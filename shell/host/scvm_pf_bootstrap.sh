#!/usr/bin/env bash
#########################################
#Copyright (c) 2024 ABLECLOUD Co. Ltd.
#
#powerflex 스토리지를 설정(bootstrap)하는 스크립트
#
#최초작성자 : 정민철 주임(mcjeong@ablecloud.io)
#최초작성일 : 2024-07-17
#########################################
set -x

scvms=$(grep scvm /etc/hosts |  grep pn | awk {'print $1'})
scvms_name=$(grep scvm /etc/hosts | grep pn | awk '{print $2}')
hosts=$(grep ablecube /etc/hosts | grep -v pn | awk {'print $2'})
hosts_pn=$(grep ablecube /etc/hosts | grep pn | awk {'print $1'})
virtual_ip_pn_band=$(grep scvm /etc/hosts| grep pn | awk {'print $1'} | cut -d '.' -f 1,2,3 | head -n 1)
virtual_ip_cn_band=$(grep scvm /etc/hosts| grep cn | awk {'print $1'} | cut -d '.' -f 1,2,3 | head -n 1)
interface_pn=$(ip route list | grep $virtual_ip_pn_band | awk {'print $3'})
interface_cn=$(ip route list | grep $virtual_ip_cn_band | awk {'print $3'})
virtual_ip_pn=$(grep scvm /etc/hosts| grep -v mngt | grep -v cn | awk {'print $1'} | cut -d '.' -f 1,2,3 | head -n 1).250
virtual_ip_cn=$(grep scvm /etc/hosts| grep -v mngt | grep cn | awk {'print $1'} | cut -d '.' -f 1,2,3 | head -n 1).250

################ 모든 SCVM에 activemq,lia,sds 설치 ##################
for scvm in $scvms
do
  ssh -o StrictHostKeyChecking=no $scvm <<EOF
    rpm -ivh /usr/share/ablestack/powerflex/EMC-ScaleIO-activemq-*
    rpm -ivh /usr/share/ablestack/powerflex/EMC-ScaleIO-sds-*
    TOKEN=Ablecloud1! rpm -ivh /usr/share/ablestack/powerflex/EMC-ScaleIO-lia-*
EOF
done

################ 모든 SCVM에 mdm 설치 (Primary, Secondary는 MDM_ROLE_IS_MANAGER=1, TB는 MDM_ROLE_IS_MANAGER=0) ##################
for scvm in $scvms_name
do
  if [ $scvm == "pn-scvm3" ]
  then
     ssh -o StrictHostKeyChecking=no $scvm MDM_ROLE_IS_MANAGER=0 rpm -ivh /usr/share/ablestack/powerflex/EMC-ScaleIO-mdm-*
  else
     ssh -o StrictHostKeyChecking=no $scvm MDM_ROLE_IS_MANAGER=1 rpm -ivh /usr/share/ablestack/powerflex/EMC-ScaleIO-mdm-*
  fi
done

################ CA 인증서 발급 (1번 scvm에서 실행) ##################
python3 /opt/emc/scaleio/mdm/cfg/certificate_generator_MDM_USER.py --generate_ca /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem --password Ablecloud1!
python3 /opt/emc/scaleio/mdm/cfg/certificate_generator_MDM_USER.py --generate_cli /opt/emc/scaleio/mdm/cfg/cli_certificate.p12 -CA /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem --password Ablecloud1!
python3 /opt/emc/scaleio/mdm/cfg/certificate_generator_MDM_USER.py --generate_mdm /opt/emc/scaleio/mdm/cfg/mdm_certificate.pem -CA /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem
python3 /opt/emc/scaleio/mdm/cfg/certificate_generator_MDM_USER.py --generate_mdm /opt/emc/scaleio/mdm/cfg/sec_mdm_certificate.pem -CA /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem

for scvm in $scvms_name
do
  if [ $scvm == "pn-scvm1" ]
  then
    scli --add_certificate --certificate_file /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem
  elif [ $scvm == "pn-scvm2" ]
  then

    scp /opt/emc/scaleio/mdm/cfg/sec_mdm_certificate.pem $scvm:/opt/emc/scaleio/mdm/cfg/mdm_certificate.pem

    scp /opt/emc/scaleio/mdm/cfg/cli_certificate.p12 /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem $scvm:/opt/emc/scaleio/mdm/cfg/

    ssh -o StrictHostKeyChecking=no $scvm scli --add_certificate --certificate_file /opt/emc/scaleio/mdm/cfg/mgmt_ca.pem

    systemctl restart mdm.service
  fi
  systemctl restart mdm.service
done

################ MDM 생성 (1번 scvm에서 실행) ##################
sleep 5

for scvm in $scvms_name
do
scvm_name=$(grep $scvm /etc/hosts | awk '{split($2,a,"-"); print a[1]}')
scvms_cn=$(grep $scvm_name /etc/hosts| grep -v mngt | grep cn | awk {'print $1'})
scvms_pn=$(grep $scvm_name /etc/hosts| grep -v mngt | grep  -v cn | awk {'print $1'})

  if [ $scvm == "pn-scvm1" ]
  then
    scli --create_mdm_cluster --primary_mdm_ip $scvms_pn,$scvms_cn --primary_mdm_management_ip $scvms_pn,$scvms_cn --primary_mdm_name MDM1 --cluster_virtual_ip $virtual_ip_pn,$virtual_ip_cn --primary_mdm_virtual_ip_interface $interface_pn,$interface_cn --accept_license --approve_certificate
    sleep 1
    scli --login --p12_path /opt/emc/scaleio/mdm/cfg/cli_certificate.p12 --p12_password Ablecloud1!

  elif [ $scvm == "pn-scvm2" ]
  then
    sleep 1
    scli --add_standby_mdm --new_mdm_ip $scvms_pn,$scvms_cn --mdm_role manager --new_mdm_management_ip $scvms_pn,$scvms_cn --new_mdm_virtual_ip_interface $interface_pn,$interface_cn --new_mdm_name MDM2 --i_am_sure
  else
    sleep 1
    scli --add_standby_mdm --new_mdm_ip $scvms_pn,$scvms_cn --mdm_role tb --new_mdm_name MDM3 --i_am_sure
  fi
done

  sleep 1
################ 3노드로 클러스터링 (1번 scvm에서 실행) ##################
  scli --switch_cluster_mode --cluster_mode 3_node --add_secondary_mdm_name MDM2 --add_tb_name MDM3

################ 보호 도메인 생성 (1번 scvm에서 실행) ##################
  scli --add_protection_domain --protection_domain_name PD1

################ 스토리지 풀 생성 (1번 scvm에서 실행) ##################
  scli --add_storage_pool --protection_domain_name PD1 --dont_use_rmcache --media_type SSD --data_layout medium_granularity --storage_pool_name SP1

################ sds 생성 (1번 scvm에서 실행) ##################
for scvm in $scvms_name
do
scvm_name=$(grep $scvm /etc/hosts | awk '{split($2,a,"-"); print a[1]}')
scvms_cn=$(grep $scvm_name /etc/hosts| grep -v mngt | grep cn | awk {'print $1'})
scvms_pn=$(grep $scvm_name /etc/hosts| grep -v mngt | grep  -v cn | awk {'print $1'})

  if [ $scvm == "pn-scvm1" ]
  then
    scli --add_sds --sds_ip $scvms_pn,$scvms_cn --protection_domain_name PD1 --storage_pool_name SP1 --disable_rmcache --sds_name SDS1
  elif [ $scvm == "pn-scvm2" ]
  then
    scli --add_sds --sds_ip $scvms_pn,$scvms_cn --protection_domain_name PD1 --storage_pool_name SP1 --disable_rmcache --sds_name SDS2
  else
    scli --add_sds --sds_ip $scvms_pn,$scvms_cn --protection_domain_name PD1 --storage_pool_name SP1 --disable_rmcache --sds_name SDS3
  fi
done

################ 보호도메인, 스토리지 풀 설정 (1번 scvm에서 실행) ##################
scli --modify_spare_policy --protection_domain_name PD1 --storage_pool_name SP1 --spare_percentage 34 --i_am_sure

sleep 1
################ 물리 디스크 sds에  설정 (1번 scvm에서 실행) ##################
for scvm in $scvms_name
do
ssd_disk_name=$(ssh -o StrictHostKeyChecking=no $scvm lsblk -d -o name,rota,type | grep disk | awk '$2 == 0 {print $1}')

  if [ $scvm == "pn-scvm1" ]
  then
    for disks in $ssd_disk_name
    do
        scli --add_sds_device --sds_name SDS1 --storage_pool_name SP1 --device_path /dev/$disks --force_device_takeover
    done
  elif [ $scvm == "pn-scvm2" ]
  then
    for disks in $ssd_disk_name
    do
        scli --add_sds_device --sds_name SDS2 --storage_pool_name SP1 --device_path /dev/$disks --force_device_takeover
    done
  else
    for disks in $ssd_disk_name
    do
        scli --add_sds_device --sds_name SDS3 --storage_pool_name SP1 --device_path /dev/$disks --force_device_takeover
    done
  fi

done

################ 호스트 sdc rpm 설치 및 scini 커널 버전으로 재구성 (1번 scvm에서 실행) ##################
for host in $hosts
do
  ssh -o StrictHostKeyChecking=no $host <<EOF
      MDM_IP=$virtual_ip_pn,$virtual_ip_cn rpm -ivh /usr/share/ablestack/powerflex/EMC-ScaleIO-sdc-*
      tar -xvf /bin/emc/scaleio/scini_sync/driver_cache/RHEL9/4.5.2100.105/Dell-PowerFlex-scini_builder-*.tgz -C /bin/emc/scaleio/scini_sync/driver_cache/RHEL9/4.5.2100.105/
      sh /bin/emc/scaleio/scini_sync/driver_cache/RHEL9/4.5.2100.105/build_driver.sh
      systemctl restart scini
      systemctl enable --now sdcd.service
EOF

done

sleep 10
################ CCVM 볼륨 생성 및 매핑 (1번 scvm에서 실행) ##################
scli --add_volume --protection_domain_name PD1 --storage_pool_name SP1 --size_gb 512  --volume_name ccvm --thin_provisioned

for host in $hosts_pn
do
  scli --map_volume_to_host --volume_name ccvm --sdc_ip $host --allow_multi_map
done

for scvm in $scvms
do
  ssh -o StrictHostKeyChecking=no $scvm rm -rf /root/bootstrap.sh
done

exit