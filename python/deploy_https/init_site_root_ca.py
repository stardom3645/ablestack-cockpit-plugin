#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
init_site_root_ca.py

역할
- 사이트 전용 Root CA 디렉터리를 생성합니다.
- rootCA.key, rootCA.crt 가 없으면 새로 생성합니다.
- 이미 존재하면 재사용합니다.
- 파일 권한을 정리합니다.

생성 경로
- /usr/share/ablestack/pki/rootCA/rootCA.key
- /usr/share/ablestack/pki/rootCA/rootCA.crt
"""

import os
import stat
import subprocess
import sys
from pathlib import Path


ROOT_CA_DIR = Path("/usr/share/ablestack/pki/rootCA")
ROOT_CA_KEY = ROOT_CA_DIR / "rootCA.key"
ROOT_CA_CRT = ROOT_CA_DIR / "rootCA.crt"

ROOT_CA_SUBJECT = "/C=KR/ST=Seoul/L=Seoul/O=ABLESTACK/OU=Platform/CN=ABLESTACK Root CA"
ROOT_CA_DAYS = "7300"


def log(message: str) -> None:
    """일반 로그 출력입니다."""
    print(f"[INFO] {message}")


def fail(message: str, code: int = 1) -> None:
    """에러 로그 출력 후 종료합니다."""
    print(f"[ERROR] {message}", file=sys.stderr)
    sys.exit(code)


def require_root() -> None:
    """root 권한 확인입니다."""
    if os.geteuid() != 0:
        fail("root 권한으로 실행해야 합니다.")


def run_command(command: list[str]) -> None:
    """외부 명령 실행입니다."""
    result = subprocess.run(command, text=True)
    if result.returncode != 0:
        fail(f"명령 실행 실패: {' '.join(command)}")


def ensure_directory(path: Path) -> None:
    """디렉터리 생성 및 권한 정리입니다."""
    path.mkdir(parents=True, exist_ok=True)
    os.chmod(path, 0o755)
    log(f"디렉터리 확인 완료: {path}")


def set_permissions() -> None:
    """파일 권한 설정입니다."""
    if ROOT_CA_KEY.exists():
        os.chmod(ROOT_CA_KEY, 0o600)

    if ROOT_CA_CRT.exists():
        os.chmod(ROOT_CA_CRT, 0o644)

    log("파일 권한 설정 완료")


def validate_existing_files() -> bool:
    """
    기존 rootCA.key, rootCA.crt 존재 여부 확인입니다.
    둘 다 있으면 재사용합니다.
    """
    key_exists = ROOT_CA_KEY.is_file()
    crt_exists = ROOT_CA_CRT.is_file()

    if key_exists and crt_exists:
        log("기존 Root CA 파일이 이미 존재하여 재사용합니다.")
        return True

    if key_exists and not crt_exists:
        fail(f"불완전한 상태입니다. 인증서 파일이 없습니다: {ROOT_CA_CRT}")

    if crt_exists and not key_exists:
        fail(f"불완전한 상태입니다. 키 파일이 없습니다: {ROOT_CA_KEY}")

    return False


def generate_root_ca() -> None:
    """Root CA 키와 인증서를 생성합니다."""
    log("새 Root CA 생성을 시작합니다.")

    run_command([
        "openssl", "genrsa",
        "-out", str(ROOT_CA_KEY),
        "4096",
    ])

    run_command([
        "openssl", "req",
        "-x509",
        "-new",
        "-nodes",
        "-key", str(ROOT_CA_KEY),
        "-sha256",
        "-days", ROOT_CA_DAYS,
        "-out", str(ROOT_CA_CRT),
        "-subj", ROOT_CA_SUBJECT,
    ])

    log("Root CA 생성 완료")


def print_summary() -> None:
    """최종 결과 요약입니다."""
    log(f"Root CA key : {ROOT_CA_KEY}")
    log(f"Root CA crt : {ROOT_CA_CRT}")

    if ROOT_CA_KEY.exists():
        key_mode = oct(ROOT_CA_KEY.stat().st_mode & 0o777)
        log(f"rootCA.key mode : {key_mode}")

    if ROOT_CA_CRT.exists():
        crt_mode = oct(ROOT_CA_CRT.stat().st_mode & 0o777)
        log(f"rootCA.crt mode : {crt_mode}")


def main() -> None:
    require_root()
    ensure_directory(ROOT_CA_DIR)

    exists = validate_existing_files()
    if not exists:
        generate_root_ca()

    set_permissions()
    print_summary()


if __name__ == "__main__":
    main()