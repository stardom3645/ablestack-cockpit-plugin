

'''
Copyright (c) 2021 ABLECLOUD Co. Ltd
설명 : pfmp을 생성 하는 프로그램
최초 작성일 : 2023. 05. 15
'''

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import os
import json
import subprocess

from ablestack import *


env=os.environ.copy()

cluster_json_file_path = pluginpath+"/tools/properties/cluster.json"
pfmp_json_file_path = pluginpath+"/tools/properties/pfmp_config.json"

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
    parser.add_argument('-mgmt', metavar="[managerment ip]", type=str, help='input 5 range Value of the management network ip', required=True)
    parser.add_argument('-data1', metavar='[data1 ip]', type=str, help='input 5 range Value of the data1 network ip', required=True)
    parser.add_argument('-data2', metavar='[data2 ip]', type=str, help='input 5 range Value of the data2 network ip', required=True)
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

def PfmpConfigJson():
    cluster_data = openClusterJson()
    try:
        with open(pfmp_json_file_path, 'r') as json_file:
            pfmp_data = json.load(json_file)
            for i in range(len(pfmp_data["Nodes"])):
                pfmp_data["Nodes"][i]["ipaddress"] = cluster_data["clusterConfig"]["hosts"][i]["scvmMngt"]
                pfmp_data["RoutableIPPoolCIDR"][0]["mgmt"] = args.mgmt
                pfmp_data["RoutableIPPoolCIDR"][1]["data1"] = args.data1
                pfmp_data["RoutableIPPoolCIDR"][2]["data2"] = args.data2
                pfmp_data["PFMPHostIP"] = args.mgmt.split('-')[0].strip()
        with open(pfmp_json_file_path, 'w') as json_file:
            pfmp_data = json.dump(pfmp_data, json_file,indent=4)
            return json.loads(createReturn(code=200, val="pfmp_config json write success"))
    except Exception as e:
        return json.loads(createReturn(code=500, val='pfmp_config.json write error'+e))
def setup():

    success_bool = True

    # pfmp 가상머신용 qcow2 이미지 생성
    check_err = os.system("/usr/bin/cp -f /var/lib/libvirt/images/ablestack-powerflex-pfmp-template.qcow2 /var/lib/libvirt/images/pfmp.qcow2")
    if check_err != 0 :
        success_bool = False

    # pfmp.qcow2 파일 권한 설정
    check_err = os.system("chmod 666 /var/lib/libvirt/images/pfmp.qcow2")
    if check_err != 0 :
        success_bool = False

    # virsh 초기화
    check_err = os.system("virsh define "+pluginpath+"/tools/vmconfig/pfmp/pfmp.xml > /dev/null")
    if check_err != 0 :
        success_bool = False

    check_err = os.system("virsh start pfmp > /dev/null")
    if check_err != 0 :
        success_bool = False

    check_err = os.system("virsh autostart pfmp > /dev/null")
    if check_err != 0 :
        success_bool = False

    # 결과값 리턴
    if success_bool:
        return createReturn(code=200, val="pfmp virtual mashine setup success")
    else:
        return createReturn(code=500, val="pfmp virtual mashine setup fail")

if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()

    verbose = (5 - args.verbose) * 10

    # 실제 로직 부분 호출 및 결과 출력
    ret = PfmpConfigJson()
    if ret["code"] == 200:
        ret = setup()
        print(ret)
    else:
        print(ret)