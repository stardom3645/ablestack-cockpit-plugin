/**
 * File Name : main.js
 * Date Created : 2020.02.18
 * Writer  : 박동혁
 * Description : main.html에서 발생하는 이벤트 처리를 위한 JavaScript
 **/

// document.ready 영역 시작

this.ccvm_instance = new CloudCenterVirtualMachine();
ccvm_instance = this.ccvm_instance;
$(document).ccvm_instance = ccvm_instance;
pluginpath = '/usr/share/cockpit/ablestack';
let pcs_exe_host = "";
var os_type = sessionStorage.getItem("os_type");
//PFMP 설치 시 퍼센트 값 설정 초가화
let interval;
var gfs_file_system_arr = [];

$(document).ready(function(){

    $('#dropdown-menu-storage-cluster-status').hide();
    $('#dropdown-menu-cloud-cluster-status').hide();
    $('#dropdown-menu-storage-vm-status').hide();
    $('#dropdown-menu-cloud-vm-status').hide();
    $('#dropdown-menu-gfs-cluster-status').hide();
    $('#dropdown-menu-gfs-disk-status').hide();

    $('#button-open-modal-wizard-storage-cluster').hide();
    $('#button-open-modal-wizard-storage-vm').hide();
    $('#button-open-modal-wizard-pfmp-vm').hide();
    $('#button-open-modal-wizard-cloud-vm').hide();
    $('#button-link-storage-center-dashboard').hide();
    $('#button-link-cloud-center').hide();
    $('#button-open-modal-wizard-monitoring-center').hide();
    $('#button-link-monitoring-center').hide();
    $('#button-config-file-download').hide();

    $('#div-modal-wizard-storage-vm').load("./src/features/storage-vm-wizard.html");
    $('#div-modal-wizard-storage-vm').hide();

    $('#div-modal-wizard-pfmp-vm').load("./src/features/pfmp-vm-wizard.html");
    $('#div-modal-wizard-pfmp-vm').hide();

    $('#div-modal-wizard-cluster-config-prepare').load("./src/features/cluster-config-prepare.html");
    $('#div-modal-wizard-cluster-config-prepare').hide();

    $('#div-modal-wizard-cloud-vm').load("./src/features/cloud-vm-wizard.html");
    $('#div-modal-wizard-cloud-vm').hide();

    $('#div-modal-wizard-wall-monitoring').load("./src/features/wall-monitoring-wizard.html");
    $('#div-modal-wizard-wall-monitoring').hide();

    $('#dev-modal-migration-cloud-vm').hide();
    $('#dev-modal-stop-cloud-vm').hide();

    $('#div-change-modal-cloud-vm').load("./src/features/cloud-vm-change.html");
    $('#div-change-modal-cloud-vm').hide();
    $('#div-change-alert-cloud-vm').load("./src/features/cloud-vm-change-alert.html");
    $('#div-change-alert-cloud-vm').hide();

    $('#div-cloud-vm-snap').load("./src/features/cloud-vm-snap.html");
    $('#div-cloud-vm-snap').hide();

    // 스토리지 센터 가상머신 자원변경 페이지 로드
    $('#div-modal-storage-vm-resource-update').load("./src/features/storage-vm-resource-update.html");
    $('#div-modal-storage-vm-resource-update').hide();
    // 스토리지 센터 가상머신 상태변경 페이지 로드
    $('#div-modal-storage-vm-status-update').load("./src/features/storage-vm-status-update.html");
    $('#div-modal-storage-vm-status-update').hide();
    // 스토리지 클러스터 유지보수 모드 변경 페이지 로드
    $('#div-modal-storage-cluster-maintenance-update').load("./src/features/storage-cluster-maintenance-update.html");
    $('#div-modal-storage-cluster-maintenance-update').hide();
    // 전체 시스템 종료 페이지 로드
    $('#div-modal-auto-shutdown').load("./src/features/auto-shutdown.html");
    $('#div-modal-auto-shutdown').hide();
    // ccvm db 백업 페이지 로드
    $('#div-modal-db-backup-cloud-vm-first').load("./src/features/cloud-vm-dbbackup.html");
    $('#div-modal-db-backup-cloud-vm-first').hide();

    // 일반 가상화일 경우 화면 변환
    screenConversion();

    cockpit.spawn(['python3', pluginpath + '/python/pcs/pcsExehost.py'])
    .then(function (data) {
        let retVal = JSON.parse(data);
        pcs_exe_host = retVal.val;
        ribbonWorker();
        //30초마다 화면 정보 갱신
        setInterval(() => {
            createLoggerInfo("Start collecting ablestack status information : setInterval()");
            // 배포상태 조회(비동기)완료 후 배포상태에 따른 요약리본 UI 설정
            ribbonWorker();
        }, 30000);
    })
    .catch(function (err) {
        ribbonWorker();
        //30초마다 화면 정보 갱신
        setInterval(() => {
            createLoggerInfo("Start collecting ablestack status information : setInterval()");
            // 배포상태 조회(비동기)완료 후 배포상태에 따른 요약리본 UI 설정
            ribbonWorker();
        }, 30000);
        createLoggerInfo("pcsExeHost err");
        console.log("pcsExeHost err : " + err);
    });
});
// document.ready 영역 끝

// 이벤트 처리 함수
$('#card-action-cloud-cluster-status').on('click', function(){
    $('#dropdown-menu-cloud-cluster-status').toggle();
});
$('#card-action-gfs-cluster-status').on('click', function(){
    $('#dropdown-menu-gfs-cluster-status').toggle();
});
$('#card-action-storage-vm-status').on('click', function(){
    $('#dropdown-menu-storage-vm-status').toggle();
});

$('#card-action-cloud-vm-status').on('click', function(){
    $('#dropdown-menu-cloud-vm-status').toggle();
});

var cpu=0;
var memory=0;
$('#card-action-cloud-vm-change').on('click', function(){
    ccvm_instance.createChangeModal();
});

$('#card-action-cloud-vm-connect').on('click', function(){
    // 클라우드센터VM 연결
    window.open('http://' + ccvm_instance.ip + ":9090");
});

$('#button-open-modal-wizard-storage-vm').on('click', function(){
    $('#div-modal-wizard-storage-vm').show();
});

$('#button-open-modal-wizard-pfmp-vm').on('click', function(){
 $('#div-modal-wizard-pfmp-vm').show();
});

$('#button-open-modal-wizard-storage-cluster').on('click', function(){
    readSshKeyFile();
    $('#div-modal-wizard-cluster-config-prepare').show();
});

$('#button-open-modal-wizard-cloud-vm').on('click', function(){
    $('#div-modal-wizard-cloud-vm').show();
});

$('#button-open-modal-wizard-monitoring-center').on('click', function(){
    $('#div-modal-wizard-wall-monitoring').show();
    autoConfigWallIP();
});

$('#button-link-storage-center-dashboard').on('click', function(){
    // storageCenter url 링크 주소 가져오기
    createLoggerInfo("button-link-storage-center-dashboard click");
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

$('#button-link-cloud-center').on('click', function(){
    // 클라우드센터 연결
    createLoggerInfo("button-link-cloud-center click");
    cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "cloudCenter"])
        .then(function(data){
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                window.open(retVal.val);
            }else{
                $("#modal-status-alert-title").html("클라우드센터 연결");
                $("#modal-status-alert-body").html(retVal.val);
                $('#div-modal-status-alert').show();
            }
        })
        .catch(function(err){
            createLoggerInfo(":::create_address.py cloudCenter Error:::");
            console.log(":::create_address.py cloudCenter Error:::"+ err);
        });
});

$('#button-link-monitoring-center').on('click', function(){
    // 모니터링센터 대시보드 연결
    cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "wallCenter"])
        .then(function(data){
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                window.open(retVal.val);
            }else{
                $("#modal-status-alert-title").html("모니터링센터 대시보드 연결");
                $("#modal-status-alert-body").html(retVal.val);
                $('#div-modal-status-alert').show();
            }
        })
        .catch(function(err){
            console.log(":::create_address.py wallCenter Error:::"+ err);
        });
});

// 스토리지센터 클러스터 유지보수모드 설정 버튼 클릭시 modal의 설명 세팅
$('#menu-item-set-maintenance-mode').on('click',function(){
    $('#modal-description-maintenance-status').html("<p>스토리지 클러스터를 유지보수 모드를 '설정' 하시겠습니까?</p>");
    $('#scc-maintenance-update-cmd').val("set");
    $('#div-modal-storage-cluster-maintenance-update').show();
});

// 스토리지센터 클러스터 유지보수모드 해제 버튼 클릭시 modal의 설명 세팅
$('#menu-item-unset-maintenance-mode').on('click',function(){
    $('#modal-description-maintenance-status').html("<p>스토리지 클러스터를 유지보수 모드를 '해제' 하시겠습니까?</p>");
    $('#scc-maintenance-update-cmd').val("unset");
    $('#div-modal-storage-cluster-maintenance-update').show();
});

// 스토리지센터 VM 시작 버튼 클릭시 modal의 설명 세팅
$('#menu-item-set-storage-center-vm-start').on('click',function(){
    $('#modal-title-scvm-status').text("스토리지 센터 가상머신 상태 변경");
    $('#modal-description-scvm-status').html("<p>스토리지 센터 가상머신을 '시작' 하시겠습니까?</p>");
    $('#button-storage-vm-status-update').html("시작");
    $('#scvm-status-update-cmd').val("start");
    $('#div-modal-storage-vm-status-update').show();
});

// 스토리지센터 VM 정지 버튼 클릭시 modal의 설명 세팅
$('#menu-item-set-storage-center-vm-stop').on('click',function(){
    $('#modal-title-scvm-status').text("스토리지 센터 가상머신 상태 변경");
    $('#modal-description-scvm-status').html("<p>스토리지 센터 가상머신을 '정지' 하시겠습니까?</p>");
    $('#button-storage-vm-status-update').html("정지");
    $('#scvm-status-update-cmd').val("stop");
    $('#div-modal-storage-vm-status-update').show();
});

// 스토리지센터 VM 삭제 버튼 클릭시 modal의 설명 세팅
$('#menu-item-set-storage-center-vm-delete').on('click',function(){
    $('#modal-title-scvm-status').text("스토리지 센터 가상머신 상태 변경");
    $('#modal-description-scvm-status').html("<p>스토리지 센터 가상머신을 '삭제' 하시겠습니까?</p>");
    $('#button-storage-vm-status-update').html("삭제");
    $('#scvm-status-update-cmd').val("delete");
    $('#div-modal-storage-vm-status-update').show();
});

// 스토리지센터 VM 자원변경 버튼 클릭시 modal의 설명 세팅
$('#menu-item-set-storage-center-vm-resource-update').on('click', function(){
    //현재 cpu, memory 값은 선택이 되지 않도록 disabled
    $("#form-select-storage-vm-cpu-update option[value="+ sessionStorage.getItem("scvm_cpu") +"]").prop('disabled',true);
    $("#form-select-storage-vm-memory-update option[value="+ sessionStorage.getItem("scvm_momory").split(' ')[0] +"]").prop('disabled',true);
    $('#div-modal-storage-vm-resource-update').show();
});

// 전체 시스템 종료 버튼 클릭시 modal의 설명 세팅
$('#menu-item-set-auto-shutdown-step-two').on('click',function(){
    $('#modal-description-auto-shutdown').html("전체 시스템을 '종료' 하시겠습니까?<br><br> 사전에 각 호스트에 Mount된 볼륨을 작업 수행자가 직접 해제해야 합니다. 해제 후, 아래 볼륨 마운트 해제 확인 스위치를 클릭하여 계속 진행합니다.");
    $('#auto-shutdown-cmd').val("start");
    $('#div-modal-auto-shutdown').show();
    $('#button-auto-shutdown').show();
    $('#button-close-auto-shutdown').show();
    $('#modal-div-auto-shutdown-mount').show();
});

// 클라우드센터 VM DB 백업 드롭다운 버튼 클릭시
$('#card-action-cloud-vm-db-dump').on('click', function(){
    $('#div-modal-db-backup-cloud-vm').show();
    $('#div-modal-wizard-cluster-config-finish-db-dump-file-download-empty-state').hide();
});

//div-modal-status-alert modal 닫기
$('#modal-status-alert-button-close1, #modal-status-alert-button-close2').on('click', function(){
    $('#div-modal-status-alert').hide();
    location.reload();
});

// 상태 보기 드롭다운 메뉴를 활성화한 상태에서 다른 영역을 클릭 했을 경우 메뉴 닫기 (현재 활성화된 iframe 클릭할 때 작동)
$('html').on('click', function(e){
    if(!$(e.target).hasClass('pf-c-dropdown__toggle')){
        $('.pf-c-dropdown__menu, .pf-m-align-right').hide();
    }
});

// 상태 보기 드롭다운 메뉴를 활성화한 상태에서 다른 영역을 클릭 했을 경우 메뉴 닫기 (pareant html 클릭할 때 작동)
$(top.document, 'html').on('click', function(e){
    if(!$(e.target).hasClass('pf-c-dropdown__toggle')){
        $('.pf-c-dropdown__menu, .pf-m-align-right').hide();
    }
});

// 상태 보기 드롭다운 메뉴를 활성화한 상태에서 다른 드롭다운 메뉴를 클릭 했을 경우 메뉴 닫기
$('.pf-c-dropdown').on('click', function(e){
    $('.pf-c-dropdown__menu, .pf-m-align-right').hide();
    var card_id_sting = $(this).find('ul').attr('id');
    $('#'+ card_id_sting).show();
})

// 클라우드센터 VM DB 백업 실행 클릭 시
$('#button-execution-modal-cloud-vm-db-dump').on('click', function () {
    $('#dbdump-prepare-status').html("<svg class='pf-c-spinner pf-m-xl' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100'><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>" +
    "<h1 data-ouia-component-type='PF4/Title' data-ouia-safe='true' data-ouia-component-id='OUIA-Generated-Title-1' class='pf-c-title pf-m-lg'>백업파일 준비 중...</h1><div class='pf-c-empty-state__body'></div>")
    let dump_sql_file_path = "/root/db_dump/ccvm_dump_cloud.sql"
    readFile(dump_sql_file_path);
    $('#div-db-backup').hide();
    $('#button-execution-modal-cloud-vm-db-dump').hide();
    $('#button-cancel-modal-cloud-vm-db-dump').hide();
    $('#button-close-modal-cloud-vm-db-dump').hide();
    $('#div-modal-wizard-cluster-config-finish-db-dump-file-download').hide();
})

// 클라우드센터 VM DB 백업파일 다운로드 링크 클릭 시
$('#span-modal-wizard-cluster-config-finish-db-dump-file-download').on('click', function () {

})

/**
 * Meathod Name : scvm_bootstrap_run
 * Date Created : 2021.04.10
 * Writer  : 최진성
 * Description : scvm /root/bootstrap.sh  파일 실행
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.04.10 최초 작성
 */
function scvm_bootstrap_run(){
    $("#modal-status-alert-title").html("스토리지센터 가상머신 상태 체크");
    $("#modal-status-alert-body").html("스토리지센터 가상머신이 구성되지 않아<br>스토리지센터를 구성할 수 없습니다.<br><br>잠시 후 다시 실행해 주세요.");
    createLoggerInfo("scvm_bootstrap_run() start");
    //scvm ping 체크
    cockpit.spawn(["python3", pluginpath+"/python/cloudinit_status/cloudinit_status.py", "ping", "--target",  "scvm"])
        .then(function(data){
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                //scvm 의 cloudinit 실행이 완료되었는지 확인하기 위한 명렁
                cockpit.spawn(["python3", pluginpath+"/python/cloudinit_status/cloudinit_status.py", "status", "--target",  "scvm"])
                    .then(function(data){
                        var retVal = JSON.parse(data);
                        //cloudinit status: done 일때
                        if(retVal.code == 200 && retVal.val == "status: done"){
                            $('#modal-title-scvm-status').text("스토리지센터 구성하기");
                            $('#modal-description-scvm-status').html("<p>스토리지센터를 구성하시겠습니까?</p>");
                            $('#button-storage-vm-status-update').html("실행");
                            $('#scvm-status-update-cmd').val("bootstrap");
                            $('#div-modal-storage-vm-status-update').show();
                        }else{
                            $('#div-modal-status-alert').show();
                        }
                    })
                    .catch(function(data){
                        $('#div-modal-status-alert').show();
                        createLoggerInfo(":::scvm_bootstrap_run() Error :::");
                        console.log(":::scvm_bootstrap_run() Error :::" + data);
                    });
            }else{
                $('#div-modal-status-alert').show();
            }
        })
        .catch(function(data){
            $('#div-modal-status-alert').show();
            createLoggerInfo(":::scvm_bootstrap_run() Error :::");
            console.log(":::scvm_bootstrap_run() Error :::" + data);
        });
}

/**
 * Meathod Name : scc_link_go
 * Date Created : 2021.04.10
 * Writer  : 최진성
 * Description : 스토리지센터 연결 버튼 클릭시 URL 세팅
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.04.10 최초 작성
 */
 function scc_link_go(){
    // storageCenter url 링크 주소 가져오기
    createLoggerInfo("scc_link_go() start");
    cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "storageCenter"])
    .then(function(data){
        createLoggerInfo("scc_link_go start");
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
    .catch(function(data){
        createLoggerInfo(":::scc_link_go() Error :::");
        console.log(":::scc_link_go() Error :::" + data);
    });
}

// 스토리지센터VM 연결 버튼 클릭시 URL 세팅
$('#menu-item-linkto-storage-center-vm').on('click', function(){
    // storageCenterVm url 링크 주소 가져오기
    createLoggerInfo("menu-item-linkto-storage-center-vm click");
    cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "storageCenterVm"])
        .then(function(data){
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                // 스토리지 센터 VM 연결
                window.open(retVal.val);
            }
        })
        .catch(function(data){
            console.log(":::menu-item-linkto-storage-center-vm click Error ::: " + data);
        });
});

/**
 * Meathod Name : checkConfigStatus
 * Date Created : 2021.03.23
 * Writer  : 박다정
 * Description : 클러스터 구성준비 상태 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.23 최초 작성
 */
function checkConfigStatus(){
    //createLoggerInfo("checkConfigStatus() start");
    return new Promise((resolve) => {
        cockpit.spawn(['grep', '-c', 'ablecube', '/etc/hosts'])
            .then(data=>{
                if(data >= 1){
                    cockpit.spawn(['cat', '/root/.ssh/id_rsa.pub'])
                        .then(data=>{
                            sessionStorage.setItem("ccfg_status", "true");
                            saveHostInfo();
                            resolve();
                        })
                        .catch(err=>{
                            // ssh-key 파일 없음
                            createLoggerInfo("no ssh-key file error");
                            sessionStorage.setItem("ccfg_status", "false");
                            resetBootstrap();
                            resolve();
                        })
                }
            })
            .catch(err=>{
                // hosts 파일 구성 되지않음
                createLoggerInfo("hosts file not configured error");
                sessionStorage.setItem("ccfg_status", "false");
                resetBootstrap();
                resolve();
            })
    });
}

/** all hosts update glue config modal 관련 action start */
function all_host_glue_config_update_modal(){
    $('#div-modal-update-glue-config').show();
}
function pfmp_install(){
    $('#div-modal-pfmp-install').show();
}
$('#button-close-modal-update-glue-config').on('click', function(){
    $('#div-modal-update-glue-config').hide();
});
$('#button-close-modal-pfmp-install').on('click', function(){
    $('#div-modal-pfmp-install').hide();
});
$('#button-execution-modal-pfmp-install').on('click', function(){
    $('#div-modal-pfmp-install').hide();
    $('#div-modal-spinner-pfmp-header-txt').text('PFMP 컨테이너 설치 중입니다.');
    $('#div-modal-spinner-pfmp').show();

    $("#modal-status-alert-title").html("PFMP 설치");
    $("#modal-status-alert-body").html("PFMP 설치를 실패하였습니다.<br/>PFMP 상태를 확인해주세요.");
    createLoggerInfo("pfmp_install() start");

    updatePfmpInstall(35,"second");
    cockpit.spawn(["python3", pluginpath+"/python/pfmp/pfmp_install.py", "pre_install"])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $("#div-modal-spinner-pfmp-header-txt").text("PFMP 클러스터 및 앱을 설치 중입니다. ");
            createLoggerInfo("pfmp containers install success");
            updatePfmpInstall(105,"minute");
            cockpit.spawn(["python3", pluginpath+"/python/pfmp/pfmp_install.py", "install"])
            .then(function(data){
                var retVal = JSON.parse(data);
                console.log(retVal);
                if(retVal.code == 200){
                    console.log(retVal);
                    $("#div-modal-spinner-pfmp-header-txt").text("PFMP 가상머신을 삭제 중입니다.");
                    updatePfmpInstall(2,"second");
                    cockpit.spawn(["python3", pluginpath+"/python/pfmp/pfmp_install.py", "remove"])
                    .then(function(data){
                        var retVal = JSON.parse(data);
                        console.log(retVal);
                        if(retVal.code == 200){
                            console.log(retVal);
                            $('#div-modal-spinner-pfmp').hide();
                            $("#modal-status-alert-body").html("PFMP 설치를 성공했습니다.<br/> 성공 후 자동으로 PFMP 가상머신은 삭제됩니다.");
                            $('#div-modal-status-alert').show();
                        }else{
                            console.log(retVal);
                            $("#modal-status-alert-title").html("PFMP 설치");
                            $("#modal-status-alert-body").html("PFMP 삭제를 실패하셨습니다.<br/>PFMP 상태를 확인해주세요.");
                            $('#div-modal-spinner-pfmp').hide();
                            $('#div-modal-status-alert').show();
                            createLoggerInfo(":::pfmp_install() Error ::: error");
                            console.log(":::pfmp_install() Error :::" + data);
                        }
                    })
                    .catch(function(data){
                        $('#div-modal-spinner-pfmp').hide();
                        $('#div-modal-status-alert').show();
                        createLoggerInfo(":::pfmp_install() Error ::: error");
                        console.log(":::pfmp_install() Error :::" + data);
                    });
                    createLoggerInfo("pfmp cluster and application install success");
                }else{
                    $("#modal-status-alert-title").html("PFMP 설치");
                    $("#modal-status-alert-body").html("PFMP 클러스터 및 앱 설치를 실패하셨습니다.<br/>PFMP 및 pfmp_config.json 파일 상태를 확인해주세요.");
                    $('#div-modal-spinner-pfmp').hide();
                    $('#div-modal-status-alert').show();
                    createLoggerInfo(":::pfmp_install() Error ::: error");
                    console.log(":::pfmp_install() Error :::" + data);
                }
            })
            .catch(function(data){
                $('#div-modal-spinner-pfmp').hide();
                $('#div-modal-status-alert').show();
                createLoggerInfo(":::pfmp_install() Error ::: error");
                console.log(":::pfmp_install() Error :::" + data);
            });
        }else{
            $("#modal-status-alert-title").html("PFMP 설치");
            $("#modal-status-alert-body").html("PFMP 컨테이너 설치를 실패하셨습니다.<br/>PFMP 상태를 확인해주세요.");
            $('#div-modal-spinner-pfmp').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo(":::pfmp_install() Error ::: error");
            console.log(":::pfmp_install() Error :::" + data);
        }
    })
    .catch(function(data){
        $('#div-modal-spinner-pfmp').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo(":::pfmp_install() Error ::: error");
        console.log(":::pfmp_install() Error :::" + data);
    });
});

$('#button-execution-modal-update-glue-config').on('click', function(){
    var console_log = true;
    $('#div-modal-update-glue-config').hide();
    $('#div-modal-spinner-header-txt').text('전체 호스트 Glue 설정 업데이트하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("전체 호스트 Glue 설정 업데이트");
    $("#modal-status-alert-body").html("전체 호스트 Glue 설정 업데이트를 실패하였습니다.<br/>CUBE 호스트, SCVM 상태를 확인해주세요.");
    createLoggerInfo("all_host_glue_config_update_modal() start");

    cockpit.spawn(["python3", pluginpath+"/python/glue/update_glue_config.py", "update"])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-body").html("전체 호스트 Glue 설정 업데이트를 성공하였습니다");
            $('#div-modal-status-alert').show();
            createLoggerInfo("all cube hosts, scvms update keyring and ceph.confg spawn success");
        }else{
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo(":::all_host_glue_config_update_modal() Error ::: error");
            console.log(":::all_host_glue_config_update_modal() Error :::" + data);
        }
    })
    .catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo(":::all_host_glue_config_update_modal() Error ::: error");
        console.log(":::all_host_glue_config_update_modal() Error :::" + data);
    });
});

$('#button-cancel-modal-update-glue-config').on('click', function(){
    $('#div-modal-update-glue-config').hide();
});
$('#button-cancel-modal-pfmp-install').on('click', function(){
    $('#div-modal-pfmp-install').hide();
});
/** all hosts update glue config modal 관련 action end */

/** remove cube host config modal 관련 action start */
// 전체 시스템 종료 버튼 클릭시 modal의 설명 세팅
$('#menu-item-remove-cube-host').on('click',function(){
    $('#div-modal-remove-cube-host').show();
});

$('#button-close-modal-remove-cube-host').on('click', function(){
    $('#div-modal-remove-cube-host').hide();
});

$('#button-execution-modal-remove-cube-host').on('click', function(){
    var console_log = true;
    $('#div-modal-remove-cube-host').hide();
    $('#div-modal-spinner-header-txt').text('Cube 호스트를 초기화하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("Cube 호스트 제거");
    $("#modal-status-alert-body").html("Cube 호스트 제거를 실패하였습니다.");
    createLoggerInfo("remove_cube_host_modal() start");

    /*
    todo list
    1) hosts 파일 초기화
    2) ablestack.json 초기화
    3) cluster.json 초기화
    4) vmconfig 초기화
    */
    cockpit.spawn(["python3", pluginpath+"/python/cluster/remove_cube_host.py", "remove"])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-body").html("Cube 호스트를 초기화를 성공하였습니다");
            $('#div-modal-status-alert').show();
            createLoggerInfo("remove cube host success");
        }else{
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo(":::remove_cube_host_modal() Error ::: error");
            console.log(":::remove_cube_host_modal() Error :::" + data);
        }
    })
    .catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo(":::remove_cube_host_modal() Error ::: error");
        console.log(":::remove_cube_host_modal() Error :::" + data);
    });
});

$('#button-cancel-modal-remove-cube-host').on('click', function(){
    $('#div-modal-remove-cube-host').hide();
});
/** move cube host config modal 관련 action end */


/**
 * Meathod Name : checkStorageClusterStatus
 * Date Created : 2021.03.31
 * Writer  : 최진성
 * Description : 스토리지센터 클러스터 상태 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.31 최초 작성
 */
function checkStorageClusterStatus(){
    //createLoggerInfo("checkStorageClusterStatus() start");
    return new Promise((resolve) => {
        //초기 상태 체크 중 표시
        $('#scc-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
        $("#scc-css").attr('class','pf-c-label pf-m-orange');
        $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');

        cockpit.spawn(["cat", pluginpath+"/tools/properties/cluster.json"])
        .then(function(data){
            var retVal = JSON.parse(data);
            if (retVal.clusterConfig.type == "PowerFlex"){
                setPfmpStatus();
                //bootstrap.sh을 실행했는지 여부 확인
                cockpit.spawn(["python3", pluginpath+"/python/ablestack_json/ablestackJson.py", "status"])
                .then(function(data){
                    var retVal = JSON.parse(data);
                    if(retVal.val.bootstrap.scvm == "false"){ //bootstrap.sh 실행 전
                        sessionStorage.setItem("scvm_bootstrap_status","false");
                        $("#scvm-after-bootstrap-run").html("");
                        $("#scvm-before-bootstrap-run").html("<a class='pf-c-dropdown__menu-item' href='#' id='menu-item-bootstrap-run' onclick='scvm_bootstrap_run()'>Bootstrap 실행</a>");
                    }else{  //bootstrap.sh 실행 후
                        sessionStorage.setItem("scvm_bootstrap_status","true");
                        $("#scvm-after-bootstrap-run").html("<a class='pf-c-dropdown__menu-item' href='#' id='menu-item-linkto-storage-center' onclick='scc_link_go()'>스토리지센터 연결</a>");
                        $("#scvm-before-bootstrap-run").html("");
                    }
                    //PowerFlex PFMP의 bootstrap 실행전
                    if(retVal.val.bootstrap.pfmp == "false"){
                        sessionStorage.setItem("pfmp_bootstrap_status","false");
                        $("#pfmp-bootstrap-run").html("");
                        $("#pfmp-bootstrap-run").html("<a class='pf-c-dropdown__menu-item pf-m-disabled' href='#' id='menu-item-pfmp-install' onclick='pfmp_install()'>PFMP 설치</a>");
                    }else{  //bootstrap.sh 실행 후
                        sessionStorage.setItem("pfmp_bootstrap_status","true");
                        $("#pfmp-bootstrap-run").hide();
                        $("#pfmp-bootstrap-run").html("");
                    }
                })
                .catch(function(data){
                    createLoggerInfo("Check whether bootstrap.sh is executed Error");
                    console.log(" bootstrap.sh을 실행했는지 여부 확인 Error ::: " + data);
                    $("#scvm-after-bootstrap-run").html("");
                    $("#scvm-before-bootstrap-run").html("");
                });
                cockpit.spawn(["python3", pluginpath + "/python/powerflex_status/powerflex_status.py", "status"])
                .then(function(data){
                    var retVal = JSON.parse(data);
                    var pfmp_bootstrap_status = sessionStorage.getItem("pfmp_bootstrap_status");
                    if (retVal.code == 200){
                        //파워플렉스 상태 상세 조회(API => json 형식)
                        cockpit.spawn(["python3", pluginpath+"/python/powerflex_status/powerflex_status.py","detail"])
                        .then(function(data){
                            var retVal = JSON.parse(data);
                            var sc_status = "Health Err";
                            //Cluster 상태에 대한 값
                            if (retVal.code == 200){
                                if (retVal.val.clusterState == "ClusteredNormal"){
                                    sc_status = "Health Ok";
                                    sessionStorage.setItem("sc_status", "HEALTH_OK");
                                    $('#scc-status-check').text("스토리지센터 클러스터가 구성되었습니다.");
                                    $('#scc-status-check').attr("style","color: var(--pf-global--success-color--100)");
                                    $("#menu-item-linkto-storage-center").removeClass('pf-m-disabled');
                                    $("#menu-item-update-glue-config").removeClass('pf-m-disabled');
                                    $("#scc-css").attr('class','pf-c-label pf-m-green');
                                    $("#scc-icon").attr('class','fas fa-fw fa-check-circle');
                                }else if(retVal.val.clusterState == "ClusteredDegraded"){
                                    sc_status = "Health Warn";
                                    sessionStorage.setItem("sc_status", "HEALTH_WARN");
                                    $('#scc-status-check').text("스토리지센터 클러스터가 구성되었습니다.");
                                    $('#scc-status-check').attr("style","color: var(--pf-global--success-color--100)");
                                    $("#menu-item-linkto-storage-center").removeClass('pf-m-disabled');
                                    $("#menu-item-update-glue-config").removeClass('pf-m-disabled');
                                    $("#scc-css").attr('class','pf-c-label pf-m-orange');
                                    $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                                }else{
                                    sc_status = "Health Err";
                                    sessionStorage.setItem("sc_status", "HEALTH_ERR");
                                    $("#scc-css").attr('class','pf-c-label pf-m-red');
                                    $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                                    $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                                    $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                                    $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                                    $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                                    $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                                    $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                                }
                                $('#protect-domain').show();
                                $('#manage-daemon').hide();
                                $('#scc-status').html(sc_status);

                                if(retVal.val.devices[0].total_disks !="N/A" && retVal.val.devices[0].disk_state !="N/A" ){
                                    $('#scc-osd').text("전체 " + retVal.val.devices[0].total_disks + "개의 디스크 중 " + retVal.val.devices[0].disk_state + "개 작동 중");
                                }
                                if(retVal.val.tieBreakers !="N/A" && retVal.val.slave !="N/A"  && retVal.val.master !="N/A" ){
                                    $('#scc-gw').text("PowerFlex GW " + retVal.val.goodNodesNum + "개 실행 중 / " + retVal.val.goodNodesNum + "개 제공 중(quorum : " + retVal.val.master.hostname +","+retVal.val.slaves[0].hostname+","+retVal.val.tieBreakers[0].hostname + ")");
                                }
                                if(retVal.val.protection_domains !="N/A"){
                                    $('#scc-protect-domain').text(retVal.val.protection_domains.length + " 개의 보호도메인")
                                    var len = 0;
                                    for (var i = 0; i < retVal.val.protection_domains.length; i++){
                                        for (var j = 0 ; j < retVal.val.protection_domains[i].storage_pools.length; j++){
                                            len += 1;
                                        }
                                    }
                                    $('#scc-pools').text(len + " 개의 풀");
                                }
                                if(retVal.val.protection_domains[0].capactiy !="N/A" ){
                                    $('#scc-usage').text("전체 " + retVal.val.protection_domains[0].capacity[0].limit_capacity + " 중 " +retVal.val.protection_domains[0].capacity[0].used_capacity+ " 사용 중 (사용가능 " + retVal.val.protection_domains[0].capacity[0].unused_capacity+ ")" );
                                }
                                resolve();
                            }else{
                                sc_status = "Health Err";
                                sessionStorage.setItem("sc_status", sc_status);
                                $("#scc-css").attr('class','pf-c-label pf-m-red');
                                $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                                $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                                $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                                $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                                $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                                $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                                $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                                $('#protect-domain').show();
                                $('#manage-daemon').hide();
                                $('#scc-status').html(sc_status);
                                resolve();
                            }

                        })
                        .catch(function(data){
                            createLoggerInfo(":::checkStorageClusterStatus() Error:::");
                            console.log(":::checkStorageClusterStatus() Error::: "+ data);
                            $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                            $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                            $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                            $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                            $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                            $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                            $("#menu-item-bootstrap-run").addClass('pf-m-disabled');
                            resolve();
                        });
                    }else{
                        sc_status = "Health Err";
                        sessionStorage.setItem("sc_status", sc_status);
                        $("#scc-css").attr('class','pf-c-label pf-m-red');
                        $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                        $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                        $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                        $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                        $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                        $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                        $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                        $('#protect-domain').show();
                        $('#manage-daemon').hide();
                        $('#scc-status').html(sc_status);
                        resolve();
                    }
                })
                .catch(function(data){
                    createLoggerInfo(":::checkStorageClusterStatus() Error:::");
                    console.log(":::checkStorageClusterStatus() Error::: "+ data);
                    $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                    $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                    $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                    $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                    $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                    $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                    $("#menu-item-bootstrap-run").addClass('pf-m-disabled');
                    resolve();
                });
            }else{
                    //bootstrap.sh을 실행했는지 여부 확인
                    cockpit.spawn(["python3", pluginpath+"/python/ablestack_json/ablestackJson.py", "status"])
                    .then(function(data){
                        var retVal = JSON.parse(data);
                        if(retVal.val.bootstrap.scvm == "false"){ //bootstrap.sh 실행 전
                            sessionStorage.setItem("scvm_bootstrap_status","false");
                            $("#scvm-after-bootstrap-run").html("");
                            $("#scvm-before-bootstrap-run").html("<a class='pf-c-dropdown__menu-item' href='#' id='menu-item-bootstrap-run' onclick='scvm_bootstrap_run()'>스토리지센터 구성하기</a>");
                        }else{  //bootstrap.sh 실행 후
                            sessionStorage.setItem("scvm_bootstrap_status","true");
                            $("#scvm-after-bootstrap-run").html("<a class='pf-c-dropdown__menu-item' href='#' id='menu-item-linkto-storage-center' onclick='scc_link_go()'>스토리지센터 연결</a>");
                            $("#scvm-after-update-glue-config").html("<a class='pf-c-dropdown__menu-item' href='#' id='menu-item-update-glue-config' onclick='all_host_glue_config_update_modal()'>전체 호스트 Glue 설정 업데이트</a>");
                            $("#scvm-before-bootstrap-run").html("");
                        }
                    })
                    .catch(function(data){
                        createLoggerInfo("Check whether bootstrap.sh is executed Error");
                        console.log(" bootstrap.sh을 실행했는지 여부 확인 Error ::: " + data);
                        $("#scvm-after-bootstrap-run").html("");
                        $("#scvm-before-bootstrap-run").html("");
                    });
                    //스토리지 클러스터 상태 상세조회(ceph -s => json형식)
                    cockpit.spawn(["python3", pluginpath+"/python/scc_status/scc_status_detail.py", "detail" ])
                        .then(function(data){
                            var retVal = JSON.parse(data);
                            var sc_status = "Health Err";
                            var inMessHtml = "";
                            sessionStorage.setItem("sc_status", retVal.val.cluster_status); //스토리지 클러스터 상태값 세션스토리지에 저장
                            sessionStorage.setItem("storage_cluster_maintenance_status", retVal.val.maintenance_status); //스토리지 클러스터 유지보수 상태값 세션스토리지에 저장
                            //스토리지 클러스터 유지보수 상태 확인 후 버튼 disabled 여부 세팅
                            if(retVal.val.maintenance_status){
                                $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                                $("#menu-item-unset-maintenance-mode").removeClass('pf-m-disabled');
                            }else{
                                $("#menu-item-set-maintenance-mode").removeClass('pf-m-disabled');
                                $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                            }
                            //스토리지 클러스터 상태값에 따라 icon 및 색상 변경을 위한 css 설정 값 세팅
                            if(retVal.val.cluster_status == "HEALTH_OK"){
                                sc_status = "Health Ok";
                                $('#scc-status-check').text("스토리지센터 클러스터가 구성되었습니다.");
                                $('#scc-status-check').attr("style","color: var(--pf-global--success-color--100)");
                                $("#menu-item-linkto-storage-center").removeClass('pf-m-disabled');
                                $("#menu-item-update-glue-config").removeClass('pf-m-disabled');
                                $("#scc-css").attr('class','pf-c-label pf-m-green');
                                $("#scc-icon").attr('class','fas fa-fw fa-check-circle');
                            }else if(retVal.val.cluster_status == "HEALTH_WARN"){
                                sc_status = "Health Warn";
                                $('#scc-status-check').text("스토리지센터 클러스터가 구성되었습니다.");
                                $('#scc-status-check').attr("style","color: var(--pf-global--success-color--100)");
                                $("#menu-item-linkto-storage-center").removeClass('pf-m-disabled');
                                $("#menu-item-update-glue-config").removeClass('pf-m-disabled');
                                $("#scc-css").attr('class','pf-c-label pf-m-orange');
                                $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                            }else if(retVal.val.cluster_status == "HEALTH_ERR"){
                                sc_status = "Health Err";
                                $("#scc-css").attr('class','pf-c-label pf-m-red');
                                $("#scc-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                                $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                                $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                                $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                                $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                                $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                                $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                            }
                            $('#manage-daemon').show();
                            //json으로 넘겨 받은 값들 세팅
                            if(retVal.val.cluster_status != "HEALTH_OK"){
                                //json key중 'message'이라는 key의 value값 가져옴
                                const recurse = (obj, arr=[]) => {
                                    Object.entries(obj).forEach(([key, val]) => {
                                        if (key === 'message') {
                                            arr.push(val);
                                        }
                                        if (typeof val === 'object') {
                                            recurse(val, arr);
                                        }
                                    });
                                    return arr;
                                };
                                //health상태가 warn, error일경우 message 정보 확인하기 위함.
                                var messArr = recurse(retVal);
                                for(var i in messArr){
                                    inMessHtml = inMessHtml + "<br> - "  + messArr[i];
                                }
                                $('#scc-status').html(sc_status + inMessHtml);
                            }else{
                                $('#scc-status').html(sc_status);
                            }
                            if(retVal.val.osd !="N/A" && retVal.val.osd_up !="N/A" ){
                                $('#scc-osd').text("전체 " + retVal.val.osd + "개의 디스크 중 " + retVal.val.osd_up + "개 작동 중");
                            }
                            if(retVal.val.mon_gw1 !="N/A" && retVal.val.mon_gw2 !="N/A" ){
                                if(retVal.val.json_raw.health.checks.hasOwnProperty('MON_DOWN')){//health 상태값 중 MON_DOWN 값이 있을때
                                    activeGwCnt = parseInt(retVal.val.mon_gw1) - parseInt(retVal.val.json_raw.health.checks.MON_DOWN.summary.count);//다운된 mon count 확인해 실행중인(activeGwCnt) mon count 값세팅
                                }else{
                                    activeGwCnt = retVal.val.mon_gw1;
                                }
                                $('#scc-gw').text("RBD GW " + activeGwCnt + "개 실행 중 / " + retVal.val.mon_gw1 + "개 제공 중(quorum : " + retVal.val.mon_gw2 + ")");
                            }
                            if(retVal.val.mgr !="N/A" && retVal.val.mgr_cnt !="N/A" ){
                                $('#scc-mgr').text(retVal.val.mgr + "(전체 " + retVal.val.mgr_cnt + "개 실행중)");
                            }
                            if(retVal.val.pools !="N/A"){
                                $('#scc-pools').text(retVal.val.pools + " pools");
                            }
                            if(retVal.val.avail !="N/A" && retVal.val.used !="N/A" && retVal.val.usage_percentage !="N/A" ){
                                $('#scc-usage').text("전체 " + retVal.val.avail + " 중 " +retVal.val.used + " 사용 중 (사용률 " + retVal.val.usage_percentage+ " %)" );
                            }
                            resolve();
                        })
                        .catch(function(data){
                            createLoggerInfo(":::checkStorageClusterStatus() Error:::");
                            console.log(":::checkStorageClusterStatus() Error::: "+ data);
                            $('#scc-status-check').text("스토리지센터 클러스터가 구성되지 않았습니다.");
                            $('#scc-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                            $("#menu-item-set-maintenance-mode").addClass('pf-m-disabled');
                            $("#menu-item-unset-maintenance-mode").addClass('pf-m-disabled');
                            $("#menu-item-linkto-storage-center").addClass('pf-m-disabled');
                            $("#menu-item-update-glue-config").addClass('pf-m-disabled');
                            $("#menu-item-bootstrap-run").addClass('pf-m-disabled');
                            resolve();
                        });
            }//else문
        });

    });
}


/**
 * Meathod Name : checkStorageVmStatus
 * Date Created : 2021.03.31
 * Writer  : 최진성
 * Description : 스토리지센터 가상머신 상태 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.31 최초 작성
 */
function checkStorageVmStatus(){
    //createLoggerInfo("checkStorageVmStatus() start");
    return new Promise((resolve) => {
        //초기 상태 체크 중 표시
        $('#scvm-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
        $("#scvm-css").attr('class','pf-c-label pf-m-orange');
        $("#scvm-icon").attr('class','fas fa-fw fa-exclamation-triangle');

        //scvm 상태 조회
        cockpit.spawn(["python3", pluginpath+"/python/scvm_status/scvm_status_detail.py", "detail" ])
            .then(function(data){
                var retVal = JSON.parse(data);
                sessionStorage.setItem("scvm_status", retVal.val.scvm_status.toUpperCase());//스트리지센터 가상머신 상태값 세션스토리지에 저장
                sessionStorage.setItem("scvm_cpu", retVal.val.vcpu);//스트리지센터 가상머신 상태값 세션스토리지에 저장
                sessionStorage.setItem("scvm_momory", retVal.val.memory);//스트리지센터 가상머신 상태값 세션스토리지에 저장

                //json으로 넘겨 받은 값들 세팅
                var scvm_status = retVal.val.scvm_status;
                if(scvm_status == "running"){
                    scvm_status = "Running";
                }else if(scvm_status == "shut off"){
                    scvm_status = "Stopped";
                }else{
                    scvm_status = "Health Err";
                }
                $('#scvm-status').text(scvm_status);
                if(retVal.val.vcpu !="N/A"){
                    $('#scvm-cpu').text(retVal.val.vcpu + " vCore");
                }
                //$('#scvm-cpu').text(retVal.val.vcpu + "vCore(" + retVal.val.socket + " Socket, "+retVal.val.core+" Core)");
                if(retVal.val.memory !="N/A"){
                    $('#scvm-memory').text(retVal.val.memory);
                }
                if(retVal.val.rootDiskSize !="N/A" && retVal.val.rootDiskAvail !="N/A" && retVal.val.rootDiskUsePer !="N/A"){
                    $('#scvm-rdisk').text(retVal.val.rootDiskSize + "(사용가능 " + retVal.val.rootDiskAvail + " / 사용률 " + retVal.val.rootDiskUsePer + ")");
                }
                if(retVal.val.manageNicType !="N/A" && retVal.val.manageNicParent !="N/A"){
                    $('#scvm-manage-nic-type').text("NIC Type : " + retVal.val.manageNicType + " (Parent : " + retVal.val.manageNicParent + ")");
                }
                if(retVal.val.manageNicIp !="N/A"){
                    $('#scvm-manage-nic-ip').text("IP : " + retVal.val.manageNicIp.split("/")[0]);
                    $('#scvm-manage-nic-ip-prefix').text("PREFIX : " + retVal.val.manageNicIp.split("/")[1]);
                }
                if(retVal.val.manageNicGw !="N/A"){
                    $('#scvm-manage-nic-gw').text("GW : " + retVal.val.manageNicGw);
                }
                if(retVal.val.manageNicDns != "N/A"){
                    $('#scvm-manage-nic-dns').text("DNS : " + retVal.val.manageNicDns);
                }
                if(retVal.val.storageServerNicType !="N/A"){
                    $('#scvm-storage-server-nic-type').text("서버용 NIC Type : " + retVal.val.storageServerNicType);
                    if( retVal.val.storageServerNicParent !="N/A"){
                        $('#scvm-storage-server-nic-type').text("서버용 NIC Type : " + retVal.val.storageServerNicType + " (Parent : " + retVal.val.storageServerNicParent + ")");
                    }
                }
                if(retVal.val.storageServerNicIp !="N/A"){
                    $('#scvm-storage-server-nic-ip').text("서버용 IP : " + retVal.val.storageServerNicIp);
                }
                if(retVal.val.storageReplicationNicType !="N/A"){
                    $('#scvm-storage-replication-nic-type').text("복제용 NIC Type : " + retVal.val.storageReplicationNicType);
                    if( retVal.val.storageReplicationNicParent !="N/A"){
                        $('#scvm-storage-replication-nic-type').text("복제용 NIC Type : " + retVal.val.storageReplicationNicType + " (Parent : " + retVal.val.storageReplicationNicParent + ")");
                    }
                }
                if(retVal.val.storageReplicationNicIp !="N/A"){
                    $('#scvm-storage-replication-nic-ip').text("복제용 IP : " + retVal.val.storageReplicationNicIp);
                }
                if(retVal.val.dataDiskType !="N/A"){
                    $('#scvm-storage-datadisk-type').text("Disk Type : " + retVal.val.dataDiskType);
                }

                //스토리지 센터 가상머신 toggle세팅
                if(retVal.val.scvm_status == "running"){ //가상머신 상태가 running일 경우
                    $("#scvm-css").attr('class','pf-c-label pf-m-green');
                    $("#scvm-icon").attr('class','fas fa-fw fa-check-circle');
                    $('#scvm-deploy-status-check').text("스토리지센터 가상머신이 배포되었습니다.");
                    $('#scvm-deploy-status-check').attr("style","color: var(--pf-global--success-color--100)");
                    $("#menu-item-set-storage-center-vm-start").addClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-resource-update").addClass('pf-m-disabled');
                    $("#menu-item-linkto-storage-center-vm").removeClass('pf-m-disabled');
                    if(sessionStorage.getItem("sc_status") == "HEALTH_ERR"){ //가상머신 상태 running && sc상태 Error 일때
                        $("#menu-item-set-storage-center-vm-delete").removeClass('pf-m-disabled');
                    }else{ //가상머신 상태 running && sc상태 ok, warn 일때
                        $("#menu-item-set-storage-center-vm-delete").addClass('pf-m-disabled');
                    }
                    if (os_type == "ABLESTACK-HCI"){
                        if(sessionStorage.getItem("storage_cluster_maintenance_status") == "true"){ //가상머신 상태 running && sc 유지보수모드일때
                            $("#menu-item-set-storage-center-vm-stop").removeClass('pf-m-disabled');
                        }else{//가상머신 상태 running && sc 유지보수모드 아닐때
                            $("#menu-item-set-storage-center-vm-stop").addClass('pf-m-disabled');
                        }
                    }else{
                        $("#menu-item-set-storage-center-vm-stop").removeClass('pf-m-disabled');
                    }
                }else if(retVal.val.scvm_status == "shut off"){ //가상머신 상태가 shut off일 경우
                    $("#scvm-css").attr('class','pf-c-label pf-m-red');
                    $("#scvm-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                    $('#scvm-deploy-status-check').text("스토리지센터 가상머신이 배포되었습니다.");
                    $('#scvm-deploy-status-check').attr("style","color: var(--pf-global--success-color--100)");
                    $("#menu-item-set-storage-center-vm-start").removeClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-stop").addClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-delete").removeClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-resource-update").attr('class','pf-c-dropdown__menu-item');
                    $("#menu-item-linkto-storage-center-vm").addClass('pf-m-disabled');
                }else{//가상머신 상태가 health_err일 경우
                    $("#scvm-css").attr('class','pf-c-label pf-m-red');
                    $("#scvm-icon").attr('class','fas fa-fw fa-exclamation-triangle');
                    $('#scvm-deploy-status-check').text("스토리지센터 가상머신이 배포되지 않았습니다.");
                    $('#scvm-deploy-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                    $("#menu-item-set-storage-center-vm-start").addClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-stop").addClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-delete").addClass('pf-m-disabled');
                    $("#menu-item-set-storage-center-vm-resource-update").addClass('pf-m-disabled');
                    $("#menu-item-linkto-storage-center-vm").addClass('pf-m-disabled');
                    $("#menu-item-bootstrap-run").addClass('pf-m-disabled');
                }
                resolve();
            })
            .catch(function(data){
                createLoggerInfo(":::checkStorageVmStatus Error:::");
                console.log(":::checkStorageVmStatus Error:::" + data);
                $("#menu-item-set-storage-center-vm-start").addClass('pf-m-disabled');
                $("#menu-item-set-storage-center-vm-stop").addClass('pf-m-disabled');
                $("#menu-item-set-storage-center-vm-delete").addClass('pf-m-disabled');
                $("#menu-item-set-storage-center-vm-resource-update").addClass('pf-m-disabled');
                $("#menu-item-linkto-storage-center-vm").addClass('pf-m-disabled');
                $('#scvm-deploy-status-check').text("스토리지센터 가상머신이 배포되지 않았습니다.");
                $('#scvm-deploy-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                resolve();
            });
        //스토리지 클러스터 배포 여부 확인 후 스토리지센터 가상머신 삭제 버튼 disabled 여부 세팅
        if(sessionStorage.getItem("sc_status") == "HEALTH_ERR"){
            $("#menu-item-set-storage-center-vm-delete").removeClass('class','pf-m-disabled');
        }else{
            $("#menu-item-set-storage-center-vm-delete").addClass('class','pf-m-disabled');
        }
    });
}

function sleep(sec) {
    let start = Date.now(), now = start;
    while (now - start < sec * 1000) {
        now = Date.now();
    }
}

/**
 * Meathod Name : checkDeployStatus
 * Date Created : 2021.03.30
 * Writer  : 박다정
 * Description : 요약리본 UI 배포상태에 따른 이벤트 처리
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.30 최초 작성
 */
function checkDeployStatus(){
    setTimeout(function(){
        // 배포 상태 조회 전 버튼 hide 처리
        $('#button-open-modal-wizard-storage-cluster').hide();
        $('#button-open-modal-wizard-storage-vm').hide();
        $('#button-open-modal-wizard-pfmp-vm').hide();
        $('#button-open-modal-wizard-cloud-vm').hide();
        $('#button-link-storage-center-dashboard').hide();
        $('#button-link-cloud-center').hide();
        $('#button-open-modal-wizard-monitoring-center').hide();
        $('#button-link-monitoring-center').hide();
        $('#button-config-file-download').hide();
        /*
        가상머신 배포 및 클러스터 구성 상태를 세션 스토리지에서 조회
        - 클러스터 구성준비 상태 = false, true
        - 스토리지센터 가상머신 상태 = HEALTH_ERR(배포x), RUNNING, SHUT OFF 등
        - 스토리지센터 가상머신 부트스트랩 실행 상태 = false, true
        - 스토리지센터 클러스터 상태 = HEALTH_ERR(구성x), HEALTH_OK, HEALTH_WARN 등
        - 클라우드센터 클러스터 상태 = HEALTH_ERR1(구성x), HEALTH_ERR2(리소스 구성x), HEALTH_OK
        - 클라우드센터 가상머신 상태 = HEALTH_ERR(배포x), RUNNING, SHUT OFF 등
        - 클라우드센터 가상머신 부트스트랩 실행 상태 = false, true
        */
        const os_type = sessionStorage.getItem("os_type");
        const step1 = sessionStorage.getItem("ccfg_status");
        const step2 = sessionStorage.getItem("scvm_status");
        const step3 = sessionStorage.getItem("scvm_bootstrap_status");
        const step4 = sessionStorage.getItem("sc_status");
        const step5 = sessionStorage.getItem("cc_status");
        const step6 = sessionStorage.getItem("ccvm_status");
        const step7 = sessionStorage.getItem("ccvm_bootstrap_status");
        const step8 = sessionStorage.getItem("wall_monitoring_status");

        // PowerFlex용 sessionStorage
        const step9 = sessionStorage.getItem("pfmp_status");
        const step10 = sessionStorage.getItem("pfmp_bootstrap_status");

        // 배포 상태조회
        if (os_type == "ABLESTACK-HCI"){
            console.log("step1 :: " + step1 + ", step2 :: " + step2 + " , step3 :: " + step3 + ", step4 :: " + step4 + ", step5 :: " + step5 + ", step6 :: " + step6 + ", step7 :: " + step7 + ", step8 :: " + step8);

            if(step1!="true"){
                // 클러스터 구성준비 버튼 show
                $('#button-open-modal-wizard-storage-cluster').show();
                showRibbon('warning','스토리지센터 및 클라우드센터 VM이 배포되지 않았습니다. 클러스터 구성준비를 진행하십시오.');
            }else{
                $('#button-config-file-download').show();
                if(step2=="HEALTH_ERR"||step2==null){
                    // 클러스터 구성준비 버튼, 스토리지센터 VM 배포 버튼 show
                    $('#button-open-modal-wizard-storage-cluster').show();
                    $('#button-open-modal-wizard-storage-vm').show();
                    showRibbon('warning','스토리지센터 및 클라우드센터 VM이 배포되지 않았습니다. 스토리지센터 VM 배포를 진행하십시오.');
                }else{
                    if(step3!="true"){
                        showRibbon('warning','스토리지센터 대시보드에 연결할 수 있도록 스토리지센터 VM Bootstrap 실행 작업을 진행하십시오.');
                    }else{
                        if(step8!="true" && step4=="Health Err"||step4==null){
                            // 스토리지센터 연결 버튼 show
                            $('#button-open-modal-wizard-cloud-vm').show();
                            $('#button-link-storage-center-dashboard').show();
                            showRibbon('warning','클라우드센터 VM이 배포되지 않았습니다. 스토리지센터에 연결하여 스토리지 클러스터 구성한 후 클라우드센터 VM 배포를 진행하십시오.');
                        }else{
                            if(step8!="true" && step5=="HEALTH_ERR1"||step5=="HEALTH_ERR2"||step5==null){
                                //클라우드센터 VM 배포 버튼, 스토리지센터 연결 버튼 show
                                $('#button-open-modal-wizard-cloud-vm').show();
                                $('#button-link-storage-center-dashboard').show();
                                if(step8!="true" && step5=="HEALTH_ERR1"||step5==null){
                                    showRibbon('warning','클라우드센터 클러스터가 구성되지 않았습니다. 클라우드센터 클러스터 구성을 진행하십시오.');
                                }else{
                                    showRibbon('warning','클라우드센터 클러스터는 구성되었으나 리소스 구성이 되지 않았습니다. 리소스 구성을 진행하십시오.');
                                }
                            }else{
                                if(step8!="true" && step6=="HEALTH_ERR"||step6==null){
                                    //클라우드센터 VM 배포 버튼, 스토리지센터 연결 버튼 show
                                    $('#button-open-modal-wizard-cloud-vm').show();
                                    $('#button-link-storage-center-dashboard').show();
                                    showRibbon('warning','클라우드센터 VM이 배포되지 않았습니다. 클라우드센터 VM 배포를 진행하십시오.');
                                }else{
                                    if(step8!="true" && step7!="true"){
                                        showRibbon('warning','클라우드센터에 연결할 수 있도록 클라우드센터 VM Bootstrap 실행 작업을 진행하십시오.');
                                    }else{
                                        // 스토리지센터 연결 버튼, 클라우드센터 연결 버튼 show, 모니터링센터 구성 버튼 show
                                        $('#button-link-storage-center-dashboard').show();
                                        $('#button-link-cloud-center').show();

                                        if(step8!="true"){
                                            $('#button-open-modal-wizard-monitoring-center').show();
                                            showRibbon('warning','모니터링센터에 연결할 수 있도록 모니터링센터 구성 작업을 진행하십시오.');
                                        }else{
                                            // 모니터링센터 구성 연결 버튼 show
                                            $('#button-link-monitoring-center').show();

                                            showRibbon('success','ABLESTACK 스토리지센터 및 클라우드센터 VM 배포되었으며 모니터링센터 구성이 완료되었습니다. 가상어플라이언스 상태가 정상입니다.');
                                            // 운영 상태조회
                                            let msg ="";
                                            if(step2!="RUNNING"){
                                                msg += '스토리지센터 가상머신이 '+step2+' 상태 입니다.\n';
                                                msg += '스토리지센터 가상머신이 shut off 상태일 경우 스토리지센터 가상머신 카드에서 스토리지센터 VM을 시작해주세요.\n';
                                                showRibbon('warning', msg);
                                            }
                                            if(step4!="HEALTH_OK"){
                                                msg += '스토리지센터 클러스터가 '+step4+' 상태 입니다.\n';
                                                msg += 'oout, nobackfill, norecover flag인 경우 의도하지 않은 유지보수 모드일 경우 스토리지센터 클러스터 상태 카드에서 유지보수 모드 해제해주세요.\n';
                                                msg += '스토리지센터 클러스터 상태가 Monitor clock detected 인 경우 cube host, scvm, ccvm의 ntp 시간 동기화 작업을 해야합니다.';
                                                showRibbon('warning', msg);
                                            }
                                            if(step6!="RUNNING"){
                                                msg += '클라우드센터 가상머신이 '+step6+' 상태 입니다.\n';
                                                msg += '클라우드센터 가상머신 Mold 서비스 , DB 상태를 확인하여 정지상태일 경우 서비스 재시작\n';
                                                msg += '또는 클라우드센터 클러스터 상태 카드에서 가상머신 시작하여 문제를 해결할 수 있습니다.';
                                                showRibbon('warning', msg);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }else if (os_type == "PowerFlex"){
            console.log("step1 :: " + step1 + ", step2 :: " + step2 + " , step3 :: " + step3 + ", step4 :: " + step4 + ", step5 :: " + step5 + ", step6 :: " + step6 + ", step7 :: " + step7 + ", step8 :: " + step8 + ", stpe9 :: " + step9 + ", step10 :: " + step10);
            if(step1!="true"){
                // 클러스터 구성준비 버튼 show
                $('#button-open-modal-wizard-storage-cluster').show();
                showRibbon('warning','스토리지센터 및 파워플렉스 관리 플랫폼 및 클라우드센터 VM이 배포되지 않았습니다. 클러스터 구성준비를 진행하십시오.');
            }else{
                $('#button-config-file-download').show();
                if(step2=="HEALTH_ERR"||step2==null){
                    // 클러스터 구성준비 버튼, 스토리지센터 VM 배포 버튼 show
                    $('#button-open-modal-wizard-storage-cluster').show();
                    $('#button-open-modal-wizard-storage-vm').show();
                    showRibbon('warning','스토리지센터 및 파워 플렉스 관리 플랫폼 및 클라우드센터 VM이 배포되지 않았습니다. 스토리지센터 VM 배포를 진행하십시오.');
                }else{
                    if(step3!="true"){
                        showRibbon('warning','스토리지센터의 설정을 위해 스토리지센터 VM Bootstrap 실행 작업을 진행하십시오.');
                    }else{
                        //여기서 들어가야지 pfmp에 대한
                        if(step8!="true" && ((step9=="HEALTH_ERR"||step9=="null") && step10 == "false")){
                            $('#button-open-modal-wizard-pfmp-vm').show();
                            showRibbon('warning','파워플렉스 관리 플랫폼 VM이 배포되지 않았습니다. 파워플렉스 관리 플랫폼 VM 배포를 진행하십시오.');
                            if(step10 == "true"){
                                if(step8!="true" && (step5=="HEALTH_ERR1"||step5=="HEALTH_ERR2"||step5==null)){
                                    //클라우드센터 VM 배포 버튼, 스토리지센터 연결 버튼 show
                                    $('#button-open-modal-wizard-cloud-vm').show();
                                    $('#button-link-storage-center-dashboard').show();
                                    if(step8!="true" && step5=="HEALTH_ERR1"||step5==null){
                                        showRibbon('warning','클라우드센터 클러스터가 구성되지 않았습니다. 클라우드센터 클러스터 구성을 진행하십시오.');
                                    }else{
                                        showRibbon('warning','클라우드센터 클러스터는 구성되었으나 리소스 구성이 되지 않았습니다. 리소스 구성을 진행하십시오.');
                                    }
                                }else{
                                    if(step8!="true" && (step6=="HEALTH_ERR"||step6==null)){
                                        //클라우드센터 VM 배포 버튼, 스토리지센터 연결 버튼 show
                                        $('#button-open-modal-wizard-cloud-vm').show();
                                        $('#button-link-storage-center-dashboard').show();
                                        showRibbon('warning','클라우드센터 VM이 배포되지 않았습니다. 클라우드센터 VM 배포를 진행하십시오.');
                                    }else{
                                        if(step8!="true" && step7!="true"){
                                            showRibbon('warning','클라우드센터에 연결할 수 있도록 클라우드센터 VM Bootstrap 실행 작업을 진행하십시오.');
                                        }else{
                                            // 스토리지센터 연결 버튼, 클라우드센터 연결 버튼 show, 모니터링센터 구성 버튼 show
                                            $('#button-link-storage-center-dashboard').show();
                                            $('#button-link-cloud-center').show();

                                            if(step8!="true"){
                                                $('#button-open-modal-wizard-monitoring-center').show();
                                                showRibbon('warning','모니터링센터에 연결할 수 있도록 모니터링센터 구성 작업을 진행하십시오.');
                                            }else{
                                                // 모니터링센터 구성 연결 버튼 show
                                                $('#button-link-monitoring-center').show();

                                                showRibbon('success','ABLESTACK 스토리지센터 및 클라우드센터 VM 배포되었으며 모니터링센터 구성이 완료되었습니다. 가상어플라이언스 상태가 정상입니다.');
                                                // 운영 상태조회
                                                let msg ="";
                                                if(step2!="RUNNING"){
                                                    msg += '스토리지센터 가상머신이 '+step2+' 상태 입니다.\n';
                                                    msg += '스토리지센터 가상머신이 shut off 상태일 경우 스토리지센터 가상머신 카드에서 스토리지센터 VM을 시작해주세요.\n';
                                                    showRibbon('warning', msg);
                                                }
                                                if(step4!="HEALTH_OK"){
                                                    msg += '스토리지센터 클러스터가 '+step4+' 상태 입니다.\n';
                                                    msg += 'oout, nobackfill, norecover flag인 경우 의도하지 않은 유지보수 모드일 경우 스토리지센터 클러스터 상태 카드에서 유지보수 모드 해제해주세요.\n';
                                                    msg += '스토리지센터 클러스터 상태가 Monitor clock detected 인 경우 cube host, scvm, ccvm의 ntp 시간 동기화 작업을 해야합니다.';
                                                    showRibbon('warning', msg);
                                                }
                                                if(step6!="RUNNING"){
                                                    msg += '클라우드센터 가상머신이 '+step6+' 상태 입니다.\n';
                                                    msg += '클라우드센터 가상머신 Mold 서비스 , DB 상태를 확인하여 정지상태일 경우 서비스 재시작\n';
                                                    msg += '또는 클라우드센터 클러스터 상태 카드에서 가상머신 시작하여 문제를 해결할 수 있습니다.';
                                                    showRibbon('warning', msg);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }else{
                            if(step10!="true"){
                                $('#menu-item-pfmp-install').removeClass('pf-m-disabled');
                                showRibbon('warning','파워플렉스 관리 플랫폼의 쿠버네티스 설정을 위해 파워플렉스 관리 플랫폼 VM Bootstrap 실행 작업을 진행하십시오.');
                            }else{
                                if(step8!="true" && (step5=="HEALTH_ERR1"||step5=="HEALTH_ERR2"||step5==null)){
                                    //클라우드센터 VM 배포 버튼
                                    $('#button-open-modal-wizard-cloud-vm').show();
                                    $('#button-link-storage-center-dashboard').show();
                                    if(step8!="true" && (step5=="HEALTH_ERR1"||step5==null)){
                                        showRibbon('warning','클라우드센터 클러스터가 구성되지 않았습니다. 클라우드센터 클러스터 구성을 진행하십시오.');
                                    }else{
                                        showRibbon('warning','클라우드센터 클러스터는 구성되었으나 리소스 구성이 되지 않았습니다. 리소스 구성을 진행하십시오.');
                                    }
                                }else{
                                    if(step8!="true" && (step6=="HEALTH_ERR"||step6==null)){
                                        //클라우드센터 VM 배포 버튼, 스토리지센터 연결 버튼 show
                                        $('#button-open-modal-wizard-cloud-vm').show();
                                        $('#button-link-storage-center-dashboard').show();
                                        showRibbon('warning','클라우드센터 VM이 배포되지 않았습니다. 클라우드센터 VM 배포를 진행하십시오.');
                                    }else{
                                        if(step8!="true" && step7!="true"){
                                            showRibbon('warning','클라우드센터에 연결할 수 있도록 클라우드센터 VM Bootstrap 실행 작업을 진행하십시오.');
                                        }else{
                                            // 스토리지센터 연결 버튼, 클라우드센터 연결 버튼 show, 모니터링센터 구성 버튼 show
                                            $('#button-link-storage-center-dashboard').show();
                                            $('#button-link-cloud-center').show();

                                            if(step8!="true"){
                                                $('#button-open-modal-wizard-monitoring-center').show();
                                                showRibbon('warning','모니터링센터에 연결할 수 있도록 모니터링센터 구성 작업을 진행하십시오.');
                                            }else{
                                                // 모니터링센터 구성 연결 버튼 show
                                                $('#button-link-monitoring-center').show();

                                                showRibbon('success','ABLESTACK 스토리지센터 및 클라우드센터 VM 배포되었으며 모니터링센터 구성이 완료되었습니다. 가상어플라이언스 상태가 정상입니다.');
                                                // 운영 상태조회
                                                let msg ="";
                                                if(step2!="RUNNING"){
                                                    msg += '스토리지센터 가상머신이 '+step2+' 상태 입니다.\n';
                                                    msg += '스토리지센터 가상머신이 shut off 상태일 경우 스토리지센터 가상머신 카드에서 스토리지센터 VM을 시작해주세요.\n';
                                                    showRibbon('warning', msg);
                                                }
                                                if(step4!="HEALTH_OK"){
                                                    msg += '스토리지센터 클러스터가 '+step4+' 상태 입니다.\n';
                                                    msg += 'oout, nobackfill, norecover flag인 경우 의도하지 않은 유지보수 모드일 경우 스토리지센터 클러스터 상태 카드에서 유지보수 모드 해제해주세요.\n';
                                                    msg += '스토리지센터 클러스터 상태가 Monitor clock detected 인 경우 cube host, scvm, ccvm의 ntp 시간 동기화 작업을 해야합니다.';
                                                    showRibbon('warning', msg);
                                                }
                                                if(step6!="RUNNING"){
                                                    msg += '클라우드센터 가상머신이 '+step6+' 상태 입니다.\n';
                                                    msg += '클라우드센터 가상머신 Mold 서비스 , DB 상태를 확인하여 정지상태일 경우 서비스 재시작\n';
                                                    msg += '또는 클라우드센터 클러스터 상태 카드에서 가상머신 시작하여 문제를 해결할 수 있습니다.';
                                                    showRibbon('warning', msg);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }else if (os_type == "general-virtualization"){
            console.log("step1 :: " + step1 + ", step5 :: " + step5 + ", step6 :: " + step6 + ", step7 :: " + step7 + ", step8 :: " + step8);

            if (step1 != "true"){
                $('#button-open-modal-wizard-storage-cluster').show();
                showRibbon('warning','클라우드센터 VM이 배포되지 않았습니다. 클러스터 구성준비를 진행하십시오.');
            }else{
                $('#button-config-file-download').show();
                if(step8!="true" && step5=="HEALTH_ERR1"||step5=="HEALTH_ERR2"||step5==null){
                    //클라우드센터 VM 배포 버튼
                    $('#button-open-modal-wizard-storage-cluster').show();
                    $('#button-open-modal-wizard-cloud-vm').show();
                    if(step8!="true" && step5=="HEALTH_ERR1"||step5==null){
                        showRibbon('warning','클라우드센터 클러스터가 구성되지 않았습니다. 클라우드센터 클러스터 구성을 진행하십시오.');
                    }else{
                        showRibbon('warning','클라우드센터 클러스터는 구성되었으나 리소스 구성이 되지 않았습니다. 리소스 구성을 진행하십시오.');
                    }
                }else{
                    if(step8!="true" && (step7!="true" && (step6=="HEALTH_ERR"||step6==null))){
                        //클라우드센터 VM 배포 버튼
                        $('#button-open-modal-wizard-cloud-vm').show();
                        showRibbon('warning','클라우드센터 VM이 배포되지 않았습니다. 클라우드센터 VM 배포를 진행하십시오.');
                    }else{
                        if(step8!="true" && step7!="true"){
                            showRibbon('warning','클라우드센터에 연결할 수 있도록 클라우드센터 VM Bootstrap 실행 작업을 진행하십시오.');
                        }else{
                            // 스토리지센터 연결 버튼, 클라우드센터 연결 버튼 show, 모니터링센터 구성 버튼 show
                            $('#button-link-cloud-center').show();

                            if(step8!="true"){
                                $('#button-open-modal-wizard-monitoring-center').show();
                                showRibbon('warning','모니터링센터에 연결할 수 있도록 모니터링센터 구성 작업을 진행하십시오.');
                            }else{
                                // 모니터링센터 구성 연결 버튼 show
                                $('#button-link-monitoring-center').show();

                                showRibbon('success','ABLESTACK 클라우드센터 VM 배포되었으며 모니터링센터 구성이 완료되었습니다. 가상어플라이언스 상태가 정상입니다.');
                                // 운영 상태조회
                                let msg ="";
                                if (step6 != null){
                                    if(step6!="RUNNING"){
                                        msg += '클라우드센터 가상머신이 '+step6+' 상태 입니다.\n';
                                        msg += '클라우드센터 가상머신 Mold 서비스 , DB 상태를 확인하여 정지상태일 경우 서비스 재시작\n';
                                        msg += '또는 클라우드센터 클러스터 상태 카드에서 가상머신 시작하여 문제를 해결할 수 있습니다.';
                                        showRibbon('warning', msg);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }else{
            $('#button-open-modal-wizard-storage-cluster').show();
            showRibbon('warning','스토리지센터 및 클라우드센터 VM이 배포되지 않았습니다. 클러스터 구성준비를 진행하십시오.');
        }
    },200);


}

/**
 * Meathod Name : showRibbon
 * Date Created : 2021.03.23
 * Writer  : 박다정
 * Description : 배포 및 운영 상태에 따른 요약리본 알림메세지 및 class 속성 변경
 * Parameter : (String) status, (String) description
 * Return  : 없음
 * History  : 2021.03.23 최초 작성
 */
function showRibbon(status, description) {
    $('#ribbon').attr('class','pf-c-alert pf-m-'+status)
    if(status =='success'){
        $('#main-ribbon').text('Success alert:');
    }
    let alert_text = $('#main-ribbon-description').text(description);
    alert_text.html(alert_text.html().replace(/\n/g, '<br/>'));
}

/**
 * Meathod Name : saveHostInfo
 * Date Created : 2021.04.01
 * Writer  : 박다정
 * Description : 호스트 파일 정보를 세션스토리지에 저장
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.04.01 최초 작성
 */
function saveHostInfo(){
    //createLoggerInfo("saveHostInfo() start");
    cockpit.spawn(['cat', '/etc/hosts'])
    .then(function(data){
        var line = data.split("\n");
        for(var i=0; i<line.length; i++){
            var word = line[i].split("\t");
            if(word.length>1){
                sessionStorage.setItem(word[1], word[0]);
            }
        }
    })
    .catch(function(error){
        createLoggerInfo("Hosts file is not configured error");
        console.log("Hosts file is not configured :"+error);
    });
}



/**
 * Meathod Name : scanHostKey
 * Date Created : 2021.04.14
 * Writer  : 박다정
 * Description : 호스트 키 스캔
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.04.14 최초 작성
 */
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
 * Meathod Name : pcsExeHost
 * Date Created : 2022.09.14
 * Writer  : 배태주
 * Description : pcs 클러스터 명령이 가능한 호스트의 정보를 세팅하는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2022.09.14 최초 작성
 */
 function pcsExeHost(){
    cockpit.spawn(['python3', pluginpath + '/python/pcs/pcsExehost.py'])
    .then(function (data) {
        let retVal = JSON.parse(data);
        pcs_exe_host = retVal.val;
    })
    .catch(function (err) {
        createLoggerInfo("pcsExeHost err");
        console.log("pcsExeHost err : " + err);
    });
}

/**
 * Meathod Name : resetBootstrap
 * Date Created : 2021.04.14
 * Writer  : 박다정
 * Description : 클러스터 구성 전인 경우 bootstrap 관련 프로퍼티 초기화
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.04.14 최초 작성
 */
 function resetBootstrap(){
    createLoggerInfo("resetBootstrap() start");
    //scvm bootstrap 프로퍼티 초기화
    cockpit.spawn(["python3", pluginpath+"/python/ablestack_json/ablestackJson.py", "update", "--depth1", "bootstrap", "--depth2", "scvm", "--value", "false"])
    .then(function(data){
        createLoggerInfo("resetBootstrap scvm ok");
        console.log("resetBootstrap scvm ok");
    })
    .catch(function(err){
        createLoggerInfo("resetBootstrap scvm err");
        console.log("resetBootstrap scvm err : " + err);
    });
    //ccvm bootstrap 프로퍼티 초기화
    cockpit.spawn(["python3", pluginpath+"/python/ablestack_json/ablestackJson.py", "update", "--depth1", "bootstrap", "--depth2", "ccvm", "--value", "false"])
    .then(function(data){
        createLoggerInfo("resetBootstrap ccvm ok");
        console.log("resetBootstrap ccvm ok");
    })
    .catch(function(err){
        createLoggerInfo("resetBootstrap ccvm err");
        console.log("resetBootstrap ccvm err : " + err);
    });
    //wall monitoring 프로퍼티 초기화
    cockpit.spawn(["python3", pluginpath+"/python/ablestack_json/ablestackJson.py", "update", "--depth1", "monitoring", "--depth2", "wall", "--value", "false"])
    .then(function(data){
        createLoggerInfo("resetBootstrap wall ok");
        console.log("resetBootstrap wall ok");
    })
    .catch(function(err){
        createLoggerInfo("resetBootstrap wall err");
        console.log("resetBootstrap wall err : " + err);
    });
}

function ribbonWorker() {
    if (os_type == "general-virtualization"){
        Promise.all([
            pcsExeHost(),
            checkConfigStatus(),
            CardCloudClusterStatus(),
            gfsDiskStatus(),
            gfsResourceStatus(),
            new CloudCenterVirtualMachine().checkCCVM()
        ])
            .then(function () {
                scanHostKey();
            })
            .finally(function () {
                checkDeployStatus();
            });
    }else{
        Promise.all([pcsExeHost(), checkConfigStatus(), checkStorageClusterStatus(),
            checkStorageVmStatus(), CardCloudClusterStatus(), new CloudCenterVirtualMachine().checkCCVM()]).then(function(){
                scanHostKey();
                checkDeployStatus();
        });
    }
}

/**
 * Meathod Name : readFile
 * Date Created : 2021.10.21
 * Writer  : 류홍욱
 * Description : DB Dump 파일을 로컬 저장소에 저장하고 다운로드 링크를 생성하는 함수
 * Parameter : file_path
 * Return  : 없음
 * History  : 2021.10.26 수정
 */
 async function readFile(file_path) {
    // 파일명에 날짜 출력을 위한 코드
    let today = new Date();
    let year = today.getFullYear();
    let month = ('0' + (today.getMonth() + 1)).slice(-2);
    let day = ('0' + today.getDate()).slice(-2);
    let date_string = year+month+day;
    let hours = ('0' + today.getHours()).slice(-2);
    let minutes = ('0' + today.getMinutes()).slice(-2);
    let seconds = ('0' + today.getSeconds()).slice(-2);
    let time_string = hours+ minutes+seconds;

    // ccvm에서 mysqldump 파일을 생성하는 파이썬 파일 실행
    let result="";
    await cockpit.spawn(['/usr/bin/python3', pluginpath+'/python/vm/dump_ccvm.py'])
    .then(function(data){
        let retVal = JSON.parse(data);
        if (retVal.code == 200) {
            createLoggerInfo("Creation of mysqldump of ccvm is completed");
            console.log("Creation of mysqldump of ccvm is completed");
            result="200";
        }else {
            $('#div-db-backup').show();
            $('#div-db-backup').text("클라우드센터 가상머신의 데이터베이스 백업이 실패하었습니다.");
            $('#dbdump-prepare-status').html("")
            $('#div-modal-wizard-cluster-config-finish-db-dump-file-download').hide()
            $('#button-execution-modal-cloud-vm-db-dump').show();
            $('#button-cancel-modal-cloud-vm-db-dump').show();
            $('#button-close-modal-cloud-vm-db-dump').show();
            createLoggerInfo("Creation of mysqldump of ccvm is failed");
            console.log("Creation of mysqldump of ccvm is failed");
            result="500";
        }
    }).catch(function(data){
        $('#div-db-backup').show();
        $('#div-db-backup').text("클라우드센터 가상머신의 데이터베이스 백업이 실패하었습니다.");
        $('#dbdump-prepare-status').html("")
        $('#div-modal-wizard-cluster-config-finish-db-dump-file-download').hide()
        $('#button-execution-modal-cloud-vm-db-dump').show();
        $('#button-cancel-modal-cloud-vm-db-dump').show();
        $('#button-close-modal-cloud-vm-db-dump').show();
        createLoggerInfo("Creation of mysqldump of ccvm is failed");
        console.log("Creation of mysqldump of ccvm is failed");
        result="500";
    });

    // 파이썬 파일 실행 결과에 따라 다운로드 링크 생성
    if (result == "200") {
        await cockpit.file(file_path).read()
        .done(function (tag) {
            $('#span-modal-wizard-cluster-config-finish-db-dump-file-download').attr({
                target: '_blank',
                href: 'data:Application/octet-stream;application/x-xz;attachment;/,' + encodeURIComponent(tag),
                download: "dump_ccvm_cloud_" +date_string+time_string+ ".sql"
            });
            $('#div-db-backup').show();
            $('#div-db-backup').text("클라우드센터 가상머신의 데이터베이스 백업이 완료되었습니다.");
            $('#dbdump-prepare-status').html("")
            $('#div-modal-wizard-cluster-config-finish-db-dump-file-download').show()
            $('#button-execution-modal-cloud-vm-db-dump').show();
            $('#button-cancel-modal-cloud-vm-db-dump').show();
            $('#button-close-modal-cloud-vm-db-dump').show();
            createLoggerInfo("Creation of download link of ccvm_mysqldump is completed");
            console.log("Creation of download link of ccvm_mysqldump is completed");
        }).catch(function(tag){
            $('#div-db-backup').show();
            $('#div-db-backup').text("클라우드센터 가상머신의 데이터베이스 백업이 실패하었습니다.");
            $('#dbdump-prepare-status').html("")
            $('#div-modal-wizard-cluster-config-finish-db-dump-file-download').hide()
            $('#button-execution-modal-cloud-vm-db-dump').show();
            $('#button-cancel-modal-cloud-vm-db-dump').show();
            $('#button-close-modal-cloud-vm-db-dump').show();
            createLoggerInfo("Creation download link of ccvm_mysqldump is failed");
            console.log("Creation download link of ccvm_mysqldump is failed");
        });
        cockpit.file().close()
    }
}

/**
 * Meathod Name : setPfmpStatus
 * Date Created : 2024.09.19
 * Writer  : 정민철
 * Description : 파워플렉스 관리 플랫폼 가상머신 상태 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.09.19 최초 작성
 */
function setPfmpStatus() {
    cockpit.spawn(['python3',pluginpath + '/python/pfmp/pfmp_status_detail.py', 'detail'])
    .then(function(data) {
        var retVal = JSON.parse(data);
        pfmp_status_result = retVal.val.pfmp_status;
        sessionStorage.setItem('pfmp_status', pfmp_status_result);
    });
}
/**
 * Meathod Name : updateSpinnerPercentage
 * Date Created : 2024.10.25
 * Writer  : 정민철
 * Description : 파워플렉스 관리 플랫폼 설치 퍼센트 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.09.19 최초 작성
 */
function updateSpinnerPercentage(percentage) {
    document.getElementById('spinner-percentage').innerText = percentage + '%';
}
/**
 * Meathod Name : updatePfmpInstall
 * Date Created : 2024.10.25
 * Writer  : 정민철
 * Description : 파워플렉스 관리 플랫폼 설치 퍼센트 조회
 * Parameter : time_value, unit
 * Return  : 없음
 * History  : 2024.09.19 최초 작성
 */
function updatePfmpInstall(time_value, unit) {
    let currentPercentage = 0;
    let intervalTime;

    if (interval) {
        clearInterval(interval);
    }

    document.getElementById('spinner-percentage').innerText = '0%';

    // 단위를 초 단위로 변환
    if (unit === "minute") {
        intervalTime = (time_value * 60 * 1000) / 100; // 분 -> 밀리초로 변환 후 1%당 시간 계산
    } else if (unit === "second") {
        intervalTime = (time_value * 1000) / 100; // 초 -> 밀리초로 변환 후 1%당 시간 계산
    }

    // 퍼센트 업데이트 실행
    interval = setInterval(() => {
        if (currentPercentage <= 100) {
            updateSpinnerPercentage(currentPercentage);
            currentPercentage += 1; // 1%씩 증가
        } else {
            clearInterval(interval); // 100%가 되면 타이머 종료
        }
    }, intervalTime);
}
/**
 * Meathod Name : screenConversion
 * Date Created : 2024.09.19
 * Writer  : 정민철
 * Description : 일반 가상화에 대한 화면 처리
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.09.19 최초 작성
 */
function screenConversion(){
    if (os_type == "general-virtualization"){
        $('#div-card-gfs-cluster-status').show();
        $('#div-card-storage-cluster-status').hide();
        $('#div-card-storage-vm-status').hide();
        $('#div-card-gfs-disk-status').show();
        $('#gfs-maintenance-update').show();
        $('#gfs-qdevice-init').show();
    }
}

/**
 * Meathod Name : gfs_maintenance_run
 * Date Created : 2024.12.09
 * Writer  : 정민철
 * Description : GFS 유지보수 일 경우 Stonith Disable or Enable 설정
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.12.09 최초 작성
 */
function gfs_maintenance_run(){
    var stonith_status = sessionStorage.getItem("stonith_status");
    if (stonith_status == "Started"){
        $('#gfs-maintenance-setting-head').text("펜스 장치 유지보수 설정");
        $('#gfs-maintenance-setting-body').text("펜스 장치 유지보수를 설정하시겠습니까?");
        $('#div-modal-gfs-maintenance-setting').show();
    }else{
        $('#gfs-maintenance-setting-head').text("펜스 장치 유지보수 해제");
        $('#gfs-maintenance-setting-body').text("펜스 장치 유지보수를 해제하시겠습니까?");
        $('#div-modal-gfs-maintenance-setting').show();
    }
}

function gfsDiskStatus(){
    return new Promise((resolve) => {
        $('#gfs-disk-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
        $("#gfs-disk-css").attr('class','pf-c-label pf-m-orange');
        $("#gfs-disk-icon").attr('class','fas fa-fw fa-exclamation-triangle');

        cockpit.spawn(['python3', pluginpath + '/python/gfs/gfs_disk_status.py'])
        .then(function(data) {
            var retVal = JSON.parse(data);

            if (retVal.code == "200"){
                // Clear previous data
                if (retVal.val.mode == "multi"){
                    $('#page-gfs-disk-mode').text("다중 모드");
                }else{
                    $('#page-gfs-disk-mode').text("단일 모드");
                }
                $('#page-gfs-disk-mount-info').html("");
                $('#gfs-disk-deploy-status-check').text("GFS 디스크가 생성되었습니다.");
                $('#gfs-disk-deploy-status-check').attr("style","color: var(--pf-global--success-color--100)");
                $('#gfs-disk-status').text("Health OK");
                $('#gfs-disk-icon').attr('class','fas fa-fw fa-check-circle');
                $('#gfs-disk-css').attr('class','pf-c-label pf-m-green');

                for(var i=0; i < retVal.val.blockdevices.length; i++){
                    var blockDevice = retVal.val.blockdevices[i];
                    var mountPoint = blockDevice.mountpoint;
                    var multipaths = blockDevice.multipaths.join(", ");
                    var devices = blockDevice.devices.join(", ");
                    var physicalVolume = blockDevice.lvm; // Assuming `lvm` is the physical volume
                    var volumeGroup = blockDevice.lvm.split('-')[0]; // Assuming `lvm` contains volume group info
                    var diskSize = blockDevice.size;
                    if (i%3 == 0 ){
                        margin = "margin: 6px 0px;margin-right: 10px"
                    }else{
                        margin = "margin: 6px 10px"
                    }
                    // Create a clickable link for the mount point
                    var linkHTML = `<a id=page-mount-path-${i} href="javascript:void(0);" class="gfs-mount-link pf-c-button pf-m-link"
                    style="display: inline-flex; align-items: center; padding: 8px 16px;
                    border: 1px solid; border-radius: 4px;
                    text-decoration: none; font-weight: bold; ${margin};
                    transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
                    data-mountpoint="${mountPoint}"
                    data-multipaths="${multipaths}"
                    data-devices="${devices}"
                    data-physicalvolume="${physicalVolume}"
                    data-volumegroup="${volumeGroup}"
                    data-disksize="${diskSize}">
                    ${mountPoint}
                </a>`;

                    if ((i + 1) % 3 == 0) {
                        linkHTML += "<br>";
                    }

                    // Append the link to the container
                    $('#page-gfs-disk-mount-info').append(linkHTML);
                }
                $('#menu-item-set-gfs-clvm-disk-add').removeClass('pf-m-disabled');
                $('#menu-item-set-gfs-clvm-disk-delete').removeClass('pf-m-disabled');
                $('#menu-item-set-gfs-clvm-disk-info').removeClass('pf-m-disabled');
                $('#menu-item-set-gfs-disk-add').removeClass('pf-m-disabled');
                $('#menu-item-set-gfs-disk-delete').removeClass('pf-m-disabled');
                // Add click event to show detailed information in a modal
                $('.gfs-mount-link').on('click', function() {
                    var mountPoint = $(this).data('mountpoint');
                    var multipaths = $(this).data('multipaths');
                    var devices = $(this).data('devices');
                    var physicalVolume = $(this).data('physicalvolume');
                    var volumeGroup = $(this).data('volumegroup');
                    var diskSize = $(this).data('disksize');

                    // Update modal content
                    updateModalContent(mountPoint, multipaths, devices, physicalVolume, volumeGroup, diskSize);

                    // Show the modal
                    $('#div-modal-gfs-disk-info').show();
                });

            } else {
                $('#gfs-disk-deploy-status-check').text("GFS 디스크가 생성되지 않았습니다.");
                $('#gfs-disk-deploy-status-check').attr("style","color: var(--pf-global--danger-color--100)");
                $('#page-gfs-disk-mount-info').html("");
                $('#page-gfs-disk-mount-info').text("N/A");
                $('#page-gfs-disk-mode').text("N/A");
            }

            resolve();
        });
    });
}

function updateModalContent(mountPoint, multipaths, devices, physicalVolume, volumeGroup, diskSize) {
    // Populate the modal with relevant information
    $('#gfs-disk-mount-info').text(mountPoint);
    $('#gfs-disk-physical-volume').text(devices + " ( " + multipaths + " ) ");
    $('#gfs-disk-volume-group').text(physicalVolume);
    $('#gfs-disk-size').text(diskSize);
    $('#gfs-disk-status').text("Health OK"); // You can customize based on the actual status
    // You can adjust status class based on the state (e.g., if there's an error, change color)
    $('#gfs-disk-css').removeClass('pf-m-red').addClass('pf-m-green'); // Adjust based on your logic
    $('#gfs-disk-icon').removeClass('fa-exclamation-triangle').addClass('fa-check-circle'); // Adjust based on status\

    $('#gfs-disk-text').text('N/A');
    for (var i = 0; i < gfs_file_system_arr.length; i++){

        if (gfs_file_system_arr[i][0] == mountPoint.split("/")[2]){

            var offline_filteredIPs = gfs_file_system_arr
                                .filter(item => item[2] === "offline")
                                .map(item => item[1])
                                .join(', ');
            var start_filteredIPs = gfs_file_system_arr
                                .filter(item => item[0] === mountPoint.split("/")[2] && item[2] === "start")
                                .map(item => item[1])
                                .join(', ');
            var stop_filteredIPs = gfs_file_system_arr
                                .filter(item => item[0] === mountPoint.split("/")[2] && item[2].includes("stop"))
                                .map(item => item[1])
                                .join(', ');

            if (offline_filteredIPs) {
                if (start_filteredIPs && !stop_filteredIPs){
                    $('#gfs-disk-text').html('Started ( ' + start_filteredIPs + ' )</br>' + 'Offline ( ' + offline_filteredIPs + ' )');
                }else if (!start_filteredIPs && stop_filteredIPs){
                    $('#gfs-disk-text').html('Stopped ( ' + stop_filteredIPs + ' )</br>' + 'Offline ( ' + offline_filteredIPs + ' )');
                }else{
                    $('#gfs-disk-text').html('Started ( ' + start_filteredIPs + ' )</br>' + 'Offline ( ' + offline_filteredIPs + ' )');
                }
            }else{
                if (start_filteredIPs && !stop_filteredIPs){
                    $('#gfs-disk-text').text('Started ( ' + start_filteredIPs + ' )');
                }else if (!start_filteredIPs && stop_filteredIPs){
                    $('#gfs-disk-text').text('Stop ( ' + stop_filteredIPs + ' )');
                }else{
                    $('#gfs-disk-text').html('Started ( ' + start_filteredIPs + ' )</br> Stopped ( ' + stop_filteredIPs + ' )');
                }
            }
        }
    }
}
// Close button in the modal
$('#button-close-modal-gfs-disk-info').on('click', function() {
    $('#div-modal-gfs-disk-info').hide();;
});

// Cancel button in the modal (optional, depending on your design)
$('#button-cancel-modal-gfs-disk-info').on('click', function() {
    $('#div-modal-gfs-disk-info').hide();;
});

/**
 * Meathod Name : setDiskAction
 * Date Created : 2025.01.09
 * Writer  : 정민철
 * Description : CLVM 디스크 추가 및 GFS 디스크 추가
 * Parameter : 없음
 * Return  : 없음
 * History  : 2025.01.07 최초 작성
 */
function setDiskAction(type, action){
    if (type == "clvm" && action == "add"){
        var cmd = ["python3", pluginpath + "/python/disk/disk_action.py", "gfs-list"];

        cockpit.spawn(cmd).then(function(data) {
            // 초기화
            $('#clvm-disk-add-list').empty();

            var el = '';
            var multipathElements = ''; // MultiPath 정보를 저장할 변수
            var result = JSON.parse(data);
            var clvm_list = result.val.blockdevices;

            // MultiPath 중복 제거용 세트
            var displayedMultipaths = new Set();
            var displayedName = new Set();

            if (clvm_list.length > 0) {
                for (var i = 0; i < clvm_list.length; i++) {
                    var partition_text = '';
                    var check_disable = '';

                    if (clvm_list[i].children != undefined) {
                        for (var j = 0; j < clvm_list[i].children.length; j++) {
                            if (!clvm_list[i].wwn) {
                                clvm_list[i].wwn = ""; // 값을 공백으로 설정
                            }
                            var mpathName = clvm_list[i].children[j].name;
                            if (clvm_list[i].children[j].name.includes('mpath')) {
                                if (clvm_list[i].children[j].children != undefined) {
                                    partition_text = '( Partition exists count : ' + clvm_list[i].children[j].children.length + ' )';
                                    check_disable = 'disabled';
                                }
                                // MultiPath가 이미 표시된 경우 스킵
                                if (!displayedMultipaths.has(mpathName)) {
                                    var mpathHtml = '';
                                    mpathHtml += '<div class="pf-c-check">';
                                    mpathHtml += '<input class="pf-c-check__input" type="checkbox" id="form-clvm-checkbox-disk-add' + i + '" name="form-clvm-checkbox-disk-add" value="' + clvm_list[i].children[j].path + '" ' + check_disable + ' />';
                                    // mpathHtml += '<input class="pf-c-check__input" type="checkbox" id="form-clvm-checkbox-disk-add' + i + '" name="form-clvm-checkbox-disk-add" value="' + clvm_list[i].children[j].path + '" />';
                                    mpathHtml += '<label class="pf-c-check__label" style="margin-top:5px" for="form-clvm-checkbox-disk-add' + i + '">' + clvm_list[i].children[j].path + ' ' + clvm_list[i].children[j].state + ' (' + clvm_list[i].children[j].type + ') ' + clvm_list[i].children[j].size + ' ' + ' ' + clvm_list[i].vendor + ' ' + clvm_list[i].wwn  + ' ' + partition_text + '</label>';
                                    mpathHtml += '</div>';

                                    multipathElements += mpathHtml; // MultiPath 요소를 multipathElements에 저장

                                    displayedMultipaths.add(mpathName);  // MultiPath 이름을 Set에 추가
                                }
                            } else {
                                partition_text = '( Partition exists count : ' + clvm_list[i].children.length + ' )';
                                check_disable = 'disabled';

                                var disk_name = clvm_list[i].name;
                                if (!displayedName.has(disk_name)) {
                                    el += '<div class="pf-c-check">';
                                    el += '<input class="pf-c-check__input" type="checkbox" id="form-clvm-checkbox-disk-add' + i + '" name="form-clvm-checkbox-disk-add" value="' + clvm_list[i].path + '" ' + check_disable + ' />';
                                    // el += '<input class="pf-c-check__input" type="checkbox" id="form-clvm-checkbox-disk-add' + i + '" name="form-clvm-checkbox-disk-add" value="' + clvm_list[i].path + '" />';
                                    el += '<label class="pf-c-check__label" style="margin-top:5px" for="form-clvm-checkbox-disk-add' + i + '">' + clvm_list[i].path + ' ' + clvm_list[i].state + ' (' + clvm_list[i].tran + ') ' + clvm_list[i].size + ' ' + clvm_list[i].model + ' ' + clvm_list[i].wwn + partition_text + '</label>';
                                    el += '</div>';

                                    displayedName.add(disk_name);
                                }
                            }
                        }
                    } else {
                        if (!clvm_list[i].wwn) {
                            clvm_list[i].wwn = ""; // 값을 공백으로 설정
                        }
                        el += '<div class="pf-c-check">';
                        el += '<input class="pf-c-check__input" type="checkbox" id="form-clvm-checkbox-disk-add' + i + '" name="form-clvm-checkbox-disk-add" value="' + clvm_list[i].path + '" ' + check_disable + ' />';
                        // el += '<input class="pf-c-check__input" type="checkbox" id="form-clvm-checkbox-disk-add' + i + '" name="form-clvm-checkbox-disk-add" value="' + clvm_list[i].path + '" />';
                        el += '<label class="pf-c-check__label" style="margin-top:5px" for="form-clvm-checkbox-disk-add' + i + '">' + clvm_list[i].path + ' ' + clvm_list[i].state + ' (' + clvm_list[i].tran + ') ' + clvm_list[i].size + ' ' + clvm_list[i].model + ' ' + clvm_list[i].wwn + partition_text + '</label>';
                        el += '</div>';
                    }
                }
            } else {
                el += '<div class="pf-c-check">';
                el += '<label class="pf-c-check__label" style="margin-top:5px">데이터가 존재하지 않습니다.</label>';
                el += '</div>';
            }

            // 일반 장치 정보를 먼저 추가하고, 마지막에 MultiPath 정보를 추가
            $('#clvm-disk-add-list').append(multipathElements + el);

        }).catch(function() {
            createLoggerInfo("setDiskAction error");
        });
    }else if (type == "clvm" && action == "delete"){
        var cmd = ["python3", pluginpath + "/python/clvm/disk_manage.py", "--list-clvm"];

        cockpit.spawn(cmd).then(function(data) {
            // 초기화
            $('#clvm-disk-delete-list').empty();

            // JSON 데이터 파싱
            var result = JSON.parse(data);

            // 결과 리스트 가져오기
            var clvmList = result.val;

            var output = ''; // 최종 출력 문자열

            if (clvmList.length > 0) {
                // 데이터를 순회하면서 출력 형식 생성
                for (var i = 0; i < clvmList.length; i++) {
                    var clvm = clvmList[i];

                    // 체크박스 추가
                    output += `
                        <div style="margin-bottom: 8px;">
                            <input type="checkbox" class="clvm-checkbox" id="clvm-${i}" name="form-clvm-disk-delete"
                                data-vg="${clvm.vg_name}"
                                data-pv="${clvm.pv_name}"
                                data-size="${clvm.pv_size}"
                                data-wwn="${clvm.wwn}"
                                style="margin-left:5px;transform: scale(1.3);">
                            <label for="clvm-${i}">
                                ${i + 1}. ${clvm.vg_name} ${clvm.pv_name} ${clvm.pv_size} ${clvm.wwn}
                            </label>
                        </div>
                    `;
                }
            } else {
                output = '데이터가 존재하지 않습니다.<br>';
            }

            // 출력 데이터 추가
            $('#clvm-disk-delete-list').append(output);

        }).catch(function() {
            createLoggerInfo("setDiskAction error");
        });
    }else if (type == "clvm" && action == "list"){
        var cmd = ["python3", pluginpath + "/python/clvm/disk_manage.py", "--list-clvm"];

        cockpit.spawn(cmd).then(function(data) {
            // 초기화
            $('#clvm-disk-info-list').empty();

            // JSON 데이터 파싱
            var result = JSON.parse(data);

            // 결과 리스트 가져오기
            var clvmList = result.val;

            var output = ''; // 최종 출력 문자열

            if (clvmList.length > 0) {
                // 데이터를 순회하면서 출력 형식 생성
                for (var i = 0; i < clvmList.length; i++) {
                    var clvm = clvmList[i];
                    output += `${i + 1}. ${clvm.vg_name} ${clvm.pv_name} ${clvm.pv_size} ${clvm.wwn}<br>`;
                }
            } else {
                output = '데이터가 존재하지 않습니다.<br>';
            }
            // 출력 데이터 추가
            $('#clvm-disk-info-list').append(output);

        }).catch(function() {
            createLoggerInfo("setDiskAction error");
        });
    }else if (type == "gfs" && action == "add"){
        var cmd = ["python3", pluginpath + "/python/disk/disk_action.py", "gfs-list"];

        cockpit.spawn(cmd).then(function(data) {
            // 초기화
            $('#gfs-disk-add-list').empty();

            var el = '';
            var multipathElements = ''; // MultiPath 정보를 저장할 변수
            var result = JSON.parse(data);
            var gfs_list = result.val.blockdevices;

            // MultiPath 중복 제거용 세트
            var displayedMultipaths = new Set();
            var displayedName = new Set();

            if (gfs_list.length > 0) {
                for (var i = 0; i < gfs_list.length; i++) {
                    var partition_text = '';
                    var check_disable = '';

                    if (gfs_list[i].children != undefined) {
                        for (var j = 0; j < gfs_list[i].children.length; j++) {
                            if (!gfs_list[i].wwn) {
                                gfs_list[i].wwn = ""; // 값을 공백으로 설정
                            }
                            var mpathName = gfs_list[i].children[j].name;
                            if (gfs_list[i].children[j].name.includes('mpath')) {
                                if (gfs_list[i].children[j].children != undefined) {
                                    partition_text = '( Partition exists count : ' + gfs_list[i].children[j].children.length + ' )';
                                    check_disable = 'disabled';
                                }
                                // MultiPath가 이미 표시된 경우 스킵
                                if (!displayedMultipaths.has(mpathName)) {
                                    var mpathHtml = '';
                                    mpathHtml += '<div class="pf-c-check">';
                                    mpathHtml += '<input class="pf-c-check__input" type="checkbox" id="form-gfs-checkbox-disk-add' + i + '" name="form-gfs-checkbox-disk-add" value="' + gfs_list[i].children[j].path + '" ' + check_disable + ' />';
                                    // mpathHtml += '<input class="pf-c-check__input" type="checkbox" id="form-gfs-checkbox-disk-add' + i + '" name="form-gfs-checkbox-disk-add" value="' + gfs_list[i].children[j].path + '" />';
                                    mpathHtml += '<label class="pf-c-check__label" style="margin-top:5px" for="form-gfs-checkbox-disk-add' + i + '">' + gfs_list[i].children[j].path + ' ' + gfs_list[i].children[j].state + ' (' + gfs_list[i].children[j].type + ') ' + gfs_list[i].children[j].size + ' ' + ' ' + gfs_list[i].vendor + ' ' + gfs_list[i].wwn  + ' ' + partition_text + '</label>';
                                    mpathHtml += '</div>';

                                    multipathElements += mpathHtml; // MultiPath 요소를 multipathElements에 저장

                                    displayedMultipaths.add(mpathName);  // MultiPath 이름을 Set에 추가
                                }
                            } else {
                                partition_text = '( Partition exists count : ' + gfs_list[i].children.length + ' )';
                                check_disable = 'disabled';

                                var disk_name = gfs_list[i].name;
                                if (!displayedName.has(disk_name)) {
                                    el += '<div class="pf-c-check">';
                                    el += '<input class="pf-c-check__input" type="checkbox" id="form-gfs-checkbox-disk-add' + i + '" name="form-gfs-checkbox-disk-add" value="' + gfs_list[i].path + '" ' + check_disable + ' />';
                                    // el += '<input class="pf-c-check__input" type="checkbox" id="form-gfs-checkbox-disk-add' + i + '" name="form-gfs-checkbox-disk-add" value="' + gfs_list[i].path + '" />';
                                    el += '<label class="pf-c-check__label" style="margin-top:5px" for="form-gfs-checkbox-disk-add' + i + '">' + gfs_list[i].path + ' ' + gfs_list[i].state + ' (' + gfs_list[i].tran + ') ' + gfs_list[i].size + ' ' + gfs_list[i].model + ' ' + gfs_list[i].wwn + partition_text + '</label>';
                                    el += '</div>';

                                    displayedName.add(disk_name);
                                }
                            }
                        }
                    } else {
                        if (!gfs_list[i].wwn) {
                            gfs_list[i].wwn = ""; // 값을 공백으로 설정
                        }
                        el += '<div class="pf-c-check">';
                        el += '<input class="pf-c-check__input" type="checkbox" id="form-gfs-checkbox-disk-add' + i + '" name="form-gfs-checkbox-disk-add" value="' + gfs_list[i].path + '" ' + check_disable + ' />';
                        // el += '<input class="pf-c-check__input" type="checkbox" id="form-gfs-checkbox-disk-add' + i + '" name="form-gfs-checkbox-disk-add" value="' + gfs_list[i].path + '" />';
                        el += '<label class="pf-c-check__label" style="margin-top:5px" for="form-gfs-checkbox-disk-add' + i + '">' + gfs_list[i].path + ' ' + gfs_list[i].state + ' (' + gfs_list[i].tran + ') ' + gfs_list[i].size + ' ' + gfs_list[i].model + ' ' + gfs_list[i].wwn + partition_text + '</label>';
                        el += '</div>';
                    }
                }
            }else {
                el += '<div class="pf-c-check">';
                el += '<label class="pf-c-check__label" style="margin-top:5px">데이터가 존재하지 않습니다.</label>';
                el += '</div>';
            }

            // 일반 장치 정보를 먼저 추가하고, 마지막에 MultiPath 정보를 추가
            $('#gfs-disk-add-list').append(multipathElements + el);

        }).catch(function() {
            createLoggerInfo("setDiskAction error");
        });
    } else if (type == "gfs" && action == "delete"){
        var cmd = ["python3", pluginpath + "/python/gfs/gfs_disk_status.py"];

        cockpit.spawn(cmd).then(function(data) {
            $('#gfs-disk-delete-list').empty();

            // JSON 데이터 파싱
            var result = JSON.parse(data);
            var gfsList = result.val.blockdevices;

            var output = '';

            if (gfsList.length > 0) {
                for (var i = 0; i < gfsList.length; i++) {
                    var gfs_disk = gfsList[i];
                    var multipaths = gfs_disk.multipaths.join(', ');

                    // 각 데이터 길이에 따라 너비 조정
                    var mountpointWidth = Math.max(gfs_disk.mountpoint.length * 10, 160);  // 최소 200px
                    var multipathWidth = Math.max(multipaths.length * 10, 200);           // 최소 300px
                    var formattedMultipaths = '';

                    // multipaths 배열을 여러 줄로 표시하도록 수정
                    for (var j = 0; j < gfs_disk.multipaths.length; j += 2) {
                        formattedMultipaths += `
                            <div style="display: flex; gap: 10px; font-family: monospace;">
                                <span>${gfs_disk.multipaths[j]}</span>
                                ${gfs_disk.multipaths[j + 1] ? `<span>${gfs_disk.multipaths[j + 1]}</span>` : ''}
                            </div>
                        `;
                    }

                    output += `
                        <div style="margin-bottom: 8px; display: flex; align-items: center; font-family: monospace;">
                            <input type="checkbox" class="gfs-disk-delete-checkbox" id="gfs-disk-checkbox-delete-${i}"
                                name="form-gfs-checkbox-disk-delete" data-mountpoint="${gfs_disk.mountpoint}"
                                data-multipaths="${multipaths}" data-size="${gfs_disk.size}" data-lvm="${gfs_disk.lvm}"
                                style="margin-left:5px; transform: scale(1.3); margin-right:10px;">

                            <label for="gfs-disk-checkbox-delete-${i}"
                                style="display: inline-block; min-width:${mountpointWidth}px; flex-grow: 1; overflow: hidden; text-overflow: ellipsis;">
                                ${gfs_disk.mountpoint}
                            </label>

                            <label for="gfs-disk-checkbox-delete-${i}"
                                style="display: inline-block; min-width:${multipathWidth}px; flex-grow: 2; overflow: hidden; text-overflow: ellipsis;">
                                ${formattedMultipaths}
                            </label>

                            <label for="gfs-disk-checkbox-delete-${i}"
                                style="display: inline-block; width: 100px; text-align: right;">
                                ${gfs_disk.size}
                            </label>

                        </div>
                    `;
                }
            } else {
                output = '데이터가 존재하지 않습니다.<br>';
            }

            $('#gfs-disk-delete-list').append(output);
        });

    }
}
$('#menu-item-set-gfs-clvm-disk-add').on('click',function(){
    setDiskAction("clvm","add")
    $('#div-modal-clvm-disk-add').show();
});
$('#button-close-modal-clvm-disk-add, #button-cancel-modal-clvm-disk-add').on('click',function(){
    $('#div-modal-clvm-disk-add').hide();
});
$('#button-execution-modal-clvm-disk-add').on('click',function(){
    $('#div-modal-clvm-disk-add').hide();
    $('#div-modal-spinner-header-txt').text("CLVM 디스크 논리 볼륨을 구성 중입니다.")
    $('#div-modal-spinner').show();

    var clvm_disk_name = $('input[type=checkbox][name="form-clvm-checkbox-disk-add"]:checked')
    .map(function () {
        return $(this).val(); // 체크된 값 가져오기
    })
    .get() // jQuery 객체를 배열로 변환
    .join(','); // 쉼표로 연결
    cmd = ['python3', pluginpath + '/python/clvm/disk_manage.py', '--create-clvm', '--disks', clvm_disk_name];
    console.log(cmd);
    cockpit.spawn(cmd)
    .then(function(data){
        var retVal = JSON.parse(data);
        if (retVal.code == "200"){
            $('#div-modal-spinner').hide();
            $('#modal-status-alert-title').html("CVLM 디스크 추가");
            $("#modal-status-alert-body").html("CLVM 디스크 논리 볼륨을 구성했습니다.");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $('#modal-status-alert-title').html("CVLM 디스크 추가");
            $("#modal-status-alert-body").html("CLVM 디스크 논리 볼륨을 실패했습니다.");
            $('#div-modal-status-alert').show();
        }
    })
});
$('#div-modal-clvm-disk-add').on('change', 'input[type=checkbox][name="form-clvm-checkbox-disk-add"]', function() {
    // 체크된 항목이 있는지 확인
    var isChecked = $('input[type=checkbox][name="form-clvm-checkbox-disk-add"]:checked').length > 0;

    // 체크되면 버튼 활성화, 아니면 비활성화
    $('#button-execution-modal-clvm-disk-add').prop('disabled', !isChecked);
});

$('#menu-item-set-gfs-clvm-disk-delete').on('click',function(){
    setDiskAction("clvm","delete")
    $('#div-modal-clvm-disk-delete').show();
});
$('#button-close-modal-clvm-disk-delete, #button-cancel-modal-clvm-disk-delete').on('click',function(){
    $('#div-modal-clvm-disk-delete').hide();
});
$('#button-execution-modal-clvm-disk-delete').on('click',function(){
    $('#div-modal-clvm-disk-delete').hide();
    $('#div-modal-spinner-header-txt').text("CLVM 디스크 논리 볼륨을 삭제 중입니다.")
    $('#div-modal-spinner').show();

    var vg_names = $('input[type=checkbox][name="form-clvm-disk-delete"]:checked')
    .map(function () {
        return $(this).data('vg'); // 체크된 값 가져오기
    })
    .get() // jQuery 객체를 배열로 변환
    .join(','); // 쉼표로 연결

    var pv_names = $('input[type=checkbox][name="form-clvm-disk-delete"]:checked')
    .map(function () {
        return $(this).data('pv'); // 체크된 값 가져오기
    })
    .get() // jQuery 객체를 배열로 변환
    .join(','); // 쉼표로 연결
    cmd = ['python3', pluginpath + '/python/clvm/disk_manage.py', '--delete-clvm', '--vg-names', vg_names, '--pv-names', pv_names];
    console.log(cmd);
    cockpit.spawn(cmd)
    .then(function(data){
        var retVal = JSON.parse(data);
        if (retVal.code == "200"){
            $('#div-modal-spinner').hide();
            $('#modal-status-alert-title').html("CVLM 디스크 삭제");
            $("#modal-status-alert-body").html("CLVM 디스크 논리 볼륨을 삭제했습니다.");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $('#modal-status-alert-title').html("CVLM 디스크 삭제");
            $("#modal-status-alert-body").html("CLVM 디스크 논리 볼륨 삭제를 실패했습니다.");
            $('#div-modal-status-alert').show();
        }
    })
});
$('#button-cancel-modal-clvm-disk-delete, #button-close-modal-clvm-disk-delete').on('click', function(){
    $('#div-modal-clvm-disk-delete').hide();
})
$('#div-modal-clvm-disk-delete').on('change', 'input[type=checkbox][name="form-clvm-disk-delete"]', function() {
    // 체크된 항목이 있는지 확인
    var isChecked = $('input[type=checkbox][name="form-clvm-disk-delete"]:checked').length > 0;
    // 체크되면 버튼 활성화, 아니면 비활성화
    $('#button-execution-modal-clvm-disk-delete').prop('disabled', !isChecked);
});
$('#menu-item-set-gfs-clvm-disk-info').on('click',function(){
    setDiskAction("clvm", "list")
    $('#div-modal-clvm-disk-info').show();
});
$('#button-execution-modal-clvm-disk-info, #button-close-modal-clvm-disk-info').on('click',function(){
    $('#div-modal-clvm-disk-info').hide();
});
$('#button-execution-modal-gfs-maintenance-setting').on('click', function(){
    $('#div-modal-gfs-maintenance-setting').hide();
    var stonith_status = sessionStorage.getItem('stonith_status');

    if (stonith_status == "Started"){
        $('#div-modal-spinner-header-txt').text('펜스 장치 유지보수 설정 중입니다.');
        $('#div-modal-spinner').show();
        cockpit.spawn(['python3', pluginpath + '/python/gfs/gfs_manage.py', '--check-stonith', '--control', 'disable'])
        .then(function(data){
            $('#div-modal-spinner').hide();
            var retVal = JSON.parse(data);
            if (retVal.code == "200"){
                $("#modal-status-alert-title").html("펜스 장치 유지보수 설정 완료");
                $("#modal-status-alert-body").html("펜스 장치 유지보수 설정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("펜스 장치 유지보수 설정 실패 : " + data);
        });
    }else{
        $('#div-modal-spinner-header-txt').text('펜스 장치 유지보수 해제 중입니다.');
        $('#div-modal-spinner').show();
        cockpit.spawn(['python3', pluginpath + '/python/gfs/gfs_manage.py', '--check-stonith', '--control', 'enable'])
        .then(function(data){
            var retVal = JSON.parse(data);
            if (retVal.code == "200"){
                $("#modal-status-alert-title").html("펜스 장치 유지보수 해제 완료");
                $("#modal-status-alert-body").html("펜스 장치 유지보수 해제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("펜스 장치 유지보수 해제 실패 : " + data);
        });
    }
});
$('#button-cancel-modal-gfs-maintenance-setting, #button-close-modal-cloud-vm-maintenance-setting').on('click', function(){
    $('#div-modal-gfs-maintenance-setting').hide();
})

$('#button-gfs-qdevice-init').on('click', function(){
    $('#div-modal-cloud-vm-qdevice-init').show();
});
$('#button-close-modal-cloud-vm-qdevice-init, #button-cancel-modal-cloud-vm-qdevice-init').on('click', function(){
    $('#div-modal-cloud-vm-qdevice-init').hide();
});
$('#button-execution-modal-cloud-vm-qdevice-init').on('click', function(){
    $('#div-modal-cloud-vm-qdevice-init').hide();

    $('#div-modal-spinner-header-txt').text('쿼럼을 초기화하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("쿼럼 초기화");
    $("#modal-status-alert-body").html("쿼럼 초기화를 실패하였습니다.<br/>쿼럼 상태를 확인해주세요.");

    cmd =["python3", pluginpath + "/python/gfs/gfs_manage.py", "--init-qdevice"];
    console.log(cmd);
    cockpit.spawn(cmd)
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == "200"){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-title").html("쿼럼 초기화 완료");
            $("#modal-status-alert-body").html("쿼럼 초기화를 완료하였습니다.");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-title").html("쿼럼 초기화 실패");
            $("#modal-status-alert-body").html("쿼럼 초기화를 실패하였습니다.");
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("쿼럼 초기화 실패 : " + data);
    });

});

$('#button-gfs-multipath-sync').on("click",function(){
    $('#div-modal-spinner-header-txt').text('멀티패스 장치 동기화하고 있습니다.');
    $('#div-modal-spinner').show();

    cockpit.spawn(["sh", pluginpath + "/shell/host/multipath_sync.sh"])
    .then(function(data){
        $('#div-modal-spinner').hide();
    })
});

$('#menu-item-set-gfs-disk-add').on('click',function(){
    setDiskAction("gfs","add")
    $('#div-modal-gfs-disk-add').show();
});
$('#button-close-modal-gfs-disk-add, #button-cancel-modal-gfs-disk-add').on('click',function(){
    $('#div-modal-gfs-disk-add').hide();
});
$('#button-execution-modal-gfs-disk-add').on('click', function() {
    $('#div-modal-gfs-disk-add').hide();
    $('#div-modal-spinner-header-txt').text('GFS 디스크를 추가 중입니다.');
    $('#div-modal-spinner').show();

    var gfs_disk_name = $('input[type=checkbox][name="form-gfs-checkbox-disk-add"]:checked')
        .map(function () {
            return $(this).val();
        })
        .get()
        .join(',');
    cockpit.file(pluginpath + '/tools/properties/cluster.json').read()
        .then(function(data) {
        var retVal = JSON.parse(data);

        var journal_nums = String(retVal.clusterConfig.hosts.length + 1);
        var list_ips = retVal.clusterConfig.hosts.map(function(host) {
            return host.ablecube;
        }).join(' ');
        cmd = ['python3', pluginpath + '/python/clvm/disk_manage.py', '--list-gfs'];
        console.log(cmd);
        cockpit.spawn(cmd)
            .then(function(data) {
                var retVal = JSON.parse(data);
                var maxIndex = 0;
                if (retVal.code == "200") {
                    var vg_name = "";
                    var lv_name = "";
                    var mount_point = "";
                    var gfs_name = "";
                    for (var i = 0; i < retVal.val.length; i++) {
                        var match = retVal.val[i].vg_name.match(/vg_glue_(\d+)/);
                        if (match) {
                            var num = parseInt(match[1], 10);  // 숫자 부분만 가져와서 정수로 변환
                            if (num > maxIndex) {
                                maxIndex = num;
                            }
                        }

                        newIndex = maxIndex > 0 ? maxIndex + 1 : 1;
                        vg_name = "vg_glue_" + newIndex;
                        lv_name = "lv_glue_" + newIndex;
                        mount_point = "/mnt/glue-gfs-" + newIndex;
                        gfs_name = "glue-gfs-" + newIndex;
                    }
                    var cmd = ['python3', pluginpath + '/python/gfs/gfs_manage.py','--create-gfs','--disks', gfs_disk_name,
                        '--vg-name', vg_name,'--lv-name', lv_name,'--gfs-name', gfs_name,'--mount-point', mount_point,
                        '--cluster-name', 'cloudcenter_res','--journal-nums', journal_nums,'--list-ip', list_ips];
                    console.log(cmd);

                    cockpit.spawn(cmd).then(function(data) {

                        var retVal = JSON.parse(data);
                        if (retVal.code == "200"){
                            $('#div-modal-spinner').hide();
                            $("#modal-status-alert-title").html("GFS 디스크 추가");
                            $("#modal-status-alert-body").html("GFS 디스크를 추가하였습니다.");
                            $('#div-modal-status-alert').show();
                        }else{
                            $('#div-modal-spinner').hide();
                            $("#modal-status-alert-title").html("GFS 디스크 추가");
                            $("#modal-status-alert-body").html("GFS 디스크 추가를 실패하였습니다.");
                            $('#div-modal-status-alert').show();
                        }
                    }).catch(function(error) {
                        $('#div-modal-spinner').hide();
                        $("#modal-status-alert-title").html("GFS 디스크 추가");
                        $("#modal-status-alert-body").html("GFS 디스크 추가를 실패하였습니다.");
                        $('#div-modal-status-alert').show();
                        console.error("GFS 디스크 추가 실패:", error);
                    });
                }
            }).catch(function(error) {
                $('#div-modal-spinner').hide();
                $("#modal-status-alert-title").html("GFS 디스크 추가");
                $("#modal-status-alert-body").html("GFS 디스크 리스트 정보를 불러오지 못했습니다.");
                $('#div-modal-status-alert').show();
                console.error("디스크 목록 조회 실패:", error);
            });
    }).catch(function() {
        $('#div-modal-spinner').hide();
        $("#modal-status-alert-title").html("GFS 디스크 추가");
        $("#modal-status-alert-body").html("Cluster.json 파일을 불러오지 못했습니다.");
        $('#div-modal-status-alert').show();
        console.error("클러스터 정보를 불러오지 못했습니다.");
    });
});
$('#div-modal-gfs-disk-add').on('change', 'input[type=checkbox][name="form-gfs-checkbox-disk-add"]', function() {
    // 체크된 항목이 있는지 확인
    var isChecked = $('input[type=checkbox][name="form-gfs-checkbox-disk-add"]:checked').length > 0;

    // 체크되면 버튼 활성화, 아니면 비활성화
    $('#button-execution-modal-gfs-disk-add').prop('disabled', !isChecked);
});
$('#button-close-modal-gfs-disk-info,#button-cancel-modal-gfs-disk-info').on('click', function(){
    $('#div-modal-gfs-disk-info').hide();
});
$('#menu-item-set-gfs-disk-delete').on('click', function(){
    setDiskAction("gfs","delete")
    $('#div-modal-gfs-disk-delete').show();
});
$('#button-cancel-modal-gfs-disk-delete , #button-close-modal-gfs-disk-delete').on('click', function(){
    $('#div-modal-gfs-disk-delete').hide();
});
$('#div-modal-gfs-disk-delete').on('change', 'input[type=checkbox][name="form-gfs-checkbox-disk-delete"]', function() {
    if (this.checked) {
        // 다른 체크박스는 모두 해제
        $('input[type=checkbox][name="form-gfs-checkbox-disk-delete"]').not(this).prop('checked', false);
    }
    // 체크된 항목이 있는지 확인
    var isChecked = $('input[type=checkbox][name="form-gfs-checkbox-disk-delete"]:checked').length > 0;

    // 체크되면 버튼 활성화, 아니면 비활성화
    $('#button-execution-modal-gfs-disk-delete').prop('disabled', !isChecked);
});
$('#button-execution-modal-gfs-disk-delete').on('click', function() {
    $('#div-modal-gfs-disk-delete').hide();
    $('#div-modal-spinner-header-txt').text('GFS 디스크를 삭제 중입니다.');
    $('#div-modal-spinner').show();
    function extractData(selector, dataAttribute, regex) {
        return $(selector)
            .map(function() {
                return $(this).data(dataAttribute);
            })
            .get()
            .map(function(value) {
                var match = value.match(regex);
                return match ? match[1] : '';
            })
            .join(',');  // 배열을 콤마로 구분된 문자열로 변환
    }

    var gfs_disk_name = $('input[type=checkbox][name="form-gfs-checkbox-disk-delete"]:checked')
    .map(function () {
        return $(this).data('multipaths');
    })
    .get()
    .map(function(multipath) {
        return multipath
            .split(',') // 콤마(,)로 분리
            .map(function(path) {
                return path.trim().replace(/1$/, ''); // 각 경로 끝의 1 제거
            })
            .join(','); // 다시 콤마로 합침
    })
    .join(','); // 최종적으로 모든 결과를 콤마로 연결

    var gfs_name = extractData('input[type=checkbox][name="form-gfs-checkbox-disk-delete"]:checked', 'mountpoint', /\/mnt\/(.*)/);
    var vg_name = extractData('input[type=checkbox][name="form-gfs-checkbox-disk-delete"]:checked', 'lvm', /\/dev\/mapper\/([^\-]+)/);
    var lv_name = extractData('input[type=checkbox][name="form-gfs-checkbox-disk-delete"]:checked', 'lvm', /\/dev\/mapper\/[^-]+-(.*)/);

    cmd = ['python3', pluginpath + '/python/clvm/disk_manage.py', '--delete-gfs', '--disks', gfs_disk_name, '--gfs-name', gfs_name, '--vg-names', vg_name, '--lv-names', lv_name];
    console.log(cmd);
    cockpit.spawn(cmd)
        .then(function(data) {
            var retVal = JSON.parse(data);
            if (retVal.code == "200") {
                $('#div-modal-spinner').hide();
                $("#modal-status-alert-title").html("GFS 디스크 삭제");
                $("#modal-status-alert-body").html("GFS 디스크를 삭제하였습니다.");
                $('#div-modal-status-alert').show();
            }
        }).catch(function() {
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-title").html("GFS 디스크 삭제");
            $("#modal-status-alert-body").html("GFS 디스크 삭제를 실패하였습니다.");
            $('#div-modal-status-alert').show();
        });
});
/**
 * Meathod Name : gfsResourceStatus
 * Date Created : 2025.01.06
 * Writer  : 정민철
 * Description : GFS 리소스 상태 카드란 처리
 * Parameter : 없음
 * Return  : 없음
 * History  : 2025.01.06 최초 작성
 */
function gfsResourceStatus() {
    return new Promise((resolve) => {
        //초기 상태 체크 중 표시
        $('#gfs-fence-status, #gfs-lock-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
        $('#gfs-fence-back-color, #gfs-lock-back-color').attr('class','pf-c-label pf-m-orange');
        $('#gfs-fence-icon, #gfs-lock-icon').attr('class','fas fa-fw fa-exclamation-triangle');

        cockpit.spawn(['python3', pluginpath + '/python/gfs/gfs_resource_status.py'])
        .then(function(data){
            var retVal = JSON.parse(data);
            if (retVal.code == "200"){
                var gfs_fence_started_arr = [];
                var gfs_fence_stopped_arr = [];
                var gfs_fence_offline_arr = [];

                var gfs_lvmlockd_arr = [];
                var gfs_dlm_arr = [];
                var gfs_file_system_arr_list = [];
                var gfs_lvmlockd_start_arr = [];
                var gfs_lvmlockd_stop_arr = [];
                var gfs_dlm_start_arr = [];
                var gfs_dlm_stop_arr = [];
                var gfs_dlm_offline_arr = [];
                var gfs_lvmlockd_offline_arr = [];
                gfs_file_system_arr = [];
                var num = 0;

                for (var m = 0; m < retVal.val.nodes_info.length; m++){
                    var node_name = retVal.val.nodes_info[m].name;
                    var state = retVal.val.nodes_info[m].online;
                    if (state == "false"){
                        gfs_fence_offline_arr.push(node_name);
                        gfs_lvmlockd_offline_arr.push(node_name);
                        gfs_dlm_offline_arr.push(node_name);
                        gfs_file_system_arr.push(["",node_name,"offline"]);
                    }
                }
                for (var i = 0; i < retVal.val.resources.fence_resources.length; i++){
                    var gfs_fence_host = retVal.val.resources.fence_resources[i].node_name;
                    var gfs_fence_status = retVal.val.resources.fence_resources[i].role;

                    if (gfs_fence_status == "Started"){
                        gfs_fence_started_arr.push(gfs_fence_host);
                    }else {
                        gfs_fence_stopped_arr.push(gfs_fence_host);
                    }
                }

                for (var j = 0; j < retVal.val.node_history.length; j++) {
                    var node_name = retVal.val.node_history[j].node_name;

                    for (var k = 0; k < retVal.val.node_history[j].resource_histories.length; k++) {
                        var resource_name = retVal.val.node_history[j].resource_histories[k].resource_id;
                        var resource_status;
                        var start_error_occurred = false; // start에서 error 발생 여부를 추적

                        for (var n = 0; n < retVal.val.node_history[j].resource_histories[k].operations.length; n++) {
                            var operation = retVal.val.node_history[j].resource_histories[k].operations[n];
                            var task = operation.task;
                            var rc_text = operation.rc_text;

                            if (task == "start" || task == "stop" || task == "probe") {
                                if (resource_name === "glue-lvmlockd") {
                                    resource_status = task;

                                    if (task == "start" && rc_text == "error") {
                                        resource_status = task + "(" + rc_text + ")"
                                        start_error_occurred = true; // start에서 오류 발생
                                    }

                                    if (task == "stop" && start_error_occurred) {
                                        // start에서 error가 발생했으므로 stop 추가하지 않음
                                        continue;
                                    }
                                    gfs_lvmlockd_arr.push([node_name, resource_status]); //

                                } else if (resource_name === "glue-dlm") {
                                    resource_status = task;
                                    if (task == "start" && rc_text == "error") {
                                        resource_status = task + "(" + rc_text + ")"
                                        start_error_occurred = true; // start에서 오류 발생
                                    }

                                    if (task == "stop" && start_error_occurred) {
                                        // start에서 error가 발생했으므로 stop 추가하지 않음
                                        continue;
                                    }
                                    gfs_dlm_arr.push([node_name, resource_status]); // 배열 추가

                                } else if (/^glue-gfs(-\d+)?$/.test(resource_name)) {

                                    gfs_file_system_arr_list[num] = [];
                                    resource_status = task;
                                    if (task == "start" && rc_text == "error") {
                                        resource_status = task + "(" + rc_text + ")"
                                        start_error_occurred = true; // start에서 오류 발생
                                    }

                                    if (task == "stop" && start_error_occurred) {
                                        // start에서 error가 발생했으므로 stop 추가하지 않음
                                        continue;
                                    }
                                    gfs_file_system_arr_list[num].push([resource_name,node_name, resource_status]); // 배열 추가
                                    num++;
                                }
                            }
                        }
                    }
                }
                if (gfs_fence_offline_arr.length == 0){
                    if (gfs_fence_stopped_arr.length == 0){
                        $("#gfs-fence-back-color").attr('class','pf-c-label pf-m-green');
                        $("#gfs-fence-icon").attr('class','fas fa-fw fa-check-circle');
                        $('#gfs-fence-status').text("Health OK");
                        $('#gfs-fence-text').text('Started ( ' + gfs_fence_started_arr.join(', ') + ' )');
                    }else if (gfs_fence_started_arr.length == 0){
                        $("#gfs-fence-back-color").attr('class','pf-c-label pf-m-orange');
                        $('#gfs-fence-status').text("Health Warn");
                        $('#gfs-fence-text').text('Stopped ( ' + gfs_fence_stopped_arr.join(', ') + ' )');
                    }else{
                        $("#gfs-fence-back-color").attr('class','pf-c-label pf-m-orange');
                        $('#gfs-fence-status').text("Health Warn");
                        $('#gfs-fence-text').text('Started ( ' + gfs_fence_started_arr.join(', ') + ' ), '+ 'Stopped ( ' + gfs_fence_stopped_arr.join(', ') + ' )');
                    }
                }else{
                    if (gfs_fence_stopped_arr.length == 0){
                        $("#gfs-fence-back-color").attr('class','pf-c-label pf-m-green');
                        $("#gfs-fence-icon").attr('class','fas fa-fw fa-check-circle');
                        $('#gfs-fence-status').text("Health OK");
                        $('#gfs-fence-text').text('Started ( ' + gfs_fence_started_arr.join(', ') + ' ), Offline ( ' + gfs_fence_offline_arr.join(', ') + ' )');
                    }else if (gfs_fence_started_arr.length == 0){
                        $("#gfs-fence-back-color").attr('class','pf-c-label pf-m-orange');
                        $('#gfs-fence-status').text("Health Warn");
                        $('#gfs-fence-text').text('Stopped ( ' + gfs_fence_stopped_arr.join(', ') + ' ), Offline ( ' + gfs_fence_offline_arr.join(', ') + ' )');
                    }else{
                        $("#gfs-fence-back-color").attr('class','pf-c-label pf-m-orange');
                        $('#gfs-fence-status').text("Health Warn");
                        $('#gfs-fence-text').text('Started ( ' + gfs_fence_started_arr.join(', ') + ' ), '+ 'Stopped ( ' + gfs_fence_stopped_arr.join(', ') + ' ), Offline ( ' + gfs_fence_offline_arr.join(', ') + ' )');
                    }
                }
                try {

                    for (var l = 0; l < gfs_lvmlockd_arr.length; l++) {
                        // gfs_lvmlockd 처리
                        if (l < gfs_lvmlockd_arr.length && gfs_lvmlockd_arr[l][1] !== undefined) {
                            if (gfs_lvmlockd_arr[l][1] == "stop") {
                                gfs_lvmlockd_stop_arr.push(gfs_lvmlockd_arr[l][0]);
                            }else if (gfs_lvmlockd_arr[l][1] == "start(error)") {
                                $('#gfs-lock-status, #gfs-resource-status, #gfs-file-system-status').text("Health Err");
                                $('#gfs-lock-back-color, #gfs-resource-back-color, #gfs-file-system-back-color').attr('class','pf-c-label pf-m-red');
                                $('#gfs-lock-icon, #gfs-resource-icon, #gfs-file-system-icon').attr('class','fas fa-fw fa-exclamation-triangle');
                                $('#gfs-low-info').attr("style", "color: var(--pf-global--danger-color--100)");
                                $('#gfs-low-info').text("GFS 잠금 장치 구성 중 오류가 발생했습니다.");
                                return;
                            }else {
                                gfs_lvmlockd_start_arr.push(gfs_lvmlockd_arr[l][0]);
                            }
                        } else {
                            $('#gfs-lock-status, #gfs-resource-status, #gfs-file-system-status').text("Health Err");
                            $('#gfs-lock-back-color, #gfs-resource-back-color, #gfs-file-system-back-color').attr('class','pf-c-label pf-m-red');
                            $('#gfs-lock-icon, #gfs-resource-icon, #gfs-file-system-icon').attr('class','fas fa-fw fa-exclamation-triangle');
                            $('#gfs-low-info').attr("style", "color: var(--pf-global--danger-color--100)");
                            $('#gfs-low-info').text("GFS 잠금 장치 구성 중 오류가 발생했습니다.");
                        }

                        // gfs_dlm 처리
                        if (l < gfs_dlm_arr.length && gfs_dlm_arr[l][1] !== undefined) {
                            if (gfs_dlm_arr[l][1] == "stop") {
                                gfs_dlm_stop_arr.push(gfs_dlm_arr[l][0]);
                            } else if (gfs_dlm_arr[l][1] == "start(error)"){
                                $('#gfs-lock-status, #gfs-resource-status, #gfs-file-system-status').text("Health Err");
                                $('#gfs-lock-back-color, #gfs-resource-back-color, #gfs-file-system-back-color').attr('class','pf-c-label pf-m-red');
                                $('#gfs-lock-icon, #gfs-resource-icon, #gfs-file-system-icon').attr('class','fas fa-fw fa-exclamation-triangle');
                                $('#gfs-low-info').attr("style", "color: var(--pf-global--danger-color--100)");
                                $('#gfs-low-info').text("GFS 잠금 장치 구성 중 오류가 발생했습니다.");
                                return;
                            }else {
                                gfs_dlm_start_arr.push(gfs_dlm_arr[l][0]);
                            }
                        } else {
                            $('#gfs-lock-status, #gfs-resource-status, #gfs-file-system-status').text("Health Err");
                            $('#gfs-lock-back-color, #gfs-resource-back-color, #gfs-file-system-back-color').attr('class','pf-c-label pf-m-red');
                            $('#gfs-lock-icon, #gfs-resource-icon, #gfs-file-system-icon').attr('class','fas fa-fw fa-exclamation-triangle');
                            $('#gfs-low-info').attr("style", "color: var(--pf-global--danger-color--100)");
                            $('#gfs-low-info').text("GFS 잠금 장치 구성 중 오류가 발생했습니다.");
                        }
                    }
                    if (gfs_dlm_offline_arr.length == 0 && gfs_lvmlockd_offline_arr == 0){
                        if (gfs_dlm_stop_arr.length == 0 && gfs_lvmlockd_stop_arr.length == 0) {
                            $("#gfs-lock-back-color").attr('class', 'pf-c-label pf-m-green');
                            $("#gfs-lock-icon").attr('class', 'fas fa-fw fa-check-circle');
                            $('#gfs-lock-status').text("Health OK");
                            $('#gfs-lock-text').html(
                                'glue-dlm : Started ( ' + gfs_dlm_start_arr.join(', ') + ' )</br>' +
                                'glue-lvmlockd : Started ( ' + gfs_lvmlockd_start_arr.join(', ') + ' )'
                            );
                        } else if (gfs_dlm_start_arr.length == 0 && gfs_lvmlockd_start_arr.length == 0) {
                            $("#gfs-lock-back-color").attr('class', 'pf-c-label pf-m-orange');
                            $('#gfs-lock-status').text("Health Warn");
                            $('#gfs-lock-text').html(
                                'glue-dlm : Stopped ( ' + gfs_dlm_stop_arr.join(', ') + ' )</br> ' +
                                'glue-lvmlockd : Stopped ( ' + gfs_lvmlockd_stop_arr.join(', ') + ' )'
                            );
                        } else {
                            $("#gfs-lock-back-color").attr('class', 'pf-c-label pf-m-orange');
                            $('#gfs-lock-status').text("Health Warn");
                            $('#gfs-lock-text').html(
                                'glue-dlm : Started ( ' + gfs_dlm_start_arr.join(', ') + ' ),</br>' +
                                           'Stopped ( ' + gfs_dlm_stop_arr.join(', ') + ' ) </br>' +
                                'glue-lvmlockd : Started ( ' + gfs_lvmlockd_start_arr.join(', ') + ' ),</br> ' +
                                                'Stopped ( ' + gfs_lvmlockd_stop_arr.join(', ') + ' )</br>'
                            );
                        }
                    }else{
                        if (gfs_dlm_stop_arr.length == 0 && gfs_lvmlockd_stop_arr.length == 0) {
                            $("#gfs-lock-back-color").attr('class', 'pf-c-label pf-m-green');
                            $("#gfs-lock-icon").attr('class', 'fas fa-fw fa-check-circle');
                            $('#gfs-lock-status').text("Health OK");
                            $('#gfs-lock-text').html(
                                'glue-dlm : Started ( ' + gfs_dlm_start_arr.join(', ') + ' ), Offline ( ' + gfs_dlm_offline_arr.join(', ') + ' )</br>' +
                                'glue-lvmlockd : Started ( ' + gfs_lvmlockd_start_arr.join(', ') + ' ), Offline ( ' + gfs_lvmlockd_offline_arr.join(', ') + ' )'
                            );
                        } else if (gfs_dlm_start_arr.length == 0 && gfs_lvmlockd_start_arr.length == 0) {
                            $("#gfs-lock-back-color").attr('class', 'pf-c-label pf-m-orange');
                            $('#gfs-lock-status').text("Health Warn");
                            $('#gfs-lock-text').html(
                                'glue-dlm : Stopped ( ' + gfs_dlm_stop_arr.join(', ') + ' ), Offline ( ' + gfs_dlm_offline_arr.join(', ') + ' )</br>' +
                                'glue-lvmlockd : Stopped ( ' + gfs_lvmlockd_stop_arr.join(', ') + ' ), Offline ( ' + gfs_lvmlockd_offline_arr.join(', ') + ' )'
                            );
                        } else {
                            $("#gfs-lock-back-color").attr('class', 'pf-c-label pf-m-orange');
                            $('#gfs-lock-status').text("Health Warn");
                            $('#gfs-lock-text').html(
                                'glue-dlm : Started ( ' + gfs_dlm_start_arr.join(', ') + ' ), Offline ( ' + gfs_dlm_offline_arr.join(', ') + ' )</br>' +
                                           'Stopped ( ' + gfs_dlm_stop_arr.join(', ') + ' ), Offline ( ' + gfs_lvmlockd_offline_arr.join(', ') + ' )</br>' +
                                'glue-lvmlockd : Started ( ' + gfs_lvmlockd_start_arr.join(', ') + ' ), Offline ( ' + gfs_dlm_offline_arr.join(', ') + ' )</br>' +
                                                'Stopped ( ' + gfs_lvmlockd_stop_arr.join(', ') + ' ), Offline ( ' + gfs_lvmlockd_offline_arr.join(', ') + ' )'
                            );
                        }
                    }

                    for (var l = 0; l < gfs_file_system_arr_list.length; l++) {
                        // gfs_file_system 처리
                        if (l < gfs_file_system_arr_list.length && gfs_file_system_arr_list[l][0][2] !== undefined) {
                            gfs_file_system_arr.push([gfs_file_system_arr_list[l][0][0],gfs_file_system_arr_list[l][0][1], gfs_file_system_arr_list[l][0][2]]);
                        }
                    }

                } catch (error) {
                    $('#gfs-lock-status').text("Health Err");
                    $('#gfs-lock-back-color').attr('class','pf-c-label pf-m-red');
                    $('#gfs-lock-icon').attr('class','fas fa-fw fa-exclamation-triangle');
                    // 오류 처리 추가 (필요 시 사용자 알림 등)
                    $('#gfs-low-info').attr("style", "color: var(--pf-global--danger-color--100)");
                    $('#gfs-low-info').text("GFS 리소스 구성 중 오류가 발생했습니다.");
                    return;
                }
                $('#gfs-low-info').attr("style","color: var(--pf-global--success-color--100)");
                $('#gfs-low-info').text("GFS 리소스가 구성되었습니다.");
            }else{
                $('#gfs-fence-status, #gfs-lock-status').text("Health Err");
                $('#gfs-fence-back-color, #gfs-lock-back-color').attr('class','pf-c-label pf-m-red');
                $('#gfs-fence-icon, #gfs-lock-icon').attr('class','fas fa-fw fa-exclamation-triangle');
                $('#gfs-fence-text, #gfs-lock-text').text("N/A");
            }
            resolve();
        })
        cockpit.spawn(['python3', pluginpath + '/python/gfs/gfs_manage.py', '--check-stonith','--control', 'check'])
        .then(function(data){
            var retVal = JSON.parse(data);
            sessionStorage.setItem("stonith_status", retVal.val);

            if (retVal.val == "Started"){
                $('#gfs-maintenance-update').html('<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-gfs-maintenance" onclick="gfs_maintenance_run()">펜스 장치 유지보수 설정</a>');
            }else if (retVal.val == "Stopped"){
                $('#gfs-maintenance-update').html('<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-gfs-maintenance" onclick="gfs_maintenance_run()">펜스 장치 유지보수 해제</a>');
            }
            else{
                $('#gfs-maintenance-update').html('<a class="pf-c-dropdown__menu-item pf-m-disabled" href="#" id="menu-item-gfs-maintenance" onclick="gfs_maintenance_run()">펜스 장치 유지보수 설정</a>');
            }
            resolve();
        })
        cockpit.spawn(['python3', pluginpath + '/python/gfs/gfs_manage.py', '--check-qdevice'])
        .then(function(data){
            var retVal =JSON.parse(data);
            if (retVal.code == "200"){
                sessionStorage.setItem("qdevice_status","true");
                $('#button-gfs-qdevice-init').removeClass("pf-m-disabled");
            }else{
                sessionStorage.setItem("qdevice_status","false");
            }
            resolve();
        })
})
}