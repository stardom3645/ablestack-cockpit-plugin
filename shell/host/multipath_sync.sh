#!/usr/bin/env bash
#########################################
#Copyright (c) 2025 ABLECLOUD Co. Ltd.
#
#Multipath를 모든 호스트끼리 동기화를 하기 위한 쉘 스크립트
#최초작성자 : 정민철 주임
#최초작성일 : 2025-01-08
#########################################
hosts=$(grep "ablecube" /etc/hosts | awk '{print $1}')

for host in $hosts
do
    # 처음 Mpath 활성화 하여 파일듣 가져오기
    /usr/bin/ssh -o StrictHostKeyChecking=no $host mpathconf --enable
    /usr/bin/ssh -o StrictHostKeyChecking=no $host systemctl start multipathd

    sleep 1
    # 처음 셋팅된 mpath 삭제
    /usr/bin/ssh -o StrictHostKeyChecking=no $host systemctl stop multipathd
    /usr/bin/ssh -o StrictHostKeyChecking=no $host multipath -F

    sleep 1
    # 1번에 있는 binding, wwn 을 나머지 노드에 복사
    /usr/bin/scp /etc/multipath/bindings /etc/multipath/wwids $host:/etc/multipath/

    /usr/bin/ssh -o StrictHostKeyChecking=no $host systemctl start multipathd
done