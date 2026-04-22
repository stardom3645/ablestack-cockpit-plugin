#!/bin/sh
#
# Copyright 2015-2021 the Pacemaker project contributors
#
# The version control history for this file may have further details.
#
# This source code is licensed under the GNU General Public License version 2
# or later (GPLv2+) WITHOUT ANY WARRANTY.
#
##############################################################################
# Alert script policy
# ===================
#
# 이 스크립트는 Pacemaker alert agent 예제 스크립트를 기반으로 하며,
# fencing alert 발생 시 무조건 pcs stonith confirm 을 수행하지 않도록
# 보호 로직을 추가한 버전입니다.
#
# 목적
# ----
# 네트워크 단절 상황에서 양쪽 노드가 서로를 UNCLEAN 으로 보고,
# 양쪽 모두 pcs stonith confirm 을 수행하면 공유 스토리지(GFS2 등)에
# 불필요한 IO 가 발생할 수 있습니다.
#
# 특히 split-brain 이 의심되는 상황에서는 자동 진행보다 데이터 보호가
# 더 중요하므로, 아래 정책으로 confirm 을 제한합니다.
#
# 동작 방식
# --------
# 1. fencing alert 중에서도 CRM_alert_desc 가 "lost" 인 경우만 처리합니다.
# 2. 상대 노드의 PCS 관리 IP(CRM_alert_node) 로 60초 동안 ping 을 확인합니다.
#    - 5초 간격
#    - 총 12회 시도
# 3. 60초 내내 ping 실패 시 /run/pcs-confirm-block 파일을 생성합니다.
# 4. block 파일이 존재하는 동안에는 pcs stonith confirm 을 수행하지 않습니다.
# 5. /run 은 tmpfs 이므로 재부팅하면 block 파일이 자동으로 사라집니다.
#
# 설계 의도
# --------
# - 네트워크가 잠깐 복구되더라도 자동으로 confirm 을 다시 수행하지 않습니다.
# - block 해제는 재부팅 또는 운영자의 수동 삭제로만 이뤄지게 합니다.
# - 즉, 가용성보다 split-brain 방지와 불필요한 IO 방지를 우선합니다.
#
# 운영 참고
# --------
# block 파일 수동 해제:
#   rm -f /run/pcs-confirm-block
#
# 주의
# ----
# 이 정책은 보수적인 정책입니다.
# 따라서 실제 노드 장애 상황에서도 자동 confirm 이 지연되거나 차단될 수 있습니다.
# 하지만 공유 스토리지 환경에서 split-brain 으로 인한 동시 IO 방지가 더 중요한 경우
# 이 방식이 더 안전합니다.
##############################################################################

# Explicitly list all environment variables used, to make static analysis happy
: ${CRM_alert_version:=""}
: ${CRM_alert_recipient:=""}
: ${CRM_alert_node_sequence:=""}
: ${CRM_alert_timestamp:=""}
: ${CRM_alert_kind:=""}
: ${CRM_alert_node:=""}
: ${CRM_alert_desc:=""}
: ${CRM_alert_task:=""}
: ${CRM_alert_rsc:=""}
: ${CRM_alert_attribute_name:=""}
: ${CRM_alert_attribute_value:=""}
: ${CRM_alert_interval:=""}
: ${CRM_alert_target_rc:=""}

# Block file path
BLOCK_FILE="/run/pcs-confirm-block"

# No one will probably ever see this echo, unless they run the script manually.
if [ -z "$CRM_alert_version" ]; then
    echo "$0 must be run by Pacemaker version 1.1.15 or later"
    exit 0
fi

# Alert agents must always handle the case where no recipients are defined.
if [ -z "${CRM_alert_recipient}" ]; then
    echo "$0 requires a recipient configured with a full filename path"
    exit 0
fi

debug_exec_order_default="false"

# Pacemaker passes instance attributes to alert agents as environment variables.
: ${debug_exec_order=${debug_exec_order_default}}

if [ "${debug_exec_order}" = "true" ]; then
    tstamp=$(printf "%04d. " "$CRM_alert_node_sequence")
    if [ -n "$CRM_alert_timestamp" ]; then
        tstamp="${tstamp} $CRM_alert_timestamp ($(date "+%H:%M:%S.%06N")): "
    fi
else
    if [ -n "$CRM_alert_timestamp" ]; then
        tstamp="$(date "+%F %H:%M:%S"): "
    else
        tstamp="$(date "+%F %H:%M:%S"): "
    fi
fi

##############################################################################
# Utility functions
##############################################################################

# block 파일 존재 여부 확인
is_confirm_blocked() {
    [ -f "$BLOCK_FILE" ]
}

# block 파일 생성
set_confirm_block() {
    : > "$BLOCK_FILE"
}

# 60초 동안 대상 PCS 관리 IP ping 확인
# - 5초 간격
# - 총 12회
# - 한 번이라도 성공하면 0 반환
# - 끝까지 실패하면 1 반환
check_ping_60s() {
    target_ip="$1"
    attempt=1

    while [ "$attempt" -le 12 ]; do
        if ping -c 1 -W 1 "$target_ip" > /dev/null 2>&1; then
            echo "${tstamp}Ping success to $target_ip on attempt $attempt" >> "${CRM_alert_recipient}"
            return 0
        fi

        echo "${tstamp}Ping failed to $target_ip on attempt $attempt" >> "${CRM_alert_recipient}"
        attempt=$((attempt + 1))
        sleep 5
    done

    return 1
}

##############################################################################
# Main alert handling
##############################################################################

case $CRM_alert_kind in
    node)
        echo "${tstamp}Node '${CRM_alert_node}' is now '${CRM_alert_desc}'" >> "${CRM_alert_recipient}"
        ;;
    fencing)
        # fencing alert 전체를 다 처리하지 않고,
        # 실제로 상대 노드 상실(lost) 상황일 때만 처리합니다.
        if [ "$CRM_alert_desc" != "lost" ]; then
            echo "${tstamp}Ignoring fencing alert because desc='${CRM_alert_desc}'" >> "${CRM_alert_recipient}"
            exit 0
        fi

        sleep 7

        echo "${tstamp}Fencing ${CRM_alert_desc}" >> "${CRM_alert_recipient}"
        # /etc/hosts 에서 fence 리소스 이름에 사용할 hostname 추출
        # hostname=$(grep -w "$CRM_alert_node" /etc/hosts | awk '{print $2}')
        # [ -z "$hostname" ] && hostname="$CRM_alert_node"

        # 이미 네트워크 분리로 인해 block 상태면 confirm 을 수행하지 않음
        # if is_confirm_blocked; then
        #     echo "${tstamp}Confirm is blocked by $BLOCK_FILE, skipping confirm for $CRM_alert_node" >> "${CRM_alert_recipient}"
        #     exit 0
        # fi

        # echo "${tstamp}Checking reachability to PCS management IP $CRM_alert_node for 60 seconds" >> "${CRM_alert_recipient}"

        # 60초 동안 ping 이 계속 실패하면 block 파일을 만들고 confirm 중단
        # if ! check_ping_60s "$CRM_alert_node"; then
        #     echo "${tstamp}PCS management IP $CRM_alert_node unreachable for 60 seconds, creating $BLOCK_FILE and skipping pcs stonith confirm" >> "${CRM_alert_recipient}"
        #     set_confirm_block
        #     exit 0
        # fi

        # ping 성공 시에만 confirm 진행
        # echo "${tstamp}Confirming stonith for $CRM_alert_node" >> "${CRM_alert_recipient}"
        # pcs stonith confirm "$CRM_alert_node" --force >> "${CRM_alert_recipient}" 2>&1

        # echo "${tstamp}Disabling fence-$hostname" >> "${CRM_alert_recipient}"
        # pcs stonith disable "fence-$hostname" >> "${CRM_alert_recipient}" 2>&1

        # echo "${tstamp}Executing stonith for $CRM_alert_node ($hostname)" >> "${CRM_alert_recipient}"
        ;;
    resource)
        if [ "${CRM_alert_interval}" = "0" ]; then
            CRM_alert_interval=""
        else
            CRM_alert_interval=" (${CRM_alert_interval})"
        fi

        if [ "${CRM_alert_target_rc}" = "0" ]; then
            CRM_alert_target_rc=""
        else
            CRM_alert_target_rc=" (target: ${CRM_alert_target_rc})"
        fi

        case ${CRM_alert_desc} in
            Cancelled)
                ;;
            *)
                echo "${tstamp}Resource operation '${CRM_alert_task}${CRM_alert_interval}' for '${CRM_alert_rsc}' on '${CRM_alert_node}': ${CRM_alert_desc}${CRM_alert_target_rc}" >> "${CRM_alert_recipient}"
                ;;
        esac
        ;;
    attribute)
        echo "${tstamp}Attribute '${CRM_alert_attribute_name}' on node '${CRM_alert_node}' was updated to '${CRM_alert_attribute_value}'" >> "${CRM_alert_recipient}"
        ;;
    *)
        echo "${tstamp}Unhandled $CRM_alert_kind alert" >> "${CRM_alert_recipient}"
        env | grep CRM_alert >> "${CRM_alert_recipient}"
        ;;
esac