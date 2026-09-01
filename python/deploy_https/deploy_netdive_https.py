#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Netdive TLS 인증서 배포 스크립트입니다.

역할
1. ccvm에서 analyzer 인증서를 생성합니다.
2. ccvm에서 agent 인증서를 생성합니다.
3. rootCA.crt 를 Netdive TLS 디렉터리로 복사합니다.
4. cube(host)에 agent 인증서와 rootCA.crt 를 배포합니다.

주의
- netdive.yml 은 수정하지 않습니다.
- systemd 서비스 파일은 수정하지 않습니다.
- daemon-reload 는 하지 않습니다.
- 서비스 restart 는 하지 않습니다.
- netdive-analyzer.service 의 listen 포트가 19500인지 검증만 수행합니다.
- 서비스 restart 는 config_netdive.py 에서 수행합니다.
"""

import argparse
import os
import subprocess
import sys


SSH_COMMON_OPTS = "-o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=5"

ROOT_CA_KEY = "/usr/share/ablestack/pki/rootCA/rootCA.key"
ROOT_CA_CRT = "/usr/share/ablestack/pki/rootCA/rootCA.crt"

TLS_DIR = "/usr/share/ablestack/ablestack-netdive/tls"
NETDIVE_HTTPS_PORT = "19500"
NETDIVE_ANALYZER_SERVICE_PATHS = [
    "/etc/systemd/system/netdive-analyzer.service",
    "/usr/lib/systemd/system/netdive-analyzer.service",
    "/lib/systemd/system/netdive-analyzer.service",
]

CERT_DAYS = "7300"


def run(cmd):
    """
    shell 명령 실행
    """
    print(">>", cmd)
    subprocess.check_call(cmd, shell=True)


def parseArgs():
    """
    실행 인자 파싱
    """
    parser = argparse.ArgumentParser(description="Deploy Netdive TLS certificates")

    parser.add_argument("--cube", metavar="cube_ip", nargs="*", help="cube ip list")
    parser.add_argument("--ccvm", metavar="ccvm_ip", nargs="*", help="ccvm ip list")

    return parser.parse_args()


def ensure_file(path, label):
    """
    필수 파일 존재 확인
    """
    if not os.path.isfile(path):
        raise RuntimeError(f"{label} not found: {path}")


def ensure_tls_dir():
    """
    TLS 디렉터리 준비
    """
    if not os.path.exists(TLS_DIR):
        os.makedirs(TLS_DIR)

    print(">> TLS directory ready:", TLS_DIR)


def append_unique(items, value):
    """
    빈 값과 중복을 제외하고 목록에 추가합니다.
    """
    if value and value not in items:
        items.append(value)


def create_openssl_conf(name, san_dns_list, san_ip_list):
    """
    openssl 설정 파일 생성
    """
    alt_name_lines = []
    dns_index = 1

    for san_dns in san_dns_list:
        alt_name_lines.append(f"DNS.{dns_index} = {san_dns}")
        dns_index += 1

    ip_index = 1
    for san_ip in san_ip_list:
        alt_name_lines.append(f"IP.{ip_index} = {san_ip}")
        ip_index += 1

    conf = f"""
[req]
prompt = no
default_bits = 2048
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
CN = {name}

[req_ext]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth

[alt_names]
{os.linesep.join(alt_name_lines)}
"""

    conf_path = f"{TLS_DIR}/{name}.cnf"

    with open(conf_path, "w") as f:
        f.write(conf)

    return conf_path


def generate_cert(name, san_dns_list, san_ip_list):
    """
    서비스 인증서 생성
    """
    key_path = f"{TLS_DIR}/{name}.key"
    csr_path = f"{TLS_DIR}/{name}.csr"
    crt_path = f"{TLS_DIR}/{name}.crt"

    conf_path = create_openssl_conf(name, san_dns_list, san_ip_list)

    run(
        f"openssl req -new -nodes -newkey rsa:2048 "
        f"-keyout {key_path} "
        f"-out {csr_path} "
        f"-config {conf_path}"
    )

    run(
        f"openssl x509 -req "
        f"-in {csr_path} "
        f"-CA {ROOT_CA_CRT} "
        f"-CAkey {ROOT_CA_KEY} "
        f"-CAcreateserial "
        f"-out {crt_path} "
        f"-days {CERT_DAYS} "
        f"-sha256 "
        f"-extensions req_ext "
        f"-extfile {conf_path}"
    )

    return key_path, crt_path


def copy_root_ca_to_tls_dir():
    """
    Netdive 런타임 TLS 경로에 rootCA.crt 복사
    """
    run(f"cp -f {ROOT_CA_CRT} {TLS_DIR}/rootCA.crt")


def deploy_cube_tls(cube_ip, agent_key_path, agent_crt_path):
    """
    cube 호스트에 agent 인증서 및 rootCA 배포
    """
    print(">> Deploy TLS to cube:", cube_ip)

    run(f"ssh {SSH_COMMON_OPTS} root@{cube_ip} 'mkdir -p {TLS_DIR}'")

    run(f"scp {agent_key_path} root@{cube_ip}:{TLS_DIR}/agent.key")
    run(f"scp {agent_crt_path} root@{cube_ip}:{TLS_DIR}/agent.crt")
    run(f"scp {TLS_DIR}/rootCA.crt root@{cube_ip}:{TLS_DIR}/rootCA.crt")


def validate_netdive_analyzer_port():
    """
    템플릿에 선반영된 netdive-analyzer listen 포트를 검증합니다.
    포트 변경은 이 스크립트에서 수행하지 않습니다.
    """
    service_path = None
    for candidate in NETDIVE_ANALYZER_SERVICE_PATHS:
        if os.path.isfile(candidate):
            service_path = candidate
            break

    if not service_path:
        raise RuntimeError("netdive-analyzer.service file not found")

    with open(service_path, "r", encoding="utf-8", errors="ignore") as service_file:
        content = service_file.read()

    expected_listen = f":{NETDIVE_HTTPS_PORT}"
    if expected_listen not in content:
        raise RuntimeError(
            f"netdive-analyzer.service listen port is not {NETDIVE_HTTPS_PORT}: {service_path}"
        )

    print(f">> Netdive analyzer listen port verified: {service_path} -> {NETDIVE_HTTPS_PORT}")


def main():
    args = parseArgs()

    if not args.cube:
        raise RuntimeError("cube list required")

    ensure_file(ROOT_CA_KEY, "rootCA.key")
    ensure_file(ROOT_CA_CRT, "rootCA.crt")

    print("==== Netdive TLS deployment start ====")

    ensure_tls_dir()

    # Netdive 런타임 경로에 rootCA 복사
    copy_root_ca_to_tls_dir()
    validate_netdive_analyzer_port()

    ccvm_ips = []
    for ccvm_ip in args.ccvm or []:
        append_unique(ccvm_ips, ccvm_ip)
    append_unique(ccvm_ips, "127.0.0.1")

    cube_ips = []
    for cube_ip in args.cube:
        append_unique(cube_ips, cube_ip)
    append_unique(cube_ips, "127.0.0.1")

    # Analyzer 인증서 생성
    analyzer_key_path, analyzer_crt_path = generate_cert(
        "analyzer",
        ["ccvm", "ccvm-mngt", "localhost"],
        ccvm_ips
    )
    print(">> Analyzer cert created:", analyzer_key_path, analyzer_crt_path)

    # Agent 인증서 생성
    agent_key_path, agent_crt_path = generate_cert(
        "agent",
        ["agent", "localhost"],
        cube_ips
    )
    print(">> Agent cert created:", agent_key_path, agent_crt_path)

    # cube 배포
    for cube_ip in args.cube:
        deploy_cube_tls(cube_ip, agent_key_path, agent_crt_path)

    print("==== Netdive TLS deployment completed ====")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.write(f">> [FATAL] {str(e)}\n")
        sys.exit(1)
