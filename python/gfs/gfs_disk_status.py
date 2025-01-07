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
from collections import OrderedDict
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
def filter_mpath_only(blockdevices):
    """
    Filters blockdevices based on multipathd status:
    - If active, include only children with type 'mpath'.
    - If inactive, include only children with mountpoint '/mnt/glue-gfs'.
    """
    filtered_devices = []
    mpath_status = os.popen("systemctl is-active multipathd").read().strip()

    for device in blockdevices:
        if 'children' in device:
            filtered_children = []
            for child in device['children']:
                if mpath_status == "active":
                    # Filter for type 'mpath' when multipathd is active
                    if child.get('type') == 'mpath':
                        filtered_children.append(child)
                elif mpath_status == "inactive":
                    # Filter for mountpoint '/mnt/glue-gfs' when multipathd is inactive
                    if 'children' in child:  # Check if child has nested children
                        nested_children = []
                        for nested_child in child['children']:
                            if nested_child.get('mountpoint') == '/mnt/glue-gfs':
                                nested_children.append(nested_child)
                        if nested_children:
                            child['children'] = nested_children
                            filtered_children.append(child)
            if filtered_children:
                device['children'] = filtered_children
                filtered_devices.append(device)
    return filtered_devices


from collections import OrderedDict

def listDiskInterface(H=False, classify=None):
    disk_path = []
    mode = ""
    mpath_status = os.popen("systemctl is-active multipathd").read().strip()

    if mpath_status == "active":
        mode = "multi"
    elif mpath_status == "inactive":
        mode = "single"

    item = json.loads(lsblk_cmd(J=True, o="name,path,rota,model,size,state,group,type,tran,subsystems,vendor,wwn,mountpoint"))
    bd = item['blockdevices']
    newbd = []
    for dev in bd:
        if 'loop' not in dev['type'] and (dev['tran'] is None or 'usb' not in dev['tran']) and 'cdrom' not in dev['group']:
            for dp in disk_path:
                if dev["name"] == dp[0]:
                    dev["path"] = dp[1]
            newbd.append(dev)

    # Filter devices to include only mpath type children
    newbd = filter_mpath_only(newbd)
    item['blockdevices'] = newbd

    list_pci = listPCIInterface(classify=classify)
    item['raidcontrollers'] = [
    ]
    for pci in list_pci:
        if 'raid' in pci['Class'].lower() or "Non-Volatile memory controller" in pci['Class']:
            item['raidcontrollers'].append(pci)

    # Rearrange the order to make 'mode' the first key
    ordered_item = OrderedDict([
        ("mode", mode),
        ("blockdevices", item['blockdevices']),
        ("raidcontrollers", item['raidcontrollers'])
    ])

    if len(item['blockdevices']) == 0:
        return createReturn(code=500, val=ordered_item)
    return createReturn(code=200, val=ordered_item)

if __name__ == '__main__':
    parser = createArgumentParser()
    args = parser.parse_args()
    verbose = (5 - args.verbose) * 10

    # 로깅을 위한 logger 생성, 모든 인자에 default 인자가 있음.
    logger = createLogger(verbosity=logging.CRITICAL, file_log_level=logging.ERROR, log_file='test.log')

    # 실제 로직 부분 호출 및 결과 출력
    ret = listDiskInterface()
    print(ret)
