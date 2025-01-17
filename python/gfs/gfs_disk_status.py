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
from collections import defaultdict, OrderedDict
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
def get_gfs2_mounts():
    """
    GFS2 파일 시스템으로 마운트된 디스크 목록을 반환합니다.
    """
    mounts = os.popen("mount | grep gfs2").read().splitlines()
    gfs2_mounts = []

    for mount in mounts:
        parts = mount.split()
        if len(parts) >= 3:
            device = parts[0]  # ex) /dev/mapper/vg_glue-lv_glue
            mountpoint = parts[2]  # ex) /mnt/glue-gfs
            gfs2_mounts.append((device, mountpoint))

    return gfs2_mounts


def filter_gfs2_mounted_devices(blockdevices, gfs2_mounts):
    """
    GFS2로 마운트된 디스크만 필터링합니다.
    - LVM 경로, 멀티패스 경로, 마운트 경로만 반환합니다.
    """
    filtered_devices = []

    for device in blockdevices:
        if 'children' in device:
            for child in device['children']:
                if 'children' in child:
                    for sub_child in child['children']:
                        if 'children' in sub_child:
                            for lvm in sub_child['children']:
                                for gfs2_dev, gfs2_mount in gfs2_mounts:
                                    if lvm['path'] == gfs2_dev:
                                        filtered_devices.append({
                                            "lvm": lvm['path'],
                                            "multipath": sub_child['path'],
                                            "device": device['path'],
                                            "mountpoint": gfs2_mount,
                                            "size": lvm['size']
                                        })
    return filtered_devices

def group_by_mountpoint(devices):
    """
    mountpoint 기준으로 그룹화하고, multipath와 device를 배열로 묶음
    """
    grouped = defaultdict(lambda: {"lvm": "", "multipaths": [], "devices": [], "size": ""})

    for dev in devices:
        mountpoint = dev["mountpoint"]
        grouped[mountpoint]["lvm"] = dev["lvm"]
        grouped[mountpoint]["size"] = dev["size"]
        grouped[mountpoint]["multipaths"].append(dev["multipath"])
        grouped[mountpoint]["devices"].append(dev["device"])

    # 결과를 리스트 형태로 변환
    return [
        {
            "lvm": value["lvm"],
            "mountpoint": key,
            "size": value["size"],
            "multipaths": list(set(value["multipaths"])),
            "devices": list(set(value["devices"]))
        }
        for key, value in grouped.items()
    ]


def listDiskInterface(H=False, classify=None):
    mode = "multi" if os.popen("systemctl is-active multipathd").read().strip() == "active" else "single"

    # GFS2 마운트 정보 수집
    gfs2_mounts = get_gfs2_mounts()

    # 디스크 정보 수집
    item = json.loads(lsblk_cmd(J=True, o="name,path,size,group,type,mountpoint"))
    bd = item['blockdevices']

    # GFS2로 마운트된 디스크만 필터링
    filtered_devices = filter_gfs2_mounted_devices(bd, gfs2_mounts)

    # mountpoint 기준으로 그룹화
    grouped_devices = group_by_mountpoint(filtered_devices)

    # 결과 구성
    result = OrderedDict([
        ("mode", mode),
        ("blockdevices", grouped_devices)
    ])

    # 마운트된 디스크가 없으면 500 코드 반환
    if len(grouped_devices) == 0:
        return createReturn(code=500, val={"message": "GFS2로 마운트된 디스크가 없습니다."})

    return createReturn(code=200, val=result)



if __name__ == '__main__':
    parser = createArgumentParser()
    args = parser.parse_args()

    # 결과 출력
    ret = listDiskInterface()
    print(ret)
