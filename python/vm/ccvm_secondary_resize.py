'''
Copyright (c) 2024 ABLECLOUD Co. Ltd
설명 : ccvm secondary 용량을 추가하는 기능
최초 작성일 : 2024. 9. 3
'''

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import logging
import sys
import os
import json
import datetime
import subprocess
import time
import sh

from subprocess import check_output
from ablestack import *
from sh import python3
from sh import ssh


env=os.environ.copy()
env['LANG']="en_US.utf-8"
env['LANGUAGE']="en"

def createArgumentParser():
    '''
    입력된 argument를 파싱하여 dictionary 처럼 사용하게 만들어 주는 parser를 생성하는 함수
    :return: argparse.ArgumentParser
    '''
    # 참조: https://docs.python.org/ko/3/library/argparse.html
    # 프로그램 설명
    parser = argparse.ArgumentParser(description='ccvm secondary 용량을 추가하는 프로그램',
                                        epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™',
                                        usage='%(prog)s arguments')

    # 인자 추가: https://docs.python.org/ko/3/library/argparse.html#the-add-argument-method

    parser.add_argument('--add-size', metavar='Additional capacity size', type=int, help='Additional capacity size',required=True)

    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐):
    parser.add_argument('-v', '--verbose', action='count', default=0, help='increase output verbosity')
    
    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    parser.add_argument('-H', '--Human', action='store_const', dest='flag_readerble', const=True, help='Human readable')
    
    # Version 추가
    parser.add_argument('-V', '--Version', action='version', version='%(prog)s 1.0')

    return parser

def processFail(message):
    return createReturn(code=500, val=message)

def ccvmSecondaryResize(args):
    try:
        # 이미지 사이즈 입력 범위 체크
        if args.add_size < 1 or args.add_size > 500:
            return createReturn(code=500, val="Please enter additional capacity size less than 500 GiB.")

        ccvm_image_info = json.loads(subprocess.check_output("rbd info rbd/ccvm --format json", shell=True).strip())
        original_image_size = ccvm_image_info["size"]/1024/1024/1024
        new_image_size = original_image_size + args.add_size
        if new_image_size > 2000:
            return createReturn(code=500, val="CCVM can support capacities up to 2TiB.")

        # ccvm 정상 실행중인지 체크
        ccvm_boot_check = os.system("ssh -q -o StrictHostKeyChecking=no -o ConnectTimeout=1 ccvm 'echo ok > /dev/null 2>&1'")
        if ccvm_boot_check != 0:
            return createReturn(code=500, val="Please check if CCVM status is running normally.")
        ret = ssh('-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=5', "ccvm", "echo ok").strip()
        if ret != "ok":
            return createReturn(code=500, val="Please check if CCVM status is running normally.")

        # pcs 명령 수행 호스트 확인
        ret = json.loads(python3(pluginpath + '/python/pcs/pcsExehost.py' ))
        pcs_exe_ip = ret["val"]

        # pcs cloudcenter_res disable 명령 
        ret = json.loads(sh.python3(pluginpath + "/python/pcs/main.py", "disable", "--resource", "cloudcenter_res").strip())
        if ret["code"] != 200:
            return createReturn(code=500, val="cloudcenter_res disable failed.")

        # 완전 정지 되었는지 확인 (최대 10분간)
        cnt_num = 0
        while True:
            time.sleep(5)
            cnt_num += 1
            ret = json.loads(sh.python3(pluginpath + "/python/pcs/main.py", "status", "--resource", "cloudcenter_res").strip())
            if ret['val']['role'] == 'Stopped':
                break
            if cnt_num > 600:
                return createReturn(code=500, val="cloudcenter_res is not stopped. Please check.")

        # rbd snap purge ccvm
        result = os.system("rbd snap purge ccvm --no-progress")
        if result != 0:
            return createReturn(code=500, val="CCVM Snapshot Purge Failed")

        # ccvm image resize
        result = os.system("rbd resize -s "+str(int(new_image_size))+"G ccvm > /dev/null 2>&1")
        if result != 0:
            return createReturn(code=500, val="CCVM Image Resize Failed")

        # pcs cloudcenter_res enable 명령 
        ret = json.loads(sh.python3(pluginpath + "/python/pcs/main.py", "enable", "--resource", "cloudcenter_res").strip())
        if ret["code"] != 200:
            return createReturn(code=500, val="cloudcenter_res enable failed.")

        # ccvm이 명령 수행 가능한지 확인 (최대 10분간)
        ccvm_boot_check = 0
        cnt_num = 0
        while True:
            time.sleep(5)
            cnt_num += 1
            ccvm_boot_check = os.system("ssh -q -o StrictHostKeyChecking=no -o ConnectTimeout=1 ccvm 'echo ok > /dev/null 2>&1'")
            if ccvm_boot_check == 0 or cnt_num > 600:
                break

        # ccvm secondary fs (nfs) 용량 확장
        cmd = "sgdisk -e /dev/vda > /dev/null 2>&1"
        cmd += " && parted --script /dev/vda resizepart 3 100% > /dev/null 2>&1"
        cmd += " && pvresize /dev/vda3 > /dev/null 2>&1"
        cmd += " && lvextend -l +100%FREE /dev/rl/nfs > /dev/null 2>&1"
        cmd += " && xfs_growfs /nfs > /dev/null 2>&1"

        result = os.system("ssh -q -o StrictHostKeyChecking=no -o ConnectTimeout=5 ccvm '"+cmd+"'")
        if result != 0:
            return createReturn(code=500, val="ccvm secondary fs capacity expansion failed")
        # 2차 스토리지 사이즈 확장 완료
        return createReturn(code=200, val="ccvm secondary fs capacity expansion success")
    except Exception as e:
        # 결과값 리턴
        return createReturn(code=500, val=e)

# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()

    verbose = (5 - args.verbose) * 10

    # 로깅을 위한 logger 생성, 모든 인자에 default 인자가 있음.
    logger = createLogger(verbosity=logging.CRITICAL, file_log_level=logging.ERROR, log_file='ccvm_snap.log')

    # 실제 로직 부분 호출 및 결과 출력
    print(ccvmSecondaryResize(args))