#!/usr/bin/python3
# -*- coding: utf-8 -*-
'''
Copyright (c) 2024 ABLECLOUD Co. Ltd.

libvirt domain들의 정보를 수집하는 스크립트입니다.
수정자 : 정민철
최초작성일 : 2024-12-10
'''

import os
import sh
import json
from concurrent.futures import ThreadPoolExecutor

env = os.environ.copy()
env['LANG'] = "en_US.utf-8"
env['LANGUAGE'] = "en"

virsh_cmd = sh.Command('/usr/bin/virsh')
ssh_cmd = sh.Command('/usr/bin/ssh')


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
        ret = virsh_cmd('dominfo', domain=vm['Name'], _env=env).splitlines()
        for line in ret:
            items = line.split(":", maxsplit=1)
            if len(items) == 2:
                k, v = items[0].strip(), items[1].strip()
                vm[k] = v

        if vm['State'] == "running":
            # Collect IP and network details
            ret = virsh_cmd('domifaddr', domain=vm['Name'], source='agent', interface='enp0s20',full=True).splitlines()
            for line in ret:
                if 'ipv4' in line:
                    items = line.split(maxsplit=4)
                    vm['ip'] = items[3].split('/')[0]
                    vm['prefix'] = items[3].split('/')[1]
                    vm['mac'] = items[1]

            ret = virsh_cmd('domiflist', domain=vm['Name']).splitlines()
            for line in ret:
                if vm['mac'] in line:
                    items = line.split()
                    vm['nictype'], vm['nicbridge'] = items[1], items[2]

            # Run SSH commands in one go
            command = '''
            /usr/bin/df -h;
            '''
            ret = ssh_cmd('-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=3', 'ccvm-mngt', command).splitlines()

            # Parse disk usage
            vm['blk'] = ret[:]
            for line in ret:
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

            command = '''
            output=$(/usr/sbin/route -n | grep -P "^0.0.0.0|UG" | awk '{print $2}');
            echo "${output:-""}";
            output=$(/usr/bin/awk '/^nameserver/ {print $2}' /etc/resolv.conf);
            echo "${output:-""}";
            output=$(systemctl is-active mold.service);
            echo "${output:-"inactive"}";
            output=$(systemctl is-active mysqld);
            echo "${output:-"inactive"}"
            '''
            ret = ssh_cmd('-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=3', 'ccvm-mngt', command).splitlines()

            # Parse gateway
            vm['GW'] = ret[0]
            # Parse DNS
            vm['DNS'] = ret[1]
            # Parse service status
            vm['MOLD_SERVICE_STATUE'] = ret[2]
            vm['MOLD_DB_STATUE'] = ret[3]

    except Exception as e:
        vm['error'] = str(e)

    return vm


def main():
    """
    Main function to collect VM information.
    """
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
