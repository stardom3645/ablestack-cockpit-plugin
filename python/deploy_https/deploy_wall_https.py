#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Wall HTTPS 자동 배포 스크립트입니다.

구성 전제
1. rootCA.key / rootCA.crt 는 ccvm 템플릿에 포함되어 있습니다.
2. 사이트 구축 후 ccvm 에서 이 스크립트를 실행합니다.
3. 이 스크립트는 Wall 서비스 인증서를 생성하고 설치합니다.
4. SAN 은 고정값(ccvm, localhost, 127.0.0.1)만 사용합니다.
5. Wall 은 https://ccvm:19400 으로 서비스됩니다.

주의
- root 권한으로 실행해야 합니다.
- 현재 노드의 hostname 이 ccvm 이어야 합니다.
- Wall 서비스 systemd 이름은 grafana-server.service 입니다.
"""

import os
import re
import shutil
import socket
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple


# ----------------------------------------------------------------------
# 고정 경로 및 설정
# ----------------------------------------------------------------------

ROOT_CA_KEY = Path("/usr/share/ablestack/pki/rootCA/rootCA.key")
ROOT_CA_CRT = Path("/usr/share/ablestack/pki/rootCA/rootCA.crt")

WALL_TLS_DIR = Path("/usr/share/ablestack/ablestack-wall/grafana/tls")
WALL_CONFIG_FILE = Path("/usr/share/ablestack/ablestack-wall/grafana/conf/defaults.ini")

TRUST_ANCHOR_DIR = Path("/etc/pki/ca-trust/source/anchors")
TRUST_ANCHOR_FILE = TRUST_ANCHOR_DIR / "ablestack-rootCA.crt"

# 실제 서비스명
WALL_SERVICE_NAME = "grafana-server.service"

WALL_PROTOCOL = "https"
WALL_PORT = "19400"
WALL_DOMAIN = "ccvm"
WALL_ROOT_URL = "https://ccvm:19400"

WALL_CERT_COMMON_NAME = "ccvm"
WALL_CERT_SAN_DNS = ["ccvm", "localhost"]
WALL_CERT_SAN_IP = ["127.0.0.1"]

# 20년
WALL_CERT_DAYS = 7300

WALL_KEY_FILE = WALL_TLS_DIR / "wall.key"
WALL_CSR_FILE = WALL_TLS_DIR / "wall.csr"
WALL_CERT_FILE = WALL_TLS_DIR / "wall.crt"
WALL_CERT_CONFIG_FILE = WALL_TLS_DIR / "wall.cnf"
WALL_CERT_SERIAL_FILE = WALL_TLS_DIR / "rootCA.srl"
WALL_CA_CERT_COPY_FILE = WALL_TLS_DIR / "rootCA.crt"


# ----------------------------------------------------------------------
# 공통 유틸
# ----------------------------------------------------------------------

def run_command(command: List[str]) -> None:
    """
    외부 명령을 실행합니다.
    실패 시 예외를 발생시킵니다.
    """
    print(f"[INFO] 실행: {' '.join(command)}")
    subprocess.run(command, check=True)


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


# ----------------------------------------------------------------------
# 역할 판별
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


# ----------------------------------------------------------------------
# Wall 인증서 생성
# ----------------------------------------------------------------------

def build_wall_openssl_config(common_name: str, san_dns: List[str], san_ip: List[str]) -> str:
    """
    Wall 서버 인증서용 openssl 설정 파일 내용을 생성합니다.
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
OU = Wall
CN = {common_name}

[req_ext]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
{alt_names_block}
"""


def generate_wall_certificate() -> None:
    """
    Wall 서버 인증서를 생성합니다.
    """
    validate_file(ROOT_CA_KEY, "Root CA key")
    validate_file(ROOT_CA_CRT, "Root CA crt")

    ensure_dir(WALL_TLS_DIR)

    config_text = build_wall_openssl_config(
        common_name=WALL_CERT_COMMON_NAME,
        san_dns=WALL_CERT_SAN_DNS,
        san_ip=WALL_CERT_SAN_IP
    )
    write_text_file(WALL_CERT_CONFIG_FILE, config_text)

    run_command([
        "openssl", "genrsa",
        "-out", str(WALL_KEY_FILE),
        "2048"
    ])

    run_command([
        "openssl", "req",
        "-new",
        "-key", str(WALL_KEY_FILE),
        "-out", str(WALL_CSR_FILE),
        "-config", str(WALL_CERT_CONFIG_FILE)
    ])

    sign_command = [
        "openssl", "x509",
        "-req",
        "-in", str(WALL_CSR_FILE),
        "-CA", str(ROOT_CA_CRT),
        "-CAkey", str(ROOT_CA_KEY),
        "-out", str(WALL_CERT_FILE),
        "-days", str(WALL_CERT_DAYS),
        "-sha256",
        "-extensions", "req_ext",
        "-extfile", str(WALL_CERT_CONFIG_FILE)
    ]

    if WALL_CERT_SERIAL_FILE.exists():
        sign_command.extend(["-CAserial", str(WALL_CERT_SERIAL_FILE)])
    else:
        sign_command.append("-CAcreateserial")

    run_command(sign_command)

    shutil.copy2(ROOT_CA_CRT, WALL_CA_CERT_COPY_FILE)

    os.chmod(WALL_KEY_FILE, 0o600)
    os.chmod(WALL_CERT_FILE, 0o644)
    os.chmod(WALL_CA_CERT_COPY_FILE, 0o644)

    print("[INFO] Wall 인증서 생성 완료")
    print(f"[INFO] wall.key   : {WALL_KEY_FILE}")
    print(f"[INFO] wall.crt   : {WALL_CERT_FILE}")
    print(f"[INFO] rootCA.crt : {WALL_CA_CERT_COPY_FILE}")


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


# ----------------------------------------------------------------------
# Wall 설정 반영
# ----------------------------------------------------------------------

def update_or_append_ini_key(content: str, key: str, value: str) -> str:
    """
    ini 형식의 key=value 항목을 갱신합니다.
    없으면 파일 마지막에 추가합니다.
    """
    pattern = rf"(?m)^[;#]?\s*{re.escape(key)}\s*=.*$"
    replacement = f"{key} = {value}"

    if re.search(pattern, content):
        return re.sub(pattern, replacement, content)

    return content.rstrip() + f"\n{replacement}\n"


def update_wall_config() -> None:
    """
    Wall defaults.ini 에 HTTPS 설정을 반영합니다.
    """
    validate_file(WALL_CONFIG_FILE, "Wall 설정 파일")
    backup_file(WALL_CONFIG_FILE)

    content = WALL_CONFIG_FILE.read_text(encoding="utf-8", errors="ignore")

    updates: List[Tuple[str, str]] = [
        ("protocol", WALL_PROTOCOL),
        ("http_port", WALL_PORT),
        ("domain", WALL_DOMAIN),
        ("root_url", WALL_ROOT_URL),
        ("cert_file", str(WALL_CERT_FILE)),
        ("cert_key", str(WALL_KEY_FILE)),
        ("enforce_domain", "false"),
    ]

    for key, value in updates:
        content = update_or_append_ini_key(content, key, value)

    WALL_CONFIG_FILE.write_text(content, encoding="utf-8")
    print(f"[INFO] Wall 설정 반영 완료: {WALL_CONFIG_FILE}")


# ----------------------------------------------------------------------
# 서비스 재기동 및 검증
# ----------------------------------------------------------------------

def restart_wall_service() -> None:
    """
    Wall 서비스를 재기동합니다.
    """
    run_command(["systemctl", "restart", WALL_SERVICE_NAME])
    print(f"[INFO] 서비스 재기동 완료: {WALL_SERVICE_NAME}")


def show_wall_service_status() -> None:
    """
    Wall 서비스 상태를 출력합니다.
    """
    try:
        run_command(["systemctl", "--no-pager", "--full", "status", WALL_SERVICE_NAME])
    except subprocess.CalledProcessError:
        print("[WARN] 서비스 상태 출력 중 오류가 있었습니다.")


def verify_wall_certificate_summary() -> None:
    """
    생성된 Wall 인증서 요약 정보를 출력합니다.
    """
    run_command([
        "openssl", "x509",
        "-in", str(WALL_CERT_FILE),
        "-noout",
        "-subject",
        "-issuer",
        "-ext", "subjectAltName"
    ])


# ----------------------------------------------------------------------
# 메인
# ----------------------------------------------------------------------

def main() -> int:
    """
    메인 진입점입니다.
    """
    require_root()
    ensure_current_node_is_ccvm()
    generate_wall_certificate()
    install_root_ca_to_trust_store()
    update_wall_config()
    restart_wall_service()
    verify_wall_certificate_summary()
    show_wall_service_status()

    print("[DONE] Wall HTTPS 자동 배포가 완료되었습니다.")
    print(f"[INFO] 접속 주소: {WALL_ROOT_URL}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"[ERROR] {error}")
        sys.exit(1)