/**
 * File Name : main-glue.js
 * Date Created : 2023.04.25
 * Writer  :배태주
 * Description : main-glue.html에서 발생하는 이벤트 처리를 위한 JavaScript
 **/

// document.ready 영역 시작
pluginpath = '/usr/share/cockpit/ablestack';
var console_log = true;

$(document).ready(function(){
    $('#div-modal-wizard-gateway-vm').load("./src/features/glue/gateway-vm-wizard.html");
    $('#div-modal-wizard-gateway-vm').hide();

    $('#dropdown-menu-storage-system-status').hide();
    $('#dropdown-menu-iscsi-status').hide();
    // gluefs 구성 화면 로드
    $('#div-modal-gluefs-construction').load("./src/features/glue/gluefs-construction.html");
    $('#div-modal-gluefs-construction').hide();
    // nfs 구성 화면 로드
    $('#div-modal-nfs-construction').load("./src/features/glue/nfs-construction.html");
    $('#div-modal-nfs-construction').hide();
    // smb 구성 화면 로드
    $('#div-modal-smb-construction').load("./src/features/glue/smb-construction.html");
    $('#div-modal-smb-construction').hide();

    $('#menu-item-set-gluefs-delete').hide();
    $('#menu-item-set-nfs-delete').hide();
    $('#menu-item-set-smb-delete').hide();
    $('#menu-item-set-iscsi-delete').hide();
    $('#menu-item-set-iscsi-service-control').hide();
    $('#menu-item-set-iscsi-target-create').hide();
    $('#menu-item-set-iscsi-acl-connect').hide();

    topTabAction("button-tab-glue-vm");
    scanHostKey();
    gwvmInfoSet();
    glueVmList();

    setInterval(() => {
        gwvmInfoSet(),glueVmList()
        // ,gluefsList(),nfsClusterList(),nfsExportList(),iscsiServiceList(),smbServiceList()
    }, 60000);
});
// document.ready 영역 끝

// 이벤트 처리 함수
// 상태 보기 드롭다운 메뉴를 활성화한 상태에서 다른 영역을 클릭 했을 경우 메뉴 닫기 (현재 활성화된 iframe 클릭할 때 작동)
$('html').on('click', function(e){
    if(!$(e.target).hasClass('pf-c-dropdown__toggle')){
        $('.pf-c-dropdown__menu, .pf-m-align-right').hide();
    }
    
    // if(!$(e.target).hasClass('pf-c-check__input') || ){
    //     if(!$(e.target).hasClass('pf-c-select__toggle') || !$(e.target).hasClass('pf-c-select__menu-item') || !$(e.target).hasClass('pf-c-select__menu')){
    //         $('.pf-c-select__menu').hide();
    //     }
    // }
});

// 상태 보기 드롭다운 메뉴를 활성화한 상태에서 다른 영역을 클릭 했을 경우 메뉴 닫기 (pareant html 클릭할 때 작동)
$(top.document, 'html').on('click', function(e){
    if(!$(e.target).hasClass('pf-c-dropdown__toggle')){
        $('.pf-c-dropdown__menu, .pf-m-align-right').hide();
    }
});

// 상태 보기 드롭다운 메뉴를 활성화한 상태에서 다른 드롭다운 메뉴를 클릭 했을 경우 메뉴 닫기
function toggleAction(id,index){
    $('.pf-c-dropdown__menu, .pf-m-align-right').hide();
    $('#'+id+index).toggle();
}

$('#card-action-gateway-vm-status').on('click', function(){
    $('#dropdown-menu-gateway-vm-status').toggle();
});

$('#button-open-modal-wizard-gateway-vm').on('click', function(){
    $('#div-modal-wizard-gateway-vm').show();
});

// 파일 시스템 눈금 클릭 시
$('#card-action-storage-cluster-system-status').on('click',function(){

    if( $('#gluefs-status').text() != 'Health Err' || $('#nfs-status').text() != 'Health Err' || $('#smb-status').text() != 'Health Err'){
        $('#menu-item-set-filesystem-control').removeClass('pf-m-disabled');
        $('#menu-item-set-filesystem-control').addClass('pf-m-enabled');
    }else{
        $('#menu-item-set-filesystem-control').removeClass('pf-m-enabled');
        $('#menu-item-set-filesystem-control').addClass('pf-m-disabeld');
    }
    $('#dropdown-menu-storage-system-status').toggle();
});

// iscsi 눈금 클릭 시
$('#card-action-storage-cluster-iscsi-status').on('click', function(){
        if($('#iscsi-status').text() == "Health Err"){
            $('#menu-item-set-iscsi-delete').hide();
            $('#menu-item-set-iscsi-service-control').hide();
            $('#menu-item-set-iscsi-target-create').hide();
            $('#menu-item-set-iscsi-acl-connect').hide();
            $('#menu-item-set-iscsi-construction').show();
        }else{
            $('#menu-item-set-iscsi-delete').show();
            $('#menu-item-set-iscsi-service-control').show();
            $('#menu-item-set-iscsi-target-create').show();
            $('#menu-item-set-iscsi-acl-connect').show();
            $('#menu-item-set-iscsi-construction').hide();
        }
    $('#dropdown-menu-iscsi-status').toggle();
});

/** 스토리지 서비스 구성 관련 action start */
$('#button-glue-api-server-connect').on('click', function(){
    window.open("https://10.10.3.11:8080/swagger/index.html");
});

/** 스토리지 서비스 구성 관련 action start */
$('#menu-item-gateway-vm-setup').on('click', function(){
    $('#form-select-gateway-vm-mngt-nic-parent').val("");
    $('#form-input-gateway-vm-mngt-nic-ip').val("");
    $('#form-select-gateway-vm-storage-nic-parent').val("");
    $('#form-input-gateway-vm-storage-nic-ip').val("");
    
    $('#div-modal-gateway-vm-setup').show();
});

/** 스토리지 서비스 구성 관련 action start */
$('#menu-item-gateway-vm-setup2').on('click', function(){

    $('#div-modal-gateway-vm-setup').show();
});

// iscsi 구성 화면 닫기
$('#div-modal-iscsi-close, #button-cancel-iscsi').on('click', function(){
    $('#div-modal-iscsi').hide();
});
// iscsi 구성
$('#button-execution-iscsi').on('click', function(){
    $('#div-modal-iscsi').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI 구성 중');
    $('#div-modal-spinner').show();
    setTimeout(function(){
        cockpit.spawn(['python3', pluginpath + '/python/glue/iscsi.py', 'config']).then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#modal-status-alert-title').text("iSCSI 구성");
            $('#modal-status-alert-body').text("iSCSI 구성 완료되었습니다.");
            $('#div-modal-status-alert').show();
        }else{
            $('#modal-status-alert-title').text("iSCSI 구성");
            $('#modal-status-alert-body').text("iSCSI 구성 실패했습니다.");
            $('#div-modal-status-alert').show();
        }
    })}, 5000)

});
//gluefs 구성 화면 열기
$('#menu-item-set-gluefs-construction').on('click',function(){
    localStorage.clear();
    sessionStorage.clear();
    $('#div-modal-gluefs-construction').show();
});
// nfs 구성 화면 열기
$('#menu-item-set-nfs-construction').on('click',function(){
    localStorage.clear();
    sessionStorage.clear();
    $('#div-modal-nfs-construction').show();
});
// smb 구성 화면 열기
$('#menu-item-set-smb-construction').on('click',function(){
    localStorage.clear();
    sessionStorage.clear();
    $('#div-modal-smb-construction').show();
});
// iscsi 구성 화면 열기
$('#menu-item-set-iscsi-construction').on('click', function(){
    $('#modal-title-iscsi').text("iSCSI 구성");
    $('#modal-body-iscsi').text("iSCSI 구성 하시겠습니까?")
    $('#div-modal-iscsi').show();
});

// div-modal-alert-button-confirm 클릭시
$('#modal-status-alert-button-confirm').on('click',function(){
    $('#div-modal-status-alert').hide();
    // location.reload();
});

// alert modal 닫기
$('#modal-status-alert-button-close1, #modal-status-alert-button-close2').on('click', function(){
    $('#div-modal-status-alert').hide();
});

// help 팝업 이벤트 처리 시작
$('i[name=icon-help-action]').on('click',function(e){
    console.log(e.target.id);
    $("#modal-help-title").html("");
    // $("#modal-help-body").html("");
    
    if(e.target.id == "icon-help-glue-vm-status"){
        $("#modal-help-title").html("Glue 가상머신 도움말");
        $("#modal-help-body").html("Glue 스토리지 클러스터를 구성하는 가상머신 상태 정보와 IP 정보를 확인할 수 있습니다.");
    } else if (e.target.id == "icon-help-gateway-vm-status") {
        $("#modal-help-title").html("게이트웨이 가상머신 도움말");
        $("#modal-help-body").html("스토리지 서비스 게이트웨이 전용 가상머신으로 필요시 해당 가상머신을 구성하여 사용할 수 있습니다.");
    } else if (e.target.id == "icon-help-gluefs") {
        $("#modal-help-title").html("Glue File System 도움말");
        $("#modal-help-body").html("Glue 파일 시스템( GlueFS )은 Glue의 분산 객체 저장소인 RADOS 위에 구축된 POSIX 호환 파일 시스템입니다. Glue FS는 공유 홈 디렉터리, HPC 스크래치 공간, 분산 워크플로 공유 스토리지와 같은 다양한 애플리케이션을 위한 최첨단 다용도 고가용성 고성능 파일 저장소를 제공합니다.");
    } else if (e.target.id == "icon-help-gluefs-subvolume-group") {
        $("#modal-help-title").html("Glue FS Subvolume Group 도움말");
        $("#modal-help-body").html("GlueFS(Glue File System) 하위 볼륨 그룹을 생성, 조회, 절대 경로 가져오기 및 제거할 수 있습니다. Glue FS의 하위 그룹을 생성하여 효율적으로 GlueFS의 그룹 및 경로를 관리할 수 있습니다.");
    } else if (e.target.id == "icon-help-nfs-cluster") {
        $("#modal-help-title").html("NFS Cluster 도움말");
        $("#modal-help-body").html("NFS 서비스를 제공하는 클러스터를 생성할 수 있습니다.");
    } else if (e.target.id == "icon-help-nfs-export") {
        $("#modal-help-title").html("NFS Export 도움말");
        $("#modal-help-body").html("NFS Export의 경로, GlueFS, 프로토콜, 접근타입, Squash를 설정 및 관리할 수 있습니다.");
    } else if (e.target.id == "icon-help-ingress-service") {
        $("#modal-help-title").html("INGRESS Service 도움말");
        $("#modal-help-body").html("NFS, OBJECT GATEWAY 서비스에 대한 INGRESS 서비스를 배포하면 가상 IP를 통한 안적적 접근이 가능하고, SCVM 장애 발생시 SCVM간 페일오버가 가능합니다.");
    } else if (e.target.id == "icon-help-iscsi-service") {
        $("#modal-help-title").html("iSCSI Service 도움말");
        $("#modal-help-body").html("iSCSI 게이트웨이 서비스는 RBD(RADOS 블록 장치) 이미지를 SCSI 디스크로 내보내는 HA(고가용성) iSCSI Target을 제공합니다. iSCSI 프로토콜을 사용하면 클라이언트(이니시에이터)가 TCP/IP 네트워크를 통해 스토리지 장치(대상)에 SCSI 명령을 보낼 수 있으므로 클라이언트가 Glue 블록 스토리지에 액세스할 수 있습니다.");
    } else if (e.target.id == "icon-help-iscsi-target") {
        $("#modal-help-title").html("iSCSI Target 도움말");
        $("#modal-help-body").html("iSCSI Target을 생성하고 관리할 수 있습니다.");
    } else if (e.target.id == "icon-help-smb-service") {
        $("#modal-help-title").html("SMB Service 도움말");
        $("#modal-help-body").html("Glue 가상머신 별 SMB 서비스를 제공 및 활성화 하고 관리할 수 있습니다. 또한 사용자 정보를 관리할 수 있습니다.");
    } else if (e.target.id == "icon-help-object-gateway") {
        $("#modal-help-title").html("Object Gateway 도움말");
        $("#modal-help-body").html("Object Gateway는 Glue 위에 구축된 객체 스토리지 인터페이스입니다. 애플리케이션과 Glue Storage Cluster 사이에 RESTful 게이트웨이를 제공합니다. Glue Object Storage는 S3과 Swift 두 가지 RESTful API와 호환되는 인터페이스로 객체 스토리지 기능을 제공합니다.");
    } else if (e.target.id == "icon-help-object-gateway-user") {
        $("#modal-help-title").html("Object Gateway User 도움말");
        $("#modal-help-body").html("Object Gateway User는 객체 스토리지 사용자정보를 관리하는 기능으로서 엑세스 정보와 사용량 제한 등 관리기능을 제공합니다.");
    } else if (e.target.id == "icon-help-object-gateway-bucket") {
        $("#modal-help-title").html("Object Gateway Bucket 도움말");
        $("#modal-help-body").html("Object Gateway Bucket은 연관된 오브젝트(파일)를 그룹핑한 최상위 디렉토리이며, 사용자별 여러개의 버킷을 생성하여 사용할 수 있습니다.");
    }

    $('#div-modal-help').show();
})
// help 팝업 이벤트 처리 끝



// div-modal-alert-button-confirm 클릭시
$('#modal-help-button-confirm, #modal-help-button-close1').on('click',function(){
    $('#div-modal-help').hide();
});

// 삭제 modal 닫기
$('#button-cancel-modal-delete, #button-close-modal-delete').on('click',function(){
    $('#div-modal-all-delete').hide();
});
// gluefs 편집 열기
$('#gluefs-edit').on('click',function(){
    sessionStorage.setItem('type','gluefs_edit');
    $('#gluefs-construction-type').attr('style', "display:none;");
    $('#modal-title-gluefs-construciton').text('GlueFS 편집');
    $('#div-modal-gluefs-construction').show();

});
// nfs 편집 열기
$('#nfs-edit').on('click',function(){
    sessionStorage.setItem('type','nfs_edit');

    $('#modal-title-nfs-construciton').text('NFS 편집');
    $('#div-modal-nfs-construction').show();
});
// smb 편집 열기
$('#smb-edit').on('click',function(){
    sessionStorage.setItem('type','smb_edit');

    $('#smb-group-user, #smb-group-password').attr('style','display:none;');
    $('#modal-title-smb-construciton').text('SMB 편집');
    $('#div-modal-smb-construction').show();
});
// 파일 시스템 서비스 제어 열림
$('#menu-item-set-filesystem-control').on('click',function(){
    sessionStorage.clear();
    $('#div-modal-file-system-control').show();
});
// 파일 시스템 서비스 제어 닫힘
$('#button-close-file-system-control, #button-cancel-modal-file-system-control').on('click',function(){
    sessionStorage.clear();
    $('#div-modal-file-system-control').hide();
});
// 파일 시스템 서비스 실행 버튼 클릭 시
$('#button-execution-modal-file-system-control').on('click',function(){
    var service_name = $('#form-select-file-system-service-control').val();
    var service_action = $('#form-select-service-control-action').val();

    if(service_name == 'gluefs'){
            $('#div-modal-file-system-control').hide();
            $('#div-modal-spinner-header-txt').text('GlueFS 서비스 제어 중');
            $('#div-modal-spinner').show();

            var cmd = ['python3', pluginpath + '/python/glue/gluefs.py', 'daemon', '--control', service_action];
            cockpit.spawn(cmd).then(function(data){
                var retVal = JSON.parse(data);
                var retVal_code = JSON.parse(retVal.code);

                $('#div-modal-spinner').hide();

                if(service_action == 'stop'){
                    if(retVal_code == 200){
                        $('#modal-status-alert-title').text("GlueFS 서비스 제어");
                        $('#modal-status-alert-body').text("GlueFS 서비스가 정지되었습니다.");
                        $('#div-modal-status-alert').show();
                    }
                    else{
                        $('#modal-status-alert-title').text("GlueFS 서비스 제어");
                        $('#modal-status-alert-body').text("GlueFS 서비스를 정지 시키는 데 실패했습니다.");
                        $('#div-modal-status-alert').show();
                    }
                }
                else{
                    if(retVal_code == 200){
                        $('#modal-status-alert-title').text("GlueFS 서비스 제어");
                        $('#modal-status-alert-body').text("GlueFS 서비스가 시작되었습니다.");
                        $('#div-modal-status-alert').show();
                    }
                    else{
                        $('#modal-status-alert-title').text("GlueFS 서비스 제어");
                        $('#modal-status-alert-body').text("GlueFS 서비스를 시작 시키는 데 실패했습니다.");
                        $('#div-modal-status-alert').show();
                    }
                }

            });
    }
    else if(service_name == 'nfs'){
        $('#div-modal-file-system-control').hide();
        $('#div-modal-spinner-header-txt').text('NFS 서비스 제어 중');
        $('#div-modal-spinner').show();

        var cmd = ['python3', pluginpath + '/python/glue/nfs.py', 'daemon', '--control', service_action];
        cockpit.spawn(cmd).then(function(data){
            var retVal = JSON.parse(data);
            var retVal_code = JSON.parse(retVal.code);
            $('#div-modal-spinner').hide();
            if(service_action == 'stop'){
                if(retVal_code == 200){
                    $('#modal-status-alert-title').text("NFS 서비스 제어");
                    $('#modal-status-alert-body').text("NFS 서비스가 정지되었습니다.");
                    $('#div-modal-status-alert').show();
                }
                else{
                    $('#modal-status-alert-title').text("NFS 서비스 제어");
                    $('#modal-status-alert-body').text("NFS 서비스를 정지 시키는 데 실패했습니다.");
                    $('#div-modal-status-alert').show();
                }
            }
            else{
                if(retVal_code == 200){
                    $('#modal-status-alert-title').text("NFS 서비스 제어");
                    $('#modal-status-alert-body').text("NFS 서비스가 시작되었습니다.");
                    $('#div-modal-status-alert').show();
                }
                else{
                    $('#modal-status-alert-title').text("NFS 서비스 제어");
                    $('#modal-status-alert-body').text("NFS 서비스를 시작 시키는 데 실패했습니다.");
                    $('#div-modal-status-alert').show();
                }
            }
        });
        }
    else if(service_name == 'smb'){
        $('#div-modal-file-system-control').hide();
        $('#div-modal-spinner-header-txt').text('SMB 서비스 제어 중');
        $('#div-modal-spinner').show();

        var cmd = ['python3', pluginpath + '/python/glue/smb.py', service_action,'-sn','smb'];
        cockpit.spawn(cmd).then(function(data){
            var retVal = JSON.parse(data);
            $('#div-modal-spinner').hide();
            if(service_action == 'stop'){
                if(retVal.code == 200){
                    $('#modal-status-alert-title').text("SMB 서비스 제어");
                    $('#modal-status-alert-body').text("SMB 서비스가 정지되었습니다.");
                    $('#div-modal-status-alert').show();

                    localStorage.setItem('smb','stop');
                }
                else{
                    $('#modal-status-alert-title').text("SMB 서비스 제어");
                    $('#modal-status-alert-body').text("SMB 서비스를 정지 시키는 데 실패했습니다.");
                    $('#div-modal-status-alert').show();
                }
            }
            else{
                if(retVal.code == 200){
                    $('#modal-status-alert-title').text("SMB 서비스 제어");
                    $('#modal-status-alert-body').text("SMB 서비스가 시작되었습니다.");
                    $('#div-modal-status-alert').show();
                }
                else{
                    $('#modal-status-alert-title').text("SMB 서비스 제어");
                    $('#modal-status-alert-body').text("SMB 서비스를 시작 시키는 데 실패했습니다.");
                    $('#div-modal-status-alert').show();
                }
            }
        });
    }
});
// iscsi 서비스 제어 버튼 클릭 시
$('#menu-item-set-iscsi-service-control').on('click', function(){
    $('#div-modal-iscsi-control').show();
});
// iscsi 서비스 제어 취소 버튼 시
$('#button-close-iscsi-control, #button-cancel-modal-iscsi-control').on('click', function(){
    $('#div-modal-iscsi-control').hide();
});
// iscsi 서비스 제어 실행 클릭 시
$('#button-execution-modal-iscsi-control').on('click', function(){

    var action = $('#form-select-iscsi-service-control-action').val();

    $('#div-modal-iscsi-control').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI 서비스 제어 중');
    $('#div-modal-spinner').show();

    cockpit.spawn(['python3', pluginpath + '/python/glue/iscsi.py', 'daemon', '--control', action]).then(function(data){
        var retVal = JSON.parse(data);
        if(action == 'stop'){
            if(retVal.code == 200){
                $('#modal-status-alert-title').text("iSCSI 서비스 제어");
                $('#modal-status-alert-body').text("iSCSI 서비스가 정지되었습니다.");
                $('#div-modal-status-alert').show();

                localStorage.setItem('iscsi','stop');
            }
            else{
                $('#modal-status-alert-title').text("iSCSI 서비스 제어");
                $('#modal-status-alert-body').text("iSCSI 서비스를 정지 시키는 데 실패했습니다.");
                $('#div-modal-status-alert').show();
            }
        }
        else{
            if(retVal.code == 200){
                $('#modal-status-alert-title').text("iSCSI 서비스 제어");
                $('#modal-status-alert-body').text("iSCSI 서비스가 시작되었습니다.");
                $('#div-modal-status-alert').show();
            }
            else{
                $('#modal-status-alert-title').text("iSCSI 서비스 제어");
                $('#modal-status-alert-body').text("iSCSI 서비스를 시작 시키는 데 실패했습니다.");
                $('#div-modal-status-alert').show();
            }
        }

    });
});
// gluefs 삭제 버튼 클릭 시
$('#menu-item-set-gluefs-delete').on('click',function(){

    sessionStorage.setItem('type','gluefs_delete');

    $('#div-modal-delete-title').text("GlueFS 삭제");
    $('#div-modal-delete-body').text("GlueFS를 삭제하시겠습니까?");
    $('#div-modal-delete-body-p').text("(GlueFS 삭제 시 SMB,NFS 삭제를 먼저 이행 하셔야 합니다.)");
    $('#div-modal-delete-body-p').show();
    if ($('#nfs-status').text() == "Health Err" && $('#smb-status').text() == "Health Err"){
        $('#button-execution-modal-delete').addClass('pf-m-enabled');
        $('#button-execution-modal-delete').removeClass('pf-m-disabled');
    }else{
        $('#button-execution-modal-delete').addClass('pf-m-disabled');
        $('#button-execution-modal-delete').removeClass('pf-m-enabled');
    }

    $('#div-modal-all-delete').show();
});
// nfs 삭제 버튼 클릭 시
$('#menu-item-set-nfs-delete').on('click',function(){

    sessionStorage.setItem('type','nfs_delete');

    $('#div-modal-delete-title').text("NFS 삭제");
    $('#div-modal-delete-body').text("NFS를 삭제하시겠습니까?");
    $('#div-modal-delete-body-p').hide();
    $('#button-execution-modal-delete').removeClass('pf-m-disabled');
    $('#button-execution-modal-delete').removeClass('pf-m-enabled');
    $('#div-modal-all-delete').show();
});
// smb 삭제 버튼 클릭 시
$('#menu-item-set-smb-delete').on('click',function(){

    sessionStorage.setItem('type','smb_delete');

    $('#div-modal-delete-title').text("SMB 삭제");
    $('#div-modal-delete-body').text("SMB를 삭제하시겠습니까?");
    $('#div-modal-delete-body-p').hide();
    $('#button-execution-modal-delete').removeClass('pf-m-disabled');
    $('#button-execution-modal-delete').removeClass('pf-m-enabled');
    $('#div-modal-all-delete').show();
});
// iscsi 삭제 버튼 클릭 시
$('#menu-item-set-iscsi-delete').on('click', function(){
    sessionStorage.setItem('type', 'iscsi_delete');

    $('#div-modal-delete-title').text("iSCSI 삭제");
    $('#div-modal-delete-body').text("iSCSI를 삭제하시겠습니까?");
    $('#div-modal-delete-body-p').text("iSCSI 삭제 진행 시, 타겟 및 이미지도 완전 삭제됩니니다.");
    $('#div-modal-delete-body-p').show();
    $('#button-execution-modal-delete').removeClass('pf-m-disabled');
    $('#button-execution-modal-delete').removeClass('pf-m-enabled');
    $('#div-modal-all-delete').show();

});
// 삭제 실행 버튼 클릭 시
$('#button-execution-modal-delete').on('click',function(){

    var delete_session = sessionStorage.getItem('type');

    localStorage.clear();

    $('#div-modal-all-delete').hide();

    if(delete_session == 'gluefs_delete'){
        $('#div-modal-spinner-header-txt').text('GlueFS 삭제 중');
        $('#div-modal-spinner').show();

        cockpit.spawn(['python3', pluginpath + '/python/glue/gluefs.py','delete']).then(function(data){
            var retVal = JSON.parse(data);
            var retVal_code = JSON.parse(retVal.code);
            if(retVal_code == 200){
                cockpit.spawn(['python3', pluginpath + '/python/glue/gluefs.py', 'destroy']).then(function(data){
                    var retVal = JSON.parse(data);
                    var retVal_code = JSON.parse(retVal.code);
                    $('#div-modal-spinner').hide();

                    if(retVal_code == 200){
                        $('#modal-status-alert-title').text("GlueFS 삭제");
                        $('#modal-status-alert-body').text("GlueFS 삭제가 완료되었습니다.");
                        $('#div-modal-status-alert').show();

                        sessionStorage.removeItem('type');
                    }
                    else{
                        $('#modal-status-alert-title').text("GlueFS 삭제");
                        $('#modal-status-alert-body').text("GlueFS 삭제가 실패했습니다.");
                        $('#div-modal-status-alert').show();
                    }
                }).catch(function(){
                    createLoggerInfo("GlueFS destroy failed");
                });
            }
            else{
                $('#modal-status-alert-title').text("GlueFS 삭제");
                $('#modal-status-alert-body').text("GlueFS 삭제가 실패했습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function(){
                createLoggerInfo("GlueFS delete failed");
        });
    }
    else if(delete_session == 'nfs_delete'){
        $('#div-modal-spinner-header-txt').text('NFS 삭제 중');
        $('#div-modal-spinner').show();
        cockpit.spawn(['python3', pluginpath + '/python/glue/nfs.py','destroy']).then(function(data){
            var retVal = JSON.parse(data);
            var retVal_code = JSON.parse(retVal.code);

            $('#div-modal-spinner').hide();

            if(retVal_code == 200){
                $('#modal-status-alert-title').text("NFS 삭제");
                $('#modal-status-alert-body').text("NFS 삭제가 완료되었습니다.");
                $('#div-modal-status-alert').show();

                sessionStorage.removeItem('type');
            }
            else{
                $('#modal-status-alert-title').text("NFS 삭제");
                $('#modal-status-alert-body').text("NFS 삭제가 실패했습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function(){
            createLoggerInfo("NFS delete failed");
        });
    }
    else if(delete_session == 'smb_delete'){
        $('#div-modal-spinner-header-txt').text('SMB 삭제 중');
        $('#div-modal-spinner').show();
        cockpit.spawn(['python3', pluginpath + '/python/glue/smb.py','delete']).then(function(data){
            var retVal = JSON.parse(data);

            $('#div-modal-spinner').hide();

            if(retVal.code == 200){
                $('#div-modal-all-delete').hide();
                $('#modal-status-alert-title').text("SMB 삭제");
                $('#modal-status-alert-body').text("SMB 삭제가 완료되었습니다.");
                $('#div-modal-status-alert').show();

                sessionStorage.removeItem('type');
            }
            else{
                $('#modal-status-alert-title').text("SMB 삭제");
                $('#modal-status-alert-body').text("SMB 삭제가 실패했습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function(){
            createLoggerInfo("SMB delete failed");
        })
    }
    else if(delete_session == 'iscsi_delete'){
        $('#div-modal-spinner-header-txt').text('iSCSI 삭제 중');
        $('#div-modal-spinner').show();
        cockpit.spawn(['python3', pluginpath + '/python/glue/iscsi.py', 'destroy']).then(function(data){
            var retVal = JSON.parse(data);

            $('#div-modal-spinner').hide();

            if(retVal.code == 200){
                $('#div-modal-all-delete').hide();
                $('#modal-status-alert-title').text("iSCSI 삭제");
                $('#modal-status-alert-body').text("iSCSI 삭제가 완료되었습니다.");
                $('#div-modal-status-alert').show();

                sessionStorage.removeItem('type');
            }
            else{
                $('#modal-status-alert-title').text("SMB 삭제");
                $('#modal-status-alert-body').text("SMB 삭제가 실패했습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function(){
            createLoggerInfo("iSCSI delete failed");
        })
    }
});

// function iscsiCheckInfo(type){
//     $('#iscsi-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
//     $("#iscsi-color").attr('class','pf-c-label pf-m-orange');
//     $("#iscsi-icon").attr('class','fas fa-fw fa-exclamation-triangle');

//     var session = localStorage.getItem('iscsi');

//     cockpit.spawn(['python3', pluginpath + '/python/glue/iscsi.py', 'status']).then(function(data){
//         var retVal = JSON.parse(data);
//         var retVal_val = JSON.parse(retVal.val);
//         if(retVal_val[0].status.running == "1"){
//             cockpit.spawn(['python3', pluginpath + '/python/glue/iscsi.py', 'list']).then(function(data){
//                 var retVal = JSON.parse(data);
//                 var retVal_val = JSON.parse(retVal.val);
//                 if(retVal.code == 200){

//                     cockpit.spawn(['python3', pluginpath + '/python/glue/iscsi.py', 'image']).then(function(data){
//                         var image = JSON.parse(data);
//                         var image_val = JSON.parse(image.val);
//                         console.log(image_val);
//                         if(image.code == 200){
//                             if(type == 'delete'){
//                                 $('#iscsi-tbody tr').remove();
//                                 $('#iscsi-tbody').html('<tbody role="rowgroup" id="iscsi-tbody"></tbody>');
//                             }
//                             for(var i = 0; i < retVal_val.length; i++){
//                                 $('#iscsi-tbody').append('<tr role="row"><td role="cell" data-label="대상">'+ retVal_val[i].target_iqn+'</td>'
//                                                           + '<td role="cell" data-label="포털">'+ retVal_val[i].portals[0].ip+ '</td>'
//                                                           + '<td role="cell" data-label="이미지">'+ image_val[0].value[0].name+ '</td>'
//                                                           + '<td role="cell" data-label="크기">'+ Byte(image_val[0].value[0].size)+ '</td>'
//                                                           + '<td class="pf-c-table__icon" role="cell" data-label="편집"><button class="pf-c-dropdown__toggle pf-m-plain" id="iscsi-edit" aria-expanded="false" type="button" aria-label="Actions"><i class="fas fa-edit"></i></td>'
//                                                           + '<td class="pf-c-table__icon" role="cell" data-label="삭제"><button class="pf-c-dropdown__toggle pf-m-plain" id="iscsi-delete" aria-expanded="false" type="button" aria-label="Actions"><i class="fas fa-trash"></i></td></tr>');
//                             }
//                             $('#iscsi-status').text("Health OK");
//                             $('#iscsi-color').attr('class','pf-c-label pf-m-green');
//                             $('#iscsi-icon').attr('class','fas fa-fw fas fa-fw fa-check-circle');

//                         }
//                     })
//                 }
//             })
//         }
//         else{
//             if(session == "stop"){
//                 $('#iscsi-status').text("Stop");
//                 $('#iscsi-color').attr('class','pf-c-label pf-m-red');
//                 $('#iscsi-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//             }
//             else{
//                 $('#iscsi-status').text("Health Err");
//                 $('#iscsi-color').attr('class','pf-c-label pf-m-red');
//                 $('#iscsi-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//             }
//         }
//     });
// }
/**
 * Meathod Name : sambaCheckInfo
 * Date Created : 2023.06.02
 * Writer  : 정민철
 * Description : 삼바 서비스 상태 동작 확인 및 정보 확인
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.31 최초 작성
 */
// function sambaCheckInfo(){
//     var action = localStorage.getItem('smb');

//     $('#smb-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
//     $("#smb-color").attr('class','pf-c-label pf-m-orange');
//     $("#smb-icon").attr('class','fas fa-fw fa-exclamation-triangle');

//     cockpit.spawn(['python3', pluginpath + '/python/glue/smb.py','detail']).then(function(data){
//         var retVal_detail = JSON.parse(data);
//         if(retVal_detail.code == 200){
//             cockpit.spawn(['python3', pluginpath + '/python/glue/smb.py','status', '-sn','smb']).then(function(data){
//                 var retVal_status = JSON.parse(data);
//                 if(retVal_status.code == 500){
//                     if(action == 'stop'){
//                         ServiceQuota('smb');

//                         $('#smb-path').text("/fs");
//                         $('#smb-mount-path').text("/smb");
//                         $('#smb-access-ip').text(retVal_detail.val.ip_address);
//                         $('#smb-status').text("Stop");
//                         $('#smb-color').attr('class','pf-c-label pf-m-red');
//                         $('#smb-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                         $('#smb-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-enabled');
//                         $('#menu-item-set-smb-construction').hide();
//                         $('#menu-item-set-smb-delete').show();
//                     }
//                     else{
//                         cleanSambaInfo();
//                         $('#smb-status').text("Health Err");
//                         $('#smb-color').attr('class','pf-c-label pf-m-red');
//                         $('#smb-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                         $('#smb-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//                         $("#form-select-file-system-service-control option[value=smb]").hide();
//                         $('#menu-item-set-smb-construction').show();
//                         $('#menu-item-set-smb-delete').hide();
//                     }
//                 }
//                 else{
//                     ServiceQuota('smb');

//                     $('#smb-path').text("/fs");
//                     $('#smb-mount-path').text("/smb");
//                     $('#smb-access-ip').text(retVal_detail.val.ip_address);
//                     $('#smb-status').text("Health OK");
//                     $('#smb-color').attr('class','pf-c-label pf-m-green');
//                     $('#smb-icon').attr('class','fas fa-fw fas fa-fw fa-check-circle');
//                     $('#smb-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-enabled');
//                     $('#menu-item-set-smb-construction').hide();
//                     $('#menu-item-set-smb-delete').show();
//                 }
//             }).catch(function(){
//                 createLoggerInfo("SMB status 조회 실패");
//             });
//         }
//         else{
//             $('#smb-status').text("Health Err");
//             $('#smb-color').attr('class','pf-c-label pf-m-red');
//             $('#smb-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//             $('#smb-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//             $("#form-select-file-system-service-control option[value=smb]").hide();
//             $('#menu-item-set-smb-construction').show();
//             $('#menu-item-set-smb-delete').hide();
//             cleanSambaInfo();
//         }
//     }).catch(function(){
//         createLoggerInfo("SMB detail 조회 실패");
//     });
// }
// function cleanSambaInfo(){
//     $('#smb-path').text("N/A");
//     $('#smb-mount-path').text("N/A");
//     $('#smb-access-ip').text("N/A");
//     $('#smb-usage').text("N/A");
// }
/**
 * Meathod Name : gluefsCheckInfo
 * Date Created : 2023.06.02
 * Writer  : 정민철
 * Description : gluefs 서비스 상태 동작 확인 및 정보 확인
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.31 최초 작성
 */
// function gluefsCheckInfo(){
//     $('#gluefs-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
//     $("#gluefs-color").attr('class','pf-c-label pf-m-orange');
//     $("#gluefs-icon").attr('class','fas fa-fw fa-exclamation-triangle');

//     cockpit.spawn(['python3', pluginpath + '/python/glue/gluefs.py','status']).then(function(data){
//         var retVal = JSON.parse(data);
//         var retVal_code_status = JSON.parse(retVal.code);
//         var retVal_val_status = JSON.parse(retVal.val);
//         if(retVal_code_status == 200){
//             if(retVal_val_status[0] == undefined){
//                 cleanGluefsInfo();
//                 $('#gluefs-status').text("Health Err");
//                 $('#gluefs-color').attr('class','pf-c-label pf-m-red');
//                 $('#gluefs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                 $('#gluefs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//                 $("#form-select-file-system-service-control option[value=gluefs]").hide();
//                 $('#menu-item-set-gluefs-construction').show();
//                 $('#menu-item-set-gluefs-delete').hide();
//             }
//             else{
//                 cockpit.spawn(['python3', pluginpath + '/python/glue/gluefs.py','detail']).then(function(data){
//                     var retVal = JSON.parse(data);
//                     var retVal_code_detail = JSON.parse(retVal.code);
//                     var retVal_val_detail = JSON.parse(retVal.val);
//                     console.log(retVal_val_detail);
//                     if(retVal_code_detail == 200){
//                         gwvmEtcHostIp('gluefs');
//                         ServiceQuota('gluefs');
//                             if(retVal_val_status[0].status.running == 2){

//                                 $('#gluefs-mount-path').text("/gluefs");
//                                 $('#gluefs-status').text("Health OK");
//                                 $('#gluefs-color').attr('class','pf-c-label pf-m-green');
//                                 $('#gluefs-icon').attr('class','fas fa-fw fas fa-fw fa-check-circle');
//                                 $('#gluefs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-enabled');
//                                 $('#menu-item-set-gluefs-construction').hide();
//                                 $('#menu-item-set-gluefs-delete').show();
//                             }
//                             else {

//                                 $('#gluefs-mount-path').text("/gluefs");
//                                 $('#gluefs-status').text("Stop");
//                                 $('#gluefs-color').attr('class','pf-c-label pf-m-red');
//                                 $('#gluefs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                                 $('#gluefs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-enabled');
//                                 $('#menu-item-set-gluefs-construction').hide();
//                                 $('#menu-item-set-gluefs-delete').show();
//                             }
//                     }
//                     else{
//                         cleanGluefsInfo();
//                         $('#gluefs-status').text("Health Err");
//                         $('#gluefs-color').attr('class','pf-c-label pf-m-red');
//                         $('#gluefs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                         $('#gluefs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//                         $("#form-select-file-system-service-control option[value=gluefs]").hide();
//                         $('#menu-item-set-gluefs-construction').show();
//                         $('#menu-item-set-gluefs-delete').hide();
//                     }
//                 }).catch(function(){
//                     createLoggerInfo("GlueFS status 조회 실패");
//                 });
//             }
//         }
//         else{
//             cleanGluefsInfo();
//             $('#gluefs-status').text("Health Err");
//             $('#gluefs-color').attr('class','pf-c-label pf-m-red');
//             $('#gluefs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//             $('#gluefs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//             $("#form-select-file-system-service-control option[value=gluefs]").hide();
//             $('#menu-item-set-gluefs-construction').show();
//             $('#menu-item-set-gluefs-delete').hide();

//         }
//     }).catch(function(){
//         createLoggerInfo("GlueFS detail 조회 실패");
//     });
// }
/**
 * Meathod Name : cleanGluefsInfo
 * Date Created : 2023.06.02
 * Writer  : 정민철
 * Description : gluefs 구성 초기화
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.31 최초 작성
 */
// function cleanGluefsInfo(){
//     $('#gluefs-path').text("N/A");
//     $('#gluefs-mount-path').text("N/A");
//     $('#gluefs-access-ip').text("N/A");
//     $('#gluefs-usage').text("N/A");
// }
/**
 * Meathod Name : nfsCheckInfo
 * Date Created : 2023.06.02
 * Writer  : 정민철
 * Description : nfs 서비스 상태 동작 확인 및 정보 확인
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.31 최초 작성
 */
// function nfsCheckInfo(){
//     $('#nfs-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
//     $("#nfs-color").attr('class','pf-c-label pf-m-orange');
//     $("#nfs-icon").attr('class','fas fa-fw fa-exclamation-triangle');

//     cockpit.spawn(['python3', pluginpath + '/python/glue/nfs.py','status']).then(function(data){
//         var retVal = JSON.parse(data);
//         var retVal_code_status = JSON.parse(retVal.code);
//         var retVal_val_status = JSON.parse(retVal.val);

//         if(retVal_code_status == 200){
//             if(retVal_val_status[0] == undefined){
//                 cleanNfsInfo();
//                 $('#nfs-status').text("Health Err");
//                 $('#nfs-color').attr('class','pf-c-label pf-m-red');
//                 $('#nfs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                 $('#nfs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//                 $("#form-select-file-system-service-control option[value=nfs]").hide();
//                 $('#menu-item-set-nfs-construction').show();
//                 $('#menu-item-set-nfs-delete').hide();
//             }
//             else{
//                 cockpit.spawn(['python3', pluginpath + '/python/glue/nfs.py','detail']).then(function(data){
//                     var retVal = JSON.parse(data);
//                     var retVal_code_detail = JSON.parse(retVal.code);
//                     var retVal_val_detail = JSON.parse(retVal.val);
//                     console.log(retVal_val_detail);

//                     if(retVal_code_detail == 200){
//                         gwvmEtcHostIp('nfs');
//                         ServiceQuota('nfs');
//                             if(retVal_val_status[0].status.running == 1){

//                                 $('#nfs-path').text("/fs");
//                                 $('#nfs-mount-path').text(retVal_val_detail.path);
//                                 $('#nfs-status').text("Health OK");
//                                 $('#nfs-color').attr('class','pf-c-label pf-m-green');
//                                 $('#nfs-icon').attr('class','fas fa-fw fas fa-fw fa-check-circle');
//                                 $('#nfs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-enabled');
//                                 $('#menu-item-set-nfs-construction').hide();
//                                 $('#menu-item-set-nfs-delete').show();
//                             }
//                             else{

//                                 $('#nfs-path').text("/fs");
//                                 $('#nfs-mount-path').text(retVal_val_detail.path);
//                                 $('#nfs-status').text("Stop");
//                                 $('#nfs-color').attr('class','pf-c-label pf-m-red');
//                                 $('#nfs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                                 $('#nfs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-enabled');
//                                 $('#menu-item-set-nfs-construction').hide();
//                                 $('#menu-item-set-nfs-delete').show();
//                             }
//                     }
//                     else{
//                         cleanNfsInfo();
//                         $('#nfs-status').text("Health Err");
//                         $('#nfs-color').attr('class','pf-c-label pf-m-red');
//                         $('#nfs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                         $('#nfs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//                         $("#form-select-file-system-service-control option[value=nfs]").hide();
//                         $('#menu-item-set-nfs-construction').show();
//                         $('#menu-item-set-nfs-delete').hide();
//                     }
//                 }).catch(function(){
//                     createLoggerInfo("NFS status 조회 실패");
//                 });
//             }
//         }
//         else{
//             cleanNfsInfo();
//             $('#nfs-status').text("Health Err");
//             $('#nfs-color').attr('class','pf-c-label pf-m-red');
//             $('#nfs-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//             $('#nfs-edit').attr('class','pf-c-dropdown__toggle pf-m-plain pf-m-disabled');
//             $("#form-select-file-system-service-control option[value=nfs]").hide();
//             $('#menu-item-set-nfs-construction').show();
//             $('#menu-item-set-nfs-delete').hide();
//         }
//     }).catch(function(){
//         createLoggerInfo("NFS detail 조회 실패");
//     });

// }
/**
 * Meathod Name : ServiceQuota
 * Date Created : 2023.09.05
 * Writer  : 정민철
 * Description : 스토리지 서비스 사용량 확인
 * Parameter : type
 * Return  : 없음
 * History  : 2023.09.05 최초 작성
 */
// function ServiceQuota(type){

//     if (type == 'smb'){
//         cockpit.spawn(['python3', pluginpath + '/python/glue/smb.py','smb-quota']).then(function(data){
//             var retVal = JSON.parse(data);
//             if(retVal.code == 200){
//                 $('#smb-usage').text(retVal.val.usage+"B/"+Byte(retVal.val.quota));

//             }
//         });
//     }else if(type == 'gluefs'){
//         cockpit.spawn(['python3', pluginpath + '/python/glue/gluefs.py', 'gluefs-quota']).then(function(data){
//             var retVal = JSON.parse(data);
//             if(retVal.code == 200){
//                 $('#gluefs-usage').text(retVal.val.usage+"B/"+Byte(retVal.val.quota));
//                 $('#gluefs-path').text(retVal.val.fs_path);
//             }
//         });
//     }else if(type == 'nfs'){
//         cockpit.spawn(['python3', pluginpath + '/python/glue/nfs.py', 'nfs-quota']).then(function(data){
//             var retVal = JSON.parse(data);
//             if(retVal.code == 200){
//                 $('#nfs-usage').text(retVal.val.usage+"B/"+Byte(retVal.val.quota));
//             }
//         });
//     }
// }
/**
 * Meathod Name : gwvmEtcHostIp
 * Date Created : 2023.08.30
 * Writer  : 정민철
 * Description : gluefs, nfs 접근 IP 구성
 * Parameter : type
 * Return  : 없음
 * History  : 2023.08.30 최초 작성
 */
// function gwvmEtcHostIp(type){
//      cockpit.spawn(['grep','gwvm-mngt','/etc/hosts']).then(function(data){
//         var ip = data.split('\t');
//             if(type == 'gluefs'){
//                 $('#gluefs-access-ip').text(ip[0]);
//             }else if(type == 'nfs'){
//                 $('#nfs-access-ip').text(ip[0]);
//             }
//     });
// }
/**
 * Meathod Name : cleanNfsInfo
 * Date Created : 2023.08.30
 * Writer  : 정민철
 * Description : nfs 구성 초기화
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.08.30 최초 작성
 */
// function cleanNfsInfo(){
//     $('#nfs-path').text("N/A");
//     $('#nfs-mount-path').text("N/A");
//     $('#nfs-access-ip').text("N/A");
//     $('#nfs-usage').text("N/A");
// }
/**
 * Meathod Name : Byte
 * Date Created : 2023.08.30
 * Writer  : 정민철
 * Description : 용량 숫자를 단위에 맞춰 byte단위로 변경하는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.08.30 최초 작성
 */
function Byte(size){
    var ret_byte
    var ret_byte_name


    if(size < (1024*1024))
    {
        ret_byte = parseFloat(size)/1024;
        ret_byte_name = " KiB";
    }
    else if (size < (1024*1024*1024))
    {
        ret_byte = parseFloat(size)/(1024*1024);
        ret_byte_name = " MiB";
    }
    else if (size < (1024*1024*1024*1024)){
        ret_byte = parseFloat(size)/(1024*1024*1024);
        ret_byte_name = " GiB";
    }
    else if (size < (1024*1024*1024*1024*1024)){
        ret_byte = parseFloat(size)/(1024*1024*1024*1024);
        ret_byte_name = " TiB";
    }

    var bytes = parseInt(ret_byte);

    return (bytes + ret_byte_name);

}

/**
 * Meathod Name : Byte
 * Date Created : 2023.08.30
 * Writer  : 정민철
 * Description : 용량 숫자를 단위에 맞춰 byte단위로 변경하는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.08.30 최초 작성
 */
function byteOnlyGib(size){
    var ret_byte

    ret_byte = parseFloat(size)/(1024*1024*1024);
    ret_byte_name = "GiB";
    

    var bytes = parseInt(ret_byte);

    return (bytes);
}

/**
 * Meathod Name : gwvmInfoSet
 * Date Created : 2023.05.25
 * Writer  : 배태주
 * Description : 게이트웨이 가상머신 생성 전 입력받은 값의 유효성 검사
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.25 최초 작성
 */
function gwvmInfoSet(){
    $('#gwvm-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    $("#gwvm-back-color").attr('class','pf-c-label pf-m-orange');
    $("#gwvm-cluster-icon").attr('class','fas fa-fw fa-exclamation-triangle');
    
    //디테일 정보 가져오기
    fetch('https://10.10.3.11:8080/api/v1/gwvm/detail/cell',{
        method: 'GET'
    }).then(res => res.json()).then(data => {
        var retDetailVal = JSON.parse(data.Message);
        console.log(retDetailVal)
        if (retDetailVal.code == "200" || retDetailVal.val["role"] == 'Running') {
            fetch('https://10.10.3.11:8080/api/v1/gwvm/cell',{
                method: 'GET'
            }).then(res => res.json()).then(data => {
                var retVal = JSON.parse(data.Message);
                console.log(retVal)
                if(retVal.code == "200"){
                    if(retVal.val["role"] == "Started"){
                        $("#gwvm-status").text(retDetailVal.val["role"]);
                        $("#gwvm-back-color").attr('class','pf-c-label pf-m-green');
                        $("#gwvm-cluster-icon").attr('class','fas fa-fw fa-check-circle');

                        $('#td_gwvm_started_host').text(retVal.val["started"]);
                        $('#td_gwvm_cpu_mem').text(retVal.val['CPU(s)'] + " vCore / " + toBytes(retVal.val['Max memory']));
                        $('#td_gwvm_ip').text(retVal.val["ip"]);
                        $('#td_gwvm_root_disk').text(retVal.val["disk_cap"] + " (사용가능 " + retVal.val["disk_phy"] + " / 사용률 " + retVal.val["disk_usage_rate"] + ")");

                        // 마이그레이션 노드 옵션 설정
                        var nodeText = '( ';
                        var selectHtml = '<option selected="" value="null">노드를 선택해주세요.</option>';
                        $('#form-select-gateway-vm-migration-node option').remove();
                        for(var i=0; i<Object.keys(retDetailVal.val.clustered_host).length; i++){
                            nodeText = nodeText +retDetailVal.val.clustered_host[i];
                            if(retDetailVal.val.clustered_host[i] != retDetailVal.val.started){
                                selectHtml = selectHtml + '<option value="' + retDetailVal.val.clustered_host[i] + '">' + retDetailVal.val.clustered_host[i] + '</option>';
                            }
                            if(i == (Object.keys(retDetailVal.val.clustered_host).length - 1)){

                                nodeText = nodeText + ' )';
                            }else{
                                nodeText = nodeText + ', ';
                            }
                        }
                        $('#form-select-gateway-vm-migration-node').append(selectHtml);

                        //게이트웨이 버튼 디스플레이 액션
                        $("#button-gateway-vm-setup").hide();
                        $("#menu-item-gateway-vm-setup").hide();
                        $("#menu-item-gateway-vm-setup").removeClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-start").addClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-stop").removeClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-destroy").addClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-cleanup").removeClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-migrate").removeClass('pf-m-disabled');
                    }else if(retVal.val["role"] == "Stopped") {
                        $("#gwvm-status").text(retDetailVal.val["role"]);
                        cleanGwvmInfo();
                        //게이트웨이 버튼 디스플레이 액션
                        $("#button-gateway-vm-setup").hide();
                        $("#menu-item-gateway-vm-setup").hide();
                        $("#menu-item-gateway-vm-start").removeClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-stop").addClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-destroy").removeClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-cleanup").addClass('pf-m-disabled');
                        $("#menu-item-gateway-vm-migrate").addClass('pf-m-disabled');
                    }else{
                        allDisableConfig(retDetailVal.val["role"]);
                    }
                } else {
                    allDisableConfig(retDetailVal.val["role"]);
                    console.log("err1");
                }
            }).catch(function(data){
                allDisableConfig("Health Err");
                createLoggerInfo("게이트웨이 가상머신 정보 조회 실패 "+data);
                console.log("게이트웨이 가상머신 정보 조회 실패 "+data);
            });
        } else if (retDetailVal.code == "200" || retDetailVal.val["role"] == 'Stopped') {
            $("#gwvm-status").text("Stopped1");
            console.log("err2");
        } else if (retDetailVal.code == "400") {
            allDisableConfig("Not configured");
            stateBeforeConfig();
            
            console.log("Not configured");
        } else {
            allDisableConfig(retDetailVal.val["role"]);
            console.log("err4");
        }
    }).catch(function(data){
        allDisableConfig("Health Err");
        createLoggerInfo("게이트웨이 가상머신 상태 정보 상세 조회 실패 "+data);
        console.log("게이트웨이 가상머신 상태 정보 상세 조회 실패 "+data);
    });
}

// Gwvm 구성 전 상태
function stateBeforeConfig(){
    $("#button-gateway-vm-setup").show();
    $("#menu-item-gateway-vm-setup").show();
    $("#menu-item-gateway-vm-setup").removeClass('pf-m-disabled');
    $("#menu-item-gateway-vm-start").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-stop").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-destroy").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-cleanup").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-migrate").addClass('pf-m-disabled');
}

function stopStatusConfig(){
    cleanGwvmInfo();
    $("#gwvm-status").text("Stopped");
    //게이트웨이 버튼 디스플레이 액션
    $("#button-gateway-vm-setup").hide();
    $("#menu-item-gateway-vm-setup").hide();
    $("#menu-item-gateway-vm-start").removeClass('pf-m-disabled');
    $("#menu-item-gateway-vm-stop").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-destroy").removeClass('pf-m-disabled');
    $("#menu-item-gateway-vm-cleanup").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-migrate").addClass('pf-m-disabled');
}

function allDisableConfig(text){
    cleanGwvmInfo();
    $("#gwvm-status").text(text);
    $("#button-gateway-vm-setup").hide();
    $("#menu-item-gateway-vm-setup").hide();
    $("#menu-item-gateway-vm-start").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-stop").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-destroy").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-cleanup").addClass('pf-m-disabled');
    $("#menu-item-gateway-vm-migrate").addClass('pf-m-disabled');
}

function cleanGwvmInfo(){
    $("#gwvm-back-color").attr('class','pf-c-label pf-m-red');
    $("#gwvm-cluster-icon").attr('class','fas fa-fw fa-exclamation-triangle');
    $('#td_gwvm_started_host').text("N/A");
    $('#td_gwvm_cpu_mem').text("N/A");
    $('#td_gwvm_ip').text("N/A");
    $('#td_gwvm_gw').text("N/A");
    $('#td_gwvm_root_disk').text("N/A");
}

function sleep(sec) {
    let start = Date.now(), now = start;
    while (now - start < sec * 1000) {
        now = Date.now();
    }
}

/*
    용량 숫자를 단위에 맞춰 bytes단위로 변경하는 함수
    ex) ccvm_instance.toBytes("1.5 GiB") == 1610612736

    파라미터 설명 : size: str: 용량을 나타내는 문자열
    반환값 : float: bytes 단위의 용량
*/
function toBytes(size){
    var ret_bytes
    if( size.search('KB') >= 0) ret_bytes = parseFloat(size)*1000
    else if( size.search('KiB') >= 0) ret_bytes =  parseFloat(size)*1024
    else if( size.search('MB') >= 0) ret_bytes =  parseFloat(size)*1000*1000
    else if( size.search('MiB') >= 0) ret_bytes =  parseFloat(size)*1024*1024
    else if( size.search('GB') >= 0) ret_bytes =  parseFloat(size)*1000*1000*1000
    else if( size.search('GiB') >= 0) ret_bytes =  parseFloat(size)*1024*1024*1024
    else if( size.search('TB') >= 0) ret_bytes =  parseFloat(size)*1000*1000*1000*1000
    else if( size.search('TiB') >= 0) ret_bytes =  parseFloat(size)*1024*1024*1024*1024
    else if( size.search('PB') >= 0) ret_bytes =  parseFloat(size)*1000*1000*1000*1000*1000
    else if( size.search('PiB') >= 0) ret_bytes =  parseFloat(size)*1024*1024*1024*1024*1024

    var bytes = parseInt(ret_bytes);

    var s = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

    var e = Math.floor(Math.log(bytes) / Math.log(1024));

    if (e == "-Infinity") return "0 " + s[0];
    else
        return (bytes / Math.pow(1024, Math.floor(e))) + " " + s[e];

}

function bytesToSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
    if (bytes === 0) return '0 B'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
    if (i === 0) return `${bytes} ${sizes[i]})`
    return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}

$('#button-storage-dashboard-connect').on('click', function(){
    // storageCenter url 링크 주소 가져오기
    createLoggerInfo("button-storage-dashboard-connect click");
    cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "storageCenter"])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            // 스토리지센터 연결
            window.open(retVal.val);
        }else{
            $("#modal-status-alert-title").html("스토리지센터 연결");
            $("#modal-status-alert-body").html(retVal.val);
            $('#div-modal-status-alert').show();
        }
    })
    .catch(function(err){
        createLoggerInfo(":::create_address.py storageCenter Error:::");
        console.log(":::create_address.py storageCenter Error:::"+ err);
    });
});

/**
 * Meathod Name : glueVmList
 * Date Created : 2024.02.22
 * Writer  : 배태주
 * Description : 게이트웨이 가상머신 생성 전 입력받은 값의 유효성 검사
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.02.22 최초 작성
 */
function glueVmList(){
    fetch('https://10.10.3.11:8080/api/v1/glue/hosts',{
        method: 'GET'
    }).then(res => res.json()).then(data => {
        $('#glue-vm-list tr').remove();

        for(var i=0; i < data.length; i++){
            let insert_tr = "";
                                                    
            insert_tr += '<tr role="row">';

            insert_tr += '<tr role="row">';
            insert_tr += '    <td role="cell" data-label="이름" id="td_glue_host_name">'+data[i].hostname+'</td>';
            insert_tr += '    <td role="cell" data-label="상태">';
            if(data[i].status == ''){
                insert_tr += '        <span class="pf-c-label pf-m-green">';
                insert_tr += '            <span class="pf-c-label__content">';
                insert_tr += '                <span class="pf-c-label__icon">';
                insert_tr += '                    <i class="fas fa-fw fa-check-circle" aria-hidden="true"></i>';
                insert_tr += '                </span><div>Online</div>';
                insert_tr += '            </span>';
                insert_tr += '        </span>';
            }else{
                insert_tr += '        <span class="pf-c-label pf-m-orange">';
                insert_tr += '            <span class="pf-c-label__content">';
                insert_tr += '                <span class="pf-c-label__icon">';
                insert_tr += '                    <i class="fas fa-fw fa-exclamation-triangle" aria-hidden="true"></i>';
                insert_tr += '                </span><div>'+data[i].status+'</div>';
                insert_tr += '            </span>';
                insert_tr += '        </span>';
            }
            insert_tr += '    </td>';
            insert_tr += '    <td role="cell" data-label="관리 IP" id="td_glue_host_mngt_ip">'+data[i].ip_address+'</td>';
            insert_tr += '    <td role="cell" data-label="스토리지 IP " id="td_glue_host_storage_ip">'+data[i].addr+'</td>';
            insert_tr += '</tr>';
            $("#glue-vm-list:last").append(insert_tr);
        }
    }).catch(function(data){
        createLoggerInfo("Glue 가상머신 정보 조회 실패 "+data);
        console.log("Glue 가상머신 정보 조회 실패 "+data);
    });
}

// glue 배치 호스트 리스트 기능
$('#button-glue-hosts-list-setting, #button-update-nfs-glue-hosts-list-setting, #button-ingress-glue-hosts-list-setting, #button-update-ingress-glue-hosts-list-setting, #button-iscsi-glue-hosts-list-setting, #button-nvmeof-glue-hosts-list-setting, #button-update-iscsi-glue-hosts-list-setting, #button-object-gateway-glue-hosts-list-setting, #button-update-object-gateway-glue-hosts-list-setting').on('click', function(e){
    $('#'+e.target.parentElement.children[2].id).toggle();
});

// iscsi portal 리스트 기능
$('#button-iscsi-portal-list-setting, #button-update-iscsi-portal-list-setting').on('click', function(e){
    $('#'+e.target.parentElement.children[2].id).toggle();
});

$('#button-iscsi-image-list-setting, #button-update-iscsi-image-list-setting').on('click', function(e){
    $('#'+e.target.parentElement.children[2].id).toggle();
});


function scanHostKey(){
    //createLoggerInfo("scanHostKey() start");
    cockpit.spawn(['python3', pluginpath + '/python/host/ssh-scan.py'])
    .then(function(data){
        console.log("keyscan ok");
    })
    .catch(function(err){
        createLoggerInfo("keyscan err");
        console.log("keyscan err : " + err);
    });
}

/**
 * Meathod Name : noList
 * Date Created : 2024.03.06
 * Writer  : 배태주
 * Description : 조회되는 데이터가 없을경우 테이블에 조회되는 데이터 없음으로 표시해주는 공통 메소드
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.03.06 최초 작성
 */
function noList(tbody_id, col_num, text_val){
    let insert_tr = "";
    let txt = "조회되는 데이터가 없습니다.";
    if(text_val != null){
        txt = text_val
    }

    $('#'+tbody_id+' tr').remove();
    insert_tr += '<tr role="row">';
    insert_tr += '    <td role="cell" colspan="'+col_num+'" style="text-align: center;">'+txt+'</td>';
    insert_tr += '</tr>';
    $("#"+tbody_id+":last").append(insert_tr);
}


/**
 * Meathod Name : hostListCheckbox
 * Date Created : 2024.03.06
 * Writer  : 배태주
 * Description : 호스트 다중 체크리스트를 세팅하는 메소드
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.03.06 최초 작성
 */
function hostListCheckbox(tbody_id, col_num, text_val){
    let insert_tr = "";
    let txt = "조회되는 데이터가 없습니다.";
    if(text_val != null){
        txt = text_val
    }

    $('#'+tbody_id+' tr').remove();
    insert_tr += '<tr role="row">';
    insert_tr += '    <td role="cell" colspan="'+col_num+'" style="text-align: center;">'+txt+'</td>';
    insert_tr += '</tr>';
    $("#"+tbody_id+":last").append(insert_tr);
}

function topTabAction(button_id){
    //선택되어 있는 탭 해제
    $('#ul-top-tab-list').children().each(function(index){
        $(this).removeClass('pf-m-current');
    });
    $('#'+button_id).parent().addClass('pf-m-current');
    
    //본문 영역 숨기기 시작
    $('#div-gwvm-card').hide();
    $('#div-glue-vm-card').hide();
    $('#div-glue-fs-card').hide();
    $('#div-nfs-cluster-card').hide();
    $('#div-nfs-export-card').hide();
    $('#div-ingress-card').hide();
    $('#div-iscsi-service-card').hide();
    $('#div-iscsi-target-card').hide();
    $('#div-nvmeof-service-card').hide();
    $('#div-nvmeof-target-card').hide();
    $('#div-smb-service-card').hide();
    $('#div-object-gateway-card').hide();
    $('#div-object-gateway-user-card').hide();
    $('#div-object-gateway-bucket-card').hide();

    //본문 영역 숨기기 끝
    switch (button_id) {
        case 'button-tab-glue-vm':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("Glue 가상머신","Glue 스토리지 클러스터를 구성하는 Glue 가상머신 상태 정보와 IP 정보를 확인할 수 있습니다. 해당 Glue 가상머신을 통해 다양한 스토리지 서비스를 제공합니다.");
            setHelpInfoContent("게이트웨이 가상머신","스토리지 서비스 게이트웨이 전용 가상머신이며, 선택적으로 해당 가상머신을 구성하여 사용할 수 있습니다.");
            $('#div-gwvm-card').show();
            $('#div-glue-vm-card').show();
            break;
        case 'button-tab-gluefs':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("Glue File System","Glue 파일 시스템( GlueFS )은 Glue의 분산 객체 저장소인 RADOS 위에 구축된 POSIX 호환 파일 시스템입니다. Glue FS는 공유 홈 디렉터리, HPC 스크래치 공간, 분산 워크플로 공유 스토리지와 같은 다양한 애플리케이션을 위한 다용도 고가용성 고성능 파일 저장소를 제공합니다.");
            setHelpInfoContent("Glue FS Subvolume Group","GlueFS(Glue File System) 하위 볼륨 그룹을 생성, 조회, 절대 경로 가져오기 및 제거할 수 있습니다. Glue FS의 하위 그룹을 생성하여 효율적으로 GlueFS의 그룹 및 경로(/volumes/볼륨 그룹)를 관리할 수 있습니다.");
            gluefsList();
            $('#div-glue-fs-card').show();
            break;
        case 'button-tab-nfs':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("NFS Cluster","Glue 가상머신을 클러스터링 하여 NFS 서비스를 제공하는 클러스터를 생성할 수 있습니다. 사용자는 해당 IP와 포트를 통해 NFS에 접근할 수 있습니다.");
            setHelpInfoContent("NFS Export","NFS Export의 내보내기 경로, GlueFS, 프로토콜, 접근타입, Squash를 설정 및 관리할 수 있습니다.");
            nfsClusterList();
            nfsExportList();
            $('#div-nfs-cluster-card').show();
            $('#div-nfs-export-card').show();
            break;
        case 'button-tab-ingress':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("INGRESS Service","NFS, OBJECT GATEWAY 서비스에 대한 INGRESS 서비스를 배포하면 가상 IP를 통해 안적적 접근이 가능하고, SCVM 장애 발생시 SCVM간 페일오버가 가능합니다.");
            ingressList();
            $('#div-ingress-card').show();
            break;
        case 'button-tab-iscsi':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("iSCSI Service","iSCSI 게이트웨이 서비스는 RBD(RADOS 블록 장치) 이미지를 SCSI 디스크로 내보내는 HA(고가용성) iSCSI Target을 제공합니다. iSCSI 프로토콜을 사용하면 클라이언트(이니시에이터)가 TCP/IP 네트워크를 통해 스토리지 장치(대상)에 SCSI 명령을 보낼 수 있으므로 클라이언트가 Glue 블록 스토리지에 액세스할 수 있습니다.");
            setHelpInfoContent("iSCSI Target","iSCSI Target을 생성하고 관리할 수 있습니다.");
            iscsiServiceList();
            iscsiTargetList();
            $('#div-iscsi-service-card').show();
            $('#div-iscsi-target-card').show();
            break;
        case 'button-tab-nvmeof':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("NVMe-oF Service","NVMe-oF 게이트웨이 서비스는 RBD(RADOS 블록 장치) 이미지를 NVMe 네임스페이스로 내보내는 NVMe-oF 타겟을 제공합니다. NVMe-oF 프로토콜을 사용하면 클라이언트(이니시에이터)가 TCP/IP 네트워크를 통해 스토리지 장치(타겟)에 NVMe 명령을 보낼 수 있으므로 기본 Glue 클라이언트 지원이 없는 클라이언트가 Glue 블록 스토리지에 액세스할 수 있습니다.");
            setHelpInfoContent("NVMe-oF Target","iSCSI Target을 생성하고 관리할 수 있습니다.");
            nvmeofServiceList();
            nvmeofTargetList();
            $('#div-nvmeof-service-card').show();
            $('#div-nvmeof-target-card').show();
            break;
        case 'button-tab-smb':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("SMB Service","Glue 가상머신 별 SMB 서비스를 제공 및 활성화 하고 관리할 수 있습니다. 또한 사용자 정보를 관리할 수 있습니다.")
            smbServiceList();
            $('#div-smb-service-card').show();
            break;
        case 'button-tab-object-gateway':
            $('div[name="div-help-content"]').remove();
            setHelpInfoContent("Object Gateway","Object Gateway는 Glue 위에 구축된 객체 스토리지 인터페이스입니다. 애플리케이션과 Glue Storage Cluster 사이에 RESTful 게이트웨이를 제공합니다. Glue Object Storage는 S3과 Swift 두 가지 RESTful API와 호환되는 인터페이스로 객체 스토리지 기능을 제공합니다.");
            setHelpInfoContent("Object Gateway User","Object Gateway User는 객체 스토리지 사용자정보를 관리하는 기능으로서 엑세스 정보와 사용량 제한 등 관리기능을 제공합니다.");
            setHelpInfoContent("Object Gateway Bucket","Object Gateway Bucket은 연관된 오브젝트(파일)를 그룹핑한 최상위 디렉토리이며, 사용자별 여러개의 버킷을 생성하여 사용할 수 있습니다.");
            objectGatewayList();
            objectGatewayUserList();
            objectGatewayBucketList();
            $('#div-object-gateway-card').show();
            $('#div-object-gateway-user-card').show();
            $('#div-object-gateway-bucket-card').show();
            break;
        default:
            alert( "탭을 잘못 선택했습니다." );
    }
}

function setHelpInfoContent(title, contnet){
    let insert_tr = "";
    insert_tr += '<div class="pf-c-helper-text__item" style="color:#6a6e73;margin-left: 10px;" name="div-help-content">';
    insert_tr += '    <span class="pf-c-helper-text__item-icon">';
    insert_tr += '        <i class="fas fa-fw fa-minus" style="font-size: 0.5rem;" aria-hidden="true"></i>';
    insert_tr += '    </span>';
    insert_tr += '    <span class="pf-c-helper-text__item-text">'+title+'</span>';
    insert_tr += '</div>';
    insert_tr += '<div class="pf-c-helper-text__item" style="color:#6a6e73;margin-left: 23px;" name="div-help-content">';
    insert_tr += '    <span class="pf-c-helper-text__item-text">'+contnet+'</span>';
    insert_tr += '</div>';
    $('#card-help-content-status').append(insert_tr);
}

$('#ul-top-tab-list').on('click', function(e){
    var button_id = "";
    if(e.target.className == "pf-c-tabs__item-text"){
        button_id = e.target.parentElement.id;
    } else if (e.target.className == "pf-c-tabs__link"){
        button_id = e.target.id
    }
    topTabAction(button_id);    
});


function setSelectHostsCheckbox(div_id, form_input_id, selectHosts){
    $('fieldset[name="fieldset-glue-host-list"]').remove();
    $('#'+form_input_id).val('');
    //호스트 리스트 불러와서
    fetch('https://10.10.3.11:8080/api/v1/glue/hosts',{
        method: 'GET'
    }).then(res => res.json()).then(data => {
        $('#'+div_id+' fieldset').remove();
        let insert_tr = "";
        if(selectHosts==null){
            insert_tr += '<fieldset class="pf-c-select__menu-fieldset" aria-label="Select input" name="fieldset-glue-host-list">';
            for(var i=0; i < data.length; i++){
                insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                insert_tr += '        <input class="pf-c-check__input" type="checkbox" name="glue-hosts-list" value="'+data[i].hostname+'"/>';
                insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+'</span>';
                insert_tr += '    </label>';
            }
        }else{
            var el = "";
            for(var i=0; i < selectHosts.length; i++){
                if(i==0){
                    el = selectHosts[i]
                }else{
                    el += ", "+selectHosts[i]
                }
            }
            $('#'+form_input_id).val(el);

            insert_tr += '<fieldset class="pf-c-select__menu-fieldset" aria-label="Select input" name="fieldset-glue-host-list">';
            for(var i=0; i < data.length; i++){
                var selected_hosts_yn = false;
                for(var j=0 ; j < selectHosts.length; j++){
                    if(selectHosts[j] == data[i].hostname){
                        selected_hosts_yn = true;
                        break;
                    }
                }
                insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                insert_tr += '        <input class="pf-c-check__input" type="checkbox" name="glue-hosts-list" value="'+data[i].hostname+'" '+(selected_hosts_yn ? 'checked' : '')+'/>';
                insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+'</span>';
                insert_tr += '    </label>';
            }

        }
        insert_tr += '</fieldset>';
        $("#"+div_id).append(insert_tr);

        if(form_input_id!=null){
            // glue 호스트 리스트 기능
            $('input[name=glue-hosts-list]').on('click', function(){
                var cnt = 0;
                var el = "";
                $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
                    if(this.checked){
                        if(cnt==0){
                            el = this.value
                        }else{
                            el += ", "+this.value
                        }
                        cnt++
                    }
                });
                $('#'+form_input_id).val(el);
            });
        }
    }).catch(function(data){
        createLoggerInfo("Glue 가상머신 cleckbox 세팅 에러 : "+data);
        console.log("Glue 가상머신 cleckbox 세팅 에러 : "+data);
    });
}

function setSmbUserSelectBox(select_box_id, data){
    // 초기화
    $('#'+select_box_id).empty();
    var smb_user_list = data.split(",")
    
    var el ='';

    el += '<option value="" selected>선택하십시오.</option>';
    if(smb_user_list != ""){
        for(var i = 0 ; i < smb_user_list.length ; i ++ ){
            el += '<option value="'+smb_user_list[i]+'">'+smb_user_list[i]+'</option>';
        }
    }

    $('#'+select_box_id).append(el);

    createLoggerInfo("setSmbUserSelectBox success");
}

function setGlueFsSelectBox(fs_select_box_id, path_select_box_id, selected_gluefs_id){
    fetch('https://10.10.3.11:8080/api/v1/gluefs',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+fs_select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';
        if(data.list.length != 0){
            // 초기화
            for(var i = 0 ; i < data.list.length ; i ++ ){
                if(selected_gluefs_id == null){
                    el += '<option value="'+data.list[i].name+'">'+data.list[i].name+'</option>';
                } else {
                    if(selected_gluefs_id != data.list[i].name){
                        el += '<option value="'+data.list[i].name+'">'+data.list[i].name+'</option>';
                    }else{
                        el += '<option value="'+data.list[i].name+'" selected>'+data.list[i].name+'</option>';
                    }
                }
            }
            if(path_select_box_id != ""){
                $('#'+fs_select_box_id).off('change');
                $('#'+fs_select_box_id).on('change',function(){
                    var gluefs_name = $('#'+fs_select_box_id+' option:selected').val();
                    setGlueFsVolumeGroupSelectBox(gluefs_name, path_select_box_id);
                });
            }
        }
        $('#'+fs_select_box_id).append(el);
        createLoggerInfo("setGlueFsSelectBox success");
    }).catch(function(data){
        console.log("setGlueFsSelectBox error : "+data);
    });
}

function setGlueFsVolumeGroupSelectBox(gluefs_name, path_select_box_id, selected_subvolume_group_path_id){
    $('#'+path_select_box_id).empty();
    $('#'+path_select_box_id).append('<option value="" selected>불러오는 중...</option>');
    if(gluefs_name == ""){
        $('#'+path_select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';
        $('#'+path_select_box_id).append(el);
        return
    }
    fetch('https://10.10.3.11:8080/api/v1/gluefs/subvolume/group?vol_name='+gluefs_name,{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+path_select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';
        if(data != null && data.length != 0){
            // 초기화
            if(selected_subvolume_group_path_id == undefined){
                el += '<option value="/">/</option>';
                for(var i = 0 ; i < data.length ; i ++ ){
                    el += '<option value="'+data[i].path+'">'+data[i].path+'</option>';
                }
            } else {
                if(selected_subvolume_group_path_id == "/"){
                    el += '<option value="/" selected>/</option>';   
                    for(var i = 0 ; i < data.length ; i ++ ){
                        el += '<option value="'+data[i].path+'">'+data[i].path+'</option>';
                    }
                }else{
                    el += '<option value="/">/</option>';
                    for(var i = 0 ; i < data.length ; i ++ ){
                        if(selected_subvolume_group_path_id == data[i].path){
                            el += '<option value="'+data[i].path+'" selected>'+data[i].path+'</option>';
                        }else{
                            el += '<option value="'+data[i].path+'">'+data[i].path+'</option>';
                        }
                    }
                }
            }
        } else {
            el += '<option value="/">/</option>';
        }
        $('#'+path_select_box_id).append(el);
        createLoggerInfo("setGlueFsVolumeGroupSelectBox success");
    }).catch(function(data){
        console.log("setGlueFsVolumeGroupSelectBox error : "+data);
    });
}

function setNfsClusterSelectBox(select_box_id, selected_cluster_id){
    fetch('https://10.10.3.11:8080/api/v1/nfs',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';

        nfs_cluster_names = Object.keys(data);
        if(nfs_cluster_names.length != 0){
            for(var i=0; i < nfs_cluster_names.length; i++){
                if(selected_cluster_id == null){
                    el += '<option value="'+nfs_cluster_names[i]+'">'+nfs_cluster_names[i]+'</option>';
                } else {
                    if(selected_cluster_id != nfs_cluster_names[i]){
                        el += '<option value="'+nfs_cluster_names[i]+'">'+nfs_cluster_names[i]+'</option>';
                    }else{
                        el += '<option value="'+nfs_cluster_names[i]+'" selected>'+nfs_cluster_names[i]+'</option>';
                    }
                }
            }
        }

        $('#'+select_box_id).append(el);
        createLoggerInfo("setNfsClusterSelectBox success");
    }).catch(function(data){
        console.log("setNfsClusterSelectBox error : "+data);
    });
}

function setIngressBackendSelectBox(select_box_id){
    fetch('https://10.10.3.11:8080/api/v1/service',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';
        for(var i = 0 ; i < data.length; i++){
            if(data[i].service_type == "nfs" ||  data[i].service_type == "rgw"){
                el += '<option value="'+data[i].service_name+'">'+data[i].service_name+'</option>';
            }
        }

        $('#'+select_box_id).append(el);
        createLoggerInfo("setNfsClusterSelectBox success");
    }).catch(function(data){
        console.log("setNfsClusterSelectBox error : "+data);
    });
}

function setPoolSelectBox(select_box_id, selected_pool_id){
    fetch('https://10.10.3.11:8080/api/v1/pool?pool_type=rbd',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';

        for(var i=0; i < data.length; i++){
            if(selected_pool_id == null){
                el += '<option value="'+data[i]+'">'+data[i]+'</option>';
            } else {
                if(selected_pool_id != data[i]){
                    el += '<option value="'+data[i]+'">'+data[i]+'</option>';
                }else{
                    el += '<option value="'+data[i]+'" selected>'+data[i]+'</option>';
                }
            }
        }

        $('#'+select_box_id).append(el);
        createLoggerInfo("setNfsClusterSelectBox success");
    }).catch(function(data){
        console.log("setNfsClusterSelectBox error : "+data);
    });
}

function setIscsiPortalCheckbox(div_id, form_input_id, portals_json){
    //호스트 리스트 불러와서
    fetch('https://10.10.3.11:8080/api/v1/glue/hosts',{
        method: 'GET'
    }).then(res => res.json()).then(data => {
        $('#'+div_id+' fieldset').remove();
        let insert_tr = "";
        insert_tr += '<fieldset class="pf-c-select__menu-fieldset" aria-label="Select input">';
        if(portals_json==null){
            for(var i=0; i < data.length; i++){
                insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-portal-list-"'+i+'" name="iscsi-portal-list" value="'+data[i].hostname+':'+data[i].ip_address+'"/>';
                insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+':'+data[i].ip_address+'</span>';
                insert_tr += '    </label>';
                insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-portal-list-"'+i+'" name="iscsi-portal-list" value="'+data[i].hostname+':'+data[i].addr+'"/>';
                insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+':'+data[i].addr+'</span>';
                insert_tr += '    </label>';
            }
        }else{
            
            for(var i=0; i < data.length; i++){
                var ip_address_boolon = false;
                var addr_boolon = false;

                for(var j=0; j < portals_json.length; j++){
                    if(portals_json[j].ip == data[i].ip_address){
                        ip_address_boolon = true;
                    }
                    if(portals_json[j].ip == data[i].addr){
                        addr_boolon = true;
                    }
                }
                
                if(!ip_address_boolon){
                    insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                    insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-portal-list-"'+i+'" name="iscsi-portal-list" value="'+data[i].hostname+':'+data[i].ip_address+'"/>';
                    insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+':'+data[i].ip_address+'</span>';
                    insert_tr += '    </label>';
                }else{
                    insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                    insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-portal-list-"'+i+'" name="iscsi-portal-list" value="'+data[i].hostname+':'+data[i].ip_address+'" checked/>';
                    insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+':'+data[i].ip_address+'</span>';
                    insert_tr += '    </label>';
                }

                if(!addr_boolon){
                    insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                    insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-portal-list-"'+i+'" name="iscsi-portal-list" value="'+data[i].hostname+':'+data[i].addr+'"/>';
                    insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+':'+data[i].addr+'</span>';
                    insert_tr += '    </label>';
                }else{
                    insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                    insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-portal-list-"'+i+'" name="iscsi-portal-list" value="'+data[i].hostname+':'+data[i].addr+'" checked/>';
                    insert_tr += '        <span class="pf-c-check__label">'+data[i].hostname+':'+data[i].addr+'</span>';
                    insert_tr += '    </label>';
                }
            }

            //form_input_id 세팅
            var el = "";
            for(var i=0; i < portals_json.length; i++){
                if(i==0){
                    el += portals_json[i].host+":"+portals_json[i].ip
                }else{
                    el += ", "+portals_json[i].host+":"+portals_json[i].ip
                }
                
            }
            $('#'+form_input_id).val(el);
        }

        insert_tr += '</fieldset>';
        $("#"+div_id).append(insert_tr);

        if(form_input_id!=null){
            // iscis portal 리스트 기능
            $('input[name=iscsi-portal-list]').on('click', function(){
                var cnt = 0;
                var el = "";
                $('input[type=checkbox][name="iscsi-portal-list"]').each(function() {
                    if(this.checked){
                        if(cnt==0){
                            el = this.value
                        }else{
                            el += ", "+this.value
                        }
                        cnt++
                    }
                });
                $('#'+form_input_id).val(el);
            });
        }
    }).catch(function(data){
        createLoggerInfo("iscis portal cleckbox 세팅 에러 : "+data);
        console.log("iscis portal cleckbox 세팅 에러 : "+data);
    });
}

function setImageSelectBox(div_id, form_input_id, disks_json){
    //호스트 리스트 불러와서
    fetch('https://10.10.3.11:8080/api/v1/image',{
        method: 'GET'
    }).then(res => res.json()).then(data => {
        $('#'+div_id+' fieldset').remove();
        let insert_tr = "";
        insert_tr += '<fieldset class="pf-c-select__menu-fieldset" aria-label="Select input">';
        
        if(data.length > 4){
            div_id
            $("#"+div_id).css('height', '200px'); 
            $("#"+div_id).css('overflow', 'auto');
        
        }

        if(disks_json==null){
            for(var i=0; i < data.length; i++){
                insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-image-list-"'+i+'" name="iscsi-image-list" value="'+data[i]+'"/>';
                insert_tr += '        <span class="pf-c-check__label">'+data[i]+'</span>';
                insert_tr += '    </label>';
            }
        }else{
            for(var i=0; i < data.length; i++){
                var disk_boolon = false;

                for(var j=0; j < disks_json.length; j++){
                    var disk_split = data[i].split("/");
                    if(disks_json[j].pool == disk_split[0] && disks_json[j].image == disk_split[1]){
                        disk_boolon = true;
                    }
                }
                
                if(!disk_boolon){
                    insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                    insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-image-list-"'+i+'" name="iscsi-image-list" value="'+data[i]+'"/>';
                    insert_tr += '        <span class="pf-c-check__label">'+data[i]+'</span>';
                    insert_tr += '    </label>';
                }else{
                    insert_tr += '    <label class="pf-c-check pf-c-select__menu-item">';
                    insert_tr += '        <input class="pf-c-check__input" type="checkbox" id="iscsi-image-list-"'+i+'" name="iscsi-image-list" value="'+data[i]+'" checked/>';
                    insert_tr += '        <span class="pf-c-check__label">'+data[i]+'</span>';
                    insert_tr += '    </label>';
                }
            }
            //form_input_id 세팅
            var el = "";
            for(var i=0; i < disks_json.length; i++){
                if(i==0){
                    el += disks_json[i].pool+"/"+disks_json[i].image
                }else{
                    el += ", "+disks_json[i].pool+"/"+disks_json[i].image
                }
            }
            $('#'+form_input_id).val(el);
        }
        
        insert_tr += '</fieldset>';
        $("#"+div_id).append(insert_tr);

        if(form_input_id!=null){
            // iscis portal 리스트 기능
            $('input[name=iscsi-image-list]').on('click', function(){
                var cnt = 0;
                var el = "";
                $('input[type=checkbox][name="iscsi-image-list"]').each(function() {
                    if(this.checked){
                        if(cnt==0){
                            el = this.value
                        }else{
                            el += ", "+this.value
                        }
                        cnt++
                    }
                });
                $('#'+form_input_id).val(el);
            });
        }
    }).catch(function(data){
        createLoggerInfo("iscis portal cleckbox 세팅 에러 : "+data);
        console.log("iscis portal cleckbox 세팅 에러 : "+data);
    });

}

function setRgwUserSelectBox(select_box_id, selected_user_id){
    $('#'+select_box_id).empty();
    $('#'+select_box_id).append('<option value="" selected>불러오는 중...</option>');
    fetch('https://10.10.3.11:8080/api/v1/rgw/user',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';

        for(var i=0; i < data.length; i++){
            if(selected_user_id == null){
                el += '<option value="'+data[i].user_id+'">'+data[i].user_id+'</option>';
            } else {
                if(selected_user_id != data[i].user_id){
                    el += '<option value="'+data[i].user_id+'">'+data[i].user_id+'</option>';
                }else{
                    el += '<option value="'+data[i].user_id+'" selected>'+data[i].user_id+'</option>';
                }
            }
        }

        $('#'+select_box_id).append(el);
        createLoggerInfo("setRgwUserSelectBox success");
    }).catch(function(data){
        console.log("setRgwUserSelectBox error : "+data);
    });
}

function setRgwBucketSelectBox(select_box_id, selected_bucket_id){
    $('#'+select_box_id).empty();
    $('#'+select_box_id).append('<option value="" selected>불러오는 중...</option>');
    fetch('https://10.10.3.11:8080/api/v1/rgw/bucket?detail=false',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';

        for(var i=0; i < data.length; i++){
            if(selected_bucket_id == null){
                el += '<option value="'+data[i]+'">'+data[i]+'</option>';
            } else {
                if(selected_bucket_id != data[i]){
                    el += '<option value="'+data[i]+'">'+data[i]+'</option>';
                }else{
                    el += '<option value="'+data[i]+'" selected>'+data[i]+'</option>';
                }
            }
        }

        $('#'+select_box_id).append(el);
        createLoggerInfo("setRgwBucketSelectBox success");
    }).catch(function(data){
        console.log("setRgwBucketSelectBox error : "+data);
    });
}

async function duplicatImageNameCheck(pool_name, image_name){
    var duplication_yn = false;
    await fetch('https://10.10.3.11:8080/api/v1/image?pool_name='+pool_name,{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        for(var i=0; i < data.length; i++){
            if(data[i].image == image_name){
                duplication_yn = true
            }
        }
        createLoggerInfo("duplicatImageNameCheck success");
    }).catch(function(data){
        duplication_yn = false;
        console.log("duplicatImageNameCheck error : "+data);
    });
    return duplication_yn;
}

function setNvmeofHostIpSelectBox(select_box_id, selected_host_ip){
    fetch('https://10.10.3.11:8080/api/v1/service?service_type=nvmeof',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#'+select_box_id).empty();
        var el ='';
        el += '<option value="" selected>선택하십시오.</option>';

        for(var i=0; i < data.length; i++){
            if(selected_host_ip == null){
                el += '<option value="'+data[i]+'">'+data[i]+'</option>';
            } else {
                if(selected_host_ip != data[i]){
                    el += '<option value="'+data[i]+'">'+data[i]+'</option>';
                }else{
                    el += '<option value="'+data[i]+'" selected>'+data[i]+'</option>';
                }
            }
        }

        $('#'+select_box_id).append(el);
        createLoggerInfo("setNvmeofHostIpSelectBox success");
    }).catch(function(data){
        console.log("setNvmeofHostIpSelectBox error : "+data);
    });
}