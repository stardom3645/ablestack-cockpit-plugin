#!/bin/bash
# Copyright (c) 2021 ABLECLOUD Co. Ltd
# 이 파일은 rpmbuild를 이용하여 ablestack-cockpit-plugin을 빌드하는 스크립트입니다.
# 최초 작성일 : 2026. 1. 5

set -euo pipefail

PATH=/bin:/usr/bin:/sbin:/usr/sbin:/usr/local/bin:/usr/local/sbin
export PATH

# 이 스크립트(ablestack.spec)의 실제 위치
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 사용법 체크
# 사용법: ./rpmbuild.sh <VER> <REL> [BUILD_PATH]
if [ $# -lt 2 ]; then
  echo "Usage: $0 <VER> <REL> [BUILD_PATH]"
  echo "  예) $0 v4.5.1 251208 ."
  exit 1
fi

VER="$1"   # 예: v4.5.1
REL="$2"   # 예: 251208

# 빌드 기준 경로 (cockpit-plugin-ablestack 루트)
if [ -z "${3:-}" ]; then
  BUILD_PATH="$(pwd)"
else
  BUILD_PATH="$3"
fi
BUILD_PATH="$(cd "$BUILD_PATH" && pwd)"

# spec Name 과 맞춤
NAME="ablecube"

echo "BUILD_PATH = $BUILD_PATH"
echo "VER        = $VER"
echo "REL        = $REL"
echo "NAME       = $NAME"

# rpmbuild 디렉터리 구조 생성
mkdir -p "$BUILD_PATH/rpmbuild"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Source0: %{name}-%{version}.tar.gz 생성
cd "$BUILD_PATH/rpmbuild/SOURCES"

mkdir -p "${NAME}-${VER}"

# 플러그인 소스 복사 (파일/디렉터리 구조는 환경에 맞게 조정 가능)
cp -a "$BUILD_PATH"/{README.md,node_modules,images,main.html,manifest.json,sample,shell,src,tools,python,index.html,index.js,main-glue.html,main-glue-no-permission.html} "${NAME}-${VER}/"
find "${NAME}-${VER}" \( -name ".DS_Store" -o -name "__pycache__" -o -name "*.pyc" \) -exec rm -rf {} +

# gzip 압축 tarball 생성 → ablecube-<VER>.tar.gz
tar -czf "${NAME}-${VER}.tar.gz" "${NAME}-${VER}"
rm -rf "${NAME}-${VER}"

# spec 파일 복사 (스크립트와 같은 디렉터리에서 가져옴)
cp -f "$SCRIPT_DIR/ablestack.spec" "$BUILD_PATH/rpmbuild/SPECS/"

# rpmbuild 실행
cd "$BUILD_PATH"
rpmbuild -ba "$BUILD_PATH/rpmbuild/SPECS/ablestack.spec" \
  --define "_topdir $BUILD_PATH/rpmbuild" \
  --define "version ${VER}" \
  --define "release ${REL}" \
  --target x86_64 \
  --nocheck

echo
echo "빌드 완료!"
echo "결과 RPM 위치 예:"
echo "  $BUILD_PATH/rpmbuild/RPMS/x86_64/${NAME}-${VER}-${REL}.x86_64.rpm"
