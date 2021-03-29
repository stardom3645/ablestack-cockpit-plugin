#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from Crypto.PublicKey import RSA
from Crypto.Hash import SHA256
from Crypto import Random

# 난수를 생성하여 RSA 키 객체를 만들어 key 변수에 할당합니다.
random_generator = Random.new().read  # 난수 생성
code = 'nooneknows'  # 기초 키 코드
key = RSA.generate(2048, random_generator)  # RSA 키 객체 생성

# 공개키를 만들고 암호화 합니다.
# encrypted는 튜플 객체를 반환하며 첫 번째 아이템에는 키 정보를, 두 번째 아이템은 항상 None을 반환합니다.
# 암호화 키 생성
encrypted_key = key.exportKey(passphrase=code, pkcs=8, protection="scryptAndAES128-CBC")


