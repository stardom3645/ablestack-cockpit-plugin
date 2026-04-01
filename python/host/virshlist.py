#!/usr/bin/python3
# -*- coding: utf-8 -*-
'''
Copyright (c) 2024 ABLECLOUD Co. Ltd.

libvirt domain들의 정보를 수집하는 스크립트입니다.
수정자 : 정민철
최초작성일 : 2024-12-10
'''

import os
import re
import sh
import json
from concurrent.futures import ThreadPoolExecutor
from ablestack import *

env = os.environ.copy()
env['LANG'] = "en_US.utf-8"
env['LANGUAGE'] = "en"

virsh_cmd = sh.Command('/usr/bin/virsh')
ssh_cmd = sh.Command('/usr/bin/ssh')

SSH_OPTS = [
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ConnectTimeout=2',
    '-o', 'ConnectionAttempts=1'
]

cluster_json_file_path = pluginpath + "/tools/properties/cluster.json"
def openClusterJson():
    try:
        with open(cluster_json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')


    return ret


cluster_json_data = openClusterJson()
os_type = cluster_json_data["clusterConfig"]["type"]

def collect_vm_info(vm):
    """
    Collect detailed information about a single VM.
    """
    vm['ip'] = "Unknown"
    vm['mac'] = "Unknown"
    vm['nictype'] = "Unknown"
    vm['nicbridge'] = "Unknown"

    try:
        # Collect basic VM information
        ret = virsh_cmd('dominfo', domain=vm['Name'], _env=env, _timeout=2).splitlines()
        for line in ret:
            items = line.split(":", maxsplit=1)
            if len(items) == 2:
                k, v = items[0].strip(), items[1].strip()
                vm[k] = v

        if vm['State'] == "running":
            vm['prefix'] = "N/A"
            vm['DISK_CAP'] = "N/A"
            vm['DISK_ALLOC'] = "N/A"
            vm['DISK_PHY'] = "N/A"
            vm['DISK_USAGE_RATE'] = "N/A"
            vm['SECOND_DISK_CAP'] = "N/A"
            vm['SECOND_DISK_ALLOC'] = "N/A"
            vm['SECOND_DISK_PHY'] = "N/A"
            vm['SECOND_DISK_USAGE_RATE'] = "N/A"
            vm['GW'] = "N/A"
            vm['DNS'] = "N/A"
            vm['MOLD_SERVICE_STATUE'] = "N/A"
            vm['MOLD_DB_STATUE'] = "N/A"

            # Collect IP and network details
            try:
                ret = virsh_cmd('domifaddr', domain=vm['Name'], source='agent', interface='enp0s20', full=True, _env=env, _timeout=2).splitlines()
                for line in ret:
                    if 'ipv4' in line:
                        items = line.split(maxsplit=4)
                        vm['ip'] = items[3].split('/')[0]
                        vm['prefix'] = items[3].split('/')[1]
                        vm['mac'] = items[1]
            except Exception:
                pass

            if vm['ip'] == "Unknown":
                try:
                    ret = virsh_cmd('domifaddr', domain=vm['Name'], source='lease', full=True, _env=env, _timeout=1).splitlines()
                    for line in ret:
                        if 'ipv4' in line:
                            items = line.split(maxsplit=4)
                            vm['ip'] = items[3].split('/')[0]
                            vm['prefix'] = items[3].split('/')[1]
                            vm['mac'] = items[1]
                except Exception:
                    pass

            try:
                if vm['mac'] != "Unknown":
                    ret = virsh_cmd('domiflist', domain=vm['Name'], _env=env, _timeout=2).splitlines()
                    for line in ret:
                        if vm['mac'] in line:
                            items = line.split()
                            vm['nictype'], vm['nicbridge'] = items[1], items[2]
            except Exception:
                pass

            # Run SSH commands in one go
            command = '''
            /usr/bin/df -h;
            echo "__END_DF__";
            output=$(/usr/sbin/route -n | grep -P "^0.0.0.0|UG" | awk '{print $2}');
            echo "${output:-""}";
            output=$(/usr/bin/awk '/^nameserver/ {print $2}' /etc/resolv.conf | head -n 1);
            echo "${output:-""}";
            output=$(systemctl is-active mold.service);
            echo "${output:-"inactive"}";
            output=$(systemctl is-active mysqld);
            echo "${output:-"inactive"}"
            '''
            try:
                ret = ssh_cmd(*SSH_OPTS, 'ccvm-mngt', command, _timeout=5).splitlines()

                # Split SSH output by marker
                marker = "__END_DF__"
                marker_index = ret.index(marker) if marker in ret else len(ret)
                df_lines = ret[:marker_index]
                tail = ret[marker_index + 1:]

                # Parse disk usage
                vm['blk'] = df_lines[:]
                for line in df_lines:
                    if 'rl-root' in line:
                        items = line.split(maxsplit=5)
                        vm['DISK_CAP'] = items[1]
                        vm['DISK_ALLOC'] = items[2]
                        vm['DISK_PHY'] = items[3]
                        vm['DISK_USAGE_RATE'] = items[4]
                    if 'rl-nfs' in line:
                        items = line.split(maxsplit=5)
                        vm['SECOND_DISK_CAP'] = items[1]
                        vm['SECOND_DISK_ALLOC'] = items[2]
                        vm['SECOND_DISK_PHY'] = items[3]
                        vm['SECOND_DISK_USAGE_RATE'] = items[4]

                # Parse gateway, DNS, service status
                vm['GW'] = tail[0] if len(tail) > 0 else "N/A"
                vm['DNS'] = tail[1] if len(tail) > 1 and tail[1] != "" else "N/A"
                vm['MOLD_SERVICE_STATUE'] = tail[2] if len(tail) > 2 else "N/A"
                vm['MOLD_DB_STATUE'] = tail[3] if len(tail) > 3 else "N/A"
            except Exception:
                pass
        else:
            vm['ip'] = "N/A"
            vm['mac'] = "N/A"
            vm['nictype'] = "N/A"
            vm['nicbridge'] = "N/A"
            vm['prefix'] = "N/A"
            vm['DISK_CAP'] = "N/A"
            vm['DISK_ALLOC'] = "N/A"
            vm['DISK_PHY'] = "N/A"
            vm['DISK_USAGE_RATE'] = "N/A"
            vm['SECOND_DISK_CAP'] = "N/A"
            vm['SECOND_DISK_ALLOC'] = "N/A"
            vm['SECOND_DISK_PHY'] = "N/A"
            vm['SECOND_DISK_USAGE_RATE'] = "N/A"
            vm['GW'] = "N/A"
            vm['DNS'] = "N/A"
            vm['MOLD_SERVICE_STATUE'] = "N/A"
            vm['MOLD_DB_STATUE'] = "N/A"

    except Exception as e:
        vm['error'] = str(e)

    return vm

def main():
    """
    Main function to collect VM information.
    """
    if os_type == "ablestack-standalone":
        try:
            # List all VMs
            ret = virsh_cmd('list', '--all', _env=env).splitlines()
            vms = []
            for line in ret:
                s = line.strip()
                # 1) 빈 줄, 2) 헤더, 3) '-----' 같은 구분선만 제외
                if not s or s.startswith("Id ") or re.fullmatch(r'-+', s):
                    continue

                items = s.split(None, 2)  # 공백 기준 3개 컬럼(Id, Name, State)
                if len(items) < 3:
                    continue

                if items[1] == 'ccvm':
                    vm = {
                        'Id':   items[0],
                        'Name': items[1],
                        'State': items[2]
                    }
                    vms.append(vm)

            # ❗빈 리스트면 500 에러 반환
            if not vms:
                error_response = {
                    "code": 500,
                    "message": "The CloudCenter VM has not been created."
                }
                print(json.dumps(error_response, indent=2))
                return

            # Collect detailed information
            with ThreadPoolExecutor(max_workers=4) as executor:
                vms = list(executor.map(collect_vm_info, vms))

            print(json.dumps({
                "code": 200,
                "data": vms
            }, indent=2))

        except Exception as e:
            error_response = {
                "code": 500,
                "message": f"Error occurred while checking CloudCenter VM: {str(e)}"
            }
            print(json.dumps(error_response, indent=2))
    else:
        # List all VMs
        ret = virsh_cmd('list', '--all', _env=env).splitlines()
        vms = []
        for line in ret[2:-1]:
            items = line.split(maxsplit=2)
            if(items[1] == 'ccvm'):
                vm = {
                    'Id': items[0],
                    'Name': items[1],
                    'State': items[2]
                }
                vms.append(vm)

        # Collect detailed information for each VM in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:  # Adjust workers based on CPU cores
            vms = list(executor.map(collect_vm_info, vms))

        # Print collected VM information as JSON
        print(json.dumps(vms, indent=2))

if __name__ == "__main__":
    main()
