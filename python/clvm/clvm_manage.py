#!/usr/bin/python3
import argparse
import paramiko
import subprocess
import os
import json

from ablestack import *

def parse_size(size_str):
    # 단위 변환 로직 (t → TB, g → GB, m → MB)
    import re
    match = re.match(r"[<>]?([\d.]+)([a-zA-Z]*)", size_str)
    if match:
        number, unit = match.groups()
        unit_mapping = {"t": "TB", "g": "GB", "m": "MB"}
        unit = unit_mapping.get(unit.lower(), unit)
        return f"{float(number):.2f}{unit}"
    return size_str

def run_command(command, ssh_client=None, ignore_errors=False, suppress_errors=True):
    """Run a shell command and return its output. Suppress or handle errors as specified."""
    try:
        if ssh_client:
            stdin, stdout, stderr = ssh_client.exec_command(command)
            stdout_str = stdout.read().decode()
            stderr_str = stderr.read().decode()

            # Suppress errors if specified
            if stderr_str and not suppress_errors:
                print(f"Error running command: {command}")
                print(stderr_str)
                if not ignore_errors:
                    raise Exception(f"Command failed: {command}")
            return stdout_str

        else:
            process = subprocess.Popen(
                command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = process.communicate()
            stdout_str = stdout.decode()
            stderr_str = stderr.decode()

            # Suppress errors if specified
            if process.returncode and not suppress_errors:
                print(f"Error running command: {command}")
                print(stderr_str)
                if not ignore_errors:
                    raise Exception(f"Command failed: {command}")

            # Return only stdout
            return stdout_str

    except Exception as e:
        if not ignore_errors:
            print(f"Error running command: {command}: {e}")
            raise

def connect_to_host(ip):
    """Establish an SSH connection to the host."""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    private_key_path = os.getenv('SSH_PRIVATE_KEY_PATH', '/root/.ssh/id_rsa')
    ssh.connect(ip, username='root', key_filename=private_key_path)
    return ssh


def create_clvm(disks):
    try:
        # Prepare a list to store disk devices
        num = 1
        result = subprocess.run(["vgs", "-o", "vg_name", "--reportformat", "json"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        output = json.loads(result.stdout)
        for i in range(len(output["report"][0]["vg"])):
            vgs_name = output["report"][0]["vg"][i]["vg_name"]
            if "vg_clvm" in vgs_name:
                num += 1
        # Create a physical volume on each disk and add to the volume group
        for disk in disks:
            # 파티션 생성
            if "mapper" in disk:
                name = disk.split('/')[3]
            else:
                name = disk.split('/')[2]

            vg_name = f"vg_clvm{num}"
            run_command(f"parted -s {disk} mklabel gpt mkpart {name} 0% 100% set 1 lvm on ")
            # 파티션 이름 확인
            partition = f"{disk}1"
            # 물리 볼륨 생성
            run_command(f"pvcreate {partition}")
            run_command(f"vgcreate {vg_name} {partition} ")

            num += 1

        ret = createReturn(code=200, val="Create CLVM Disk Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Create CLVM Disk Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def list_clvm():
    try:
        # pvs 명령 실행
        pvs_result = subprocess.run(
            ["pvs", "-o", "vg_name,pv_name,pv_size", "--reportformat", "json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        # lsblk 명령 실행
        lsblk_result = subprocess.run(
            ["lsblk", "-o", "name,wwn", "--json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # JSON 파싱
        pvs_output = json.loads(pvs_result.stdout)
        lsblk_output = json.loads(lsblk_result.stdout)

        # lsblk 결과를 사전으로 매핑 (name -> wwn)
        lsblk_map = {dev["name"]: dev.get("wwn") for dev in lsblk_output["blockdevices"]}

        # vg_name에서 "vg_clvm"이 포함된 항목 필터링
        clvm_pvs = [
            {
                "vg_name": pv["vg_name"],
                "pv_name": pv["pv_name"],
                "pv_size": parse_size(pv["pv_size"]),
                "wwn": lsblk_map.get(os.path.basename(pv["pv_name"].split("/")[-1].split("1")[0]), "N/A"),
            }
            for pv in pvs_output["report"][0]["pv"]
            if "vg_clvm" in pv["vg_name"]
        ]

        # 필터링된 결과 반환
        ret = createReturn(code=200, val=clvm_pvs)
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception as e:
        # 에러 발생 시 처리
        ret = createReturn(code=500, val=f"Error: {str(e)}")
        return print(json.dumps(json.loads(ret), indent=4))



def main():
    parser = argparse.ArgumentParser(description="Cluster configuration script")

    parser.add_argument('--create-clvm', action='store_true', help='Flag to create CLVM Disk.')
    parser.add_argument('--disks', help='Comma separated list of disks to use.')
    parser.add_argument('--list-clvm', action='store_true', help='Comma separated list of CLVM Disk.')
    args = parser.parse_args()

    if args.create_clvm:
        if not all([args.disks]):
            print("All arguments are required when using --create-clvm")
            parser.print_help()
        else:
            disks = args.disks.split(',')
            create_clvm(disks)

    if args.list_clvm:
        list_clvm()
if __name__ == "__main__":
    main()
