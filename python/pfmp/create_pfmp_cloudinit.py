'''
Copyright (c) 2021 ABLECLOUD Co. Ltd
설명 : 게이트웨이 가상머신에 사용할 cloudinit iso를 생성하는 프로그램
최초 작성일 : 2023. 05. 15
'''

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import logging
import json
import subprocess
import sys
import os

from ablestack import *
from sh import python3
from python_hosts import Hosts, HostsEntry

def createArgumentParser():
    '''
    입력된 argument를 파싱하여 dictionary 처럼 사용하게 만들어 주는 parser를 생성하는 함수
    :return: argparse.ArgumentParser
    '''
    # 참조: https://docs.python.org/ko/3/library/argparse.html
    # 프로그램 설명
    parser = argparse.ArgumentParser(description='게이트웨이 가상머신에 사용할 cloudinit iso를 생성하는 프로그램',
                                        epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™',
                                        usage='%(prog)s arguments')

    # 인자 추가: https://docs.python.org/ko/3/library/argparse.html#the-add-argument-method

    #parser.add_argument('action', choices=['reset'], help='choose one of the actions')

    parser.add_argument('-f1', '--file1', metavar='[private key file1 location]', type=str, help='input Value to private key file location and name', required=True)
    parser.add_argument('-t1', '--text1', metavar='[private key file1 text]', type=str, help='input Value to private key text', required=True)
    parser.add_argument('-f2', '--file2', metavar='[public key file2 location]', type=str, help='input Value to public key file location and name', required=True)
    parser.add_argument('-t2', '--text2', metavar='[public key file2 text]', type=str, help='input Value to public key text', required=True)
    parser.add_argument('--hostname', metavar='[hostname]', help="VM의 이름")
    parser.add_argument('--ingress-ip', metavar='[ingress ip]', help="PFMP Ingress IP")
    parser.add_argument('--mgmt-ip', metavar='[management ip]', help="관리 네트워크 IP")
    parser.add_argument('--mgmt-nic', metavar='[management nic]', help="관리 네트워크 NIC")
    parser.add_argument('--mgmt-prefix', metavar='[management prefix]', help="관리 네트워크 prefix")
    parser.add_argument('--mgmt-gw', metavar='[management gw]', help="관리 네트워크 gw")
    parser.add_argument('--dns',metavar='DNS', help="서버 DNS 주소")

    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐):
    parser.add_argument('-v', '--verbose', action='count', default=0, help='increase output verbosity')

    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    parser.add_argument('-H', '--Human', action='store_const', dest='flag_readerble', const=True, help='Human readable')

    # Version 추가
    parser.add_argument('-V', '--Version', action='version', version='%(prog)s 1.0')

    return parser

json_file_path = pluginpath+"/tools/properties/cluster.json"
hosts_file_path = "/etc/hosts"

def openClusterJson():
    try:
        with open(json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret
def setupHostsAndClusterJson():
    try:
        json_data = openClusterJson()

        my_hosts = Hosts(path=hosts_file_path)

        json_data["clusterConfig"]["pfmp"]["ingress_ip"] = args.ingress_ip

        with open(json_file_path, 'w') as outfile:
            json.dump(json_data, outfile, indent=4)

        for i in range(len(json_data["clusterConfig"]["hosts"])):
            host = json_data["clusterConfig"]["hosts"][i]["ablecube"]
            os.system("scp -o StrictHostKeyChecking=no " + json_file_path + " " + host + ":" + json_file_path + " > /dev/null")

        my_hosts.remove_all_matching(name="pfmp")

        entry = HostsEntry(entry_type='ipv4', address=args.mgmt_ip, names=['pfmp'])
        my_hosts.add([entry])

        my_hosts.write()
    except Exception as e:
        print ('EXCEPTION: ',e)

def createPfmpCloudinit(args):

    setupHostsAndClusterJson()

    success_bool = True

    # cloudinit iso에 사용할 공개키 : id_rsa.pub 생성
    cmd = "cat > "+args.file1+"<< EOF\n"
    cmd += args.text1
    cmd += "\nEOF"
    os.system(cmd)

    # cloudinit iso에 사용할 개인키 : id_rsa 파일 생성
    cmd = "cat > "+args.file2+"<< EOF\n"
    cmd += args.text2
    cmd += "\nEOF"
    os.system(cmd)

    os.system('mkdir -p /usr/share/cockpit/ablestack/tools/vmconfig/pfmp')

    if args.mgmt_gw == None:
        if args.dns == None:
            result = json.loads(python3(pluginpath + '/tools/cloudinit/gencloudinit.py',
                                        '--hostname',args.hostname,'--hosts',"/etc/hosts",'--privkey',args.file1,'--pubkey',args.file2,
                                        '--mgmt-nic','enp0s20','--mgmt-ip',args.mgmt_ip,'--mgmt-prefix',args.mgmt_prefix,
                                        '--iso-path',pluginpath+'/tools/vmconfig/pfmp/pfmp-cloudinit.iso','pfmp'))
        else:
            result = json.loads(python3(pluginpath + '/tools/cloudinit/gencloudinit.py',
                                        '--hostname',args.hostname,'--hosts',"/etc/hosts",'--privkey',args.file1,'--pubkey',args.file2,
                                        '--mgmt-nic','enp0s20','--mgmt-ip',args.mgmt_ip,'--mgmt-prefix',args.mgmt_prefix,'--dns',args.dns,
                                        '--iso-path',pluginpath+'/tools/vmconfig/pfmp/pfmp-cloudinit.iso','pfmp'))
    else:
        if args.dns == None:
            result = json.loads(python3(pluginpath + '/tools/cloudinit/gencloudinit.py',
                                        '--hostname',args.hostname,'--hosts',"/etc/hosts",'--privkey',args.file1,'--pubkey',args.file2,
                                        '--mgmt-nic','enp0s20','--mgmt-ip',args.mgmt_ip,'--mgmt-prefix',args.mgmt_prefix,'--mgmt-gw',args.mgmt_gw,
                                        '--iso-path',pluginpath+'/tools/vmconfig/pfmp/pfmp-cloudinit.iso','pfmp'))
        else:
            result = json.loads(python3(pluginpath + '/tools/cloudinit/gencloudinit.py',
                                        '--hostname',args.hostname,'--hosts',"/etc/hosts",'--privkey',args.file1,'--pubkey',args.file2,
                                        '--mgmt-nic','enp0s20','--mgmt-ip',args.mgmt_ip,'--mgmt-prefix',args.mgmt_prefix,'--mgmt-gw',args.mgmt_gw,'--dns',args.dns,
                                        '--iso-path',pluginpath+'/tools/vmconfig/pfmp/pfmp-cloudinit.iso','pfmp'))


    os.system("cp -f "+pluginpath+"/tools/vmconfig/pfmp/pfmp-cloudinit.iso /var/lib/libvirt/images/")

    # 결과값 리턴
    if success_bool:
        return createReturn(code=200, val="pfmp cloudinit iso create success")
    else:
        return createReturn(code=500, val="pfmp cloudinit iso create fail")

# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()

    verbose = (5 - args.verbose) * 10

    # 로깅을 위한 logger 생성, 모든 인자에 default 인자가 있음.
    logger = createLogger(verbosity=logging.CRITICAL, file_log_level=logging.ERROR, log_file='test.log')

    # 실제 로직 부분 호출 및 결과 출력
    ret = createPfmpCloudinit(args)
    print(ret)
