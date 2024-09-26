import argparse
import fileinput
import json
import os
import random
import subprocess
import sys
import pexpect

from ablestack import *
from sh import pcs
from sh import ssh

json_file_path = "/usr/share/cockpit/ablestack/tools/properties/cluster.json"
pluginpath="/usr/share/cockpit/ablestack"
template_file = "/usr/share/cockpit/ablestack/tools/vmconfig/ccvm/ccvm.xml"
ccvm_name="cloudcenter_cluster"
gfs_mount_path="/mnt/glue-gfs"

env = os.environ.copy()
env['LANG'] = "en_US.utf-8"
env['LANGUAGE'] = "en"

def createArgumentParser():
    parser = argparse.ArgumentParser(description='Pacemaker cluster for Cloud Center VM',
                                     epilog='copyrightⓒ 2024 All rights reserved by ABLECLOUD™')

    parser.add_argument('action', choices=['config', 'attach','resource_set', 'disk_create', 'resource_create', 'create_ccvm','disk_init','resource_set_init','attach_init'], help='choose one of the actions')
    parser.add_argument('--host_name', metavar='HOST Name', type=str, help='HOST Name')
    parser.add_argument('--ipmi_ip', metavar='IPMI IP', type=str, help='IPMI IP Address')
    parser.add_argument('--ipmi_user', metavar='IPMI Access User', type=str, help='IPMI Access Users')
    parser.add_argument('--ipmi_pw', metavar='IPMI Access Password', type=str, help='IPMI Access Password')
    parser.add_argument('--ip_addr', metavar='SCVM IP Address', type=str, help='SCVM IP Address')
    parser.add_argument('--cpu', metavar='CCVM CPU Cores', type=str, help='CCVM CPU Cores')
    parser.add_argument('--memory', metavar='CCVM Memory', type=str, help='CCVM Memory')
    parser.add_argument('--management_network_bridge', metavar='CCVM Management Network', type=str, help='CCVM Management Network')
    parser.add_argument('--data1_network_bridge', metavar='CCVM PowerFlex Data1 Network', type=str, help='CCVM PowerFlex Data1 Network')
    parser.add_argument('--data2_network_bridge', metavar='CCVM PowerFlex Data2 Network', type=str, help='CCVM PowerFlex Data2 Network')
    parser.add_argument('--service_network_bridge', metavar='CCVM Service Network Bridge', type=str, help='CCVM Service Network Bridge')

    return parser

def openClusterJson():
    try:
        with open(json_file_path, 'r') as json_file:
            ret = json.load(json_file)
    except Exception as e:
        ret = createReturn(code=500, val='cluster.json read error')
        print ('EXCEPTION : ',e)

    return ret

def configCluster(args):
    try:
        json_data = openClusterJson()
        sed_command = (
            'sed -i "s/# types = \\[ \\"fd\\"\, 16 \\]/types = [ \\"scini\\", 16 ]/" /etc/lvm/lvm.conf;'
            'sed -i "s/# use_lvmlockd = 0/use_lvmlockd = 1/" /etc/lvm/lvm.conf;'
            'sed -i "s/use_devicesfile = 0/use_devicesfile = 1/" /etc/lvm/lvm.conf;'
            'systemctl enable --now corosync.service;'
            'systemctl enable --now pacemaker.service'
        )
        pcs('host', 'auth', json_data["clusterConfig"]["pcsCluster"]["hostname1"],
            json_data["clusterConfig"]["pcsCluster"]["hostname2"],
            json_data["clusterConfig"]["pcsCluster"]["hostname3"],
            '-u', 'hacluster', '-p', 'password')

        pcs('cluster','setup','glue-gfs','--start', json_data["clusterConfig"]["pcsCluster"]["hostname1"],
            json_data["clusterConfig"]["pcsCluster"]["hostname2"],
            json_data["clusterConfig"]["pcsCluster"]["hostname3"],'--force')

        for hostname in json_data["clusterConfig"]["pcsCluster"]:
            ssh('-o', 'StrictHostKeyChecking=no',json_data["clusterConfig"]["pcsCluster"][hostname],sed_command)

        pcs('cluster','enable','--all')
        pcs('resource','cleanup')

        os.system('mkdir -p '+ gfs_mount_path)

        ret = createReturn(code=200, val='pcs config success')
        return print(json.dumps(json.loads(ret), indent=4))

    except Exception:
        ret = createReturn(code=500, val='pcs config failed')
        return print(json.dumps(json.loads(ret), indent=4))


def hostAttach(args):
    try:
        pcs('stonith','create','fence-'+args.host_name,'fence_ipmilan','delay=10',
            'ipaddr='+args.ipmi_ip,'ipport=623','lanplus=1','method=onoff',
            'login='+args.ipmi_user,'passwd='+args.ipmi_pw,
            'pcmk_host_list='+args.ip_addr,'pcmk_off_action=off','pcmk_reboot_action=off')
        pcs('constraint','location','fence-'+args.host_name,'avoids',args.ip_addr)

        ret = createReturn(code=200, val='pcs host attach success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val='pcs host attach failed')
        return print(json.dumps(json.loads(ret), indent=4))

def hostAttachInit(args):
    try:
        json_data = openClusterJson()
        for i in range(len(json_data["clusterConfig"]["pcsCluster"])):
            hostname = "hostname" + str(i+1)
            if json_data["clusterConfig"]["pcsCluster"][hostname] == json_data["clusterConfig"]["hosts"][i]["ablecubePn"]:
                pcs('stonith','delete','fence-'+json_data["clusterConfig"]["hosts"][i]["hostname"])

        ret = createReturn(code=200, val='pcs host attach success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val='pcs host attach failed')
        return print(json.dumps(json.loads(ret), indent=4))

def resourceCreate(args):
    try:
        pcs('resource','create','glue-dlm','--group','glue-locking','ocf:pacemaker:controld','op','monitor','interval=30s','on-fail=fence')
        pcs('resource','create','glue-lvmlockd','--group','glue-locking','ocf:heartbeat:lvmlockd','op','monitor','interval=30s','on-fail=fence')
        pcs('resource','clone','glue-locking','interleave=true')
        ret = createReturn(code=200, val='pcs resource create success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=200, val='pcs resource create success')
        return print(json.dumps(json.loads(ret), indent=4))

def resourceCreateInit(args):
    try:
        pcs('resource','delete','glue-lvmlockd')
        pcs('resource','delete','glue-dlm')

        ret = createReturn(code=200, val='pcs resource init success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=200, val='pcs resource init success')
        return print(json.dumps(json.loads(ret), indent=4))

def diskCreate(args):
    try:
        json_data = openClusterJson()
        ccvm_disk_name = os.popen("lsblk -d -o name,size | grep scini | grep 512 | awk '{print $1}'").read().strip()
        ccvm_parted_disk_name = ccvm_disk_name +"1"
        ssh_command = (
            'partprobe /dev/'+ccvm_disk_name+';'
            'lvmdevices --adddev /dev/'+ccvm_parted_disk_name+';'
            'pcs resource cleanup'
        )
        rc = subprocess.call(["lsblk -d -o name,size | grep scini | grep 512 | awk '{print $1}'"],universal_newlines=True, shell=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        if rc == 0:
            subprocess.run("parted -s /dev/"+ccvm_disk_name+" mklabel gpt mkpart primary 0% 100% toggle 1 lvm", shell=True, check=True)
            subprocess.run("pvcreate /dev/"+ccvm_parted_disk_name+" > /dev/null", shell=True, check=True)
            subprocess.run("vgcreate --shared vg_glue /dev/"+ccvm_parted_disk_name+" > /dev/null", shell=True, check=True)
            subprocess.run("lvcreate --activate sy -l+100%FREE -n lv_glue vg_glue --wipesignatures y --yes --zero y > /dev/null", shell=True, check=True)
            subprocess.run("mkfs.gfs2 -j5 -p lock_dlm -t glue-gfs:glue /dev/vg_glue/lv_glue -q -O > /dev/null",shell=True, check=True)

            for hostname in json_data["clusterConfig"]["pcsCluster"]:
                ssh('-o', 'StrictHostKeyChecking=no',json_data["clusterConfig"]["pcsCluster"][hostname],ssh_command)

            ret = createReturn(code=200, val='powerflex disk create success')
            return print(json.dumps(json.loads(ret), indent=4))
        else :
            ret = createReturn(code=500, val='powerflex disk create failed')
            return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
            ret = createReturn(code=500, val='powerflex disk does not exist')
            return print(json.dumps(json.loads(ret), indent=4))

def diskInit(args):
    try:
        ccvm_disk_name = os.popen("lsblk -d -o name,size | grep scini | grep 512 | awk '{print $1}'").read().strip()
        rc = subprocess.call(["lvs /dev/vg_glue/lv_glue >> /dev/null 2>&1'"],universal_newlines=True, shell=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        if rc == 0:
            subprocess.run("vgchange --lock-type none --lock-opt force vg_glue -y > /dev/null", shell=True, check=True)
            subprocess.run("vgchange -aey vg_glue > /dev/null", shell=True, check=True)
            subprocess.run("lvremove --lockopt skiplv /dev/vg_glue/lv_glue -y", shell=True, check=True)
            subprocess.run("vgremove vg_glue > /dev/null", shell=True, check=True)
            subprocess.run("pvremove /dev/"+ccvm_disk_name+" > /dev/null", shell=True, check=True)

            ret = createReturn(code=200, val='powerflex disk init success')
            return print(json.dumps(json.loads(ret), indent=4))
        else :
            ret = createReturn(code=500, val='powerflex disk init does not exist')
            return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
            ret = createReturn(code=500, val='powerflex disk init failed')
            return print(json.dumps(json.loads(ret), indent=4))

def resourceSetting(args):
    try:
        json_data = openClusterJson()
        ccvm_disk_name = os.popen("lsblk -d -o name,size | grep scini | grep 512 | awk '{print $1}'").read().strip()
        ccvm_parted_disk_name = ccvm_disk_name +"1"
        ssh_command = (
            'partprobe /dev/'+ccvm_disk_name+';'
            'lvmdevices --adddev /dev/'+ccvm_parted_disk_name+';'
            'pcs resource cleanup'
        )
        pcs('resource','create','glue-resource','--group','glue','ocf:heartbeat:LVM-activate','lvname=lv_glue','vgname=vg_glue','activation_mode=shared','vg_access_mode=lvmlockd')
        pcs('resource','clone','glue-resource','interleave=true')
        pcs('constraint','order','start','glue-locking-clone','then','glue-resource-clone')
        pcs('constraint','colocation','add','glue-resource-clone','with','glue-locking-clone')
        pcs('resource','create','glue-gfs','--group','glue','ocf:heartbeat:Filesystem','device=/dev/vg_glue/lv_glue','directory='+gfs_mount_path+'',
            'fstype=gfs2','options=noatime',
            'op','monitor','interval=10s',
            'on-fail=fence')
        pcs('resource','clone','glue-gfs','interleave=true')
        pcs('constraint','order','start','glue-resource-clone','then','glue-gfs-clone')
        pcs('constraint','colocation','add','glue-resource-clone','with','glue-gfs-clone')

        for hostname in json_data["clusterConfig"]["pcsCluster"]:
            ssh('-o', 'StrictHostKeyChecking=no',json_data["clusterConfig"]["pcsCluster"][hostname],ssh_command)

        ret = createReturn(code=200, val='pcs resource setting success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val='pcs resource setting failed')
        return print(json.dumps(json.loads(ret), indent=4))

def resourceSettingInit(args):
    try:
        pcs('constraint','colocation','delete','glue-resource-clone','glue-gfs-clone')
        pcs('constraint','order','delete','glue-resource-clone','glue-gfs-clone')
        pcs('resource','delete','glue-gfs')
        pcs('constraint','colocation','delete','glue-resource-clone','glue-locking-clone')
        pcs('resource','remove','glue-resource')

        ret = createReturn(code=200, val='pcs resource setting init success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val='pcs resource setting init failed')
        return print(json.dumps(json.loads(ret), indent=4))
def ccvmInit(args):
    try:
        pcs("resource","disable",ccvm_name)

        pcs("resource","delete",ccvm_name)

        ret = createReturn(code=200, val='ccvmCreate success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val='ccvmCreate failed')
        return print(json.dumps(json.loads(ret), indent=4))
def ccvmCreate(args):
    try:
        os.system("cp /var/lib/libvirt/images/ablestack-template.qcow2 /var/lib/libvirt/images/ccvm.qcow2")

        os.system("qemu-img resize /var/lib/libvirt/images/ccvm.qcow2 +350G > /dev/null")

        pcs("resource","create",ccvm_name,"VirtualDomain","hypervisor=qemu:///system","config="+template_file,
            "migration_transport=ssh","meta","allow-migrate=true","priority=100",
            "op","start","timeout=120s",
            "op","stop","timeout=120s",
            "op","monitor","timeout=30s",
            "interval=10s")
        pcs("constraint","order","start","glue-gfs-clone","then",ccvm_name)

        ret = createReturn(code=200, val='ccvmCreate success')
        return print(json.dumps(json.loads(ret), indent=4))
    except Exception:
        ret = createReturn(code=500, val='ccvmCreate failed')
        return print(json.dumps(json.loads(ret), indent=4))

if __name__ == '__main__':
    # parser 생성
    parser = createArgumentParser()
    # input 파싱
    args = parser.parse_args()
    # 파싱된 argument 출력

    # 실제 로직 부분 호출 및 결과 출력
    if (args.action) == 'config':
        configCluster(args)
    elif (args.action) == 'attach':
        hostAttach(args)
    elif(args.action) == 'resource_create':
        resourceCreate(args)
    elif(args.action) == 'disk_create':
        diskCreate(args)
    elif(args.action) == 'resource_set':
        resourceSetting(args)
    elif(args.action) == 'resource_init':
        resourceCreateInit(args)
    elif(args.action) == 'resource_set_init':
        resourceSettingInit(args)
    elif(args.action) == 'disk_init':
        diskInit(args)
    elif(args.action) == 'attach_init':
        hostAttachInit(args)
    elif(args.action) == 'create_ccvm':
        ccvmCreate(args)
