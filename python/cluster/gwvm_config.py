'''
Copyright (c) 2024 ABLECLOUD Co. Ltd
설명 : gwvm 정보설정 파일 cluster.json을 기준으로 /etc/hosts 파일을 세팅하는 기능
최초 작성일 : 2024. 04. 19
'''

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import logging
import sys
import os
import json
import socket

from ablestack import *
from sh import python3
from python_hosts import Hosts, HostsEntry

json_file_path = pluginpath+"/tools/properties/cluster.json"
hosts_file_path = "/etc/hosts"
# hosts_file_path = "/etc/hosts"
def createArgumentParser():
    '''
    입력된 argument를 파싱하여 dictionary 처럼 사용하게 만들어 주는 parser를 생성하는 함수
    :return: argparse.ArgumentParser
    '''
    # 참조: https://docs.python.org/ko/3/library/argparse.html
    # 프로그램 설명
    parser = argparse.ArgumentParser(description='클러스터 설정 파일 cluster.json을 기준으로 /etc/hosts 파일을 세팅하는 프로그램',
                                        epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™',
                                        usage='%(prog)s arguments')

    # 인자 추가: https://docs.python.org/ko/3/library/argparse.html#the-add-argument-method
    parser.add_argument('action', choices=['create','remove'], help='choose one of the actions')
    parser.add_argument('--mgmt-ip', metavar='Management IP', help="관리 네트워크 IP")
    parser.add_argument('--sn-ip', metavar='Storage IP', help="스토리지 네트워크 IP")

    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐):
    parser.add_argument('-v', '--verbose', action='count', default=0, help='increase output verbosity')
    
    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    parser.add_argument('-H', '--Human', action='store_const', dest='flag_readerble', const=True, help='Human readable')
    
    # Version 추가
    parser.add_argument('-V', '--Version', action='version', version='%(prog)s 1.0')

    return parser

def openClusterJson():
    try:
        with open(json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret
    
def create(args):
    try:
        json_data = openClusterJson()
        my_hosts = Hosts(path=hosts_file_path)

        json_data["clusterConfig"]["gwvm"]["ip"] = args.mgmt_ip
        json_data["clusterConfig"]["gwvm"]["pn"] = args.sn_ip

        with open(json_file_path, 'w') as outfile:
            json.dump(json_data, outfile, indent=4)
        
        my_hosts.remove_all_matching(name="gwvm-mngt")
        my_hosts.remove_all_matching(name="gwvm")

        entry = HostsEntry(entry_type='ipv4', address=args.mgmt_ip, names=['gwvm-mngt'])
        my_hosts.add([entry])
        entry = HostsEntry(entry_type='ipv4', address=args.sn_ip, names=['gwvm'])
        my_hosts.add([entry])

        my_hosts.write()

        python3(pluginpath+'/python/host/ssh-scan.py')

        os.system("scp -q -o StrictHostKeyChecking=no " + hosts_file_path + " root@scvm-mngt:/etc/hosts")
        return createReturn(code=200, val="hosts file config success.")
    except Exception as e:
        # 결과값 리턴
        return createReturn(code=500, val="Please check the \"cluster.json\" file. : "+e)
    
def remove(args):
    try:
        json_data = openClusterJson()
        my_hosts = Hosts(path=hosts_file_path)

        json_data["clusterConfig"]["gwvm"]["ip"] = ""
        json_data["clusterConfig"]["gwvm"]["pn"] = ""

        with open(json_file_path, 'w') as outfile:
            json.dump(json_data, outfile, indent=4)
        
        my_hosts.remove_all_matching(name="gwvm-mngt")
        my_hosts.remove_all_matching(name="gwvm")

        my_hosts.write()

        python3(pluginpath+'/python/host/ssh-scan.py')

        os.system("scp -q -o StrictHostKeyChecking=no " + hosts_file_path + " root@scvm-mngt:/etc/hosts")
        return createReturn(code=200, val="hosts file config success.")
    except Exception as e:
        # 결과값 리턴
        return createReturn(code=500, val="Please check the \"cluster.json\" file. : "+e)
    




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
    if args.action == 'create':
        ret = create(args)
        print(ret)
    elif args.action == 'remove':
        ret = remove(args)
        print(ret)