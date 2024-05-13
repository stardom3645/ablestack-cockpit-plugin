#!/usr/bin/env bash
#########################################
#Copyright (c) 2021 ABLECLOUD Co. Ltd.
#
#ccvm 초기화(bootstrap)하는 스크립트
#
#최초작성자 : 배태주
#최초작성일 : 2023-05-19
#########################################
set -x
LOGFILE="/var/log/gwvm_install.log"

# hosts=$(grep -v mngt /etc/hosts | grep -v scvm | grep -v pn | grep -v localhost | awk {'print $1'})

################# firewall setting
firewall-cmd --permanent --zone=public --add-port=9100/tcp 2>&1 | tee -a $LOGFILE
firewall-cmd --permanent --zone=public --add-port=9095/tcp 2>&1 | tee -a $LOGFILE
firewall-cmd --permanent --zone=public --add-port=5050/tcp 2>&1 | tee -a $LOGFILE
firewall-cmd --permanent --zone=public --add-port=3260/tcp 2>&1 | tee -a $LOGFILE

firewall-cmd --permanent --zone=public --add-service=ceph 2>&1 | tee -a $LOGFILE
firewall-cmd --permanent --zone=public --add-service=ceph-mon 2>&1 | tee -a $LOGFILE
firewall-cmd --permanent --zone=public --add-service=iscsi-target 2>&1 | tee -a $LOGFILE
firewall-cmd --reload
firewall-cmd --list-all 2>&1 | tee -a $LOGFILE

#ceph 키 복사
scp -q -o StrictHostKeyChecking=no root@scvm-mngt:/etc/ceph/* /etc/ceph/

<<<<<<< HEAD
# smb_construction.sh 파일 복사
scp -q -o StrictHostKeyChecking=no root@scvm-mngt:/usr/share/cockpit/ablestack/shell/host/smb_construction.sh /usr/local/samba/sbin/

=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
<<<<<<< HEAD
>>>>>>> 398d54f (테스트 개선사항 반영)
=======
>>>>>>> 7525f05 (삼바 방화벽 설정 및 spec 파일 추가)
>>>>>>> ed9f2a9 (삼바 방화벽 설정 및 spec 파일 추가)
# hostname=$(hostname)
# ip=$(hostname -i)

# ceph orch host add $hostname $ip

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 0d87bff (삼바 방화벽 설정 및 spec 파일 추가)
=======
>>>>>>> 05b952d (테스트 개선사항 반영)
>>>>>>> 398d54f (테스트 개선사항 반영)
# Delete bootstrap script file
rm -rf /root/bootstrap.sh
