#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Copyright (c) 2024 ABLECLOUD Co. Ltd
설명 : CCVM secondary 용량을 추가하는 기능
최초 작성일 : 2024. 9. 3
개선 사항 : 타임아웃/상태 체크/명령 실행 일원화 및 안정성 보강
"""

import argparse
import json
import os
import subprocess
import time
from ablestack import *  # createReturn, pluginpath 등 제공 가정

SLEEP_SEC = 5
TIMEOUT_SEC = 600
JSON_PATH = os.path.join(pluginpath, "tools", "properties", "cluster.json")

ENV = os.environ.copy()
ENV["LANG"] = "en_US.utf-8"
ENV["LANGUAGE"] = "en"

def run(cmd, check=True, capture=True, text=True, shell=False):
    """subprocess.run 래퍼: 기본 리스트 인자 + shell=False"""
    return subprocess.run(cmd, check=check, capture_output=capture, text=text, shell=shell, env=ENV)

def wait_until(predicate, timeout_sec=TIMEOUT_SEC, interval_sec=SLEEP_SEC):
    """predicate()가 True가 될 때까지 대기"""
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            if predicate():
                return True
        except Exception:
            pass
        time.sleep(interval_sec)
    return False

def open_cluster_json():
    """클러스터 JSON 로드(실패 시 에러 리턴)"""
    try:
        with open(JSON_PATH, "r") as jf:
            return json.load(jf)
    except Exception as e:
        return createReturn(code=500, val=f"cluster.json read error: {e}")

def is_ccvm_ssh_ok():
    """CCVM SSH 가능 여부"""
    rc = os.system("ssh -q -o StrictHostKeyChecking=no -o ConnectTimeout=5 ccvm 'echo ok' >/dev/null 2>&1")
    return rc == 0

def virsh_state(domain_name):
    """libvirt 도메인 상태 조회"""
    cp = run(["virsh", "domstate", domain_name], check=False)
    return (cp.stdout or "").strip().lower()

def create_argument_parser():
    """인자 파서"""
    parser = argparse.ArgumentParser(description="ccvm secondary 용량을 추가하는 프로그램",
                                     epilog="copyrightⓒ 2021 All rights reserved by ABLECLOUD™",
                                     usage="%(prog)s arguments")
    parser.add_argument("--add-size", metavar="Additional capacity size", type=int, required=True,
                        help="추가할 용량(GiB), 1~500")
    parser.add_argument("-v", "--verbose", action="count", default=0, help="increase output verbosity")
    parser.add_argument("-H", "--Human", action="store_const", dest="flag_readerble", const=True, help="Human readable")
    parser.add_argument("-V", "--Version", action="version", version="%(prog)s 1.0")
    return parser

def ccvm_secondary_resize(args):
    try:
        if args.add_size < 1 or args.add_size > 500:
            return createReturn(code=500, val="Please enter additional capacity size between 1 and 500 GiB.")
        cfg = open_cluster_json()
        if isinstance(cfg, dict) and "code" in cfg and cfg.get("code") != 200:
            return cfg
        os_type = cfg["clusterConfig"]["type"]

        rbd_image = "rbd/ccvm"
        if os_type == "ablestack-hci" or os_type == "ablestack-hci-filesystem":
            info = run(["rbd", "info", rbd_image, "--format", "json"], check=True)
            ccvm_info = json.loads(info.stdout)
            original_gib = ccvm_info["size"] / (1024 ** 3)
            new_image_size = original_gib + args.add_size
            if new_image_size > 2000:
                return createReturn(code=500, val="CCVM can support capacities up to 2 TiB.")

        if os_type in ("ablestack-hci", "ablestack-vm", "ablestack-hci-filesystem"):
            if not is_ccvm_ssh_ok():
                return createReturn(code=500, val="Please check if CCVM status is running normally.")
            resp = run(["/usr/bin/python3", f"{pluginpath}/python/pcs/main.py", "disable", "--resource", "cloudcenter_res"], check=True)
            resp_json = json.loads((resp.stdout or "").strip() or "{}")
            if resp_json.get("code") != 200:
                return createReturn(code=500, val="cloudcenter_res disable failed.")
            def is_stopped():
                st = run(["/usr/bin/python3", f"{pluginpath}/python/pcs/main.py", "status", "--resource", "cloudcenter_res"], check=True)
                st_json = json.loads((st.stdout or "").strip() or "{}")
                return st_json.get("val", {}).get("role") == "Stopped"
            if not wait_until(is_stopped, timeout_sec=TIMEOUT_SEC):
                return createReturn(code=500, val="cloudcenter_res stop timeout. Please check.")
            if os_type == "ablestack-vm":
                ccvm_file = "/mnt/glue-gfs/ccvm.qcow2"
                run(["qemu-img", "resize", ccvm_file, f"+{args.add_size}G"])

        elif os_type == "ablestack-standalone":
            ccvm_file = "/mnt/glue/ccvm.qcow2"
            run(["virsh", "shutdown", "ccvm"], check=False)
            if not wait_until(lambda: virsh_state("ccvm") == "shut off", timeout_sec=TIMEOUT_SEC):
                return createReturn(code=500, val="CCVM shutdown timeout. Please check.")
            run(["qemu-img", "resize", ccvm_file, f"+{args.add_size}G"])
            run(["virsh", "start", "ccvm"])

        if os_type == "ablestack-hci" or os_type == "ablestack-hci-filesystem":
            if run(["rbd", "snap", "purge", rbd_image, "--no-progress"], check=False).returncode != 0:
                return createReturn(code=500, val="CCVM snapshot purge failed.")
            if run(["rbd", "resize", "-s", f"{int(new_image_size)}G", rbd_image], check=False).returncode != 0:
                return createReturn(code=500, val="CCVM image resize failed.")

        if os_type in ("ablestack-hci", "ablestack-vm", "ablestack-hci-filesystem"):
            resp = run(["/usr/bin/python3", f"{pluginpath}/python/pcs/main.py", "enable", "--resource", "cloudcenter_res"], check=True)
            resp_json = json.loads((resp.stdout or "").strip() or "{}")
            if resp_json.get("code") != 200:
                return createReturn(code=500, val="cloudcenter_res enable failed.")

        if not wait_until(is_ccvm_ssh_ok, timeout_sec=TIMEOUT_SEC):
            return createReturn(code=500, val="CCVM SSH not available after start. Please check.")

        grow_cmd = ("sgdisk -e /dev/vda >/dev/null 2>&1"
                    " && parted --script /dev/vda resizepart 3 100% >/dev/null 2>&1"
                    " && pvresize /dev/vda3 >/dev/null 2>&1"
                    " && lvextend -l +100%FREE /dev/rl/nfs >/dev/null 2>&1"
                    " && xfs_growfs /nfs >/dev/null 2>&1")
        rc = os.system(f"ssh -q -o StrictHostKeyChecking=no -o ConnectTimeout=10 ccvm '{grow_cmd}'")
        if rc != 0:
            return createReturn(code=500, val="CCVM secondary filesystem expansion failed.")
        return createReturn(code=200, val="CCVM secondary filesystem expansion success.")
    except Exception as e:
        return createReturn(code=500, val=str(e))

if __name__ == "__main__":
    parser = create_argument_parser()
    args = parser.parse_args()
    result = ccvm_secondary_resize(args)
    print(result)
