#!/usr/bin/python3

import argparse
import socket
import time
import paramiko
import subprocess
import os
import json

from ablestack import *

json_file_path = pluginpath+"/tools/properties/cluster.json"

def openClusterJson():
    try:
        with open(json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret

json_data = openClusterJson()
os_type = json_data["clusterConfig"]["type"]

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

def install_packages(remote_ips):
    """Install required packages on remote hosts."""
    try:
        for ip in remote_ips:
            ssh_client = connect_to_host(ip)
            run_command(
                'dnf install -y --nogpgcheck --enablerepo="resilientstorage","appstream" '
                'gfs2-utils pcs pacemaker fence-agents lvm2-lockd dlm corosync corosynclib '
                'dlm-lib libknet1 libknet1-crypto-nss-plugin libnozzle1 libqb sanlock-lib',
                ssh_client
            )
            ssh_client.close()

        ret = createReturn(code=200, val="Install Package Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Install Package Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def modify_lvm_conf(ips):
    """Modify the LVM configuration file on the remote hosts."""
    try:
        if os_type == "PowerFlex":
            powerflex_disk_name = os.popen("lsblk -d -o name,size | grep scini | grep 512 | awk '{print $1}'").read().strip()
            modify_command = (
                'sed -i \'s/# types = \\[ "fd", 16 \\]/types = \\[ "scini", 16 \\]/\' /etc/lvm/lvm.conf;'
                'sed -i "s/# use_lvmlockd = 0/use_lvmlockd = 1/" /etc/lvm/lvm.conf;'
                'sed -i "s/use_devicesfile = 0/use_devicesfile = 1/" /etc/lvm/lvm.conf;'
            )
            ret = createReturn(code=200, val="Modify Lvm Conf Success,"+powerflex_disk_name)
        else:
            modify_command = (
                'sed -i "s/# use_lvmlockd = 0/use_lvmlockd = 1/" /etc/lvm/lvm.conf;'
                'sed -i "s/use_devicesfile = 0/use_devicesfile = 1/" /etc/lvm/lvm.conf;'
            )
            ret = createReturn(code=200, val="Modify Lvm Conf Success")

        if ips:
            for ip in ips:
                ssh_client = connect_to_host(ip)
                run_command(modify_command, ssh_client)
                ssh_client.close()
        else:
            run_command(modify_command)

        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Modify Lvm Conf Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def set_cluster_password(remote_ips, password):
    """Set the hacluster user password on remote hosts."""
    try:
        for ip in remote_ips:
            ssh_client = connect_to_host(ip)
            run_command(f"echo 'hacluster:{password}' | chpasswd", ssh_client)
            ssh_client.close()

        ret = createReturn(code=200, val="Set Cluster Password Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Set Cluster Password Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def auth_hosts(list_ips, username, password):
    """Authenticate hosts in the cluster."""
    try:
        for ip in list_ips:
            run_command(f"pcs host auth {ip} -u {username} -p {password}")

        ret = createReturn(code=200, val="Auth Hosts Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Auth Hosts Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def setup_cluster(cluster_name, list_ips):
    """Setup the cluster with the provided cluster name and IP addresses."""
    try:
        ips = " ".join(list_ips)
        if len(list_ips)%2 == 0:
            run_command(f"pcs cluster setup {cluster_name} --start {ips} quorum auto_tie_breaker=1 wait_for_all=1 last_man_standing=1")
        else:
            run_command(f"pcs cluster setup {cluster_name} --start {ips} quorum wait_for_all=1 last_man_standing=1")
        run_command("pcs cluster enable --all")

        ret = createReturn(code=200, val="Set Up Cluster Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Set Up Cluster Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def init_pcs_cluster(disks,vg_name,lv_name,list_ips):
    try:
        if len(list_ips) == 1:
            run_command("pcs cluster stop", ignore_errors=True)
            run_command("pcs cluster destroy", ignore_errors=True)
        else:
            run_command("pcs cluster stop --all", ignore_errors=True)
            run_command("pcs cluster destroy --all", ignore_errors=True)

        if disks != "None":
            result = get_lv_path(vg_name,lv_name)
            lvm_init_command = (
                    'sed -i "s/use_lvmlockd = 1/# use_lvmlockd = 0/" /etc/lvm/lvm.conf;'
                    'sed -i "s/use_devicesfile = 1/use_devicesfile = 0/" /etc/lvm/lvm.conf;'
                    )
            if result != "":
                run_command(f"vgchange --lock-type none --lock-opt force {vg_name} -y ", ignore_errors=True)
                run_command(f"vgchange -aey {vg_name}", ignore_errors=True)
                run_command(f"lvremove --lockopt skiplv /dev/{vg_name}/{lv_name} -y", ignore_errors=True)
                for ip in list_ips:
                    ssh_client = connect_to_host(ip)
                    # lvm.conf 초기화
                    run_command(lvm_init_command,ssh_client,ignore_errors=True)
                    ssh_client.close()

                run_command(f"vgremove {vg_name}")
                for disk in disks:
                    partition = f"{disk}1"
                    run_command(f"pvremove {partition}",ignore_errors=True)
                    run_command(f"echo -e 'd\nw\n' | fdisk {disk} >/dev/null 2>&1", ignore_errors=True)

                    for ip in list_ips:
                        ssh_client = connect_to_host(ip)
                        # lvm.conf 초기화
                        run_command(f"partprobe {disk}",ssh_client,ignore_errors=True)
                        ssh_client.close()

        rc_local_init_command =(
            'systemctl disable --now rc-local.service;'
            'sed -i "/^\\[Install\\]/,/^WantedBy=multi-user.target$/d" /usr/lib/systemd/system/rc-local.service;'
            'sed -i "/^partprobe/,/^lvmdevices --adddev$/d" /etc/rc.local;'
        )

        for ip in list_ips:
            ssh_client = connect_to_host(ip)
            # rc.local 파일 및 서비스 초기화
            status = run_command("systemctl is-enabled rc-local.service", ssh_client, ignore_errors=True).strip()
            if status == "enabled":
                run_command(rc_local_init_command, ssh_client, ignore_errors=True)
            # lvm.conf 초기화
            if os_type == "PowerFlex":
                run_command('sed -i \'s/types = \\[ "scini", 16 \\]/# types = \\[ "fd", 16 \\]/\' /etc/lvm/lvm.conf',ssh_client,ignore_errors=True)
            ssh_client.close()

        ret = createReturn(code=200, val="Init PCS Cluster Success")
        return print(json.dumps(json.loads(ret), indent=4))

    except Exception:
        ret = createReturn(code=500, val="Init PCS Cluster Failure")
        return print(json.dumps(json.loads(ret), indent=4))
def configure_stonith_devices(stonith_info, list_ips):
    """Configure STONITH devices and constraints."""
    try:
        for i, (info, storage_ip) in enumerate(zip(stonith_info, list_ips)):
            ip = info["ipaddr"]
            ipport = info["ipport"]
            username = info["login"]
            password = info["passwd"]
            ssh_client = connect_to_host(storage_ip)
            hostname = run_command(f"hostname", ssh_client).strip()
            ssh_client.close()
            device_name = f"fence-{hostname}"

            # delay = 15 if i == 0 else 10  # 첫 번째 IP에만 delay = 20
            delay = 10

            command_create = (
                f'pcs stonith create {device_name} fence_ipmilan delay={delay} '
                f'ip={ip} ipport={ipport} lanplus=1 method=onoff '
                f'username={username} password={password} '
                f'pcmk_host_list={storage_ip} pcmk_off_action=off pcmk_reboot_action=off debug_file=/var/log/stonith.log'
            )
            run_command(command_create, ignore_errors=True)
            command_constraint = (f'pcs constraint location {device_name} avoids {storage_ip}')
            run_command(command_constraint, ignore_errors=True)
        run_command("pcs property set stonith-enabled=true", ignore_errors=True)
        run_command("pcs resource create glue-dlm --group glue-locking ocf:pacemaker:controld op monitor interval=45s on-fail=fence", ignore_errors=True)
        run_command("pcs resource create glue-lvmlockd --group glue-locking ocf:heartbeat:lvmlockd op monitor interval=45s on-fail=fence", ignore_errors=True)
        run_command("pcs resource clone glue-locking interleave=true", ignore_errors=True)

        ret = createReturn(code=200, val="Configure Stonith Devices Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Configure Stonith Devices Failure")
        return print(json.dumps(json.loads(ret), indent=4))
def get_lv_path(vg_name, lv_name):
    # /dev/vg_name/lv_name 경로 확인
    lv_path_dev = f"/dev/{vg_name}/{lv_name}"
    if os.path.exists(lv_path_dev):
        return lv_path_dev

    # /dev/mapper/vg_name-lv_name 경로 확인
    lv_path_mapper = f"/dev/mapper/{vg_name.replace('-', '--')}-{lv_name.replace('-', '--')}"
    if os.path.exists(lv_path_mapper):
        return lv_path_mapper

    # 위의 경로가 없으면 lvdisplay를 사용해 경로 확인
    command = f"lvdisplay -c | grep '/{vg_name}/{lv_name}' | cut -d':' -f1"
    lv_path = run_command(command)

    if lv_path:
        return lv_path.strip()

    raise FileNotFoundError(f"Logical Volume {vg_name}/{lv_name} 경로를 찾을 수 없습니다.")

def create_gfs(disks, vg_name, lv_name, gfs_name, mount_point, cluster_name, num_journals, list_ips):
    time.sleep(20)
    """Create and a single GFS2 file system on the provided disks."""
    try:
        # Prepare a list to store disk devices
        pv_disks = []
        # Create a physical volume on each disk and add to the volume group
        for disk in disks:
            # 파티션 생성
            run_command(f"parted -s {disk} mklabel gpt mkpart {gfs_name} 0% 100% set 1 lvm on ")
            # 파티션 테이블 다시 읽기
            for ip in list_ips:
                ssh_client = connect_to_host(ip)
                run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
            # 파티션 이름 확인
            partition = f"{disk}1"
            # 물리 볼륨 생성
            run_command(f"pvcreate -ff --yes {partition}")
            # PV 디스크 목록에 추가
            pv_disks.append(partition)

        vg_check = subprocess.call(f"lvmlockctl -i | grep {vg_name}", shell=True ,stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if vg_check == 1:
            run_command(f"lvmlockctl -k {vg_name}")

        # 공유 볼륨 그룹 생성
        run_command(f"vgcreate --yes --shared {vg_name} {' '.join(pv_disks)} ")
        # 논리 볼륨 생성
        run_command(f"lvcreate --yes --activate sy -l+100%FREE -n {lv_name} {vg_name} ")
        # GFS2 파일 시스템 생성
        lv_path = get_lv_path(vg_name, lv_name)
        run_command(f"mkfs.gfs2 -j{num_journals} -p lock_dlm -t {cluster_name}:{gfs_name} {lv_path} -O -K")

        for ip in list_ips:
            ssh_client = connect_to_host(ip)
            for disk in disks:
                partition = f"{disk}1"

                run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
                run_command(f"lvmdevices --adddev {partition} ", ssh_client, ignore_errors=True)
                run_command(f"echo -e 'partprobe {disk}\nlvmdevices --adddev {partition}' >> /etc/rc.local ", ssh_client, ignore_errors=True)
            status = run_command("systemctl is-active rc-local.service", ssh_client, ignore_errors=True).strip()
            run_command("pcs resource cleanup ", ssh_client, ignore_errors=True)
            if status != "active":
                run_command("chmod +x /etc/rc.local /etc/rc.d/rc.local", ssh_client, ignore_errors=True)
                run_command("echo -e '\n[Install]\nWantedBy=multi-user.target' >> /usr/lib/systemd/system/rc-local.service", ssh_client, ignore_errors=True)
                run_command("systemctl enable --now rc-local.service", ssh_client, ignore_errors=True)
            ssh_client.close()

        # Configure GFS2 and LVM resources
        run_command(f"pcs resource create {gfs_name}_res --group {gfs_name}-group ocf:heartbeat:LVM-activate lvname={lv_name} vgname={vg_name} activation_mode=shared vg_access_mode=lvmlockd > /dev/null")
        run_command(f"pcs resource clone {gfs_name}_res interleave=true")
        run_command(f"pcs constraint order start glue-locking-clone then {gfs_name}_res-clone")
        run_command(f"pcs constraint colocation add {gfs_name}_res-clone with glue-locking-clone")
        run_command(f"pcs resource create {gfs_name} --group {gfs_name}-group ocf:heartbeat:Filesystem device=\"{lv_path}\" directory=\"{mount_point}\" fstype=\"gfs2\" options=noatime op monitor timeout=120s interval=10s on-fail=fence > /dev/null")
        run_command(f"pcs resource clone {gfs_name} interleave=true")
        run_command(f"pcs constraint order start {gfs_name}_res-clone then {gfs_name}-clone")
        run_command(f"pcs constraint colocation add {gfs_name}_res-clone with {gfs_name}-clone")

        for ip in list_ips:
            ssh_client = connect_to_host(ip)
            for disk in disks:
                partition = f"{disk}1"
                run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
                run_command(f"lvmdevices --adddev {partition} ", ssh_client, ignore_errors=True)
            run_command("pcs resource cleanup ", ssh_client, ignore_errors=True)
            ssh_client.close()

        ret = createReturn(code=200, val="Create GFS Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Create GFS Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def create_ccvm_cluster(gfs_name, mount_point, cluster_name, list_ips):
    try:
        time.sleep(10)

        run_command("cp "+ pluginpath + f"/tools/vmconfig/ccvm/ccvm.xml {mount_point}/ccvm.xml")
        run_command(f"cp /var/lib/libvirt/images/ablestack-template.qcow2 {mount_point}/ccvm.qcow2")
        run_command(f"qemu-img resize {mount_point}/ccvm.qcow2 +350G")

        if len(list_ips) % 2 == 0:
            run_command(f"virsh create {mount_point}/ccvm.xml")
            ip = run_command("grep 'ccvm-mngt' /etc/hosts | awk '{print $1}'").strip()

            # Setup qdevice
            qdevice_command = (
                "echo 'hacluster:password' | chpasswd; "
                "systemctl enable --now pcsd; "
                "pcs qdevice setup model net --enable --start; "
                "firewall-cmd --permanent --add-service=high-availability; "
                "firewall-cmd --add-service=high-availability"
            )

            retries = 5
            interval = 2
            for _ in range(retries):
                response = subprocess.run(
                    ["ping", "-c", "1", "ccvm"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                if response.returncode == 0:
                    time.sleep(2)
                    ssh_client = connect_to_host(ip)
                    run_command(qdevice_command, ssh_client)
                    ssh_client.close()
                    break
                else:
                    time.sleep(interval)

            pcs_command = (
                f"pcs host auth {ip} -u hacluster -p password; "
                "pcs cluster stop --all; "
                f"pcs quorum device add model net host={ip} algorithm=ffsplit; "
                "pcs cluster start --all;"
            )
            run_command(pcs_command)

            ccvm_command = (
                "virsh destroy ccvm; "
                "sed -i 's|/mnt/ccvm.qcow2|/mnt/glue-gfs/ccvm.qcow2|g' /mnt/ccvm.xml; "
                f"cp {mount_point}/ccvm.* /mnt/glue-gfs/; "
                f"rm -rf {mount_point}/ccvm.*;"
            )
            time.sleep(40)
            run_command(ccvm_command)

            config_path = f"{mount_point}/glue-gfs/ccvm.xml"
        else:
            config_path = f"{mount_point}/ccvm.xml"

        pcs_resource_command = (
            f"pcs resource create {cluster_name} VirtualDomain hypervisor=qemu:///system config={config_path} "
            "migration_transport=ssh meta allow-migrate=true priority=100 "
            "op start timeout=120s op stop timeout=120s op monitor timeout=120s interval=10s"
        )
        run_command(pcs_resource_command)

        # Set PCS constraints
        run_command(f"pcs constraint order start {gfs_name}-clone then {cluster_name}")

        ret = createReturn(code=200, val="Create CCVM Cluster Success")
        return print(json.dumps(json.loads(ret), indent=4))

    except Exception:
        ret = createReturn(code=500, val="Create CCVM Cluster Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def extend_pcs_cluster(username,password,stonith_info,mount_point,list_ips):
    try:
        host_ip = socket.gethostbyname(socket.getfqdn())
        # 해당 호스트에서 lvm conf 설정 하기
        modify_command = (
            'sed -i "s/# use_lvmlockd = 0/use_lvmlockd = 1/" /etc/lvm/lvm.conf;'
            'sed -i "s/use_devicesfile = 0/use_devicesfile = 1/" /etc/lvm/lvm.conf;'
            'mpathconf --enable;'
            'systemctl start multipathd;'
        )
        run_command(modify_command)
        # 해당 호스트에서 hacluster에 대한 패스워드 설정
        run_command(f"echo 'hacluster:{password}' | chpasswd")
        # 마스터 노드에서 pcs host auth 설정
        for ip in list_ips[:1]:
            ssh_client = connect_to_host(ip)
            for i, (info, _) in enumerate(zip(stonith_info, list_ips)):
                stonith_ip = info["ipaddr"]
                stonith_ipport = info["ipport"]
                stonith_username = info["login"]
                stonith_password = info["passwd"]
                hostname = run_command(f"hostname").strip()
                device_name = f"fence-{hostname}"

                # delay = 15 if i == 0 else 10  # 첫 번째 IP에만 delay = 20
                delay = 10

                command_create = (
                    f'pcs stonith create {device_name} fence_ipmilan delay={delay} '
                    f'ip={stonith_ip} ipport={stonith_ipport} lanplus=1 method=onoff '
                    f'username={stonith_username} password={stonith_password} '
                    f'pcmk_host_list={host_ip} pcmk_off_action=off pcmk_reboot_action=off debug_file=/var/log/stonith.log'
                )
                command_constraint = (f'pcs constraint location {device_name} avoids {host_ip}')
                # 호스트 추가 될 때마다 journal-nums 1개씩 추가
                run_command(f"gfs2_jadd -j 1 {mount_point}", ssh_client, ignore_errors=True)
                # 추가할 호스트 pcs 클러스터 노드 추가 및 시작
                run_command(f"pcs host auth {host_ip} -u {username} -p {password}", ssh_client, ignore_errors=True)
                run_command(f"pcs cluster node add {host_ip}", ssh_client, ignore_errors=True,)
                run_command("pcs cluster enable --all", ssh_client, ignore_errors=True)
                run_command("pcs cluster start --all", ssh_client, ignore_errors=True)
                # 추가할 호스트 stonith 추가
                run_command(command_create, ssh_client, ignore_errors=True)
                run_command(command_constraint, ssh_client, ignore_errors=True)

                ssh_client.close()

        for ip in list_ips:
            ssh_client = connect_to_host(ip)
            multipath_disks = run_command("multipath -l -v 1", ssh_client, ignore_errors=True).split()

            for disk in multipath_disks:
                partition = f"{disk}1"
                run_command(f"partprobe /dev/mapper/{disk}", ssh_client, ignore_errors=True)
                run_command(f"lvmdevices --adddev /dev/mapper/{partition}", ssh_client, ignore_errors=True)
                if ip == list_ips[-1]:
                    run_command(f"echo -e 'partprobe /dev/mapper/{disk}\nlvmdevices --adddev /dev/mapper/{partition}' >> /etc/rc.local", ssh_client, ignore_errors=True)

            ssh_client.close()

        run_command("pcs resource cleanup", ignore_errors=True)
        run_command("chmod +x /etc/rc.local /etc/rc.d/rc.local", ignore_errors=True)
        run_command("echo -e '\n[Install]\nWantedBy=multi-user.target' >> /usr/lib/systemd/system/rc-local.service", ignore_errors=True)
        run_command("systemctl enable --now rc-local.service", ignore_errors=True)

        ret = createReturn(code=200, val="Extend Pcs Cluster Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Extend Pcs Cluster Failure")
        return print(json.dumps(json.loads(ret), indent=4))
def check_ipmi(stonith_str):
    """
    Check the power status of STONITH devices and log errors per device.
    Input is a semicolon-separated string of STONITH device details.
    """
    error_logs = []
    success_logs = []

    try:
        # Parse the input string
        stonith_info = []
        for item in stonith_str.split(";"):
            try:
                ipaddr, port, login, passwd = item.split(",")
                stonith_info.append({"ipaddr": ipaddr, "port": port, "login": login, "passwd": passwd})
            except ValueError:
                error_logs.append({"entry": item, "error": "Invalid STONITH entry format"})

        # Process each STONITH device
        for info in stonith_info:
            ip = info["ipaddr"]
            username = info["login"]
            password = info["passwd"]

            command = f'ipmitool -I lanplus -H {ip} -U {username} -P {password} power status'
            try:
                result = run_command(command, ignore_errors=False).strip()
                if not result:  # Check if the result is empty
                    error_logs.append({"ip": ip, "error": "Status not available"})
                else:
                    success_logs.append({"ip": ip, "status": result})
            except Exception as e:
                error_logs.append({"ip": ip, "error": str(e)})

        # Construct message
        if error_logs:  # If there are any errors, return code 500
            error_ips = ", ".join([f"{err['ip']}: {err['error']}" for err in error_logs if 'ip' in err])
            general_message = f"Errors detected in the following STONITH devices: {error_ips}"
            ret = createReturn(
                code=500,
                val={
                    "message": general_message,
                    "errors": error_logs,
                    "success": success_logs
                }
            )
        else:
            general_message = "All STONITH devices checked successfully"
            ret = createReturn(
                code=200,
                val={
                    "message": general_message,
                    "success": success_logs
                }
            )

        return print(json.dumps(json.loads(ret), indent=4))

    except Exception as e:
        ret = createReturn(code=500, val="Check Stonith Devices Failure")
        return print(json.dumps(json.loads(ret), indent=4))


def check_stonith(control):
    try:
        if control == "check":
            hosts = run_command("pcs stonith status | awk '{print $4}' | uniq").strip()

            ret = createReturn(code=200, val=hosts)
            return print(json.dumps(json.loads(ret), indent=4))

        if control == "enable":
            hosts = run_command("pcs stonith status | awk '{print $2}'").split()
            for host in hosts:
                run_command(f"pcs stonith enable {host}")
            ret = createReturn(code=200, val="Stonith Enable Pcs Cluster Success")
            return print(json.dumps(json.loads(ret), indent=4))
        elif control == "disable":
            hosts = run_command("pcs stonith status | awk '{print $2}'").split()
            for host in hosts:
                run_command(f"pcs stonith disable {host}")
            ret = createReturn(code=200, val="Stonith Disable Pcs Cluster Success")
            return print(json.dumps(json.loads(ret), indent=4))

    except Exception:
        ret = createReturn(code=500, val="Stonith Pcs Cluster Failure")
        return print(json.dumps(json.loads(ret), indent=4))
def init_qdevice():
    try:
            ip = run_command("grep 'ccvm-mngt' /etc/hosts | awk '{print $1}'").strip()

            retries = 5
            interval = 1

            run_command("pcs quorum device remove")

            for i in range(1, retries + 1):
                response = subprocess.run(
                    ["ping", "-c", "1", "ccvm"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                if response.returncode == 0:
                    run_command(f"pcs quorum device add model net host={ip} algorithm=ffsplit")
                else:
                    time.sleep(interval)

            ret = createReturn(code=200, val="Qdevice Init Success")
            return print(json.dumps(json.loads(ret), indent=4))

    except Exception:
        ret = createReturn(code=500, val="Qdevice Init Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def check_qdevice():
    try:
        # Step 1: Run the pcs quorum config command
        result = subprocess.run(
            ["pcs", "quorum", "config"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            ret = createReturn(code=500, val="Qdevice Check Failure")
            return print(json.dumps(json.loads(ret), indent=4))

        output = result.stdout

        # Step 3: Check for `Device:` section
        if "Device:" in output:
            ret = createReturn(code=200, val="Qdevice Structure Check Success")
            return print(json.dumps(json.loads(ret), indent=4))
        else:
            ret = createReturn(code=204, val="Qdevice Structure Check Success, No Device Text")
            return print(json.dumps(json.loads(ret), indent=4))

    except Exception as e:
        ret = createReturn(code=500, val="Qdevice Check Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def main():
    parser = argparse.ArgumentParser(description="Cluster configuration script")

    parser.add_argument('--install', action='store_true', help="Install necessary packages on remote hosts.")
    parser.add_argument('--modify-lvm-conf', action='store_true', help="Modify the LVM configuration file on remote hosts.")
    parser.add_argument('--set-password', type=str, help="Set the hacluster user password.")
    parser.add_argument('--auth-hosts', type=str, help="Authenticate hosts in the cluster.")
    parser.add_argument('--setup-cluster', type=str, help="Setup the cluster with the provided cluster name.")
    parser.add_argument('--configure-stonith', type=str, help="Configure STONITH devices with a list of comma-separated values (ipaddr,port,username,password).")
    parser.add_argument('--create-gfs', action='store_true', help='Flag to create GFS2 file system.')
    parser.add_argument('--disks', help='Comma separated list of disks to use.')
    parser.add_argument('--vg-name', help='Volume group name.')
    parser.add_argument('--lv-name', help='Logical volume name.')
    parser.add_argument('--gfs-name', help='GFS2 file system name.')
    parser.add_argument('--mount-point', help='Mount point for the GFS2 file system.')
    parser.add_argument('--cluster-name', help='Cluster name for the GFS2 file system.')
    parser.add_argument('--journal-nums', help='Number of journals for the GFS2 file system.')
    parser.add_argument('--init-gfs',action='store_true', help='Flag to init GFS2 file system.')
    parser.add_argument('--create-ccvm-cluster', action='store_true', help='Flag to create CCVM Cluster.')
    parser.add_argument('--init-pcs-cluster', action='store_true', help='Flag to init Pcs Cluster.')
    parser.add_argument('--check-stonith', action='store_true', help='Flag to Check Pcs Cluster Stonith.')
    parser.add_argument('--control', type=str, help='Flag to Pcs Cluster Stonith Maintenance Control.')
    parser.add_argument('--check-ipmi',action='store_true', help='Flag to Check Pcs Cluster IPMI Status.')
    parser.add_argument('--init-qdevice', action='store_true', help='Flag to Qdevice Init.')
    parser.add_argument('--check-qdevice', action='store_true', help='Flag to Check Pcs Cluster Qdevice Structure.')
    # 확장할 시에 사용되는 parser들
    parser.add_argument('--password',  help="Extend Host Set the hacluster user password.")
    parser.add_argument('--stonith',  help="Extend Host Set Configure STONITH devices with a list of comma-separated values (ipaddr,port,username,password).")
    parser.add_argument('--extend-pcs-cluster', action='store_true', help='Flag to extend Pcs Cluster.')

    parser.add_argument('--list-ip', type=str, help="The IP addresses of the local hosts for cluster operations, separated by spaces.")

    args = parser.parse_args()

    if args.configure_stonith:
        if not args.list_ip:
            parser.error("--list-ip is required when --configure-stonith is specified")
        stonith_info = []
        for item in args.configure_stonith.split(';'):
            ipaddr, ipport, login, passwd = item.split(',')
            stonith_info.append({
                "ipaddr": ipaddr,
                "ipport": ipport,
                "login": login,
                "passwd": passwd
            })
        list_ips = args.list_ip.split()
        configure_stonith_devices(stonith_info, list_ips)

    if args.install:
        if not args.list_ip:
            parser.error("--list-ip is required for --install")
        list_ips = args.list_ip.split()
        install_packages(list_ips)

    if args.modify_lvm_conf:
        if not args.list_ip:
            parser.error("--list-ip is required for --modify-lvm-conf")
        list_ips = args.list_ip.split()
        modify_lvm_conf(list_ips)

    if args.set_password:
        if not args.list_ip:
            parser.error("--list-ip is required for --set-password")
        list_ips = args.list_ip.split()
        set_cluster_password(list_ips, args.set_password)

    if args.auth_hosts:
        if not args.list_ip:
            parser.error("--list-ip is required for --auth-hosts")
        list_ips = args.list_ip.split()
        auth_hosts(list_ips, 'hacluster', args.auth_hosts)

    if args.setup_cluster:
        if not args.list_ip:
            parser.error("--list-ip is required for --setup-cluster")
        list_ips = args.list_ip.split()
        setup_cluster(args.setup_cluster, list_ips)

    if args.init_pcs_cluster:
        if not args.list_ip:
            print("--list-ip is required for --init-pcs-cluster")
            parser.print_help()
        else:
            if args.disks != None:
                disks = args.disks.split(',')
                vg_name = args.vg_name
                lv_name = args.lv_name
            else:
                disks = "None"
                vg_name = "None"
                lv_name = "None"

            list_ips = args.list_ip.split()

            init_pcs_cluster(disks, vg_name, lv_name, list_ips)

    if args.create_gfs:
        if not all([args.disks, args.vg_name, args.lv_name, args.gfs_name, args.mount_point, args.cluster_name, args.journal_nums, args.list_ip]):
            print("All arguments are required when using --create-gfs")
            parser.print_help()
        else:
            disks = args.disks.split(',')
            vg_name = args.vg_name
            lv_name = args.lv_name
            gfs_name = args.gfs_name
            mount_point = args.mount_point
            cluster_name = args.cluster_name
            num_journals = args.journal_nums
            list_ips = args.list_ip.split()

            create_gfs(disks, vg_name, lv_name, gfs_name, mount_point, cluster_name, num_journals, list_ips)

    if args.create_ccvm_cluster:
        if not all([args.gfs_name, args.cluster_name,args.mount_point, args.list_ip]):
            print("All arguments are required when using --create-ccvm-cluster")
            parser.print_help()
        else:
            gfs_name = args.gfs_name
            mount_point = args.mount_point
            cluster_name = args.cluster_name
            list_ips = args.list_ip.split()

            create_ccvm_cluster(gfs_name, mount_point, cluster_name, list_ips)

    if args.extend_pcs_cluster:
        if not all([args.password, args.stonith, args.mount_point, args.list_ip]):
            print("All arguments are required when using --extend-pcs-cluster")
            parser.print_help()
        else:
            password = args.password
            stonith_info = []
            ipaddr, ipport, login, passwd = args.stonith.split(',')
            stonith_info.append({
                "ipaddr": ipaddr,
                "ipport": ipport,
                "login": login,
                "passwd": passwd
            })
            mount_point = args.mount_point
            list_ips = args.list_ip.split()

            extend_pcs_cluster('hacluster', password, stonith_info, mount_point, list_ips)
    if args.check_ipmi:
        if not args.stonith:
            print("--stonith are required when using --check-ipmi")
            parser.print_help()
        else:
            stonith_info = args.stonith

            check_ipmi(stonith_info)

    if args.check_stonith:
        if not args.control:
             parser.error("--control is required for --check-stonith")
        control = args.control
        check_stonith(control)

    if args.init_qdevice:
        init_qdevice()

    if args.check_qdevice:
        check_qdevice()

if __name__ == "__main__":
    main()
