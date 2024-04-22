'''
Copyright (c) 2021 ABLECLOUD Co. Ltd
설명 : 게이트웨이 가상머신을 제거하는 프로그램
최초 작성일 : 2024. 04. 22
'''

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import logging
import json
import sys
import os

from ablestack import *
from sh import python3
from sh import ssh

def createArgumentParser():
    '''
    입력된 argument를 파싱하여 dictionary 처럼 사용하게 만들어 주는 parser를 생성하는 함수
    :return: argparse.ArgumentParser
    '''
    # 참조: https://docs.python.org/ko/3/library/argparse.html
    # 프로그램 설명
    parser = argparse.ArgumentParser(description='게이트웨이 가상머신을 제거하는 프로그램',
                                        epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™',
                                        usage='%(prog)s arguments')

    # 인자 추가: https://docs.python.org/ko/3/library/argparse.html#the-add-argument-method

    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐):
    parser.add_argument('-v', '--verbose', action='count', default=0, help='increase output verbosity')

    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    parser.add_argument('-H', '--Human', action='store_const', dest='flag_readerble', const=True, help='Human readable')

    # Version 추가
    parser.add_argument('-V', '--Version', action='version', version='%(prog)s 1.0')

    return parser

json_file_path = pluginpath+"/tools/properties/cluster.json"

def openClusterJson():
    try:
        with open(json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret

def removeGatewayCenter(args):
    success_bool = True
    #=========== pcs cluster 초기화 ===========
    # cluster.json 파일 읽어오기
    json_data = openClusterJson()

    host_list = []
    for f_val in json_data["clusterConfig"]["hosts"]:
        host_list.append(f_val["ablecube"])
        host_list.append(f_val["scvmMngt"])

    ping_result = json.loads(python3(pluginpath+'/python/vm/host_ping_test.py', '-hns', host_list))

    if ping_result["code"] == 200:
        # gwvm pcs 클러스터 배포
        result = json.loads(python3(pluginpath + '/python/pcs/pcsExehost.py' ))
        pcs_exe_ip = result["val"]
        
        for f_val in json_data["clusterConfig"]["hosts"]:
            cmd = "python3 "+pluginpath + "/python/cluster/gwvm_config.py remove"
            ret = json.loads(ssh('-o', 'StrictHostKeyChecking=no', f_val["ablecube"], cmd))
            if ret["code"] != 200:
                return createReturn(code=500, val="python3 gwvm_config.py remove error : Please check if CUBEs and SCVMs are running.")

    # 리소스 삭제
    cmd = "python3 "+pluginpath + "/python/pcs/main.py remove --resource gateway_res"
    result = json.loads(ssh('-o', 'StrictHostKeyChecking=no', pcs_exe_ip, cmd))
    if result['code'] not in [200,400]:
        success_bool = False

    # ceph rbd 이미지 삭제
    result = os.system("rbd ls -p rbd | grep gwvm > /dev/null")
    if result == 0:
        os.system("rbd rm --no-progress rbd/gwvm")

    # 결과값 리턴
    if success_bool:
        return createReturn(code=200, val="gateway center remove success")
    else:
        return createReturn(code=500, val="gateway center remove fail")

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
    ret = removeGatewayCenter(args)
    print(ret)
