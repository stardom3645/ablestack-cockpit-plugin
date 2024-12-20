#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
Copyright (c) 2021 ABLECLOUD Co. Ltd.

호스트의 디스크 목록을 조회하는 스크립트

최초작성일 : 2021-03-15
'''
import argparse
import json
import logging
import pprint

from ablestack import *
import os
import sh
import distro

lsblk_cmd = sh.Command('/usr/bin/lsblk')
lspci_cmd = sh.Command('/usr/sbin/lspci')

env = os.environ.copy()
env['LANG'] = "en_US.utf-8"
env['LANGUAGE'] = "en"

"""
입력된 argument를 파싱하여 dictionary 처럼 사용하게 만들어 주는 parser를 생성하는 함수

:return: argparse.ArgumentParser
"""
def createArgumentParser():
    # 참조: https://docs.python.org/ko/3/library/argparse.html
    # 프로그램 설명
    tmp_parser = argparse.ArgumentParser(description='NIC 목록을 출력하는 프로그',
                                         epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™')

    # 인자 추가: https://docs.python.org/ko/3/library/argparse.html#the-add-argument-method

    # 선택지 추가(동작 선택)
    tmp_parser.add_argument('action', choices=['list', 'gfs-list'], help="disk action")

    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐)
    tmp_parser.add_argument("-v", "--verbose", action='count', default=0,
                            help="increase output verbosity")

    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    tmp_parser.add_argument("-H", "--Human", action='store_const',
                            dest='H', const=True,
                            help="Human readable")

    # Version 추가
    tmp_parser.add_argument("-V", "--Version", action='version',
                            version="%(prog)s 1.0")
    return tmp_parser

"""
PCI 장치의 목록을 출력하는 함수

:return: dict
"""
def listPCIInterface(classify=None):
    list_output = lspci_cmd('-vmm', '-k').splitlines()
    if classify is None:
        list_pci = []
        newpci = {}
        for output in list_output:
            try:
                (k, v) = output.split(':', 1)
                newpci[k] = v.strip()
            except ValueError:
                list_pci.append(newpci)
                newpci = {}
    else:
        list_pci = {}
        newpci = {}
        for output in list_output:
            try:
                (k, v) = output.split(':', 1)
                newpci[k] = v.strip()
            except ValueError:

                if newpci[classify] in list_pci:
                    list_pci[newpci[classify]].append(newpci)
                else:
                    list_pci[newpci[classify]] = [newpci]
                newpci = {}
    return list_pci

"""
디스크의 목록을 출력하는 함수

:return: dict
"""
def listDiskInterface(H=False, classify=None, action=None):
    disk_path = []
    if action != 'gfs-list':
        stream = os.popen("ls -l /dev/disk/by-path/ | awk '{ if($11 != \"\") print substr($11,\"7\",length($11))\" \"\"/dev/disk/by-path/\"$9}'")
        output = stream.read()
        lines = output.splitlines()
        for line in lines:
            line_sp = line.split()
            if len(line_sp) == 2:
                disk_path.append(line_sp)

    item = json.loads(lsblk_cmd(J=True, o="name,path,rota,model,size,state,group,type,tran,subsystems,vendor,wwn"))
    bd = item['blockdevices']
    newbd = []
    for dev in bd:
        if action == 'gfs-list':
            if 'loop' not in dev['type'] and  (dev['tran'] is None or 'usb' not in dev['tran']) and 'cdrom' not in dev['group']:
                for dp in disk_path:
                    if dev["name"] == dp[0]:
                        dev["path"] = dp[1]
                newbd.append(dev)
        else:
            if 'loop' not in dev['type']:
                for dp in disk_path:
                    if dev["name"] == dp[0]:
                        dev["path"] = dp[1]
                newbd.append(dev)

    item['blockdevices'] = newbd

    list_pci = listPCIInterface(classify=classify)
    item['raidcontrollers'] = [
    ]
    for pci in list_pci:
        if 'raid' in pci['Class'].lower() or "Non-Volatile memory controller" in pci['Class']:
            item['raidcontrollers'].append(pci)

    if H:
        return json.dumps(indent=4, obj=json.loads(createReturn(code=200, val=item)))
    return createReturn(code=200, val=item)


"""
PCI 장치와 디스크의 목록을 출력하는 함수

:return: dict
"""
def diskAction(action, H):
    if action == 'list':
        return listDiskInterface(H=H)
    elif action == 'gfs-list':
        return listDiskInterface(H=H,action=action)


if __name__ == '__main__':
    parser = createArgumentParser()
    args = parser.parse_args()
    verbose = (5 - args.verbose) * 10

    # 로깅을 위한 logger 생성, 모든 인자에 default 인자가 있음.
    logger = createLogger(verbosity=logging.CRITICAL, file_log_level=logging.ERROR, log_file='test.log')

    # 실제 로직 부분 호출 및 결과 출력
    ret = diskAction(args.action, H=args.H)
    print(ret)
