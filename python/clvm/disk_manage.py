#!/usr/bin/python3
import argparse
import re
import sys
import paramiko
import subprocess
import os
import json

from ablestack import *

json_file_path = pluginpath + "/tools/properties/cluster.json"
def openClusterJson():
    try:
        with open(json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret

json_data = openClusterJson()

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
        max_num = 0  # 가장 큰 vg_clvm 번호를 추적

        # /etc/hosts 파일에서 클러스터 노드 IP 가져오기
        result = subprocess.run(["grep", "ablecube", "/etc/hosts"],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, check=True)
        lines = result.stdout.strip().split("\n")
        list_ips = [line.split()[0] for line in lines if line.strip()]

        # 기존 vg_clvm 볼륨 그룹 확인
        result = subprocess.run(["vgs", "-o", "vg_name", "--reportformat", "json"],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output = json.loads(result.stdout)

        # 기존 vg_clvm 번호 중 가장 큰 값을 찾음
        for vg in output["report"][0]["vg"]:
            vgs_name = vg["vg_name"]
            if "vg_clvm" in vgs_name:
                num = int(vgs_name.replace("vg_clvm", ""))
                if num > max_num:
                    max_num = num

        # 새로운 vg_clvm 번호는 기존 최대값 + 1부터 시작
        next_num = max_num + 1

        # 디스크마다 물리 볼륨 및 볼륨 그룹 생성
        for disk in disks:
            # 디스크 이름 추출
            name = disk.split('/')[-1]

            # 볼륨 그룹 이름 생성
            vg_name = f"vg_clvm{next_num}"

            # 디스크에 파티션 생성 및 LVM 설정
            run_command(f"parted -s {disk} mklabel gpt mkpart {name} 0% 100% set 1 lvm on")
            partition = f"{disk}1"  # 파티션 이름
            run_command(f"pvcreate -y {partition}")
            run_command(f"vgcreate {vg_name} {partition}")

            # 클러스터의 모든 노드에서 LVM 정보 갱신
            for ip in list_ips:
                ssh_client = connect_to_host(ip)
                run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
                run_command(f"lvmdevices --adddev {partition}", ssh_client, ignore_errors=True)
                ssh_client.close()

            next_num += 1  # 다음 볼륨 그룹 번호 증가

        # 성공 응답 반환
        ret = createReturn(code=200, val="Create CLVM Disk Success")
        return print(json.dumps(json.loads(ret), indent=4))

    except Exception as e:
        # 에러 발생 시 실패 응답 반환
        ret = createReturn(code=500, val=f"Create CLVM Disk Failure: {str(e)}")
        return print(json.dumps(json.loads(ret), indent=4))


def list_clvm():
    try:
        # pvs 명령 실행
        pvs_result = subprocess.run(
            ["pvs", "-o", "vg_name,pv_name,pv_size", "--reportformat", "json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )

        # lsblk 명령 실행
        lsblk_result = subprocess.run(
            ["lsblk", "-o", "name,wwn", "--json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )

        # multipathd 상태 확인
        mpath_status = os.popen("systemctl is-active multipathd").read().strip()

        # JSON 파싱
        pvs_output = json.loads(pvs_result.stdout)
        lsblk_output = json.loads(lsblk_result.stdout)

        # lsblk 데이터 맵핑
        lsblk_map = {}
        for dev in lsblk_output.get("blockdevices", []):
            if mpath_status == "active" and "children" in dev:
                for child in dev["children"]:
                    lsblk_map[child["name"]] = dev.get("wwn", "N/A")
            else:
                lsblk_map[dev["name"]] = dev.get("wwn", "N/A")

        # CLVM 필터링
        clvm_pvs = []
        for pv in pvs_output["report"][0]["pv"]:
            vg_name = pv.get("vg_name", "")
            if "vg_clvm" in vg_name:
                pv_name = pv.get("pv_name", "")
                pv_size = parse_size(pv.get("pv_size", "0"))
                disk_name = os.path.basename(pv_name.split("/")[-1].split("1")[0])
                wwn = lsblk_map.get(disk_name, "N/A")

                clvm_pvs.append({
                    "vg_name": vg_name,
                    "pv_name": pv_name,
                    "pv_size": pv_size,
                    "wwn": wwn,
                })
        clvm_pvs.sort(key=lambda x: int(x["vg_name"].replace("vg_clvm", "")))
        # 결과 반환
        ret = createReturn(code=200, val=clvm_pvs)
        return print(json.dumps(json.loads(ret), indent=4))
    except subprocess.CalledProcessError as e:
        error_msg = f"Command '{e.cmd}' returned non-zero exit status {e.returncode}."
        ret = createReturn(code=500, val=error_msg)
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception as e:
        ret = createReturn(code=500, val=f"Error: {str(e)}")
        return print(json.dumps(json.loads(ret), indent=4))

def list_gfs():
    try:
        vgs_result = subprocess.run(
            ["vgs", "-o", ",vg_name", "--reportformat", "json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        vgs_output = json.loads(vgs_result.stdout)
        gfs_vgs = []
        for vg in vgs_output["report"][0]["vg"]:
            vg_name = vg.get("vg_name", "")
            if "vg_glue" in vg_name:
                vg_name = vg.get("vg_name", "")
                gfs_vgs.append({
                    "vg_name": vg_name,
                })
        # 결과 반환
        ret = createReturn(code=200, val=gfs_vgs)
        return print(json.dumps(json.loads(ret), indent=4))
    except subprocess.CalledProcessError as e:
        error_msg = f"Command '{e.cmd}' returned non-zero exit status {e.returncode}."
        ret = createReturn(code=500, val=error_msg)
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception as e:
        ret = createReturn(code=500, val=f"Error: {str(e)}")
        return print(json.dumps(json.loads(ret), indent=4))

def delete_clvm(vg_names,pv_names):
    try:
        for vg_name, pv_name in zip(vg_names, pv_names):
            run_command(f"vgremove {vg_name}")
            run_command(f"pvremove {pv_name}")
            mpath_name = re.sub(r'\d+$', '', pv_name)
            run_command(f'echo -e "d\nw" | fdisk {mpath_name}')

            for host in json_data["clusterConfig"]["hosts"]:
                ssh_client = connect_to_host(host["ablecube"])
                run_command(f"partprobe {mpath_name}",ssh_client)


        ret = createReturn(code=200, val="Success to clvm delete")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception as e:
        ret = createReturn(code=500, val=f"Error: {str(e)}")
        return print(json.dumps(json.loads(ret), indent=4))
def delete_gfs(disks, gfs_name, lv_name, vg_name):
    try:
        run_command(f"pcs resource disable {gfs_name}_res")
        run_command(f"pcs resource delete {gfs_name} --force")
        run_command(f"pcs resource delete {gfs_name}_res --force")

        run_command("pcs resource cleanup")

        run_command(f"vgchange --lock-type none --lock-opt force {vg_name} -y ")
        run_command(f"vgchange -aey {vg_name}")
        run_command(f"lvremove --lockopt skiplv /dev/{vg_name}/{lv_name} -y")
        run_command(f"vgremove {vg_name}")
        for disk in disks:
            partition = f"{disk}1"
            run_command(f"pvremove {partition}")
            run_command(f"echo -e 'd\nw\n' | fdisk {disk} >/dev/null 2>&1")

            for host in json_data["clusterConfig"]["hosts"]:
                ssh_client = connect_to_host(host["ablecube"])
                # lvm.conf 초기화
                run_command(f"partprobe {disk}",ssh_client,ignore_errors=True)
                ssh_client.close()

        ret = createReturn(code=200, val="Success to gfs delete")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception as e:
        ret = createReturn(code=500, val=f"Error: {str(e)}")
        return print(json.dumps(json.loads(ret), indent=4))
def main():
    parser = argparse.ArgumentParser(description="Cluster configuration script")

    parser.add_argument('--create-clvm', action='store_true', help='Flag to create CLVM Disk.')
    parser.add_argument('--list-clvm', action='store_true', help='Comma separated list of CLVM Disk.')
    parser.add_argument('--list-gfs', action='store_true', help='List GFS Volume Groups.')
    parser.add_argument('--delete-clvm', action='store_true', help='Delete CLVM Volume Group.')
    parser.add_argument('--delete-gfs', action='store_true', help='Delete GFS Disk.')
    parser.add_argument('--disks', help='Comma separated list of disks to use.')
    parser.add_argument('--gfs-name', help='GFS Name')
    parser.add_argument('--lv-names', help='Serveral LV Name.')
    parser.add_argument('--vg-names', help='Serveral VG Name.')
    parser.add_argument('--pv-names', help='Serveral PV Name.')
    args = parser.parse_args()

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(1)

    if args.create_clvm:
        if not all([args.disks]):
            print("Please provide both '--disks' when using '--create-clvm'.")
            parser.print_help()
        else:
            disks = args.disks.split(',')
            create_clvm(disks)

    if args.list_clvm:
        list_clvm()

    if args.list_gfs:
        list_gfs()

    if args.delete_clvm:
        if not all ([args.vg_names, args.pv_names]):
            print("Please provide both '--vg-names' and '--pv-names' when using '--delete-clvm'.")
            parser.print_help()
        else:
            vg_names = args.vg_names.split(',')
            pv_names = args.pv_names.split(',')
        delete_clvm(vg_names, pv_names)

    if args.delete_gfs:
        if not all ([args.disks, args.gfs_name, args.lv_names, args.vg_names]):
            print("Please provide both '--disks', '--gfs-name', '--vg-names' and '--lv-names' when using '--delete-gfs'.")
            parser.print_help()
        else:
            disks = args.disks.split(',')
            delete_gfs(disks, args.gfs_name, args.lv_names, args.vg_names)

if __name__ == "__main__":
    main()
