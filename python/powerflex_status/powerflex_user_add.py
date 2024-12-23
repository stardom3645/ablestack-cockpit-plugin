import argparse
import math
import os
import socket
import subprocess
import requests
import json
import getpass
import urllib3

from ablestack import *

hosts_file_path = "/etc/hosts"
json_file_path = pluginpath+"/tools/properties/cluster.json"

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
    parser = argparse.ArgumentParser(description='클러스터 설정 파일 cluster.json을 기준으로 /etc/hosts 파일을 세팅하는 프로그램',
                                        epilog='copyrightⓒ 2021 All rights reserved by ABLECLOUD™',
                                        usage='%(prog)s arguments')
    # 인자 추가: https://docs.python.org/ko/3/library/argparse.html#the-add-argument-method
    parser.add_argument('action', choices=['status','add'], help='choose one of the actions')
    parser.add_argument('--username', metavar='[PowerFlex Manager User Name]', type=str, help='input Value to PowerFlex Manager User Name')
    parser.add_argument('--password', metavar='[PowerFlex Manager User Password]', type=str, help='input Value to PowerFlex Manager User Password')
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

json_data = openClusterJson()
hostname = os.popen("hostname").read().strip()
for i in range(len(json_data["clusterConfig"]["hosts"])):
    if json_data["clusterConfig"]["hosts"][i]["hostname"] == hostname:
        ip_address = json_data["clusterConfig"]["hosts"][i]["scvmMngt"]

def Powerflex_Auth_Status():
    try:
        url = 'https://'+ip_address+'/auth/realms/powerflex'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        }

        requests.packages.urllib3.disable_warnings()
        response = requests.get(url, headers=headers, verify=False)
        json_object = json.loads(response.text)

        return createReturn(code=response.status_code, val=json_object)
    except Exception as e:
        return createReturn(code=500, val="System ID Not Found")

def Token(username, password):

    try:
        url = 'https://'+ip_address+'/rest/auth/login'

        payload = json.dumps({
        'username': f'{username}',
        'password': f'{password}'
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

def UserAdd(args):
    try:

        token = Token(args.username,args.password)

        url = 'https://'+ip_address+'/rest/v1/users'

        headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        }

        payload = json.dumps({
            'username': 'ablecloud',
            'is_enabled': True,
            'role': 'Monitor',
            'first_name': 'able',
            'last_name': 'cloud',
            'password': 'Ablecloud1!',
            'is_temporary': False,
            'type': 'Local'
        })
        requests.packages.urllib3.disable_warnings()
        response = requests.post(url, headers=headers, data=payload, verify=False)
        json_object = json.loads(response.text)

        return createReturn(code=200, val=json_object)
    except Exception as e:
        return createReturn(code=500, val="PowerFlex User Add Error")


if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()

    verbose = (5 - args.verbose) * 10
    # 실제 로직 부분 호출 및 결과 출력
    if args.action == 'status':
        ret = Powerflex_Auth_Status()
        print(ret)
    elif args.action == 'add':
        ret = UserAdd(args)
        print(ret)