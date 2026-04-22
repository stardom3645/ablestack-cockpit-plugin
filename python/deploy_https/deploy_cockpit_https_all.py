#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import shlex
import socket
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Set


PLUGIN_PATH = Path("/usr/share/cockpit/ablestack")
CLUSTER_JSON_PATH = PLUGIN_PATH / "tools/properties/cluster.json"
MANIFEST_JSON_PATH = PLUGIN_PATH / "manifest.json"
MANIFEST_BACKUP_PATH = PLUGIN_PATH / "manifest.json.host-backup"
ETC_HOSTS_PATH = Path("/etc/hosts")

ROOT_CA_DIR = Path("/usr/share/ablestack/pki/rootCA")
ROOT_CA_KEY = ROOT_CA_DIR / "rootCA.key"
ROOT_CA_CRT = ROOT_CA_DIR / "rootCA.crt"

LOCAL_CERT_DIR = Path("/usr/share/ablestack/pki/cockpit")
REMOTE_CERT_DIR = Path("/etc/cockpit/ws-certs.d")
REMOTE_CERT_BASENAME = "99-ablestack"
REMOTE_CERT_FILE = f"{REMOTE_CERT_BASENAME}.cert"
REMOTE_KEY_FILE = f"{REMOTE_CERT_BASENAME}.key"
COCKPIT_OVERRIDE_DIR = Path("/etc/systemd/system/cockpit.socket.d")
COCKPIT_OVERRIDE_FILE = COCKPIT_OVERRIDE_DIR / "override.conf"
COCKPIT_HTTPS_PORT = "19100"

TRUST_ANCHOR_DIR = Path("/etc/pki/ca-trust/source/anchors")
TRUST_ANCHOR_FILE = "ablestack-rootCA.crt"

CERT_DAYS = "7300"
SSH_COMMON_OPTS = [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=5",
]
SSH_PORT_CANDIDATES = [22, 10022]


def create_return(code: int, val):
    return json.dumps({"code": code, "val": val})


def run_command(command: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(command, check=True, text=True, capture_output=True)


def build_remote_connection_error(action: str, host_ip: str) -> RuntimeError:
    tried_ports = ", ".join(str(port) for port in SSH_PORT_CANDIDATES)
    return RuntimeError(f"{action} failed for {host_ip} (tried SSH ports: {tried_ports})")


def run_remote_command_with_fallback(host_ip: str, remote_command: str) -> subprocess.CompletedProcess:
    for ssh_port in SSH_PORT_CANDIDATES:
        try:
            return run_command([
                "ssh", *SSH_COMMON_OPTS, "-p", str(ssh_port), f"root@{host_ip}", remote_command,
            ])
        except subprocess.CalledProcessError:
            continue

    raise build_remote_connection_error("SSH command", host_ip)


def scp_with_fallback(source_path: str, destination_path: str, host_ip: str) -> subprocess.CompletedProcess:
    for ssh_port in SSH_PORT_CANDIDATES:
        try:
            return run_command([
                "scp", "-P", str(ssh_port), source_path, f"root@{host_ip}:{destination_path}",
            ])
        except subprocess.CalledProcessError:
            continue

    raise build_remote_connection_error("SCP transfer", host_ip)


def require_root() -> None:
    if os.geteuid() != 0:
        raise PermissionError("root 권한으로 실행해야 합니다.")


def validate_file(path: Path, label: str) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"{label} 파일이 없습니다: {path}")


def load_cluster_json() -> Dict:
    with CLUSTER_JSON_PATH.open("r", encoding="utf-8") as json_file:
        return json.load(json_file)


def normalize_hostname(value: str) -> Set[str]:
    normalized = set()
    value = (value or "").strip().lower()
    if not value:
        return normalized

    normalized.add(value)
    normalized.add(value.split(".")[0])
    return normalized


def load_etc_hosts_entries() -> List[Dict[str, List[str]]]:
    entries = []

    if not ETC_HOSTS_PATH.is_file():
        return entries

    with ETC_HOSTS_PATH.open("r", encoding="utf-8") as hosts_file:
        for raw_line in hosts_file:
            line = raw_line.split("#", 1)[0].strip()
            if not line:
                continue

            tokens = line.split()
            if len(tokens) < 2:
                continue

            entries.append({
                "ip": tokens[0].strip(),
                "hostnames": [token.strip().lower() for token in tokens[1:] if token.strip()],
            })

    return entries


def get_runtime_hostnames() -> Set[str]:
    runtime_hostnames = set()

    for value in [socket.gethostname(), socket.getfqdn()]:
        runtime_hostnames.update(normalize_hostname(value))

    return runtime_hostnames


def get_local_identity() -> Dict[str, Set[str]]:
    hostnames = get_runtime_hostnames()
    ips = {"127.0.0.1"}

    for entry in load_etc_hosts_entries():
        entry_hostnames = set()
        for hostname in entry["hostnames"]:
            entry_hostnames.update(normalize_hostname(hostname))

        if hostnames.intersection(entry_hostnames):
            hostnames.update(entry_hostnames)
            ips.add(entry["ip"])

    return {
        "hostnames": hostnames,
        "ips": ips,
    }


def parse_args():
    parser = argparse.ArgumentParser(description="Deploy Cockpit HTTPS certificates to all Cockpit nodes")
    parser.add_argument("--cube", metavar="cube_ip", nargs="*", help="cube ip list")
    return parser.parse_args()


def build_target(hostname: str, host_ip: str, role: str, extra_dns: List[str] = None) -> Dict[str, str]:
    return {
        "hostname": hostname,
        "ip": host_ip,
        "role": role,
        "extra_dns": extra_dns or [],
    }


def collect_cockpit_targets(args) -> List[Dict[str, str]]:
    if args.cube:
        return [{
            "hostname": f"cube{i + 1}",
            "ip": ip,
            "role": "cube",
            "extra_dns": [],
        }
            for i, ip in enumerate(args.cube)
            if ip
        ]

    cluster_json = load_cluster_json()
    cluster_config = cluster_json.get("clusterConfig", {})
    hosts = cluster_json.get("clusterConfig", {}).get("hosts", [])
    targets = []
    seen = set()

    ccvm_ip = (cluster_config.get("ccvm", {}).get("ip") or "").strip()
    if ccvm_ip:
        ccvm_key = ("ccvm", ccvm_ip)
        if ccvm_key not in seen:
            targets.append(build_target("ccvm", ccvm_ip, "ccvm", ["ccvm-mngt"]))
            seen.add(ccvm_key)

    for host in hosts:
        host_index = str(host.get("index") or "").strip()

        cube_ip = (host.get("ablecube") or "").strip()
        cube_name = (host.get("hostname") or "").strip() or (f"ablecube{host_index}" if host_index else cube_ip)
        if cube_ip:
            cube_key = (cube_name, cube_ip)
            if cube_key not in seen:
                targets.append(build_target(cube_name, cube_ip, "cube", ["ablecube"]))
                seen.add(cube_key)

        scvm_ip = (host.get("scvmMngt") or "").strip()
        scvm_name = f"scvm{host_index}" if host_index else f"scvm-{cube_name}"
        scvm_dns = [f"{scvm_name}-mngt", "scvm-mngt"]
        if scvm_ip:
            scvm_key = (scvm_name, scvm_ip)
            if scvm_key not in seen:
                targets.append(build_target(scvm_name, scvm_ip, "scvm", scvm_dns))
                seen.add(scvm_key)

    if not targets:
        raise RuntimeError("cluster.json 에서 Cockpit 대상 호스트 정보를 찾지 못했습니다.")

    return targets


def build_openssl_config(common_name: str, san_dns: List[str], san_ip: List[str]) -> str:
    alt_name_lines = []

    for index, dns_value in enumerate(san_dns, start=1):
        alt_name_lines.append(f"DNS.{index} = {dns_value}")

    for index, ip_value in enumerate(san_ip, start=1):
        alt_name_lines.append(f"IP.{index} = {ip_value}")

    return f"""[req]
prompt = no
default_bits = 2048
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
CN = {common_name}

[req_ext]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
{os.linesep.join(alt_name_lines)}
"""


def generate_cockpit_certificates(targets: List[Dict[str, str]]) -> List[Dict[str, str]]:
    LOCAL_CERT_DIR.mkdir(parents=True, exist_ok=True)
    generated_files = []

    for target in targets:
        hostname = target["hostname"]
        host_ip = target["ip"]
        safe_name = f"{target['role']}_{hostname}".replace("/", "_").replace(" ", "_")

        conf_path = LOCAL_CERT_DIR / f"{safe_name}.cnf"
        key_path = LOCAL_CERT_DIR / f"{safe_name}.key"
        csr_path = LOCAL_CERT_DIR / f"{safe_name}.csr"
        cert_path = LOCAL_CERT_DIR / f"{safe_name}.crt"
        serial_path = LOCAL_CERT_DIR / "rootCA.srl"

        config_text = build_openssl_config(
            common_name=hostname,
            san_dns=[hostname, "localhost", *target.get("extra_dns", [])],
            san_ip=[host_ip, "127.0.0.1"],
        )
        conf_path.write_text(config_text, encoding="utf-8")

        run_command(["openssl", "genrsa", "-out", str(key_path), "2048"])
        run_command([
            "openssl", "req",
            "-new",
            "-key", str(key_path),
            "-out", str(csr_path),
            "-config", str(conf_path),
        ])

        sign_command = [
            "openssl", "x509",
            "-req",
            "-in", str(csr_path),
            "-CA", str(ROOT_CA_CRT),
            "-CAkey", str(ROOT_CA_KEY),
            "-out", str(cert_path),
            "-days", CERT_DAYS,
            "-sha256",
            "-extensions", "req_ext",
            "-extfile", str(conf_path),
        ]

        if serial_path.exists():
            sign_command.extend(["-CAserial", str(serial_path)])
        else:
            sign_command.append("-CAcreateserial")

        run_command(sign_command)

        os.chmod(key_path, 0o600)
        os.chmod(cert_path, 0o644)

        generated_files.append({
            "role": target["role"],
            "hostname": hostname,
            "ip": host_ip,
            "key_path": str(key_path),
            "cert_path": str(cert_path),
        })

    return generated_files


def install_cockpit_certificate_local(cert_path: str, key_path: str) -> None:
    REMOTE_CERT_DIR.mkdir(parents=True, exist_ok=True)
    TRUST_ANCHOR_DIR.mkdir(parents=True, exist_ok=True)

    run_command(["cp", "-f", cert_path, str(REMOTE_CERT_DIR / REMOTE_CERT_FILE)])
    run_command(["cp", "-f", key_path, str(REMOTE_CERT_DIR / REMOTE_KEY_FILE)])
    run_command(["cp", "-f", str(ROOT_CA_CRT), str(TRUST_ANCHOR_DIR / TRUST_ANCHOR_FILE)])
    run_command(["chmod", "644", str(REMOTE_CERT_DIR / REMOTE_CERT_FILE)])
    run_command(["chmod", "600", str(REMOTE_CERT_DIR / REMOTE_KEY_FILE)])
    run_command(["update-ca-trust"])
    run_command(["systemctl", "restart", "cockpit.socket"])
    subprocess.run(["systemctl", "restart", "cockpit.service"], check=False, text=True, capture_output=True)


def apply_cockpit_port_local() -> None:
    COCKPIT_OVERRIDE_DIR.mkdir(parents=True, exist_ok=True)
    COCKPIT_OVERRIDE_FILE.write_text(
        "[Socket]\n"
        "ListenStream=\n"
        f"ListenStream={COCKPIT_HTTPS_PORT}\n",
        encoding="utf-8",
    )

    has_semanage = subprocess.run(
        ["sh", "-c", "command -v semanage >/dev/null 2>&1"],
        check=False,
        text=True,
        capture_output=True,
    ).returncode == 0

    if has_semanage:
        semanage_registered = subprocess.run(
            ["sh", "-c", f"semanage port -l | grep -qE '^websm_port_t[[:space:]]+tcp.*(^|,|\\s){COCKPIT_HTTPS_PORT}([,-]|\\s|$)'"],
            check=False,
            text=True,
            capture_output=True,
        ).returncode == 0
        if not semanage_registered:
            add_result = subprocess.run(
                ["semanage", "port", "-a", "-t", "websm_port_t", "-p", "tcp", COCKPIT_HTTPS_PORT],
                check=False,
                text=True,
                capture_output=True,
            )
            if add_result.returncode != 0:
                subprocess.run(
                    ["semanage", "port", "-m", "-t", "websm_port_t", "-p", "tcp", COCKPIT_HTTPS_PORT],
                    check=False,
                    text=True,
                    capture_output=True,
                )

    run_command(["systemctl", "daemon-reload"])
    run_command(["systemctl", "enable", "cockpit.socket"])
    run_command(["systemctl", "restart", "cockpit.socket"])
    subprocess.run(["systemctl", "enable", "cockpit.service"], check=False, text=True, capture_output=True)
    subprocess.run(["systemctl", "restart", "cockpit.service"], check=False, text=True, capture_output=True)


def hide_ablestack_menu_on_ccvm() -> None:
    validate_file(MANIFEST_JSON_PATH, "manifest.json")

    with MANIFEST_JSON_PATH.open("r", encoding="utf-8") as manifest_file:
        manifest_data = json.load(manifest_file)

    if "menu" not in manifest_data:
        return

    if not MANIFEST_BACKUP_PATH.exists():
        MANIFEST_BACKUP_PATH.write_text(
            json.dumps(manifest_data, ensure_ascii=False, indent=4) + os.linesep,
            encoding="utf-8",
        )

    manifest_data.pop("menu", None)
    MANIFEST_JSON_PATH.write_text(
        json.dumps(manifest_data, ensure_ascii=False, indent=4) + os.linesep,
        encoding="utf-8",
    )


def build_hide_menu_remote_command() -> str:
    manifest_path = shlex.quote(str(MANIFEST_JSON_PATH))
    backup_path = shlex.quote(str(MANIFEST_BACKUP_PATH))

    python_code = (
        "import json, pathlib; "
        f"manifest = pathlib.Path({str(MANIFEST_JSON_PATH)!r}); "
        f"backup = pathlib.Path({str(MANIFEST_BACKUP_PATH)!r}); "
        "data = json.loads(manifest.read_text(encoding='utf-8')); "
        "data.pop('menu', None); "
        "backup.exists() or backup.write_text(json.dumps(json.loads(manifest.read_text(encoding='utf-8')), ensure_ascii=False, indent=4) + '\\n', encoding='utf-8'); "
        "manifest.write_text(json.dumps(data, ensure_ascii=False, indent=4) + '\\n', encoding='utf-8')"
    )

    return (
        f"if [ -f {manifest_path} ]; then "
        f"cp -an {manifest_path} {backup_path} >/dev/null 2>&1 || true; "
        f"python3 -c {shlex.quote(python_code)}; "
        "fi"
    )


def build_apply_cockpit_port_remote_command() -> str:
    override_dir = shlex.quote(str(COCKPIT_OVERRIDE_DIR))
    override_file = shlex.quote(str(COCKPIT_OVERRIDE_FILE))

    return (
        f"mkdir -p {override_dir} && "
        f"cat > {override_file} <<'EOF'\n"
        "[Socket]\n"
        "ListenStream=\n"
        f"ListenStream={COCKPIT_HTTPS_PORT}\n"
        "EOF\n"
        "if command -v semanage >/dev/null 2>&1; then "
        f"semanage port -l | grep -qE '^websm_port_t[[:space:]]+tcp.*(^|,|\\s){COCKPIT_HTTPS_PORT}([,-]|\\s|$)' "
        f"|| semanage port -a -t websm_port_t -p tcp {COCKPIT_HTTPS_PORT} "
        f"|| semanage port -m -t websm_port_t -p tcp {COCKPIT_HTTPS_PORT}; "
        "fi; "
        "systemctl daemon-reload && "
        "systemctl enable cockpit.socket && "
        "systemctl restart cockpit.socket; "
        "systemctl enable cockpit.service >/dev/null 2>&1 || true; "
        "systemctl restart cockpit.service >/dev/null 2>&1 || true"
    )


def is_local_target(target_info: Dict[str, str], local_hostnames: Set[str], local_ips: Set[str]) -> bool:
    target_hostname = (target_info.get("hostname") or "").strip().lower()
    target_ip = (target_info.get("ip") or "").strip()

    target_hostnames = normalize_hostname(target_hostname)

    return bool(target_hostnames.intersection(local_hostnames)) or target_ip in local_ips


def deploy_to_remote_host(target_info: Dict[str, str]) -> None:
    host_ip = target_info["ip"]
    cert_path = target_info["cert_path"]
    key_path = target_info["key_path"]

    run_remote_command_with_fallback(
        host_ip,
        f"{build_apply_cockpit_port_remote_command()} && mkdir -p {REMOTE_CERT_DIR} {TRUST_ANCHOR_DIR}",
    )

    scp_with_fallback(cert_path, f"{REMOTE_CERT_DIR}/{REMOTE_CERT_FILE}", host_ip)
    scp_with_fallback(key_path, f"{REMOTE_CERT_DIR}/{REMOTE_KEY_FILE}", host_ip)
    scp_with_fallback(str(ROOT_CA_CRT), f"{TRUST_ANCHOR_DIR}/{TRUST_ANCHOR_FILE}", host_ip)

    remote_command = (
        f"chmod 644 {REMOTE_CERT_DIR}/{REMOTE_CERT_FILE} && "
        f"chmod 600 {REMOTE_CERT_DIR}/{REMOTE_KEY_FILE} && "
        f"update-ca-trust && "
        f"systemctl restart cockpit.socket && "
        f"systemctl restart cockpit.service >/dev/null 2>&1 || true"
    )
    if target_info["role"] == "ccvm":
        remote_command = f"{remote_command} && {build_hide_menu_remote_command()}"

    run_remote_command_with_fallback(host_ip, remote_command)


def deploy_to_target(target_info: Dict[str, str], local_hostnames: Set[str], local_ips: Set[str]) -> None:
    if is_local_target(target_info, local_hostnames, local_ips):
        apply_cockpit_port_local()
        install_cockpit_certificate_local(target_info["cert_path"], target_info["key_path"])
        if target_info["role"] == "ccvm":
            hide_ablestack_menu_on_ccvm()
        return

    deploy_to_remote_host(target_info)


def main():
    args = parse_args()

    require_root()
    validate_file(ROOT_CA_KEY, "rootCA.key")
    validate_file(ROOT_CA_CRT, "rootCA.crt")
    validate_file(CLUSTER_JSON_PATH, "cluster.json")
    validate_file(ETC_HOSTS_PATH, "/etc/hosts")

    targets = collect_cockpit_targets(args)
    generated_files = generate_cockpit_certificates(targets)
    local_identity = get_local_identity()
    local_hostnames = local_identity["hostnames"]
    local_ips = local_identity["ips"]

    deployed_hosts = []
    failed_hosts = []
    for cube_info in generated_files:
        try:
            deploy_to_target(cube_info, local_hostnames, local_ips)
            deployed_hosts.append({
                "role": cube_info["role"],
                "hostname": cube_info["hostname"],
                "ip": cube_info["ip"],
                "port": 19100,
            })
        except Exception as error:
            failed_hosts.append({
                "role": cube_info["role"],
                "hostname": cube_info["hostname"],
                "ip": cube_info["ip"],
                "error": str(error),
            })

    result_code = 200 if not failed_hosts else 207
    result_message = "Cockpit HTTPS deployment completed" if not failed_hosts else "Cockpit HTTPS deployment completed with skipped hosts"

    print(create_return(result_code, {
        "message": result_message,
        "hosts": deployed_hosts,
        "failed_hosts": failed_hosts,
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(create_return(500, str(error)))
        sys.exit(1)
