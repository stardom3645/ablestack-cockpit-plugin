#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CCVM 백업/복구/상태/목록 관리 스크립트

- backup: virsh backup-begin을 실행하고 동적 backup xml을 생성
- status: virsh domjobinfo 결과를 JSON으로 반환
- list: /mnt/glue-gfs/backup/ccvm 내 백업 파일 목록 반환
- restore: 선택한 백업 파일로 디스크 복구
- overview: 정기 백업/삭제 관리 설정 및 백업 파일 목록 반환
- sync: ccvm 실행 호스트에 정기 백업/삭제 크론을 재적용하고, 비소유 노드는 제거
"""

import argparse
import base64
import datetime
import json
import os
import shlex
import re
import socket
import subprocess
import time
import shutil
from pathlib import Path

try:
    from ablestack import *  # type: ignore # 제공되는 환경에서 pluginpath, createReturn 사용
except Exception:
    pluginpath = str(Path(__file__).resolve().parents[2])

    def createReturn(code, val, retname=None):
        obj = {"code": code, "val": val}
        if retname is not None:
            obj["retname"] = retname
        return json.dumps(obj, ensure_ascii=False)


BACKUP_DIR = "/mnt/glue-gfs/backup/ccvm"
DOMAIN_NAME = "ccvm"
DISK_NAME = "vda"
TARGET_PREFIX = "ccvm.qcow2"
BACKUP_XML_PATH = os.path.join(pluginpath, "tools", "xml-template", "ccvm-backup.xml")
BACKUP_SCRIPT_NAME = "ccvm-backup-run.sh"
DELETE_SCRIPT_NAME = "ccvm-backup-clean.sh"
CONFIG_FILE_NAME = "ccvm-backup-config.json"
SYNC_SERVICE_NAME = "ccvm-backup-sync"
SYNC_RESOURCE_NAME = "ccvm_backup_sync"
SYNC_SERVICE_PATH = f"/etc/systemd/system/{SYNC_SERVICE_NAME}.service"
CLUSTER_JSON_PATH = os.path.join(pluginpath, "tools", "properties", "cluster.json")
BACKUP_CRON_MARKER = "CCVM_BACKUP_SCHEDULE"
DELETE_CRON_MARKER = "CCVM_BACKUP_DELETE"
PCS_RESOURCE = "cloudcenter_res"
CCVM_IMAGE_PATH = "/mnt/glue-gfs/ccvm.qcow2"
RESTORE_TIMEOUT_SEC = 600
RESTORE_POLL_SEC = 5


def parse_args():
    parser = argparse.ArgumentParser(
        description="CCVM backup 관리 스크립트",
        epilog="copyrightⓒ 2026 All rights reserved by ABLECLOUD™",
    )
    parser.add_argument(
        "action",
        choices=[
            "backup",
            "status",
            "list",
            "restore",
            "overview",
            "sync",
            "schedule",
            "unschedule",
            "schedule-delete",
            "unschedule-delete",
        ],
        help="action",
    )
    parser.add_argument("--repeat", type=str, help="repeat option")
    parser.add_argument("--time", type=str, help="HH:MM")
    parser.add_argument("--day", type=int, help="day of month")
    parser.add_argument("--month", type=int, help="month")
    parser.add_argument("--retain-months", type=int, help="retention months for delete")
    parser.add_argument("--target-dir", type=str, help="backup target directory")
    parser.add_argument("--target-file", type=str, help="backup file to restore")
    parser.add_argument("--mode", type=str, choices=["start", "stop"], help="sync mode")
    return parser.parse_args()


def build_backup_xml(target_file):
    return "\n".join(
        [
            "<domainbackup>",
            "  <disks>",
            f"    <disk name=\"{DISK_NAME}\" type=\"file\">",
            f"      <target file=\"{target_file}\"/>",
            "    </disk>",
            "  </disks>",
            "</domainbackup>",
            "",
        ]
    )


def get_ccvm_host():
    if not is_pcs_available():
        return socket.gethostname()

    try:
        output = subprocess.check_output(
            "pcs status",
            shell=True,
            text=True,
        )
    except Exception:
        output = ""

    if not output:
        return ""

    for line in output.splitlines():
        if PCS_RESOURCE not in line:
            continue
        match = re.search(r"\\bStarted\\b[:\\s]+(\\S+)", line)
        if match:
            host = match.group(1).strip()
            if host.lower() not in ("none", "null", "unknown"):
                return host
        parts = [part.strip() for part in line.split()]
        for idx, part in enumerate(parts):
            if part.startswith("Started"):
                if idx + 1 >= len(parts):
                    continue
                host = parts[idx + 1].strip()
                if host.lower() not in ("none", "null", "unknown"):
                    return host
        if "Started" in parts:
            idx = parts.index("Started")
            if idx + 1 < len(parts):
                host = parts[idx + 1].strip()
                if host.lower() not in ("none", "null", "unknown"):
                    return host

    return ""


def _normalize_hostname(name):
    return str(name or "").strip().lower()


def _hostname_variants(name):
    normalized = _normalize_hostname(name)
    if not normalized:
        return set()
    short = normalized.split(".", 1)[0]
    return {normalized, short}


def _local_hostname_variants():
    variants = set()
    for value in (socket.gethostname(), socket.getfqdn()):
        variants.update(_hostname_variants(value))
    for cmd in ("hostname", "hostname -s", "hostname -f"):
        try:
            output = subprocess.check_output(cmd, shell=True, text=True).strip()
        except Exception:
            output = ""
        variants.update(_hostname_variants(output))
    variants.update({"localhost", "localhost.localdomain"})
    return variants


def _local_ip_addresses():
    ips = set()
    for cmd in ("hostname -I", "ip -o -4 addr show", "ip -o -6 addr show"):
        try:
            output = subprocess.check_output(cmd, shell=True, text=True).strip()
        except Exception:
            output = ""
        if not output:
            continue
        if cmd.startswith("hostname"):
            for item in output.split():
                ips.add(item.strip())
            continue
        for line in output.splitlines():
            parts = line.split()
            for part in parts:
                if "/" in part:
                    ip = part.split("/", 1)[0]
                    if ip:
                        ips.add(ip.strip())
    return ips


def is_local_host(host):
    if not host:
        return True
    host_variants = _hostname_variants(host)
    if not host_variants:
        return True
    local_variants = _local_hostname_variants()
    if any(item in local_variants for item in host_variants):
        return True
    host_normalized = _normalize_hostname(host)
    if host_normalized and (re.match(r"^\\d{1,3}(?:\\.\\d{1,3}){3}$", host_normalized) or ":" in host_normalized):
        local_ips = _local_ip_addresses()
        return host_normalized in local_ips
    return False


def run_ssh_command(host, cmd):
    if not host or is_local_host(host):
        return subprocess.run(
            cmd if isinstance(cmd, list) else ["/bin/sh", "-c", cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

    if isinstance(cmd, list):
        remote_cmd = " ".join(shlex.quote(item) for item in cmd)
    else:
        remote_cmd = cmd

    return subprocess.run(
        ["ssh", f"root@{host}", remote_cmd],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def run_local_command(cmd):
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def is_pcs_available():
    return shutil.which("pcs") is not None

def run_pcs(action):
    cmd = ["/usr/bin/python3", os.path.join(pluginpath, "python", "pcs", "main.py"), action, "--resource", PCS_RESOURCE]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        return None, (result.stderr or result.stdout or "").strip()
    output = (result.stdout or "").strip()
    if not output:
        return None, "pcs response is empty"
    try:
        return json.loads(output), ""
    except Exception:
        return None, "pcs response parse failed"


def wait_pcs_role(role, timeout_sec=RESTORE_TIMEOUT_SEC, interval_sec=RESTORE_POLL_SEC):
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        status_json, err = run_pcs("status")
        if status_json and status_json.get("val", {}).get("role") == role:
            return True
        time.sleep(interval_sec)
    return False


def write_remote_file(host, path, contents):
    encoded = base64.b64encode(contents.encode("utf-8")).decode("ascii")
    remote_dir = os.path.dirname(path)
    command = (
        f"mkdir -p {shlex.quote(remote_dir)} && "
        f"echo {shlex.quote(encoded)} | base64 -d > {shlex.quote(path)}"
    )
    return run_ssh_command(host, command)


def parse_time(time_str):
    if not time_str:
        return 0, 0
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError("time must be HH:MM")
    hour = int(parts[0])
    minute = int(parts[1])
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError("time out of range")
    return hour, minute


def build_cron_expr(repeat, time_str, day=None, month=None):
    hour, minute = parse_time(time_str)
    if repeat == "hourly":
        return f"{minute} * * * *"
    if repeat == "daily":
        return f"{minute} {hour} * * *"
    if repeat == "monthly":
        if not day:
            raise ValueError("day is required for monthly schedule")
        return f"{minute} {hour} {day} * *"
    if repeat == "yearly":
        if not day or not month:
            raise ValueError("day and month are required for yearly schedule")
        return f"{minute} {hour} {day} {month} *"
    raise ValueError("invalid repeat option")


def get_crontab_lines(host):
    result = run_ssh_command(host, "crontab -l 2>/dev/null")
    if result.returncode != 0:
        return []
    lines = []
    for line in result.stdout.splitlines():
        if line.strip() == "":
            continue
        lines.append(line)
    return lines


def set_crontab_lines(host, lines):
    content = "\n".join(lines).strip() + "\n"
    encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
    command = f"echo {shlex.quote(encoded)} | base64 -d | crontab -"
    return run_ssh_command(host, command)


def update_crontab(host, marker, new_line=None):
    lines = [line for line in get_crontab_lines(host) if marker not in line]
    if new_line:
        lines.append(f"{new_line} # {marker}")
    return set_crontab_lines(host, lines)


def remove_crontabs_on_other_nodes(owner_host):
    nodes = get_cluster_nodes()
    for node in nodes:
        if not node:
            continue
        if owner_host and _hostname_variants(node) & _hostname_variants(owner_host):
            continue
        if is_local_host(node) and (not owner_host or is_local_host(owner_host)):
            continue
        update_crontab(node, BACKUP_CRON_MARKER, None)
        update_crontab(node, DELETE_CRON_MARKER, None)


def find_cron_marker_line(lines, marker):
    for line in lines:
        if marker in line:
            return line
    return ""


def parse_int(value):
    try:
        return int(value)
    except Exception:
        return None


def parse_cron_line(line):
    if not line:
        return None
    base = line.split("#")[0].strip()
    if not base:
        return None
    parts = base.split()
    if len(parts) < 6:
        return None
    minute, hour, day, month, dow = parts[:5]
    command = " ".join(parts[5:])
    return {
        "minute": minute,
        "hour": hour,
        "day": day,
        "month": month,
        "dow": dow,
        "command": command,
        "raw": base,
    }


def describe_schedule(parsed):
    minute_raw = parsed.get("minute")
    hour_raw = parsed.get("hour")
    day_raw = parsed.get("day")
    month_raw = parsed.get("month")
    dow_raw = parsed.get("dow")

    minute = parse_int(minute_raw) if minute_raw not in ("*", "?") else None
    hour = parse_int(hour_raw) if hour_raw not in ("*", "?") else None
    day = parse_int(day_raw) if day_raw not in ("*", "?") else None
    month = parse_int(month_raw) if month_raw not in ("*", "?") else None

    repeat = "custom"
    if hour is None and day is None and month is None and dow_raw in ("*", "?"):
        repeat = "hourly"
    elif hour is not None and day is None and month is None and dow_raw in ("*", "?"):
        repeat = "daily"
    elif hour is not None and day is not None and month is None and dow_raw in ("*", "?"):
        repeat = "monthly"
    elif hour is not None and day is not None and month is not None and dow_raw in ("*", "?"):
        repeat = "yearly"

    repeat_label_map = {
        "hourly": "시간",
        "daily": "매일",
        "monthly": "매월",
        "yearly": "월별",
        "custom": "사용자 지정",
    }
    repeat_label = repeat_label_map.get(repeat, "사용자 지정")

    if repeat == "hourly":
        if minute is None:
            time_label = "매시"
        else:
            time_label = f"매시 {minute}분"
        time_value = ""
    elif hour is not None and minute is not None:
        time_value = f"{hour:02d}:{minute:02d}"
        time_label = time_value
    else:
        time_value = ""
        time_label = "-"

    day_label = f"{day}일" if day is not None else "-"
    month_label = f"{month}월" if month is not None else "-"

    return {
        "repeat": repeat,
        "repeat_label": repeat_label,
        "time": time_value,
        "time_label": time_label,
        "day": day,
        "day_label": day_label,
        "month": month,
        "month_label": month_label,
        "cron": parsed.get("raw", ""),
    }


def read_retention_months(host, target_dir):
    script_path = get_delete_script_path(target_dir)
    result = run_ssh_command(host, ["cat", script_path])
    if result.returncode != 0:
        return None
    match = re.search(r"RETENTION_MONTHS\s*=\s*(\d+)", result.stdout or "")
    if not match:
        return None
    return parse_int(match.group(1))


def ensure_backup_script(host, target_dir):
    script_path = get_backup_script_path(target_dir)
    script = """#!/bin/bash
set -e
BACKUP_DIR=\"{backup_dir}\"
XML_PATH=\"{xml_path}\"
TS=$(date +%Y%m%d_%H%M%S)
TARGET=\"$BACKUP_DIR/{prefix}-$TS\"
mkdir -p \"$BACKUP_DIR\"
cat > \"$XML_PATH\" <<EOF
<domainbackup>
  <disks>
    <disk name=\"{disk_name}\" type=\"file\">
      <target file=\"$TARGET\"/>
    </disk>
  </disks>
</domainbackup>
EOF
virsh backup-begin {domain_name} --backupxml \"$XML_PATH\"
""".format(
        backup_dir=target_dir,
        xml_path=BACKUP_XML_PATH,
        prefix=TARGET_PREFIX,
        disk_name=DISK_NAME,
        domain_name=DOMAIN_NAME,
    )
    write_remote_file(host, script_path, script)
    run_ssh_command(host, ["chmod", "+x", script_path])


def ensure_delete_script(host, retention_months, target_dir):
    script_path = get_delete_script_path(target_dir)
    retention_months = max(1, int(retention_months))
    script = """#!/bin/bash
set -e
BACKUP_DIR=\"{backup_dir}\"
RETENTION_MONTHS={retention_months}
RETENTION_DAYS=$((RETENTION_MONTHS*30))
mkdir -p \"$BACKUP_DIR\"
find \"$BACKUP_DIR\" -type f -name '{prefix}-*' -mtime +$RETENTION_DAYS -delete
""".format(
        backup_dir=target_dir,
        retention_months=retention_months,
        prefix=TARGET_PREFIX,
    )
    write_remote_file(host, script_path, script)
    run_ssh_command(host, ["chmod", "+x", script_path])


def format_size(size_bytes):
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    size = float(size_bytes)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(size)} {unit}"
            return f"{size:.1f} {unit}"
        size /= 1024.0


def parse_backup_time_from_name(name):
    if not name:
        return None
    match = re.search(r"(\\d{8})_(\\d{6})", name)
    if not match:
        return None
    try:
        return datetime.datetime.strptime(f"{match.group(1)}_{match.group(2)}", "%Y%m%d_%H%M%S")
    except Exception:
        return None


def load_cluster_json():
    try:
        with open(CLUSTER_JSON_PATH, "r", encoding="utf-8") as fp:
            return json.load(fp)
    except Exception:
        return {}


def get_backup_path_from_cluster():
    data = load_cluster_json()
    if isinstance(data, dict):
        if isinstance(data.get("backup_path"), str):
            return data.get("backup_path")
        cluster_cfg = data.get("clusterConfig")
        if isinstance(cluster_cfg, dict) and isinstance(cluster_cfg.get("backup_path"), str):
            return cluster_cfg.get("backup_path")
    return None


def resolve_target_dir(target_dir):
    if not target_dir:
        target_dir = get_backup_path_from_cluster()
        if not target_dir:
            if not is_pcs_available():
                target_dir = "/mnt/glue/backup/ccvm"
            elif os.path.isdir("/mnt/glue-gfs"):
                target_dir = "/mnt/glue-gfs/backup/ccvm"
            elif os.path.isdir("/mnt/glue"):
                target_dir = "/mnt/glue/backup/ccvm"
            else:
                target_dir = BACKUP_DIR
    target_dir = str(target_dir).strip()
    if not target_dir:
        return BACKUP_DIR
    if not target_dir.startswith("/"):
        raise ValueError("backup target dir must be an absolute path")
    return os.path.normpath(target_dir)


def get_cluster_nodes():
    if not is_pcs_available():
        return [socket.gethostname()]

    nodes = set()
    online_nodes = set()
    data = load_cluster_json()
    cluster_cfg = data.get("clusterConfig") if isinstance(data, dict) else None
    if isinstance(cluster_cfg, dict):
        hosts = cluster_cfg.get("hosts")
        if isinstance(hosts, list):
            for host in hosts:
                if not isinstance(host, dict):
                    continue
                name = host.get("hostname") or host.get("ablecube")
                if name:
                    nodes.add(str(name))
        pcs_cluster = cluster_cfg.get("pcsCluster")
        if isinstance(pcs_cluster, dict):
            for key in ("hostname1", "hostname2", "hostname3"):
                name = pcs_cluster.get(key)
                if name:
                    nodes.add(str(name))

    try:
        output = subprocess.check_output("pcs status", shell=True, text=True)
    except Exception:
        output = ""

    if output:
        for line in output.splitlines():
            if "Online:" in line:
                match = re.search(r"Online:\s*\[([^\]]+)\]", line)
                if match:
                    for item in match.group(1).split():
                        online_nodes.add(item.strip())
                else:
                    parts = line.split("Online:", 1)
                    if len(parts) == 2:
                        for item in parts[1].strip().replace("[", "").replace("]", "").split():
                            online_nodes.add(item.strip())

    if online_nodes:
        return [n for n in online_nodes if n]
    return [n for n in nodes if n]


def get_script_dir(target_dir):
    return os.path.join(target_dir, "script")


def get_backup_script_path(target_dir):
    return os.path.join(get_script_dir(target_dir), BACKUP_SCRIPT_NAME)


def get_delete_script_path(target_dir):
    return os.path.join(get_script_dir(target_dir), DELETE_SCRIPT_NAME)


def get_config_path(target_dir):
    return os.path.join(get_script_dir(target_dir), CONFIG_FILE_NAME)


def build_sync_service_content(target_dir):
    exec_cmd = f"/usr/bin/python3 -B {os.path.join(pluginpath, 'python', 'backup', 'ccvm_backup.py')} sync --target-dir {shlex.quote(target_dir)}"
    return "\n".join(
        [
            "[Unit]",
            "Description=CCVM backup schedule sync",
            "After=network-online.target",
            "",
            "[Service]",
            "Type=oneshot",
            "RemainAfterExit=yes",
            f"ExecStart={exec_cmd} --mode start",
            f"ExecStop=-{exec_cmd} --mode stop",
            "",
            "[Install]",
            "WantedBy=multi-user.target",
            "",
        ]
    )


def ensure_sync_service(host, target_dir):
    content = build_sync_service_content(target_dir)
    write_result = write_remote_file(host, SYNC_SERVICE_PATH, content)
    if write_result.returncode != 0:
        err = (write_result.stderr or write_result.stdout or "").strip()
        return False, err or "sync service write failed"
    daemon_result = run_ssh_command(host, ["systemctl", "daemon-reload"])
    if daemon_result.returncode != 0:
        err = (daemon_result.stderr or daemon_result.stdout or "").strip()
        return False, err or "systemctl daemon-reload failed"
    return True, ""


def ensure_sync_service_on_nodes(target_dir):
    nodes = get_cluster_nodes()
    targets = nodes if nodes else [""]
    errors = []
    success = 0
    for node in targets:
        ok, err = ensure_sync_service(node, target_dir)
        if ok:
            success += 1
        elif err:
            errors.append(err)
    if success == 0 and errors:
        return False, "; ".join(errors)
    return True, ""


def pcs_resource_exists(resource_name):
    result = run_local_command(["pcs", "resource", "show", resource_name])
    return result.returncode == 0


def ensure_pcs_sync_resource():
    if not is_pcs_available():
        return True, ""
    if not pcs_resource_exists(SYNC_RESOURCE_NAME):
        create_cmd = [
            "pcs",
            "resource",
            "create",
            SYNC_RESOURCE_NAME,
            f"systemd:{SYNC_SERVICE_NAME}",
            "op",
            "start",
            "timeout=60s",
            "op",
            "stop",
            "timeout=60s",
            "op",
            "monitor",
            "interval=30s",
        ]
        result = run_local_command(create_cmd)
        if result.returncode != 0:
            err = (result.stderr or result.stdout or "").strip()
            err_lower = err.lower()
            if "already exists" not in err_lower and "exists" not in err_lower and "defined" not in err_lower:
                return False, err or "pcs resource create failed"

    constraint_cmds = [
        [
            "pcs",
            "constraint",
            "colocation",
            "add",
            SYNC_RESOURCE_NAME,
            "with",
            PCS_RESOURCE,
            "INFINITY",
        ],
        [
            "pcs",
            "constraint",
            "order",
            "start",
            PCS_RESOURCE,
            "then",
            SYNC_RESOURCE_NAME,
        ],
    ]
    for cmd in constraint_cmds:
        c_result = run_local_command(cmd)
        if c_result.returncode != 0:
            msg = (c_result.stderr or c_result.stdout or "").strip()
            msg_lower = msg.lower()
            if "already exists" in msg_lower or "exists" in msg_lower or "duplicate" in msg_lower:
                continue
            return False, msg or "pcs constraint create failed"
    return True, ""


def ensure_sync_resource(target_dir):
    if not is_pcs_available():
        return True, ""
    ok, err = ensure_sync_service_on_nodes(target_dir)
    if not ok:
        return False, err
    ok, err = ensure_pcs_sync_resource()
    if not ok:
        return False, err
    return True, ""


def load_backup_config(target_dir):
    path = get_config_path(target_dir)
    try:
        with open(path, "r", encoding="utf-8") as fp:
            data = json.load(fp)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def locate_backup_config(target_dir):
    candidates = []
    if target_dir:
        candidates.append(target_dir)
    cluster_path = get_backup_path_from_cluster()
    if cluster_path:
        candidates.append(cluster_path)
    candidates.extend([
        "/mnt/glue-gfs/backup/ccvm",
        "/mnt/glue/backup/ccvm",
        BACKUP_DIR,
    ])
    seen = set()
    for candidate in candidates:
        if not candidate:
            continue
        normalized = os.path.normpath(str(candidate))
        if normalized in seen:
            continue
        seen.add(normalized)
        config_path = get_config_path(normalized)
        if os.path.exists(config_path):
            return normalized, load_backup_config(normalized)
    return target_dir, load_backup_config(target_dir)


def save_backup_config(target_dir, data, host=None):
    if not isinstance(data, dict):
        return False
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    path = get_config_path(target_dir)
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as fp:
            fp.write(payload)
        os.replace(tmp_path, path)
        return True
    except Exception:
        if host and not is_local_host(host):
            result = write_remote_file(host, path, payload)
            return result.returncode == 0
    return False


def update_backup_config(target_dir, section, payload, host=None):
    config = load_backup_config(target_dir)
    if not isinstance(config, dict):
        config = {}
    config["target_dir"] = target_dir
    config["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    config[section] = payload
    return save_backup_config(target_dir, config, host=host)


def backup_ccvm(target_dir=None):
    try:
        target_dir = resolve_target_dir(target_dir)
        host = get_ccvm_host()
        if not host:
            return createReturn(code=500, val="ccvm 실행 호스트를 찾지 못했습니다.")

        if is_local_host(host):
            os.makedirs(target_dir, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{TARGET_PREFIX}-{timestamp}"
        target_file = os.path.join(target_dir, filename)

        xml_contents = build_backup_xml(target_file)
        write_result = write_remote_file(host, BACKUP_XML_PATH, xml_contents)
        if write_result.returncode != 0:
            err = (write_result.stderr or write_result.stdout).strip()
            return createReturn(code=500, val=err or "backup xml write failed")

        run_ssh_command(host, ["mkdir", "-p", target_dir])
        result = run_ssh_command(
            host,
            ["virsh", "backup-begin", DOMAIN_NAME, "--backupxml", BACKUP_XML_PATH],
        )

        if result.returncode != 0:
            err = (result.stderr or result.stdout).strip()
            return createReturn(code=500, val=err or "virsh backup-begin failed")

        return createReturn(
            code=200,
            val={
                "target_file": target_file,
                "xml_path": BACKUP_XML_PATH,
            },
        )
    except Exception as e:
        return createReturn(code=500, val=str(e))


def status_ccvm():
    try:
        host = get_ccvm_host()
        if not host:
            return createReturn(code=200, val={"active": False, "message": "ccvm 실행 호스트 없음", "fields": {}, "raw": ""})

        result = run_ssh_command(host, ["virsh", "domjobinfo", DOMAIN_NAME])

        output = (result.stdout or result.stderr or "").strip()
        output_lower = output.lower()
        if result.returncode != 0 or "no current" in output_lower or "no job" in output_lower:
            return createReturn(
                code=200,
                val={
                    "active": False,
                    "message": output or "no active job",
                    "fields": {},
                    "raw": output,
                },
            )

        fields = {}
        for line in output.splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                fields[key.strip()] = value.strip()

        job_type = fields.get("Job type", "").lower()
        active = job_type not in ("", "none", "unknown")

        return createReturn(
            code=200,
            val={
                "active": active,
                "message": "",
                "fields": fields,
                "raw": output,
            },
        )
    except Exception as e:
        return createReturn(code=500, val=str(e))


def list_backups(target_dir=None):
    try:
        target_dir = resolve_target_dir(target_dir)
        host = get_ccvm_host()
        if host:
            find_cmd = (
                f"find {shlex.quote(target_dir)} -maxdepth 1 -type f "
                f"-name '{TARGET_PREFIX}-*' -printf '%p|%s|%T@\\n' 2>/dev/null"
            )
            result = run_ssh_command(host, find_cmd)
            if result.returncode != 0:
                if not is_local_host(host):
                    err = (result.stderr or result.stdout or "").strip()
                    return createReturn(code=500, val=err or "backup list failed")
            else:
                entries = []
                for line in (result.stdout or "").splitlines():
                    parts = line.strip().split("|")
                    if len(parts) != 3:
                        continue
                    path, size_str, mtime_str = parts
                    try:
                        size_bytes = int(size_str)
                        mtime_epoch = int(float(mtime_str))
                    except ValueError:
                        continue
                    name = os.path.basename(path)
                    parsed_time = parse_backup_time_from_name(name)
                    completed_dt = datetime.datetime.fromtimestamp(mtime_epoch)
                    created_dt = parsed_time or completed_dt
                    entries.append(
                        {
                            "name": name,
                            "path": path,
                            "size_bytes": size_bytes,
                            "size_human": format_size(size_bytes),
                            "mtime_epoch": int(created_dt.timestamp()),
                            "mtime": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                            "mtime_display": created_dt.strftime("%m-%d %H:%M"),
                            "created_epoch": int(created_dt.timestamp()),
                            "created_time": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                            "created_display": created_dt.strftime("%m-%d %H:%M"),
                            "completed_epoch": int(completed_dt.timestamp()),
                            "completed_time": completed_dt.strftime("%Y-%m-%d %H:%M:%S"),
                            "completed_display": completed_dt.strftime("%m-%d %H:%M"),
                        }
                    )

                entries.sort(key=lambda x: x["mtime_epoch"], reverse=True)
                return createReturn(code=200, val=entries)

        if not os.path.exists(target_dir):
            return createReturn(code=200, val=[])

        entries = []
        for entry in os.scandir(target_dir):
            if not entry.is_file():
                continue
            if not entry.name.startswith(f"{TARGET_PREFIX}-"):
                continue
            stat = entry.stat()
            name = entry.name
            completed_dt = datetime.datetime.fromtimestamp(stat.st_mtime)
            parsed_time = parse_backup_time_from_name(name)
            created_dt = parsed_time or completed_dt
            entries.append(
                {
                    "name": name,
                    "path": entry.path,
                    "size_bytes": stat.st_size,
                    "size_human": format_size(stat.st_size),
                    "mtime_epoch": int(created_dt.timestamp()),
                    "mtime": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "mtime_display": created_dt.strftime("%m-%d %H:%M"),
                    "created_epoch": int(created_dt.timestamp()),
                    "created_time": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "created_display": created_dt.strftime("%m-%d %H:%M"),
                    "completed_epoch": int(completed_dt.timestamp()),
                    "completed_time": completed_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "completed_display": completed_dt.strftime("%m-%d %H:%M"),
                }
            )

        entries.sort(key=lambda x: x["mtime_epoch"], reverse=True)
        return createReturn(code=200, val=entries)
    except Exception as e:
        return createReturn(code=500, val=str(e))


def restore_ccvm(target_file):
    try:
        if not target_file:
            return createReturn(code=500, val="복구 대상 파일을 지정해야 합니다.")

        target_file = target_file.strip()
        if not target_file.startswith("/"):
            return createReturn(code=500, val="복구 대상 파일은 절대 경로여야 합니다.")
        if not os.path.isfile(target_file):
            return createReturn(code=500, val="복구 대상 파일이 존재하지 않습니다.")

        pcs_json, err = run_pcs("disable")
        if not pcs_json or pcs_json.get("code") != 200:
            return createReturn(code=500, val=err or "cloudcenter_res disable failed.")

        if not wait_pcs_role("Stopped"):
            return createReturn(code=500, val="cloudcenter_res stop timeout. Please check.")

        shutil.copy2(target_file, CCVM_IMAGE_PATH)

        pcs_json, err = run_pcs("enable")
        if not pcs_json or pcs_json.get("code") != 200:
            return createReturn(code=500, val=err or "cloudcenter_res enable failed.")

        return createReturn(code=200, val={"disk_path": CCVM_IMAGE_PATH, "source": target_file})
    except Exception as e:
        return createReturn(code=500, val=str(e))


def schedule_backup(repeat, time_str, day=None, month=None, target_dir=None):
    try:
        target_dir = resolve_target_dir(target_dir)
        host = get_ccvm_host()
        if not host:
            return createReturn(code=500, val="ccvm 실행 호스트를 찾지 못했습니다.")

        cron_expr = build_cron_expr(repeat, time_str, day=day, month=month)
        ensure_backup_script(host, target_dir)
        script_path = get_backup_script_path(target_dir)
        cron_line = f"{cron_expr} {script_path}"
        update_crontab(host, BACKUP_CRON_MARKER, cron_line)
        update_backup_config(
            target_dir,
            "backup",
            {
                "active": True,
                "repeat": repeat,
                "time": time_str,
                "day": day,
                "month": month,
            },
            host=host,
        )
        ok, err = ensure_sync_resource(target_dir)
        if not ok:
            update_crontab(host, BACKUP_CRON_MARKER, None)
            return createReturn(code=500, val=err or "동기화 리소스 생성 실패")
        return createReturn(code=200, val="정기 백업 설정 완료")
    except Exception as e:
        return createReturn(code=500, val=str(e))


def unschedule_backup():
    try:
        host = get_ccvm_host()
        if not host:
            return createReturn(code=500, val="ccvm 실행 호스트를 찾지 못했습니다.")
        target_dir = resolve_target_dir(None)
        update_crontab(host, BACKUP_CRON_MARKER, None)
        update_backup_config(
            target_dir,
            "backup",
            {"active": False},
            host=host,
        )
        return createReturn(code=200, val="정기 백업 비활성화 완료")
    except Exception as e:
        return createReturn(code=500, val=str(e))


def schedule_delete(repeat, time_str, day=None, retention_months=None, target_dir=None):
    try:
        target_dir = resolve_target_dir(target_dir)
        host = get_ccvm_host()
        if not host:
            return createReturn(code=500, val="ccvm 실행 호스트를 찾지 못했습니다.")

        if repeat not in ("daily", "monthly"):
            return createReturn(code=500, val="delete repeat option must be daily or monthly")
        if retention_months is None or retention_months < 1:
            return createReturn(code=500, val="retention months is required")

        cron_expr = build_cron_expr(repeat, time_str, day=day)
        ensure_delete_script(host, retention_months, target_dir)
        script_path = get_delete_script_path(target_dir)
        cron_line = f"{cron_expr} {script_path}"
        update_crontab(host, DELETE_CRON_MARKER, cron_line)
        update_backup_config(
            target_dir,
            "delete",
            {
                "active": True,
                "repeat": repeat,
                "time": time_str,
                "day": day,
                "retention_months": retention_months,
            },
            host=host,
        )
        ok, err = ensure_sync_resource(target_dir)
        if not ok:
            update_crontab(host, DELETE_CRON_MARKER, None)
            return createReturn(code=500, val=err or "동기화 리소스 생성 실패")
        return createReturn(code=200, val="삭제 관리 설정 완료")
    except Exception as e:
        return createReturn(code=500, val=str(e))


def unschedule_delete():
    try:
        host = get_ccvm_host()
        if not host:
            return createReturn(code=500, val="ccvm 실행 호스트를 찾지 못했습니다.")
        target_dir = resolve_target_dir(None)
        update_crontab(host, DELETE_CRON_MARKER, None)
        update_backup_config(
            target_dir,
            "delete",
            {"active": False},
            host=host,
        )
        return createReturn(code=200, val="삭제 관리 비활성화 완료")
    except Exception as e:
        return createReturn(code=500, val=str(e))


def build_schedule_info(lines, marker, empty_message):
    line = find_cron_marker_line(lines, marker)
    if not line:
        return {"active": False, "message": empty_message}
    parsed = parse_cron_line(line)
    info = {"active": True, "message": ""}
    if not parsed:
        info["message"] = "설정 정보를 해석하지 못했습니다."
        return info
    info.update(describe_schedule(parsed))
    return info


def sync_schedules(target_dir=None, mode=None):
    try:
        target_dir = resolve_target_dir(target_dir)
    except Exception as e:
        return createReturn(code=500, val=str(e))

    if mode == "stop":
        update_crontab("", BACKUP_CRON_MARKER, None)
        update_crontab("", DELETE_CRON_MARKER, None)
        return createReturn(code=200, val={"applied": False, "message": "정기 백업/삭제 크론 제거", "host": ""})

    host = get_ccvm_host()
    if not host:
        update_crontab("", BACKUP_CRON_MARKER, None)
        update_crontab("", DELETE_CRON_MARKER, None)
        return createReturn(code=200, val={"applied": False, "message": "ccvm 실행 호스트 없음", "host": ""})

    if not is_local_host(host):
        update_crontab("", BACKUP_CRON_MARKER, None)
        update_crontab("", DELETE_CRON_MARKER, None)
        # continue to apply on owner host via SSH

    target_dir, config = locate_backup_config(target_dir)
    backup_cfg = config.get("backup") if isinstance(config, dict) else None
    delete_cfg = config.get("delete") if isinstance(config, dict) else None
    result = {"backup": "disabled", "delete": "disabled"}

    if backup_cfg and backup_cfg.get("active"):
        try:
            cron_expr = build_cron_expr(
                backup_cfg.get("repeat"),
                backup_cfg.get("time"),
                day=backup_cfg.get("day"),
                month=backup_cfg.get("month"),
            )
            ensure_backup_script(host, target_dir)
            script_path = get_backup_script_path(target_dir)
            update_crontab(host, BACKUP_CRON_MARKER, f"{cron_expr} {script_path}")
            result["backup"] = "enabled"
        except Exception as e:
            update_crontab(host, BACKUP_CRON_MARKER, None)
            result["backup"] = f"error: {e}"
    else:
        update_crontab(host, BACKUP_CRON_MARKER, None)

    if delete_cfg and delete_cfg.get("active"):
        try:
            retention = delete_cfg.get("retention_months")
            if retention is None:
                retention = read_retention_months(host, target_dir)
            cron_expr = build_cron_expr(
                delete_cfg.get("repeat"),
                delete_cfg.get("time"),
                day=delete_cfg.get("day"),
            )
            if retention is None:
                retention = 1
            ensure_delete_script(host, retention, target_dir)
            script_path = get_delete_script_path(target_dir)
            update_crontab(host, DELETE_CRON_MARKER, f"{cron_expr} {script_path}")
            result["delete"] = "enabled"
        except Exception as e:
            update_crontab(host, DELETE_CRON_MARKER, None)
            result["delete"] = f"error: {e}"
    else:
        update_crontab(host, DELETE_CRON_MARKER, None)

    remove_crontabs_on_other_nodes(host)

    return createReturn(code=200, val={"applied": True, "host": host, "result": result, "target_dir": target_dir})


def overview(target_dir=None):
    try:
        target_dir = resolve_target_dir(target_dir)
    except Exception as e:
        return createReturn(code=500, val=str(e))

    host = get_ccvm_host()
    if not host:
        schedule_info = {"active": False, "message": "ccvm 실행 호스트를 찾지 못했습니다."}
        delete_info = {"active": False, "message": "ccvm 실행 호스트를 찾지 못했습니다."}
    else:
        lines = get_crontab_lines(host)
        schedule_info = build_schedule_info(lines, BACKUP_CRON_MARKER, "설정된 정기 백업이 없습니다.")
        delete_info = build_schedule_info(lines, DELETE_CRON_MARKER, "설정된 삭제 관리가 없습니다.")
        retention_months = read_retention_months(host, target_dir)
        if retention_months is not None:
            delete_info["retention_months"] = retention_months
            delete_info["retention_label"] = f"{retention_months}개월"

    backups = []
    backups_message = ""
    list_resp = json.loads(list_backups(target_dir))
    if list_resp.get("code") == 200:
        backups = list_resp.get("val") or []
    else:
        backups_message = list_resp.get("val") or "백업 목록을 불러오지 못했습니다."

    return createReturn(
        code=200,
        val={
            "schedule": schedule_info,
            "delete": delete_info,
            "backups": backups,
            "backups_message": backups_message,
            "target_dir": target_dir,
        },
    )


if __name__ == "__main__":
    args = parse_args()
    if args.action == "backup":
        print(backup_ccvm(args.target_dir))
    elif args.action == "status":
        print(status_ccvm())
    elif args.action == "list":
        print(list_backups(args.target_dir))
    elif args.action == "restore":
        print(restore_ccvm(args.target_file))
    elif args.action == "overview":
        print(overview(args.target_dir))
    elif args.action == "sync":
        print(sync_schedules(args.target_dir, mode=args.mode))
    elif args.action == "schedule":
        print(schedule_backup(args.repeat, args.time, day=args.day, month=args.month, target_dir=args.target_dir))
    elif args.action == "unschedule":
        print(unschedule_backup())
    elif args.action == "schedule-delete":
        print(schedule_delete(args.repeat, args.time, day=args.day, retention_months=args.retain_months, target_dir=args.target_dir))
    elif args.action == "unschedule-delete":
        print(unschedule_delete())
