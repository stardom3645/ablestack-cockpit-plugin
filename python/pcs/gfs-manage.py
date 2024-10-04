#!/usr/bin/python3

import argparse
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

def run_command(command, ssh_client=None, ignore_errors=False):
    """Run a shell command and print its output. Execute on remote host if ssh_client is provided."""
    try:
        if ssh_client:
            stdin, stdout, stderr = ssh_client.exec_command(command)
            stdout_str = stdout.read().decode()
            stderr_str = stderr.read().decode()
            if stderr_str:
                print(f"Error running command: {command}")
                print(stderr_str)
                if not ignore_errors:
                    raise Exception(f"Command failed: {command}")
            return stdout_str
        else:
            process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stdout, stderr = process.communicate()
            output = stdout.decode() + stderr.decode()
            if process.returncode:
                print(f"Error running command: {command}")
                print(stderr.decode())
                if not ignore_errors:
                    raise Exception(f"Command failed: {command}")
            return output
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
                'sed -i "s/# types = \\[ \\"fd\\"\, 16 \\]/types = [ \\"scini\\", 16 ]/" /etc/lvm/lvm.conf;'
                'sed -i "s/# use_lvmlockd = 0/use_lvmlockd = 1/" /etc/lvm/lvm.conf;'
                'sed -i "s/use_devicesfile = 0/use_devicesfile = 1/" /etc/lvm/lvm.conf'
            )
        else:
            modify_command = (
                'sed -i "s/# use_lvmlockd = 0/use_lvmlockd = 1/" /etc/lvm/lvm.conf && '
                'sed -i "s/use_devicesfile = 0/use_devicesfile = 1/" /etc/lvm/lvm.conf'
            )
        if ips:
            for ip in ips:
                ssh_client = connect_to_host(ip)
                run_command(modify_command, ssh_client)
                ssh_client.close()
        else:
            run_command(modify_command)

        ret = createReturn(code=200, val="Modify Lvm Conf Success,"+powerflex_disk_name)
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
        run_command(f"pcs cluster setup {cluster_name} --start {ips}")
        run_command("pcs cluster enable --all")

        ret = createReturn(code=200, val="Set Up Cluster Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Set Up Cluster Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def init_pcs_cluster(disk_name,vg_name,lv_name,list_ips):
    try:
        result = get_lv_path(vg_name,lv_name)
        partition = f"{disk}1"
        if result != "":
            run_command(f"vgchange --lock-type none --lock-opt force {vg_name} -y")
            run_command(f"vgchange -aey {vg_name}")
            run_command(f"lvremove --lockopt skiplv /dev/{vg_name}/{lv_name} -y")
            run_command(f"vgremove {vg_name}")
            run_command(f"pvremove /dev/{partition}")

            for ip in list_ips:
                ssh_client = connect_to_host(ip)
                for disk in disk_name:
                    run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
                    run_command(f"lvmdevices --adddev {partition}", ssh_client, ignore_errors=True)
                    run_command("pcs cluster destroy --force")
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

            # STONITH 장치 생성
            command_create = (
                f'pcs stonith create {device_name} fence_ipmilan delay=10 '
                f'ip={ip} ipport={ipport} lanplus=1 method=onoff '
                f'username={username} password={password} '
                f'pcmk_host_list={storage_ip} pcmk_off_action=off pcmk_reboot_action=off'
            )
            run_command(command_create, ignore_errors=True)

            command_constraint = (f'pcs constraint location {device_name} avoids {storage_ip}')
            run_command(command_constraint, ignore_errors=True)

        run_command("pcs property set stonith-enabled=true", ignore_errors=True)
        run_command("pcs resource create glue-dlm --group glue-locking ocf:pacemaker:controld op monitor interval=30s on-fail=fence", ignore_errors=True)
        run_command("pcs resource create glue-lvmlockd --group glue-locking ocf:heartbeat:lvmlockd op monitor interval=30s on-fail=fence", ignore_errors=True)
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
    time.sleep(15)
    """Create and a single GFS2 file system on the provided disks."""
    try:
        # Prepare a list to store disk devices
        pv_disks = []
        # Create a physical volume on each disk and add to the volume group
        for disk in disks:
            # 파티션 생성
            run_command(f"parted -s {disk} mklabel gpt mkpart {gfs_name} 0% 100% set 1 lvm on > /dev/null")
            # 파티션 테이블 다시 읽기
            run_command(f"partprobe {disk}")

            # 파티션 이름 확인
            partition = f"{disk}1"
            # 물리 볼륨 생성
            run_command(f"pvcreate -ff --yes {partition} > /dev/null")
            # PV 디스크 목록에 추가
            pv_disks.append(partition)
        run_command(f"lvmlockctl -k {vg_name} > /dev/null")
        # 공유 볼륨 그룹 생성
        run_command(f"vgcreate --yes --shared {vg_name} {' '.join(pv_disks)} > /dev/null")
        # 논리 볼륨 생성
        run_command(f"lvcreate --yes --activate sy -l+100%FREE -n {lv_name} {vg_name} > /dev/null")
        # GFS2 파일 시스템 생성
        lv_path = get_lv_path(vg_name, lv_name)
        run_command(f"mkfs.gfs2 -j{num_journals} -p lock_dlm -t {cluster_name}:{gfs_name} {lv_path} -O > /dev/null")

        for ip in list_ips:
            ssh_client = connect_to_host(ip)
            for disk in disks:
                run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
                run_command(f"lvmdevices --adddev {partition}", ssh_client, ignore_errors=True)
            run_command("pcs resource cleanup > /dev/null 2>&1", ssh_client, ignore_errors=True)
            ssh_client.close()

        # Configure GFS2 and LVM resources
        run_command(f"pcs resource create {gfs_name}_res --group {gfs_name}-group ocf:heartbeat:LVM-activate lvname={lv_name} vgname={vg_name} activation_mode=shared vg_access_mode=lvmlockd > /dev/null")
        run_command(f"pcs resource clone {gfs_name}_res interleave=true")
        run_command(f"pcs constraint order start glue-locking-clone then {gfs_name}_res-clone > /dev/null")
        run_command(f"pcs constraint colocation add {gfs_name}_res-clone with glue-locking-clone > /dev/null")
        run_command(f"pcs resource create {gfs_name} --group {gfs_name}-group ocf:heartbeat:Filesystem device=\"{lv_path}\" directory=\"{mount_point}\" fstype=\"gfs2\" options=noatime op monitor interval=10s on-fail=fence > /dev/null")
        run_command(f"pcs resource clone {gfs_name} interleave=true > /dev/null")
        run_command(f"pcs constraint order start {gfs_name}_res-clone then {gfs_name}-clone > /dev/null")
        run_command(f"pcs constraint colocation add {gfs_name}_res-clone with {gfs_name}-clone > /dev/null")

        for ip in list_ips:
            ssh_client = connect_to_host(ip)
            for disk in disks:
                run_command(f"partprobe {disk}", ssh_client, ignore_errors=True)
                run_command(f"lvmdevices --adddev {partition}", ssh_client, ignore_errors=True)
            run_command("pcs resource cleanup > /dev/null 2>&1", ssh_client, ignore_errors=True)
            # partprobe, lvmdevices 명령어를 재부팅할 시, 자동실행 스크립트
            run_command(f"echo -e 'partprobe {disk}\nlvmdevices --adddev {partition}' >> /etc/rc.local", ssh_client, ignore_errors=True)
            run_command("chmod +x /etc/rc.d/rc.local", ssh_client, ignore_errors=True)
            run_command("echo -e '\n[Install]\nWantedBy=multi-user.target' >> /usr/lib/systemd/system/rc-local.service", ssh_client, ignore_errors=True)
            run_command("systemctl enable --now rc-local.service", ssh_client, ignore_errors=True)
            ssh_client.close()

        ret = createReturn(code=200, val="Create GFS Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Create GFS Failure")
        return print(json.dumps(json.loads(ret), indent=4))

def create_ccvm_cluster(gfs_name,mount_point,cluster_name):
    try:

        os.system("cp "+ pluginpath + f"/tools/vmconfig/ccvm/ccvm.xml {mount_point}/ccvm.xml")
        os.system(f"cp /var/lib/libvirt/images/ablestack-template.qcow2 {mount_point}/ccvm.qcow2")
        os.system(f"qemu-img resize {mount_point}/ccvm.qcow2 +350G > /dev/null")

        run_command(f"pcs resource create {cluster_name} VirtualDomain hypervisor=qemu:///system config={mount_point}/ccvm.xml migration_transport=ssh meta allow-migrate=true priority=100 op start timeout=120s op stop timeout=120s op monitor timeout=30s interval=10s")
        run_command(f"pcs constraint order start {gfs_name}-clone then {cluster_name}")

        ret = createReturn(code=200, val="Create CCVM Cluster Success")
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val="Create CCVM Cluster Failure")
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
        if not all([args.disks, args.vg_name, args.lv_name]):
            print("All arguments are required when using --init-pcs-cluster")
            parser.print_help()
        else:
            disks = args.disks.split(',')
            vg_name = args.vg_name
            lv_name = args.lv_name
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
        if not all([args.gfs_name, args.cluster_name,args.mount_point]):
            print("All arguments are required when using --create-ccvm-cluster")
            parser.print_help()
        else:
            gfs_name = args.gfs_name
            mount_point = args.mount_point
            cluster_name = args.cluster_name

            create_ccvm_cluster(gfs_name, mount_point, cluster_name)

if __name__ == "__main__":
    main()
