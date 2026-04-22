#!/usr/bin/env bash
#########################################
# Copyright (c) 2021 ABLECLOUD Co. Ltd.
#
# ccvm 초기화(bootstrap)하는 스크립트
#
# 최초작성자 : 윤여천 책임(ycyun@ablecloud.io)
# 최초작성일 : 2021-04-12
#########################################

set -x

LOGFILE="/var/log/cloud_install.log"
DATABASE_PASSWD="Ablecloud1!"

os_type=$(cat /etc/cluster.json | grep '"type"' | awk -F'"' '{print $4}')
hosts=$(grep -v mngt /etc/hosts | grep -v scvm | grep -v pn | grep -v localhost | awk '{print $1}')

log_and_run() {
  "$@" 2>&1 | tee -a "$LOGFILE"
  local rc=$?
  return $rc
}

run_python_or_exit() {
  local script_path="$1"
  shift

  python3 "$script_path" "$@" 2>&1 | tee -a "$LOGFILE"
  local rc=$?

  if [ $rc -ne 0 ]; then
    echo "$(basename "$script_path") failed" | tee -a "$LOGFILE"
    exit 1
  fi
}

################# firewall setting

systemctl enable --now mysqld

firewall-cmd --permanent --zone=public --add-service=mysql 2>&1 | tee -a "$LOGFILE"
firewall-cmd --reload 2>&1 | tee -a "$LOGFILE"
firewall-cmd --list-all 2>&1 | tee -a "$LOGFILE"

# 라이선스 종류에 따라 설정 $1="hv" or "ablestack" or "clostack"
sh /usr/share/cloudstack-common/scripts/util/update-mold-theme-from-license.sh "$1"

if [ "${os_type}" = "ablestack-hci" ]; then
  # Crushmap 설정 추가 (ceph autoscale)
  scvm=$(grep scvm-mngt /etc/hosts | awk '{print $1}')
  ssh -o StrictHostKeyChecking=no "$scvm" /usr/local/sbin/setCrushmap.sh
fi

################# resize partition

sgdisk -e /dev/vda
parted --script /dev/vda resizepart 3 100%
pvresize /dev/vda3
lvcreate rl -n nfs --extents 100%FREE
mkfs.xfs /dev/rl/nfs

mkdir -p /nfs
echo '/dev/mapper/rl-nfs /nfs xfs defaults 0 0' >> /etc/fstab
echo '/nfs *(rw,no_root_squash,async)' >> /etc/exports
systemctl enable --now nfs-server.service

mkdir -p /nfs/primary
mkdir -p /nfs/secondary

################# Setting Database

mysqladmin -uroot password "$DATABASE_PASSWD"
systemctl enable --now mold-usage.service

cloudstack-setup-databases cloud:$DATABASE_PASSWD --deploy-as=root:$DATABASE_PASSWD 2>&1 | tee -a "$LOGFILE"

# 글로벌설정 DB 업데이트
global_settings=(
  "enable.vm.network.filter.allow.all.traffic=true"
)

for i in "${global_settings[@]}"; do
  IFS='=' read -r key value <<< "$i"

  if [[ -n "$key" && -n "$value" ]]; then
    mysql --user=root --password="$DATABASE_PASSWD" -e \
      "USE cloud; UPDATE configuration SET value='$value' WHERE name='$key';" \
      2>/dev/null | tee -a "$LOGFILE"
  else
    echo "잘못된 설정 항목: $i" | tee -a "$LOGFILE"
  fi
done

################# Management setup

cloudstack-setup-management 2>&1 | tee -a "$LOGFILE"
if [ $? -ne 0 ]; then
  echo "cloudstack-setup-management failed" | tee -a "$LOGFILE"
  exit 1
fi

################# Site Root CA initialize
# 사이트 단위 Root CA는 ccvm에서 1회 생성/재사용합니다.
# Cube(Cockpit) 포트는 템플릿에서 19100으로 미리 맞추기로 했으므로
# 여기서는 포트 변경을 하지 않습니다.

BOOTSTRAP_DIR="/usr/share/cockpit/ablestack/python/deploy_https"
CUBE_HTTPS_SCRIPT="$BOOTSTRAP_DIR/deploy_cockpit_https_all.py"
chmod 755 "$BOOTSTRAP_DIR"

run_python_or_exit "$BOOTSTRAP_DIR/init_site_root_ca.py"

################# HTTPS deploy
# 순서:
# 1) Mold
# 2) Wall
# 3) Netdive
# 4) Glue (ablestack-hci 일 때만)

run_python_or_exit "$BOOTSTRAP_DIR/deploy_mold_https.py"
run_python_or_exit "$BOOTSTRAP_DIR/deploy_wall_https.py"
run_python_or_exit "$BOOTSTRAP_DIR/deploy_netdive_https.py"

if [ "${os_type}" = "ablestack-hci" ]; then
  run_python_or_exit "$BOOTSTRAP_DIR/deploy_glue_https.py" --os-type "${os_type}"
else
  echo "Glue deploy skipped for os_type=${os_type}" | tee -a "$LOGFILE"
fi

################# Post bootstrap step
# Cube(Cockpit) HTTPS 인증서는 별도 후속 단계로 적용합니다.
# 부트스트랩 완료 후 deploy_cockpit_https_all.py 를 명시적으로 실행합니다.

echo "Cube(Cockpit) HTTPS deployment is intentionally not executed during ccvm bootstrap." | tee -a "$LOGFILE"
if [ -f "$CUBE_HTTPS_SCRIPT" ]; then
  echo "Next step: run python3 $CUBE_HTTPS_SCRIPT" | tee -a "$LOGFILE"
else
  echo "Next step: deploy Cube(Cockpit) HTTPS separately after bootstrap (expected script: $CUBE_HTTPS_SCRIPT)" | tee -a "$LOGFILE"
fi

################# Mold service

systemctl enable mold.service

# UEFI 설정 파일 생성
# echo -e "guest.nvram.template.secure=/usr/share/edk2/ovmf/OVMF_VARS.secboot.fd
# guest.nvram.template.legacy=/usr/share/edk2/ovmf/OVMF_VARS.fd
# guest.loader.secure=/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd
# guest.loader.legacy=/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd
# guest.nvram.path=/var/lib/libvirt/qemu/nvram/" > /root/uefi.properties
#
# for host in $hosts
# do
#   scp -o StrictHostKeyChecking=no /root/uefi.properties $host:/etc/cloudstack/agent/
# done
#
# rm -rf /root/uefi.properties

################# TPM 설정 파일 생성

echo -e "host.tpm.enable=true" > /root/tpm.properties

for host in $hosts; do
  scp -o StrictHostKeyChecking=no /root/tpm.properties "$host:/etc/cloudstack/agent/"
done

rm -rf /root/tpm.properties

################# systemvm template 등록

/usr/share/cloudstack-common/scripts/storage/secondary/cloud-install-sys-tmplt \
  -m /nfs/secondary \
  -f /usr/share/ablestack/systemvmtemplate-* \
  -h kvm -F

################# pacemaker / corosync

if [ "${os_type}" != "ablestack-standalone" ]; then
  for host in $hosts; do
    ssh -o StrictHostKeyChecking=no "$host" /usr/bin/systemctl enable --now pacemaker
    ssh -o StrictHostKeyChecking=no "$host" /usr/bin/systemctl enable --now corosync
  done
fi

################# cron jobs

# 06시 Mold 서비스 재시작 스크립트 등록
#(crontab -l 2>/dev/null; echo "0 6 * * * /usr/bin/systemctl restart mold.service") | crontab -

# ccvm 로그 정리 스크립트 등록
(crontab -l 2>/dev/null; echo "0 0 * * 7 /usr/local/sbin/ccvm_log_maintainer.sh") | crontab -

# ccvm mold db 백업
(crontab -l 2>/dev/null; echo "0 1 * * * /usr/bin/python3 /usr/share/ablestack/backup_mysql.py") | crontab -

# Delete bootstrap script file
rm -rf /root/bootstrap.sh
