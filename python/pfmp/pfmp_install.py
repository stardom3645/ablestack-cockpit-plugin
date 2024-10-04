'''
Copyright (c) 2021 ABLECLOUD Co. Ltd
설명 : pfmp을 생성 하는 프로그램
최초 작성일 : 2023. 05. 15
'''

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import logging
import os
import json
import subprocess
from time import sleep

from ablestack import *
from python_hosts import Hosts, HostsEntry
from sh import ssh

env=os.environ.copy()

cluster_json_file_path = pluginpath+"/tools/properties/cluster.json"
pfmp_json_file_path = pluginpath+"/tools/properties/pfmp_config.json"
hosts_file_path = "/etc/hosts"
pfmp_config_path = "/opt/dell/pfmp/PFMP_Installer/config/PFMP_Config.json"

def createArgumentParser():
    '''
    입력된 argument를 파싱하여 dictionary 처럼 사용하게 만들어 주는 parser를 생성하는 함수
    :return: argparse.ArgumentParser
    '''
    # 참조: https://docs.python.org/ko/3/library/argparse.html
    # 프로그램 설명
    parser = argparse.ArgumentParser(description='pfmp을 생성 하는 프로그램',
                                        epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™',
                                        usage='%(prog)s arguments')
    parser.add_argument('action', choices=['install','pre_install','remove','reset'], help='choose one of the actions')

    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐):
    parser.add_argument('-v', '--verbose', action='count', default=0, help='increase output verbosity')

    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    parser.add_argument('-H', '--Human', action='store_const', dest='flag_readerble', const=True, help='Human readable')

    # Version 추가
    parser.add_argument('-V', '--Version', action='version', version='%(prog)s 1.0')

    return parser

def openClusterJson():
    try:
        with open(cluster_json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret

def ContainerInstall():

    result = os.system("scp -o StrictHostKeyChecking=no " + pfmp_json_file_path + " pfmp:"+ pfmp_config_path + "> /dev/null")

    if result == 0:

        ssh_command = ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=5', 'pfmp', 'sh', '/opt/dell/pfmp/PFMP_Installer/scripts/setup_installer.sh']

        process = subprocess.Popen(ssh_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            process.stdout.read()
            process.stdout.close()
            process.wait()

            if process.returncode == 0:
                container_id = ssh('-o', 'StrictHostKeyChecking=no', 'pfmp', 'podman', 'ps', '-f', '"name=atlantic_installer"', '-a', '--format','"{{.ID}}"').strip()

                # ssh('-o', 'StrictHostKeyChecking=no', 'pfmp','podman exec -it ' + container_id + ' useradd -m ablecloud > /dev/null; 2>&1')
                # ssh('-o', 'StrictHostKeyChecking=no', 'pfmp','podman exec -it --user ablecloud ' + container_id + ' mkdir -p /home/ablecloud/.ssh > /dev/null')
                # ssh('-o', 'StrictHostKeyChecking=no', 'pfmp','podman cp /home/ablecloud/.ssh/id_rsa ' + container_id + ':/home/ablecloud/.ssh/')
                ssh('-o', 'StrictHostKeyChecking=no', 'pfmp','podman exec -it ' + container_id + ' mkdir -p /root/.ssh > /dev/null')
                ssh('-o', 'StrictHostKeyChecking=no', 'pfmp','podman cp /root/.ssh/id_rsa ' + container_id + ':/root/.ssh/')

                return createReturn(code=200, val="Success PFMP Container Install")
            else:
                return createReturn(code=500, val="Failed PFMP Container Install")

        except Exception as e:
                return createReturn(code=500, val="Failed PFMP Container Install"+str(e))

        finally:
            process.terminate()
    else:
        return createReturn(code=500, val="scp Connection Failed")

def install():
    json_data = openClusterJson()

    ssh_command = ['ssh', '-o', 'StrictHostKeyChecking=no', 'pfmp', '-t', 'sh', '/opt/dell/pfmp/PFMP_Installer/scripts/install_PFMP.sh']

    process = subprocess.Popen(ssh_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    last_line = ""

    try:
        for stdout_line in iter(process.stdout.readline, ""):
            last_line = stdout_line.strip()

            if "Trying to connect to node" in last_line:
                for i in range(len(json_data["clusterConfig"]["hosts"])):
                    host = json_data["clusterConfig"]["hosts"][i]["ablecube"]
                    scvm = json_data["clusterConfig"]["hosts"][i]["scvm"]
                    ssh('-o', 'StrictHostKeyChecking=no', host, 'python3', pluginpath + '/python/ablestack_json/ablestackJson.py', 'update', '--depth1', 'bootstrap', '--depth2', 'pfmp','--value', 'true')
                    ssh('-o', 'StrictHostKeyChecking=no', scvm, 'systemctl restart activemq.service')
                return createReturn(code=200, val="Success PFMP Install")

    except Exception as e:
        return createReturn(code=500, val="Failed PFMP Install: " + str(e))

    finally:
        try:
            if process.poll() is None:
                process.terminate()
                process.wait()
        except Exception as e:
            print(f"Failed to terminate the process properly: {e}")

    # 프로세스가 정상 종료되지 않았거나 특정 메시지를 찾지 못한 경우
    process.stdout.close()
    process.wait()

    if process.returncode == 0:
        return createReturn(code=200, val="Success PFMP Install")
    else:
        return createReturn(code=500, val="Failed PFMP Install")

def remove():
    try:
        json_data = openClusterJson()
        my_hosts = Hosts(path=hosts_file_path)

        with open(cluster_json_file_path, 'w') as outfile:
            json.dump(json_data, outfile, indent=4)

        my_hosts.remove_all_matching(name="pfmp")

        my_hosts.write()

        os.system("virsh destroy pfmp > /dev/null")

        os.system("virsh undefine pfmp --nvram > /dev/null")
        # cloudinit iso 삭제
        os.system("rm -rf /var/lib/libvirt/images/pfmp-cloudinit.iso")

        os.system("rm -rf /var/lib/libvirt/images/pfmp.qcow2")
        # 확인후 폴더 밑 내용 다 삭제해도 무관하면 아래 코드 수행
        os.system("rm -rf "+pluginpath+"/tools/vmconfig/pfmp/*")

        return createReturn(code=200, val="hosts and cluster.json file remove pfmp success.")

    except Exception as e:
        # 결과값 리턴
        return createReturn(code=500, val="Please check the \"cluster.json\" file. : "+e)

def reset():
    ssh_command = ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=5', 'pfmp', 'sh', '/opt/dell/pfmp/PFMP_Installer/scripts/reset_installer.sh']

    process = subprocess.Popen(ssh_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        process.stdout.read()
        process.stdout.close()
        process.wait()

        if process.returncode == 0:

            return createReturn(code=200, val="Success PFMP Install Reset")
        else:
            return createReturn(code=500, val="Failed PFMP Install Reset")

    except Exception as e:
            return createReturn(code=500, val="Failed PFMP Install Reset"+str(e))

    finally:
        process.terminate()
# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()

    verbose = (5 - args.verbose) * 10

    # 실제 로직 부분 호출 및 결과 출력

    if args.action == 'pre_install':
        ret = ContainerInstall()
        print(ret)
    elif args.action == 'install':
        ret = install()
        print(ret)
    elif args.action == 'remove':
        ret = remove()
        print(ret)
    elif args.action == 'reset':
        ret = reset()
        print(ret)