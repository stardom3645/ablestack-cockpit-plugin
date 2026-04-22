#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Mold HTTPS 443 only 자동 배포 스크립트입니다.

기본 역할
1. 기존 Root CA 를 재사용합니다.
2. Mold 서버 인증서를 생성합니다.
3. /etc/cloudstack/management/keystore 를 생성합니다.
4. /etc/cloudstack/management/server.properties 를 443 only 로 보정합니다.
5. mold.service 가 443 에 직접 바인드할 수 있도록 systemd override 를 생성합니다.
6. Root CA 를 OS trust store / Java truststore 에 등록합니다.
7. mold.service 를 재시작하고 HTTPS 기동 여부를 검증합니다.
8. endpoint.url 을 HTTPS 기준으로 보정합니다.
9. 가능한 경우 consoleproxy 관련 글로벌 설정을 반영합니다.

주의
- 이 스크립트 적용 후 Mold HTTP 8080 은 비활성화됩니다.
- custom certificate 등록 자체는 수행하지 않습니다.
- 콘솔 프록시 SSL 을 마무리하려면 Infrastructure > SSL 인증서 모달 입력이 추가로 필요합니다.
"""

import argparse
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import List, Optional


# ----------------------------------------------------------------------
# 고정 경로 및 설정
# ----------------------------------------------------------------------

ROOT_CA_KEY = Path("/usr/share/ablestack/pki/rootCA/rootCA.key")
ROOT_CA_CRT = Path("/usr/share/ablestack/pki/rootCA/rootCA.crt")

MOLD_TLS_DIR = Path("/usr/share/ablestack/ablestack-mold/tls")
MOLD_PROPERTIES_FILE = Path("/etc/cloudstack/management/server.properties")
MOLD_KEYSTORE_FILE = Path("/etc/cloudstack/management/keystore")
MOLD_TMP_PKCS12_FILE = MOLD_TLS_DIR / "mold.p12"

MOLD_SYSTEMD_OVERRIDE_DIR = Path("/etc/systemd/system/mold.service.d")
MOLD_SYSTEMD_OVERRIDE_FILE = MOLD_SYSTEMD_OVERRIDE_DIR / "override.conf"
FIREWALL_SERVICE_XML = Path("/etc/firewalld/services/ABLESTACK-Firewall.xml")

TRUST_ANCHOR_DIR = Path("/etc/pki/ca-trust/source/anchors")
TRUST_ANCHOR_FILE = TRUST_ANCHOR_DIR / "ablestack-rootCA.crt"

JAVA_CACERTS_FILE = Path("/etc/pki/java/cacerts")
JAVA_TRUSTSTORE_ALIAS = "ablestack-rootca"
JAVA_TRUSTSTORE_PASSWORD = "changeit"

MOLD_SERVICE_NAME = "mold.service"
MOLD_PORT = "443"
MOLD_KEYSTORE_PASSWORD = "vmops.com"
MOLD_CERT_DAYS = 7300

MOLD_KEY_FILE = MOLD_TLS_DIR / "mold.key"
MOLD_PKCS8_KEY_FILE = MOLD_TLS_DIR / "mold.pkcs8.key"
MOLD_CSR_FILE = MOLD_TLS_DIR / "mold.csr"
MOLD_CERT_FILE = MOLD_TLS_DIR / "mold.crt"
MOLD_CERT_CONFIG_FILE = MOLD_TLS_DIR / "mold.cnf"
MOLD_CERT_SERIAL_FILE = MOLD_TLS_DIR / "rootCA.srl"
MOLD_CA_CERT_COPY_FILE = MOLD_TLS_DIR / "rootCA.crt"

DB_PROPERTIES_FILE = Path("/etc/cloudstack/management/db.properties")
MANAGEMENT_SERVER_LOG = Path("/var/log/cloudstack/management/management-server.log")

HEALTHCHECK_HOST = "127.0.0.1"
HEALTHCHECK_PORT = 443
HEALTHCHECK_TIMEOUT_SECONDS = 120
HEALTHCHECK_INTERVAL_SECONDS = 3
DEFAULT_MYSQL_ROOT_PASSWORD = "Ablecloud1!"


# ----------------------------------------------------------------------
# 공통 유틸
# ----------------------------------------------------------------------

def run_command(command: List[str], check: bool = True) -> subprocess.CompletedProcess:
    """
    외부 명령을 실행합니다.
    """
    print(f"[INFO] 실행: {' '.join(command)}")
    result = subprocess.run(command, check=check, text=True, capture_output=True)

    if result.stdout:
        print(result.stdout.strip())

    if result.stderr:
        print(result.stderr.strip())

    return result


def require_root() -> None:
    """
    root 권한 여부를 확인합니다.
    """
    if os.geteuid() != 0:
        raise PermissionError("root 권한으로 실행해야 합니다.")


def ensure_dir(path: Path) -> None:
    """
    디렉터리가 없으면 생성합니다.
    """
    path.mkdir(parents=True, exist_ok=True)


def validate_file(path: Path, label: str) -> None:
    """
    파일 존재 여부를 확인합니다.
    """
    if not path.is_file():
        raise FileNotFoundError(f"{label} 파일이 없습니다: {path}")


def backup_file(path: Path) -> Path:
    """
    파일 백업본을 생성합니다.
    """
    backup_path = path.with_name(f"{path.name}.bak")
    shutil.copy2(path, backup_path)
    print(f"[INFO] 백업 생성: {backup_path}")
    return backup_path


def write_text_file(path: Path, content: str) -> None:
    """
    텍스트 파일을 저장합니다.
    """
    path.write_text(content, encoding="utf-8")
    print(f"[INFO] 파일 저장: {path}")


def update_or_append_property(content: str, key: str, value: str) -> str:
    """
    properties 형식의 key=value 항목을 갱신합니다.
    없으면 파일 마지막에 추가합니다.
    """
    pattern = rf"(?m)^\s*{re.escape(key)}\s*=.*$"
    replacement = f"{key}={value}"

    if re.search(pattern, content):
        return re.sub(pattern, replacement, content)

    return content.rstrip() + f"\n{replacement}\n"


def read_pem_file(path: Path) -> str:
    """
    PEM 파일을 문자열로 읽습니다.
    """
    validate_file(path, str(path))
    return path.read_text(encoding="utf-8").strip()


# ----------------------------------------------------------------------
# 역할 판별 및 네트워크 정보
# ----------------------------------------------------------------------

def get_current_hostname() -> str:
    """
    현재 시스템 hostname 을 소문자로 반환합니다.
    """
    hostname = socket.gethostname().strip().lower()
    if not hostname:
        raise RuntimeError("hostname 을 확인할 수 없습니다.")
    return hostname


def ensure_current_node_is_ccvm() -> None:
    """
    현재 노드가 ccvm 인지 확인합니다.
    """
    current_hostname = get_current_hostname()

    if current_hostname != "ccvm":
        raise RuntimeError(
            f"현재 hostname 은 '{current_hostname}' 입니다. "
            "이 스크립트는 ccvm 에서만 실행해야 합니다."
        )

    print(f"[INFO] 현재 hostname 확인 완료: {current_hostname}")


def get_primary_ip() -> str:
    """
    현재 ccvm 의 대표 IP 를 반환합니다.
    기본 라우트 기준 IP 를 우선 사용하고, 실패 시 hostname -I 첫 번째 값을 사용합니다.
    """
    try:
        result = run_command(
            [
                "bash",
                "-lc",
                "ip route get 1.1.1.1 | awk '/src/ {for (i = 1; i <= NF; i++) if ($i == \"src\") {print $(i + 1); exit}}'",
            ]
        )
        candidate = result.stdout.strip()
        if candidate:
            socket.inet_aton(candidate)
            print(f"[INFO] 기본 라우트 기준 IP 확인: {candidate}")
            return candidate
    except Exception:
        pass

    try:
        result = run_command(["bash", "-lc", "hostname -I | awk '{print $1}'"])
        candidate = result.stdout.strip()
        if candidate:
            socket.inet_aton(candidate)
            print(f"[INFO] hostname -I 기준 IP 확인: {candidate}")
            return candidate
    except Exception:
        pass

    raise RuntimeError("ccvm 대표 IP 를 확인할 수 없습니다.")


def get_fqdn() -> str:
    """
    FQDN 을 확인합니다.
    """
    fqdn = socket.getfqdn().strip().lower()
    return fqdn


def derive_domain_suffix(explicit_domain_suffix: Optional[str]) -> str:
    """
    custom certificate 및 console proxy/secondary storage 용 도메인 suffix 를 결정합니다.
    """
    if explicit_domain_suffix:
        print(f"[INFO] 지정된 domain suffix 사용: {explicit_domain_suffix}")
        return explicit_domain_suffix.strip().lower()

    fqdn = get_fqdn()
    hostname = get_current_hostname()

    if fqdn and "." in fqdn and not fqdn.startswith("localhost."):
        derived = fqdn.split(".", 1)[1]
        print(f"[INFO] FQDN 기준 domain suffix 추론: {derived}")
        return derived

    print(
        "[WARN] FQDN 기반 domain suffix 를 자동 추론하지 못했습니다. "
        f"임시로 hostname '{hostname}' 을 사용합니다."
    )
    print(
        "[WARN] 실제 운영에서 CPVM/SSVM SSL 을 안정적으로 쓰려면 "
        "--domain-suffix 로 실제 DNS suffix 를 지정하는 편이 안전합니다."
    )
    return hostname


def derive_api_host(explicit_api_host: Optional[str], primary_ip: str) -> str:
    """
    endpoint.url 등에 사용할 접근 호스트를 결정합니다.
    """
    if explicit_api_host:
        print(f"[INFO] 지정된 API 호스트 사용: {explicit_api_host}")
        return explicit_api_host.strip()

    fqdn = get_fqdn()
    if fqdn and fqdn not in {"localhost", "localhost.localdomain"}:
        print(f"[INFO] FQDN 기준 API 호스트 사용: {fqdn}")
        return fqdn

    hostname = get_current_hostname()
    if hostname:
        print(f"[INFO] hostname 기준 API 호스트 사용: {hostname}")
        return hostname

    print(f"[INFO] 대표 IP 기준 API 호스트 사용: {primary_ip}")
    return primary_ip


# ----------------------------------------------------------------------
# Mold 인증서 생성
# ----------------------------------------------------------------------

def build_mold_openssl_config(common_name: str, san_dns: List[str], san_ip: List[str]) -> str:
    """
    Mold 서버 인증서용 openssl 설정 파일 내용을 생성합니다.
    """
    alt_name_lines: List[str] = []

    dns_index = 1
    for dns_value in san_dns:
        alt_name_lines.append(f"DNS.{dns_index} = {dns_value}")
        dns_index += 1

    ip_index = 1
    for ip_value in san_ip:
        alt_name_lines.append(f"IP.{ip_index} = {ip_value}")
        ip_index += 1

    alt_names_block = "\n".join(alt_name_lines)

    return f"""[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = KR
ST = Seoul
L = Seoul
O = ABLESTACK
OU = Mold
CN = {common_name}

[req_ext]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
{alt_names_block}
"""


def generate_mold_certificate(primary_ip: str) -> None:
    """
    Mold 서버 인증서를 생성합니다.
    """
    validate_file(ROOT_CA_KEY, "Root CA key")
    validate_file(ROOT_CA_CRT, "Root CA crt")

    ensure_dir(MOLD_TLS_DIR)

    san_dns = ["ccvm", "localhost"]
    san_ip = ["127.0.0.1", primary_ip]

    config_text = build_mold_openssl_config(
        common_name="ccvm",
        san_dns=san_dns,
        san_ip=san_ip,
    )
    write_text_file(MOLD_CERT_CONFIG_FILE, config_text)

    run_command([
        "openssl",
        "genrsa",
        "-out",
        str(MOLD_KEY_FILE),
        "2048",
    ])

    run_command([
        "openssl",
        "pkcs8",
        "-topk8",
        "-nocrypt",
        "-in",
        str(MOLD_KEY_FILE),
        "-out",
        str(MOLD_PKCS8_KEY_FILE),
    ])

    run_command([
        "openssl",
        "req",
        "-new",
        "-key",
        str(MOLD_KEY_FILE),
        "-out",
        str(MOLD_CSR_FILE),
        "-config",
        str(MOLD_CERT_CONFIG_FILE),
    ])

    sign_command = [
        "openssl",
        "x509",
        "-req",
        "-in",
        str(MOLD_CSR_FILE),
        "-CA",
        str(ROOT_CA_CRT),
        "-CAkey",
        str(ROOT_CA_KEY),
        "-out",
        str(MOLD_CERT_FILE),
        "-days",
        str(MOLD_CERT_DAYS),
        "-sha256",
        "-extensions",
        "req_ext",
        "-extfile",
        str(MOLD_CERT_CONFIG_FILE),
    ]

    if MOLD_CERT_SERIAL_FILE.exists():
        sign_command.extend(["-CAserial", str(MOLD_CERT_SERIAL_FILE)])
    else:
        sign_command.append("-CAcreateserial")

    run_command(sign_command)

    shutil.copy2(ROOT_CA_CRT, MOLD_CA_CERT_COPY_FILE)

    os.chmod(MOLD_KEY_FILE, 0o600)
    os.chmod(MOLD_PKCS8_KEY_FILE, 0o600)
    os.chmod(MOLD_CERT_FILE, 0o644)
    os.chmod(MOLD_CA_CERT_COPY_FILE, 0o644)

    print("[INFO] Mold 인증서 생성 완료")
    print(f"[INFO] SAN DNS: {san_dns}")
    print(f"[INFO] SAN IP : {san_ip}")


def create_mold_jks_keystore() -> None:
    """
    Mold HTTPS 용 JKS keystore 를 생성합니다.
    최종 파일명은 /etc/cloudstack/management/keystore 를 사용합니다.
    """
    validate_file(MOLD_KEY_FILE, "Mold key")
    validate_file(MOLD_CERT_FILE, "Mold crt")

    ensure_dir(MOLD_KEYSTORE_FILE.parent)

    if MOLD_TMP_PKCS12_FILE.exists():
        MOLD_TMP_PKCS12_FILE.unlink()

    if MOLD_KEYSTORE_FILE.exists():
        MOLD_KEYSTORE_FILE.unlink()

    run_command([
        "openssl",
        "pkcs12",
        "-export",
        "-name",
        "mold",
        "-inkey",
        str(MOLD_KEY_FILE),
        "-in",
        str(MOLD_CERT_FILE),
        "-certfile",
        str(MOLD_CA_CERT_COPY_FILE),
        "-out",
        str(MOLD_TMP_PKCS12_FILE),
        "-passout",
        f"pass:{MOLD_KEYSTORE_PASSWORD}",
    ])

    run_command([
        "keytool",
        "-importkeystore",
        "-deststorepass",
        MOLD_KEYSTORE_PASSWORD,
        "-destkeypass",
        MOLD_KEYSTORE_PASSWORD,
        "-destkeystore",
        str(MOLD_KEYSTORE_FILE),
        "-srckeystore",
        str(MOLD_TMP_PKCS12_FILE),
        "-srcstoretype",
        "PKCS12",
        "-srcstorepass",
        MOLD_KEYSTORE_PASSWORD,
        "-alias",
        "mold",
        "-noprompt",
    ])

    shutil.chown(MOLD_KEYSTORE_FILE, user="cloud", group="cloud")
    os.chmod(MOLD_KEYSTORE_FILE, 0o640)

    print(f"[INFO] Mold JKS keystore 생성 완료: {MOLD_KEYSTORE_FILE}")


# ----------------------------------------------------------------------
# trust store 등록
# ----------------------------------------------------------------------

def install_root_ca_to_trust_store() -> None:
    """
    rootCA.crt 를 OS trust store 에 등록합니다.
    """
    validate_file(ROOT_CA_CRT, "Root CA crt")
    ensure_dir(TRUST_ANCHOR_DIR)

    shutil.copy2(ROOT_CA_CRT, TRUST_ANCHOR_FILE)
    os.chmod(TRUST_ANCHOR_FILE, 0o644)

    run_command(["update-ca-trust"])
    print(f"[INFO] trust store 등록 완료: {TRUST_ANCHOR_FILE}")


def install_root_ca_to_java_truststore() -> None:
    """
    rootCA.crt 를 Java truststore(/etc/pki/java/cacerts)에 등록합니다.
    재실행 가능하도록 기존 alias 는 먼저 삭제 후 다시 등록합니다.
    """
    validate_file(ROOT_CA_CRT, "Root CA crt")
    validate_file(JAVA_CACERTS_FILE, "Java cacerts")

    run_command([
        "keytool",
        "-delete",
        "-alias",
        JAVA_TRUSTSTORE_ALIAS,
        "-keystore",
        str(JAVA_CACERTS_FILE),
        "-storepass",
        JAVA_TRUSTSTORE_PASSWORD,
    ], check=False)

    run_command([
        "keytool",
        "-importcert",
        "-noprompt",
        "-alias",
        JAVA_TRUSTSTORE_ALIAS,
        "-file",
        str(ROOT_CA_CRT),
        "-keystore",
        str(JAVA_CACERTS_FILE),
        "-storepass",
        JAVA_TRUSTSTORE_PASSWORD,
    ])

    result = run_command([
        "keytool",
        "-list",
        "-keystore",
        str(JAVA_CACERTS_FILE),
        "-storepass",
        JAVA_TRUSTSTORE_PASSWORD,
    ])

    if JAVA_TRUSTSTORE_ALIAS not in result.stdout:
        raise RuntimeError(
            f"Java truststore alias 등록 확인 실패: {JAVA_TRUSTSTORE_ALIAS}"
        )

    print(f"[INFO] Java truststore 등록 완료: {JAVA_TRUSTSTORE_ALIAS}")


# ----------------------------------------------------------------------
# Mold 설정 반영
# ----------------------------------------------------------------------

def update_mold_config() -> None:
    """
    Mold server.properties 에 HTTPS 443 only 설정을 반영합니다.
    """
    validate_file(MOLD_PROPERTIES_FILE, "Mold 설정 파일")
    backup_file(MOLD_PROPERTIES_FILE)

    content = MOLD_PROPERTIES_FILE.read_text(encoding="utf-8", errors="ignore")

    updates = [
        ("http.enable", "false"),
        ("https.enable", "true"),
        ("https.port", MOLD_PORT),
        ("https.keystore", str(MOLD_KEYSTORE_FILE)),
        ("https.keystore.password", MOLD_KEYSTORE_PASSWORD),
        ("password.encryption.type", "none"),
    ]

    for key, value in updates:
        content = update_or_append_property(content, key, value)

    MOLD_PROPERTIES_FILE.write_text(content, encoding="utf-8")
    shutil.chown(MOLD_PROPERTIES_FILE, user="cloud", group="cloud")
    os.chmod(MOLD_PROPERTIES_FILE, 0o640)

    print(f"[INFO] Mold 설정 반영 완료: {MOLD_PROPERTIES_FILE}")


def configure_mold_systemd_override() -> None:
    """
    Mold 가 443 포트에 직접 바인드할 수 있도록 systemd override 를 생성합니다.
    """
    ensure_dir(MOLD_SYSTEMD_OVERRIDE_DIR)

    override_text = """[Service]
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
"""
    write_text_file(MOLD_SYSTEMD_OVERRIDE_FILE, override_text)
    os.chmod(MOLD_SYSTEMD_OVERRIDE_FILE, 0o644)

    run_command(["systemctl", "daemon-reload"])
    print(f"[INFO] systemd override 반영 완료: {MOLD_SYSTEMD_OVERRIDE_FILE}")


def configure_firewall() -> None:
    """
    ABLESTACK firewalld 서비스 정의에 443/tcp 가 없으면 추가하고 reload 합니다.
    """
    validate_file(FIREWALL_SERVICE_XML, "ABLESTACK firewalld 서비스 정의")
    xml_content = FIREWALL_SERVICE_XML.read_text(encoding="utf-8", errors="ignore")
    port_entry = '<port port="443" protocol="tcp"/>'

    if port_entry in xml_content:
        print("[INFO] ABLESTACK-Firewall.xml 에 443/tcp 가 이미 존재합니다.")
    else:
        service_close_tag = "</service>"
        if service_close_tag not in xml_content:
            raise RuntimeError(f"firewalld 서비스 정의 형식이 올바르지 않습니다: {FIREWALL_SERVICE_XML}")

        updated_content = xml_content.replace(service_close_tag, f"  {port_entry}\n{service_close_tag}")
        FIREWALL_SERVICE_XML.write_text(updated_content, encoding="utf-8")
        print(f"[INFO] ABLESTACK-Firewall.xml 에 443/tcp 추가 완료: {FIREWALL_SERVICE_XML}")

    run_command(["firewall-cmd", "--reload"])
    print("[INFO] 방화벽 reload 완료")


# ----------------------------------------------------------------------
# 서비스 재기동 및 검증
# ----------------------------------------------------------------------

def restart_mold_service() -> None:
    """
    Mold 서비스를 재기동합니다.
    """
    run_command(["systemctl", "enable", MOLD_SERVICE_NAME])
    run_command(["systemctl", "restart", MOLD_SERVICE_NAME])
    print(f"[INFO] 서비스 재기동 완료: {MOLD_SERVICE_NAME}")


def wait_for_https_ready() -> None:
    """
    Mold HTTPS 443 이 실제로 열릴 때까지 대기합니다.
    """
    deadline = time.time() + HEALTHCHECK_TIMEOUT_SECONDS

    while time.time() < deadline:
        try:
            with socket.create_connection((HEALTHCHECK_HOST, HEALTHCHECK_PORT), timeout=3):
                print(f"[INFO] HTTPS 포트 기동 확인 완료: {HEALTHCHECK_HOST}:{HEALTHCHECK_PORT}")
                return
        except OSError:
            time.sleep(HEALTHCHECK_INTERVAL_SECONDS)

    raise TimeoutError(
        f"Mold HTTPS 포트가 {HEALTHCHECK_TIMEOUT_SECONDS}초 안에 열리지 않았습니다: "
        f"{HEALTHCHECK_HOST}:{HEALTHCHECK_PORT}"
    )


def verify_https_endpoint() -> None:
    """
    /client/ 및 /client/api 에 대해 실제 HTTPS 응답을 확인합니다.
    """
    context = ssl._create_unverified_context()

    for url in (
        "https://127.0.0.1:443/client/",
        "https://127.0.0.1:443/client/api?command=listCapabilities&response=json",
    ):
        try:
            request = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(request, timeout=10, context=context) as response:
                status = response.getcode()
                print(f"[INFO] HTTPS 응답 확인: {url} -> HTTP {status}")
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                print(
                    f"[INFO] HTTPS 응답 확인: {url} -> HTTP 401 "
                    "(인증 필요, 엔드포인트는 정상 응답)"
                )
                continue
            raise RuntimeError(f"HTTPS 엔드포인트 검증 실패: {url} (HTTP {exc.code})") from exc
        except Exception as exc:
            raise RuntimeError(f"HTTPS 엔드포인트 검증 실패: {url} ({exc})") from exc


def show_mold_service_status() -> None:
    """
    Mold 서비스 상태를 출력합니다.
    """
    result = run_command(
        ["systemctl", "--no-pager", "--full", "status", MOLD_SERVICE_NAME],
        check=False,
    )
    if result.returncode != 0:
        print("[WARN] mold.service 상태가 비정상일 수 있습니다.")


def verify_mold_certificate_summary() -> None:
    """
    생성된 Mold 인증서 요약 정보를 출력합니다.
    """
    result = run_command([
        "openssl",
        "x509",
        "-in",
        str(MOLD_CERT_FILE),
        "-noout",
        "-subject",
        "-issuer",
        "-ext",
        "subjectAltName",
    ])
    print(result.stdout)


def verify_mold_keystore_summary() -> None:
    """
    생성된 JKS keystore 요약 정보를 출력합니다.
    """
    result = run_command([
        "keytool",
        "-list",
        "-keystore",
        str(MOLD_KEYSTORE_FILE),
        "-storepass",
        MOLD_KEYSTORE_PASSWORD,
    ])
    print(result.stdout)


def show_server_properties_summary() -> None:
    """
    server.properties 핵심 값만 출력합니다.
    """
    validate_file(MOLD_PROPERTIES_FILE, "Mold 설정 파일")
    content = MOLD_PROPERTIES_FILE.read_text(encoding="utf-8", errors="ignore")

    keys = [
        "http.enable",
        "http.port",
        "https.enable",
        "https.port",
        "https.keystore",
        "https.keystore.password",
        "password.encryption.type",
    ]

    print("[INFO] server.properties 핵심 설정")
    for key in keys:
        pattern = rf"(?m)^\s*{re.escape(key)}\s*=.*$"
        match = re.search(pattern, content)
        if match:
            print(match.group(0))


def mysql_execute(mysql_root_password: Optional[str], sql: str) -> None:
    """
    로컬 MySQL 에 SQL 을 실행합니다.
    """
    if not mysql_root_password:
        raise RuntimeError("MySQL root 비밀번호가 없어 로컬 DB fallback 을 수행할 수 없습니다.")

    result = run_command(
        [
            "mysql",
            "-uroot",
            f"-p{mysql_root_password}",
            "-e",
            sql,
        ],
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError("로컬 MySQL 실행에 실패했습니다.")


def detect_consoleproxy_public_ip_via_log() -> Optional[str]:
    """
    management-server.log 에서 마지막으로 올라온 Console Proxy public IP 를 찾습니다.
    """
    if not MANAGEMENT_SERVER_LOG.is_file():
        print(f"[WARN] management-server.log 파일이 없습니다: {MANAGEMENT_SERVER_LOG}")
        return None

    pattern = re.compile(r"Console proxy up .* public IP \[([^\]]+)\], private IP \[([^\]]+)\]")
    matched_public_ip: Optional[str] = None

    for line in MANAGEMENT_SERVER_LOG.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = pattern.search(line)
        if match:
            matched_public_ip = match.group(1).strip()

    if matched_public_ip:
        print(f"[INFO] management-server.log 에서 Console Proxy public IP 확인: {matched_public_ip}")
    else:
        print("[WARN] management-server.log 에서 Console Proxy public IP 를 찾지 못했습니다.")

    return matched_public_ip

def update_consoleproxy_globals_and_endpoint_via_mysql(
    mysql_root_password: Optional[str],
    api_host: str,
    consoleproxy_public_ip: Optional[str],
) -> None:
    """
    로컬 MySQL 로 endpoint.url 과 console proxy 글로벌 설정을 직접 반영합니다.
    """
    settings = {
        "endpoint.url": f"https://{api_host}:443/client/api",
    }

    if consoleproxy_public_ip:
        settings.update(
            {
                "consoleproxy.sslEnabled": "true",
                "secstorage.encrypt.copy": "true",
                "consoleproxy.url.domain": consoleproxy_public_ip,
            }
        )

    statements = ["USE cloud;"]
    for name, value in settings.items():
        escaped_name = name.replace("'", "''")
        escaped_value = value.replace("'", "''")
        print(f"[INFO] 글로벌 설정 DB fallback 반영: {name}={value}")
        statements.append(
            f"UPDATE configuration SET value='{escaped_value}' WHERE name='{escaped_name}';"
        )

    mysql_execute(mysql_root_password, "\n".join(statements))
    print("[INFO] 로컬 DB fallback 으로 글로벌 설정 반영 완료")


def print_manual_followup(consoleproxy_public_ip: Optional[str]) -> None:
    """
    현재 스크립트 범위와 수동 후속 작업을 안내합니다.
    """
    print("[MANUAL] Infrastructure > SSL 인증서 모달은 별도 수동 작업입니다.")
    print(f"[MANUAL] 루트 인증서: {ROOT_CA_CRT}")
    print(f"[MANUAL] 서버 인증서: {MOLD_CERT_FILE}")
    print(f"[MANUAL] PKCS#8 사설 인증서: {MOLD_PKCS8_KEY_FILE}")
    if consoleproxy_public_ip:
        print(f"[MANUAL] DNS 도메인: {consoleproxy_public_ip}")
    else:
        print("[MANUAL] DNS 도메인: Running 중인 Console Proxy public IP 를 확인해서 입력하세요.")
    print("[MANUAL] 제출 후 System VM 재시작/상태 반영을 확인하세요.")


# ----------------------------------------------------------------------
# 인자 처리
# ----------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    """
    CLI 인자를 파싱합니다.
    """
    parser = argparse.ArgumentParser(description="Deploy Mold HTTPS 443 and update CloudStack globals via local DB.")
    parser.add_argument("--api-host", default=os.environ.get("MOLD_API_HOST"))
    parser.add_argument("--consoleproxy-public-ip", default=os.environ.get("CONSOLEPROXY_PUBLIC_IP"))
    parser.add_argument("--mysql-root-password", default=os.environ.get("MYSQL_ROOT_PASSWORD", DEFAULT_MYSQL_ROOT_PASSWORD))
    parser.add_argument("--skip-endpoint-url-update", action="store_true")
    parser.add_argument("--skip-consoleproxy-global-settings", action="store_true")
    return parser.parse_args()


# ----------------------------------------------------------------------
# 메인
# ----------------------------------------------------------------------

def main() -> int:
    """
    메인 진입점입니다.
    """
    args = parse_args()

    require_root()
    ensure_current_node_is_ccvm()

    primary_ip = get_primary_ip()
    api_host = derive_api_host(args.api_host, primary_ip)

    generate_mold_certificate(primary_ip)
    create_mold_jks_keystore()
    install_root_ca_to_trust_store()
    install_root_ca_to_java_truststore()
    update_mold_config()
    configure_mold_systemd_override()
    configure_firewall()
    restart_mold_service()
    wait_for_https_ready()
    verify_https_endpoint()

    consoleproxy_public_ip = args.consoleproxy_public_ip

    if not consoleproxy_public_ip and not args.skip_consoleproxy_global_settings:
        consoleproxy_public_ip = detect_consoleproxy_public_ip_via_log()

    should_update_endpoint_url = not args.skip_endpoint_url_update
    should_update_consoleproxy_globals = (
        not args.skip_consoleproxy_global_settings and bool(consoleproxy_public_ip)
    )

    if not should_update_endpoint_url:
        print("[INFO] endpoint.url 반영을 건너뜁니다.")

    if args.skip_consoleproxy_global_settings:
        print("[INFO] console proxy 글로벌 설정 반영을 건너뜁니다.")
    elif not consoleproxy_public_ip:
        print("[WARN] Console Proxy public IP 를 찾지 못해 console proxy 글로벌 설정 반영을 건너뜁니다.")

    if should_update_endpoint_url or should_update_consoleproxy_globals:
        update_consoleproxy_globals_and_endpoint_via_mysql(
            mysql_root_password=args.mysql_root_password,
            api_host=api_host,
            consoleproxy_public_ip=consoleproxy_public_ip if should_update_consoleproxy_globals else None,
        )

    verify_mold_certificate_summary()
    verify_mold_keystore_summary()
    show_server_properties_summary()
    show_mold_service_status()
    print_manual_followup(consoleproxy_public_ip)

    print("[DONE] Mold 배포가 완료되었습니다.")
    print("[INFO] 접속 주소 예시: https://ccvm:443")
    print(f"[INFO] 접속 주소 예시: https://{primary_ip}:443")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"[ERROR] {error}")
        sys.exit(1)
