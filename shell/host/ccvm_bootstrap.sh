#!/usr/bin/env bash
#########################################
#Copyright (c) 2021 ABLECLOUD Co. Ltd.
#
#ccvm 초기화(bootstrap)하는 스크립트
#
#최초작성자 : 윤여천 책임(ycyun@ablecloud.io)
#최초작성일 : 2021-04-12
#########################################

set -x
LOGFILE="/var/log/cloud_install.log"

hosts=$(grep -v mngt /etc/hosts | grep -v scvm | grep -v pn | grep -v localhost | awk {'print $1'})

systemctl enable --now mysqld
DATABASE_PASSWD="Ablecloud1!"
################# firewall setting

firewall-cmd --permanent --zone=public --add-service=mysql 2>&1 | tee -a $LOGFILE
firewall-cmd --reload
firewall-cmd --list-all 2>&1 | tee -a $LOGFILE

# resize partition
sgdisk -e /dev/vda
parted --script /dev/vda resizepart 3 100%
pvresize /dev/vda3
lvcreate rl -n nfs --extents 100%FREE
mkfs.xfs /dev/rl/nfs
mkdir /nfs
echo  '/dev/mapper/rl-nfs /nfs                    xfs    defaults        0 0' >> /etc/fstab
echo '/nfs *(rw,no_root_squash,async)' >> /etc/exports
systemctl enable --now nfs-server.service

mkdir /nfs/primary
mkdir /nfs/secondary

# Crushmap 설정 추가 (ceph autoscale)
scvm=$(grep scvm-mngt /etc/hosts | awk {'print $1'})
ssh -o StrictHostKeyChecking=no $scvm /usr/local/sbin/setCrushmap.sh

################# Setting Database
mysqladmin -uroot password $DATABASE_PASSWD
systemctl enable --now mold-usage
cloudstack-setup-databases cloud:$DATABASE_PASSWD --deploy-as=root:$DATABASE_PASSWD  2>&1 | tee -a $LOGFILE

for i in "${global_settings[@]}"
do
  key=$(echo $i | cut -d "=" -f 1)
  value=$(echo $i | cut -d "=" -f 2)
  mysql --user=root --password=$DATABASE_PASSWD -e "use cloud; UPDATE configuration SET value='$value' where name='$key';"  2>&1 | tee -a $LOGFILE
done

cloudstack-setup-management  2>&1 | tee -a $LOGFILE

systemctl enable --now mold-management

#UEFI 설정 파일 생성
echo -e "guest.nvram.template.secure=/usr/share/edk2/ovmf/OVMF_VARS.secboot.fd
guest.nvram.template.legacy=/usr/share/edk2/ovmf/OVMF_VARS.fd
guest.loader.secure=/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd
guest.loader.legacy=/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd
guest.nvram.path=/var/lib/libvirt/qemu/nvram/" > /root/uefi.properties

for host in $hosts
do
  scp -o StrictHostKeyChecking=no /root/uefi.properties $host:/etc/cloudstack/agent/
done

rm -rf /root/uefi.properties


#tpm 설정 파일 생성
echo -e "host.tpm.enable=true" > /root/tpm.properties

for host in $hosts
do
  scp -o StrictHostKeyChecking=no /root/tpm.properties $host:/etc/cloudstack/agent/
done

rm -rf /root/tpm.properties

#systemvm template 등록
/usr/share/cloudstack-common/scripts/storage/secondary/cloud-install-sys-tmplt \
-m /nfs/secondary \
-f /usr/share/ablestack/systemvmtemplate-* \
-h kvm -F

for host in $hosts
do
  ssh -o StrictHostKeyChecking=no $host /usr/bin/systemctl enable --now pacemaker
  ssh -o StrictHostKeyChecking=no $host /usr/bin/systemctl enable --now corosync
done

# 06시 Mold 서비스 재시작 스크립트 등록
(crontab -l 2>/dev/null; echo "0 6 * * * /usr/bin/systemctl restart mold-management") | crontab -

# ccvm 로그 정리 스크립트 등록
(crontab -l 2>/dev/null; echo "0 0 * * 7 /usr/local/sbin/ccvm_log_maintainer.sh") | crontab -

# Delete bootstrap script file
rm -rf /root/bootstrap.sh
