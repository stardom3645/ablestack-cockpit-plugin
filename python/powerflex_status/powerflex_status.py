import argparse
import math
import os
import requests
import json
import getpass
import urllib3

from ablestack import *

hosts_file_path = "/etc/hosts"
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
    parser.add_argument('action', choices=['status','detail'], help='choose one of the actions')
    # output 민감도 추가(v갯수에 따라 output및 log가 많아짐):
    parser.add_argument('-v', '--verbose', action='count', default=0, help='increase output verbosity')
    # flag 추가(샘플임, 테스트용으로 json이 아닌 plain text로 출력하는 플래그 역할)
    parser.add_argument('-H', '--Human', action='store_const', dest='flag_readerble', const=True, help='Human readable')
    # Version 추가
    parser.add_argument('-V', '--Version', action='version', version='%(prog)s 1.0')

    return parser

def toBytes(size):
    if size < 0:
        return "Invalid byte size"

    #Default unit KB
    units = ['KB', 'MB', 'GB', 'TB', 'PB']

    if size == 0:
        return f"0 {units[0]}"

    exponent = int(math.log(size, 1024))
    exponent = min(exponent, len(units) - 1)
    converted_size = size / math.pow(1024, exponent)
    unit = units[exponent]

    return f"{converted_size:.2f} {unit}"

def Token():

    try:
        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/rest/auth/login'

        payload = json.dumps({
        'username': 'admin',
        'password': 'Ablecloud1!'
        })

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        }

        requests.packages.urllib3.disable_warnings()
        response = requests.post(url, headers=headers, data=payload, verify=False)
        json_object = json.loads(response.text)
        accessToken = str(json_object['access_token'])
        return accessToken
    except Exception as e:
        return createReturn(code=500, val="Token Not Valid")

def SystemId():
    try:
        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        token = Token()

        url = 'https://'+ip_address+'/api/types/System/instances'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }

        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)
        SystemId = str(json_object[0]['id'])

        return SystemId
    except Exception as e:
        return createReturn(code=500, val="System ID Not Found")

def Status():

    try:
        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/rest/auth/login'

        payload = json.dumps({
        'username': 'admin',
        'password': 'Ablecloud1!'
        })

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        }

        requests.packages.urllib3.disable_warnings()
        response = requests.post(url, headers=headers, data=payload, verify=False)
        json_object = json.loads(response.text)
        accessToken = str(json_object['access_token'])
        return createReturn(code=200, val="PowerFlex API Normal Operation")
    except Exception as e:
        return createReturn(code=500, val="PowerFlex API Abnormal Behavior")

def Detail():
    try:
        token = Token()
        system_id = SystemId()

        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/api/instances/System::'+system_id

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }

        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)
        result = json_object['mdmCluster']
        # scvm1 = json_object["mdmCluster"]["master"][0]["ips"][0]
        # scvm2 = json_object["mdmCluster"]["slaves"][0]["ips"][0]
        # scvm3 = json_object["mdmCluster"]["tieBreaker"][0]["ips"][0]

        protection_domains = ProtectionDomain()
        devices = DeviceLs()

        result['protection_domains'] = protection_domains
        result['devices'] = devices

        return createReturn(code=200, val=result)
    except Exception as e :
        # token = json.loads(token)
        # system_id = json.loads(system_id)

        return createReturn(code=500, val='PowerFlex API is Not Supported & ')

def ProtectionDomain():
    try:
        token = Token()
        system_id = SystemId()

        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/api/instances/System::'+system_id+'/relationships/ProtectionDomain'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }
        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)
        result = []

        for i in range(len(json_object)):
            result.append({
                "protection_domain_name": json_object[i]["name"],
                "protection_domain_id": json_object[i]["id"],
                "protection_domain_state": json_object[i]["protectionDomainState"]})

        for i in range(len(result)):
            protection_domain_id = result[i]["protection_domain_id"]
            storage_pools = StoragePool(protection_domain_id)
            capacity = Capacity(protection_domain_id)

            result[i]['storage_pools'] = storage_pools
            result[i]['capacity'] = capacity

        return result
    except Exception as e :
        return result

def StoragePool(protection_domain_id):
    try:
        token = Token()

        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/api/instances/ProtectionDomain::'+protection_domain_id+'/relationships/StoragePool'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }
        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)
        result = []
        for i in range(len(json_object)):
            result.append({
                "storage_pool_name": json_object[i]["name"],
                "storage_pool_id": json_object[i]["id"],
                "storage_pool_mediaType": json_object[i]["mediaType"],
                "storage_pool_sparePercentage": json_object[i]["sparePercentage"]})

        return result
    except Exception as e :
        return result

def DeviceLs():
    try:
        token = Token()

        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/api/types/Device/instances'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }
        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)
        result = []

        state = 0
        for i in range(len(json_object)):
            if json_object[i]["deviceState"] == "Normal":
                state += 1

        result.append({
            "total_disks" : len(json_object),
            "disk_state" : state
        })

        return result
    except Exception as e :
        return result

def Capacity(protection_domain_id):
    try:
        token = Token()

        ip_address = os.popen("grep 'scvm-mngt' /etc/hosts | awk '{print $1}'").read().strip()

        url = 'https://'+ip_address+'/api/instances/ProtectionDomain::'+protection_domain_id+'/relationships/Statistics'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }
        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)
        result = []

        result.append({
            "storage_pool_num": json_object["numOfStoragePools"],
            "unused_capacity":toBytes(json_object["unusedCapacityInKb"]),
            "limit_capacity":toBytes(json_object["capacityLimitInKb"]),
            "used_capacity":toBytes(json_object["capacityInUseInKb"]),
            "volume_allocation_capacity":toBytes(json_object["capacityAvailableForVolumeAllocationInKb"])
        })

        return result
    except Exception as e:
        return result

if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()

    verbose = (5 - args.verbose) * 10
    # 실제 로직 부분 호출 및 결과 출력
    if args.action == 'detail':
        ret = Detail()
        print(ret)
    elif args.action == 'status':
        ret = Status()
        print(ret)