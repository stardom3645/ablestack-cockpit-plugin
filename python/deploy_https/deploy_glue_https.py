#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
deploy_glue_https.py

역할
- ablestack-hci 타입에서만 Glue HTTPS 관련 배포를 수행합니다.
- 모든 SCVM(scvm1-mngt, scvm2-mngt, scvm3-mngt)에 인증서를 배포합니다.
- 모든 SCVM의 trust store 를 갱신합니다.
- 모든 SCVM의 glue-api.service 를 재시작합니다.
- Ceph Dashboard HTTPS 포트를 19200으로 설정합니다.
- 현재 active mgr daemon 을 재시작하여 새 포트 설정이 런타임에 반영되도록 합니다.

전제
- /usr/local/glue-api/conf.json 의 glue_port=19200 은 템플릿에서 영구 반영합니다.
- 따라서 이 스크립트는 conf.json 을 수정하지 않습니다.
"""

import argparse
import os
import re
import shlex
import socket
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import List


# ----------------------------------------------------------------------
# 기본 경로 / 기본값
# ----------------------------------------------------------------------

DEFAULT_ROOT_CA_CERT = "/usr/share/ablestack/pki/rootCA/rootCA.crt"
DEFAULT_ROOT_CA_KEY = "/usr/share/ablestack/pki/rootCA/rootCA.key"

DEFAULT_REMOTE_SSL_DIR = "/etc/ablestack/glue/ssl"
DEFAULT_REMOTE_ENV_FILE = "/etc/ablestack/glue-https.env"

# conf.json 의 glue_port 는 템플릿에서 영구 반영한다고 가정합니다.
DEFAULT_GLUE_PORT = 19200
DEFAULT_GLUE_PROTOCOL = "https"

DEFAULT_REMOTE_SERVICE = "glue-api.service"

DEFAULT_SSH_USER = "root"
DEFAULT_SSH_PORT = 10022
DEFAULT_SSH_OPTS = [
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ConnectTimeout=10",
]


# ----------------------------------------------------------------------
# 데이터 구조
# ----------------------------------------------------------------------

@dataclass
class ScvmNode:
    ip: str
    host_alias: str


# ----------------------------------------------------------------------
# 공통 유틸
# ----------------------------------------------------------------------

def run_cmd(cmd: List[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    """외부 명령을 실행합니다."""
    return subprocess.run(
        cmd,
        check=check,
        text=True,
        capture_output=capture,
    )


def log(message: str) -> None:
    """일반 로그를 출력합니다."""
    print(f"[INFO] {message}")


def warn(message: str) -> None:
    """경고 로그를 출력합니다."""
    print(f"[WARN] {message}")


def fail(message: str, code: int = 1) -> None:
    """오류를 출력하고 종료합니다."""
    print(f"[ERROR] {message}", file=sys.stderr)
    sys.exit(code)


def require_root() -> None:
    """root 권한을 확인합니다."""
    if os.geteuid() != 0:
        fail("root 권한으로 실행해야 합니다.")


def require_file(path: str, label: str) -> None:
    """필수 파일 존재를 확인합니다."""
    if not Path(path).is_file():
        fail(f"{label} 파일이 없습니다: {path}")


def quote(value: str) -> str:
    """원격 셸 인자 quoting 입니다."""
    return shlex.quote(value)


# ----------------------------------------------------------------------
# SCVM 탐색
# ----------------------------------------------------------------------

def discover_scvm_nodes_from_hosts(hosts_path: str = "/etc/hosts") -> List[ScvmNode]:
    """
    /etc/hosts 에서 scvm1-mngt, scvm2-mngt, scvm3-mngt 를 모두 찾아 반환합니다.
    """
    nodes: List[ScvmNode] = []
    pattern = re.compile(r"^\s*([0-9.]+)\s+(.+?)\s*$")
    target_alias = re.compile(r"\b(scvm[0-9]+-mngt)\b")

    lines = Path(hosts_path).read_text(encoding="utf-8").splitlines()

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        match = pattern.match(stripped)
        if not match:
            continue

        ip = match.group(1)
        aliases = match.group(2)

        alias_match = target_alias.search(aliases)
        if alias_match:
            nodes.append(ScvmNode(ip=ip, host_alias=alias_match.group(1)))

    unique = {}
    for node in nodes:
        unique[(node.ip, node.host_alias)] = node

    return list(unique.values())


def parse_manual_nodes(values: List[str]) -> List[ScvmNode]:
    """
    --node 10.10.12.11:scvm1-mngt 형식의 수동 노드를 파싱합니다.
    """
    nodes: List[ScvmNode] = []

    for value in values:
        if ":" not in value:
            fail(f"--node 형식이 잘못되었습니다. 예: 10.10.12.11:scvm1-mngt / 입력값: {value}")

        ip, alias = value.split(":", 1)
        nodes.append(ScvmNode(ip=ip.strip(), host_alias=alias.strip()))

    return nodes


# ----------------------------------------------------------------------
# 인증서 발급
# ----------------------------------------------------------------------

def build_san_entries(node: ScvmNode) -> List[str]:
    """
    SAN 목록을 생성합니다.
    """
    entries = [
        f"IP:{node.ip}",
        f"DNS:{node.host_alias}",
    ]

    try:
        fqdn = socket.getfqdn(node.host_alias)
        if fqdn and fqdn != node.host_alias:
            entries.append(f"DNS:{fqdn}")
    except Exception:
        pass

    return entries


def issue_glue_cert(
    node: ScvmNode,
    root_ca_cert: str,
    root_ca_key: str,
    out_dir: Path,
    days: int = 3650
) -> tuple[Path, Path]:
    """
    SCVM 1대용 Glue 서버 인증서를 발급합니다.
    """
    node_dir = out_dir / node.host_alias
    node_dir.mkdir(parents=True, exist_ok=True)

    key_path = node_dir / "glue.key"
    csr_path = node_dir / "glue.csr"
    crt_path = node_dir / "glue.crt"
    ext_path = node_dir / "glue.ext"

    san_entries = build_san_entries(node)
    ext_text = "\n".join([
        "basicConstraints=CA:FALSE",
        "keyUsage=digitalSignature,keyEncipherment",
        "extendedKeyUsage=serverAuth",
        f"subjectAltName={','.join(san_entries)}",
    ])
    ext_path.write_text(ext_text, encoding="utf-8")

    subject = f"/C=KR/O=ABLESTACK/OU=Glue/CN={node.host_alias}"

    run_cmd([
        "openssl", "genrsa",
        "-out", str(key_path),
        "2048",
    ])

    run_cmd([
        "openssl", "req",
        "-new",
        "-key", str(key_path),
        "-out", str(csr_path),
        "-subj", subject,
    ])

    run_cmd([
        "openssl", "x509",
        "-req",
        "-in", str(csr_path),
        "-CA", root_ca_cert,
        "-CAkey", root_ca_key,
        "-CAcreateserial",
        "-out", str(crt_path),
        "-days", str(days),
        "-sha256",
        "-extfile", str(ext_path),
    ])

    os.chmod(key_path, 0o600)
    os.chmod(crt_path, 0o644)

    return crt_path, key_path


# ----------------------------------------------------------------------
# SSH / SCP
# ----------------------------------------------------------------------

def ssh_exec(ssh_user: str, host: str, command: str, ssh_port: int) -> None:
    """원격 명령을 실행합니다."""
    cmd = [
        "ssh",
        "-p", str(ssh_port),
        *DEFAULT_SSH_OPTS,
        f"{ssh_user}@{host}",
        command,
    ]
    run_cmd(cmd)


def scp_copy(ssh_user: str, source: str, target: str, ssh_port: int) -> None:
    """원격 파일 복사를 수행합니다."""
    cmd = [
        "scp",
        "-P", str(ssh_port),
        *DEFAULT_SSH_OPTS,
        source,
        f"{ssh_user}@{target}",
    ]
    run_cmd(cmd)


# ----------------------------------------------------------------------
# 원격 배포
# ----------------------------------------------------------------------

def deploy_cert_bundle_to_remote(
    node: ScvmNode,
    ssh_user: str,
    ssh_port: int,
    root_ca_cert: str,
    glue_crt: Path,
    glue_key: Path,
    remote_ssl_dir: str
) -> None:
    """
    원격 SCVM으로 인증서 묶음을 배포합니다.
    """
    log(f"{node.host_alias}({node.ip}) 인증서 배포 시작")

    ssh_exec(
        ssh_user,
        node.ip,
        " && ".join([
            f"mkdir -p {quote(remote_ssl_dir)}",
            f"chmod 755 {quote(remote_ssl_dir)}",
        ]),
        ssh_port,
    )

    scp_copy(ssh_user, root_ca_cert, f"{node.ip}:{remote_ssl_dir}/rootCA.crt", ssh_port)
    scp_copy(ssh_user, str(glue_crt), f"{node.ip}:{remote_ssl_dir}/glue.crt", ssh_port)
    scp_copy(ssh_user, str(glue_key), f"{node.ip}:{remote_ssl_dir}/glue.key", ssh_port)

    ssh_exec(
        ssh_user,
        node.ip,
        " && ".join([
            f"chmod 644 {quote(remote_ssl_dir)}/rootCA.crt",
            f"chmod 644 {quote(remote_ssl_dir)}/glue.crt",
            f"chmod 600 {quote(remote_ssl_dir)}/glue.key",
        ]),
        ssh_port,
    )

    log(f"{node.host_alias}({node.ip}) 인증서 배포 완료")


def write_remote_env_file(
    node: ScvmNode,
    ssh_user: str,
    ssh_port: int,
    remote_env_file: str,
    remote_ssl_dir: str,
    glue_port: int,
    glue_protocol: str
) -> None:
    """
    원격 SCVM에 Glue HTTPS 환경 파일을 생성합니다.

    주의:
    - 현재 conf.json 의 glue_port 는 템플릿에서 영구 반영한다고 가정합니다.
    - 이 env 파일은 향후 확장/운영 편의용으로만 유지합니다.
    """
    env_text = "\n".join([
        f"GLUE_PROTOCOL={glue_protocol}",
        f"GLUE_PORT={glue_port}",
        f"GLUE_CERT_FILE={remote_ssl_dir}/glue.crt",
        f"GLUE_KEY_FILE={remote_ssl_dir}/glue.key",
        f"GLUE_CA_FILE={remote_ssl_dir}/rootCA.crt",
        "",
    ])

    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as tmp:
        tmp.write(env_text)
        tmp_path = tmp.name

    try:
        scp_copy(ssh_user, tmp_path, f"{node.ip}:{remote_env_file}", ssh_port)
        ssh_exec(
            ssh_user,
            node.ip,
            f"chmod 644 {quote(remote_env_file)}",
            ssh_port,
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    log(f"{node.host_alias}({node.ip}) 환경 파일 생성 완료: {remote_env_file}")


def trust_root_ca_on_remote(
    node: ScvmNode,
    ssh_user: str,
    ssh_port: int,
    remote_ssl_dir: str
) -> None:
    """
    원격 SCVM OS trust store 에 rootCA.crt 를 등록합니다.
    """
    remote_script = f"""
set -e

if [ -d /etc/pki/ca-trust/source/anchors ]; then
  cp -f {quote(remote_ssl_dir)}/rootCA.crt /etc/pki/ca-trust/source/anchors/ablestack-rootCA.crt
  update-ca-trust
elif [ -d /usr/local/share/ca-certificates ]; then
  cp -f {quote(remote_ssl_dir)}/rootCA.crt /usr/local/share/ca-certificates/ablestack-rootCA.crt
  update-ca-certificates
else
  echo "[WARN] trust store path not found"
fi
"""
    ssh_exec(ssh_user, node.ip, remote_script, ssh_port)
    log(f"{node.host_alias}({node.ip}) trust store 반영 완료")


def restart_remote_service_if_requested(
    node: ScvmNode,
    ssh_user: str,
    ssh_port: int,
    remote_service: str
) -> None:
    """
    Glue API 서비스를 재시작합니다.
    """
    if not remote_service:
        warn(f"{node.host_alias}({node.ip}) 서비스명이 지정되지 않아 재시작은 건너뜁니다.")
        return

    remote_script = f"""
set -e
systemctl daemon-reload
systemctl restart {quote(remote_service)}
systemctl enable {quote(remote_service)} >/dev/null 2>&1 || true
systemctl status {quote(remote_service)} --no-pager -l || true
"""
    ssh_exec(ssh_user, node.ip, remote_script, ssh_port)
    log(f"{node.host_alias}({node.ip}) 서비스 재시작 완료: {remote_service}")


# ----------------------------------------------------------------------
# Ceph Dashboard 포트 변경
# ----------------------------------------------------------------------

def configure_ceph_dashboard_port(
    node: ScvmNode,
    ssh_user: str,
    ssh_port: int,
    glue_port: int
) -> None:
    """
    Ceph Dashboard 실제 브라우저 포트를 변경하고,
    현재 active mgr daemon 을 재시작하여 새 설정을 런타임에 반영합니다.

    주의:
    - 이 작업은 클러스터 전역 설정이므로 1회만 수행합니다.
    """
    remote_script = f"""
set -e

# 1. dashboard 포트 설정
ceph config set mgr mgr/dashboard/ssl_server_port {glue_port}

# 2. 현재 active mgr 이름 확인
ACTIVE_MGR=$(ceph mgr stat -f json | python3 -c 'import sys, json; print(json.load(sys.stdin)["active_name"])')

if [ -z "$ACTIVE_MGR" ]; then
  echo "[ERROR] active mgr name not found"
  exit 1
fi

echo "[INFO] active mgr: $ACTIVE_MGR"

# 3. cephadm / orch 기준으로 active mgr daemon 재시작
if ceph orch daemon restart "$ACTIVE_MGR"; then
  echo "[INFO] ceph orch daemon restart success: $ACTIVE_MGR"
else
  echo "[WARN] ceph orch daemon restart failed, fallback to ceph mgr fail"
  ceph mgr fail "$ACTIVE_MGR"
fi

# 4. 잠시 대기 후 상태 확인
sleep 5

echo "[INFO] ceph mgr services"
ceph mgr services || true

echo "[INFO] ceph dashboard port config"
ceph config get mgr mgr/dashboard/ssl_server_port || true
"""
    ssh_exec(ssh_user, node.ip, remote_script, ssh_port)
    log(f"{node.host_alias}({node.ip}) ceph dashboard 포트 변경 및 mgr 재적용 완료: {glue_port}")


# ----------------------------------------------------------------------
# 인자 처리
# ----------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy Glue HTTPS settings to SCVM nodes")

    parser.add_argument("--os-type", default="", help="ABLESTACK os_type. Glue는 ablestack-hci 에서만 사용합니다.")
    parser.add_argument("--root-ca-cert", default=DEFAULT_ROOT_CA_CERT, help="Root CA certificate path")
    parser.add_argument("--root-ca-key", default=DEFAULT_ROOT_CA_KEY, help="Root CA private key path")
    parser.add_argument("--ssh-user", default=DEFAULT_SSH_USER, help="Remote SSH user")
    parser.add_argument("--ssh-port", type=int, default=DEFAULT_SSH_PORT, help="Remote SSH port")
    parser.add_argument("--remote-ssl-dir", default=DEFAULT_REMOTE_SSL_DIR, help="Remote SSL directory")
    parser.add_argument("--remote-env-file", default=DEFAULT_REMOTE_ENV_FILE, help="Remote environment file path")
    parser.add_argument("--remote-service", default=DEFAULT_REMOTE_SERVICE, help="Remote Glue systemd service name")
    parser.add_argument("--glue-port", type=int, default=DEFAULT_GLUE_PORT, help="Ceph Dashboard HTTPS port")
    parser.add_argument("--glue-protocol", default=DEFAULT_GLUE_PROTOCOL, choices=["http", "https"], help="Glue protocol")
    parser.add_argument("--days", type=int, default=3650, help="Certificate validity days")
    parser.add_argument("--node", action="append", default=[], help="Manual node definition: ip:alias")
    parser.add_argument("--dry-run", action="store_true", help="Only show detected nodes and exit")

    return parser.parse_args()


# ----------------------------------------------------------------------
# 메인
# ----------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    # Glue는 ablestack-hci 에서만 사용합니다.
    if args.os_type and args.os_type != "ablestack-hci":
        log(f"os_type={args.os_type} 이므로 Glue 배포를 건너뜁니다.")
        return

    require_root()
    require_file(args.root_ca_cert, "Root CA cert")
    require_file(args.root_ca_key, "Root CA key")

    auto_nodes = discover_scvm_nodes_from_hosts()
    manual_nodes = parse_manual_nodes(args.node)

    if manual_nodes:
        nodes = manual_nodes
    else:
        nodes = auto_nodes

    if not nodes:
        fail("대상 SCVM 노드를 찾지 못했습니다. /etc/hosts 또는 --node 인자를 확인해야 합니다.")

    log("대상 SCVM 목록")
    for node in nodes:
        log(f" - {node.host_alias} ({node.ip})")

    if args.dry_run:
        return

    with tempfile.TemporaryDirectory(prefix="deploy_glue_https_") as workdir:
        work_path = Path(workdir)

        # 1. 모든 SCVM에 공통 반영
        for node in nodes:
            log(f"{node.host_alias}({node.ip}) 처리 시작")

            glue_crt, glue_key = issue_glue_cert(
                node=node,
                root_ca_cert=args.root_ca_cert,
                root_ca_key=args.root_ca_key,
                out_dir=work_path,
                days=args.days,
            )

            deploy_cert_bundle_to_remote(
                node=node,
                ssh_user=args.ssh_user,
                ssh_port=args.ssh_port,
                root_ca_cert=args.root_ca_cert,
                glue_crt=glue_crt,
                glue_key=glue_key,
                remote_ssl_dir=args.remote_ssl_dir,
            )

            write_remote_env_file(
                node=node,
                ssh_user=args.ssh_user,
                ssh_port=args.ssh_port,
                remote_env_file=args.remote_env_file,
                remote_ssl_dir=args.remote_ssl_dir,
                glue_port=args.glue_port,
                glue_protocol=args.glue_protocol,
            )

            trust_root_ca_on_remote(
                node=node,
                ssh_user=args.ssh_user,
                ssh_port=args.ssh_port,
                remote_ssl_dir=args.remote_ssl_dir,
            )

            restart_remote_service_if_requested(
                node=node,
                ssh_user=args.ssh_user,
                ssh_port=args.ssh_port,
                remote_service=args.remote_service,
            )

            log(f"{node.host_alias}({node.ip}) 처리 완료")

        # 2. Ceph Dashboard 포트 변경은 클러스터 전역 1회만 수행
        # 대표 노드 1대에서 ceph 명령을 실행합니다.
        representative_node = nodes[0]

        configure_ceph_dashboard_port(
            node=representative_node,
            ssh_user=args.ssh_user,
            ssh_port=args.ssh_port,
            glue_port=args.glue_port,
        )

    log("deploy_glue_https.py 작업이 모두 완료되었습니다.")


if __name__ == "__main__":
    main()