#!/usr/bin/env bash
#########################################
# Copyright (c) 2021 ABLECLOUD Co. Ltd.
# glue dashboard가 변경된 경우 saml 설정 변경
#########################################

# ---------------------------------------------
# Keycloak 환경 설정
# ---------------------------------------------
HOST_IP=$(grep -E "ccvm" /etc/hosts | awk '{print $1}')
KC_URL="http://$HOST_IP:7070"       # Keycloak 접속 URL

# 클라이언트 설정(GLUE)
SCVM_HOSTS=$(grep -E "scvm[0-9]+-mngt" /etc/hosts)  # 전체 scvm
CERT_TARGET_PATH="/etc/ceph"                        # 인증서 경로

# ---------------------------------------------
# GLUE SAML 설정 변경
# ---------------------------------------------

# 각 scvm 조회
if [ -n "$SCVM_HOSTS" ]; then
echo "$SCVM_HOSTS" | while read -r LINE; do
  SCVM_HOST_IP=$(echo "$LINE" | awk '{print $1}')
  SCVM_HOST_NAME=$(echo "$LINE" | awk '{print $2}')

  ROOT_URL_GLUE="https://$SCVM_HOST_IP:19200"

# 원격 서버($SCVM_HOST_NAME)에서 MGR 컨테이너 검색
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SCVM_HOST_NAME" \
  CERT_TARGET_PATH="$CERT_TARGET_PATH" \
  KC_URL="$KC_URL" \
  ROOT_URL_GLUE="$ROOT_URL_GLUE" \
  bash <<'SSH_EOF'

  # echo "[INFO] Ceph MGR 컨테이너 검색 중..."
  MGR_CONTAINER=$(podman ps --format '{{.Names}}' | grep -E 'mgr' | head -n 1)

  if [ -z "$MGR_CONTAINER" ]; then
    echo "[ERROR] MGR 컨테이너를 찾을 수 없습니다."
    # podman ps --format '{{.Names}}'
  else
    echo "[INFO] MGR 컨테이너 발견: $MGR_CONTAINER"

    # Ceph Dashboard SSO (SAML2) 자동 설정 — Active MGR 에서만 실행
    # echo "[INFO] Ceph Dashboard SSO 설정 적용 대상 확인 중..."
    ACTIVE_MGR=$(podman exec "$MGR_CONTAINER" ceph mgr dump | jq -r '.active_name' | cut -d'.' -f1)

    if [[ "$ACTIVE_MGR" == "$(hostname)" ]]; then
      echo "[INFO] 현재 노드($(hostname))는 Active MGR 입니다."

      CURRENT_SP_ENTITYID=$(podman exec "$MGR_CONTAINER" ceph dashboard sso show saml2 \
                          | jq -r '.onelogin_settings.sp.entityId' | sed 's|\(https://[^/]*\)/.*|\1|')

      # echo "[INFO] 현재 SP EntityID: $CURRENT_SP_ENTITYID"
      if [ -z "$CURRENT_SP_ENTITYID" ]; then
        echo "[WARN] 기존 SAML 설정이 없습니다. Setup 수행."
        NEED_SETUP=true
      else
        echo "[INFO] 현재 SP EntityID: $CURRENT_SP_ENTITYID"
        echo "[INFO] 변경할 SP EntityID(ROOT_URL_GLUE): $ROOT_URL_GLUE"

        if [[ "$CURRENT_SP_ENTITYID" != "$ROOT_URL_GLUE" ]]; then
          echo "[INFO] SP EntityID가 다릅니다. SAML2 설정을 다시 적용합니다."
          NEED_SETUP=true
        else
          echo "✅ 현재 노드($(hostname)) SP EntityID가 동일하므로 SAML2 설정을 재적용하지 않습니다."
          NEED_SETUP=false
        fi
      fi

      if [ "$NEED_SETUP" = true ]; then
        podman exec -e ROOT_URL_GLUE="$ROOT_URL_GLUE" \
                    -e KC_URL="$KC_URL" \
                    -e CERT_TARGET_PATH="$CERT_TARGET_PATH" \
                    "$MGR_CONTAINER" \
                    bash -c 'ceph dashboard sso setup saml2 \
                      "$ROOT_URL_GLUE" \
                      "$CERT_TARGET_PATH/idp_metadata.xml" \
                      "username" \
                      "$KC_URL/realms/saml" \
                      "$CERT_TARGET_PATH/sp.crt" \
                      "$CERT_TARGET_PATH/sp.key"'

        if [ $? -ne 0 ]; then
          echo "[ERROR] SSO 설정 실패"
        else
          echo "✅ 현재 노드($(hostname)) Active MGR에서 SSO 설정 완료"
        fi
      fi

    else
      echo "✅ 현재 노드($(hostname))는 Standby MGR 입니다. SSO 설정을 건너뜁니다."
    fi
  fi

SSH_EOF

  done

else
  echo "[INFO] SCVM 호스트 정보가 없습니다. 실행을 건너뜁니다."
fi

echo "==============================="
echo "Glue Saml SSO 설정 완료"
echo "==============================="
