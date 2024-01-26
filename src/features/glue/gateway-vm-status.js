/**
 * File Name : gateway-vm-status.js
 * Date Created : 2024.01.25
 * Writer  : 배태주
 * Description : main_glue.html에서 gateway 가상머신 관련 발생하는 이벤트 처리를 위한 JavaScript
**/
var role = '';
/** gateway vm start 관련 action start */
$('#menu-item-gateway-vm-start').on('click', function(){
    $('#div-modal-start-gateway-vm').show();
});

$('#button-close-modal-gateway-vm-start').on('click', function(){
    $('#div-modal-start-gateway-vm').hide();
});

$('#button-cancel-modal-gateway-vm-start').on('click', function(){
    $('#div-modal-start-gateway-vm').hide();
});

$('#button-execution-modal-gateway-vm-start').on('click', function(){
    $('#dropdown-menu-gateway-vm-status').toggle();
    $('#div-modal-start-gateway-vm').hide();
    $('#div-modal-spinner-header-txt').text('게이트웨이 VM을 시작하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("게이트웨이 VM을 시작 실패");
    $("#modal-status-alert-body").html("게이트웨이 VM 시작을 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/gwvm/start/cell',{
        method: 'PATCH',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        var retVal = JSON.parse(data.Message);
        if(retVal.code == 200){
            $("#modal-status-alert-title").html("게이트웨이 VM을 시작 완료");
            $("#modal-status-alert-body").html("게이트웨이 VM 시작을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            createLoggerInfo("gateway vm start success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("gateway vm start error : "+ data);
        console.log('button-execution-modal-gateway-vm-start : '+data);
    });
});
/** gateway vm start 관련 action end */


/** gateway vm stop modal 관련 action start */
$('#menu-item-gateway-vm-stop').on('click', function(){
    $('#div-modal-stop-gateway-vm').show();
});

$('#button-close-modal-gateway-vm-stop').on('click', function(){
    $('#div-modal-stop-gateway-vm').hide();
});

$('#button-cancel-modal-gateway-vm-stop').on('click', function(){
    $('#div-modal-stop-gateway-vm').hide();
});

$('#button-execution-modal-gateway-vm-stop').on('click', function(){
    $('#dropdown-menu-gateway-vm-status').toggle();
    $('#div-modal-stop-gateway-vm').hide();
    $('#div-modal-spinner-header-txt').text('게이트웨이 VM을 정지하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("게이트웨이 VM을 정지 실패");
    $("#modal-status-alert-body").html("게이트웨이 VM 정지를 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/gwvm/stop/cell',{
        method: 'PATCH',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        var retVal = JSON.parse(data.Message);
        if(retVal.code == 200){
            $("#modal-status-alert-title").html("게이트웨이 VM을 정지 완료");
            $("#modal-status-alert-body").html("게이트웨이 VM 정지를 완료하였습니다.");
            $('#div-modal-status-alert').show();
            createLoggerInfo("gateway vm stop success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("gateway vm stop error : "+ data);
        console.log('button-execution-modal-gateway-vm-stop : '+data);
    });
});
/** gateway vm stop modal 관련 action end */

/** gateway vm destroy modal 관련 action start */
$('#menu-item-gateway-vm-destroy').on('click', function(){
    $('#div-modal-destroy-gateway-vm').show();
});

$('#button-close-modal-gateway-vm-destroy').on('click', function(){
    $('#div-modal-destroy-gateway-vm').hide();
});

$('#button-cancel-modal-gateway-vm-destroy').on('click', function(){
    $('#div-modal-destroy-gateway-vm').hide();
});

$('#button-execution-modal-gateway-vm-destroy').on('click', function(){
    $('#dropdown-menu-cloud-cluster-status').toggle();
    $('#div-modal-destroy-gateway-vm').hide();
    $('#div-modal-spinner-header-txt').text('게이트웨이 VM을 삭제하고 있습니다.');
    $('#div-modal-spinner').show();
    fetch('https://10.10.2.12:8080/api/v1/gwvm/delete/cell',{
        method: 'DELETE',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        var retVal = JSON.parse(data.Message);

        if(retVal.code == 200){
            $('#card-action-gateway-vm-change').attr('disabled', false);
            $('#button-gateway-vm-snap-rollback').attr('disabled', false);
            createLoggerInfo("gateway vm destroy success");
        }
        $('#div-modal-spinner').hide();
    }).catch(function(data){
        createLoggerInfo("gateway vm destroy error : "+data);
        console.log('button-execution-modal-gateway-vm-destroy spawn error : '+data);
    });
    
});
/** gateway vm destroy modal 관련 action end */

/** gateway vm cleanup modal 관련 action start */
$('#menu-item-gateway-vm-cleanup').on('click', function(){
    $('#div-modal-cleanup-gateway-vm').show();
});
$('#button-close-modal-gateway-vm-cleanup').on('click', function(){
    $('#div-modal-cleanup-gateway-vm').hide();
});

$('#button-execution-modal-gateway-vm-cleanup').on('click', function(){
    $('#dropdown-menu-cloud-cluster-status').toggle();
    $('#div-modal-cleanup-gateway-vm').hide();
    $('#div-modal-spinner-header-txt').text('게이트웨이 VM을을 클린업하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("게이트웨이 VM을 클립업 실패");
    $("#modal-status-alert-body").html("게이트웨이 VM 클린업을 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/gwvm/cleanup/cell',{
        method: 'PATCH',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        var retVal = JSON.parse(data.Message);
        if(retVal.code == 200){
            $("#modal-status-alert-title").html("게이트웨이 VM을 클린업 완료");
            $("#modal-status-alert-body").html("게이트웨이 VM 클린업을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            createLoggerInfo("gateway vm cleanup success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("gateway vm cleanup error : "+ data);
        console.log('button-execution-modal-gateway-vm-cleanup : '+data);
    });
});

$('#button-cancel-modal-gateway-vm-cleanup').on('click', function(){
    $('#div-modal-cleanup-gateway-vm').hide();
});
/** gateway vm cleanup modal 관련 action end */

/** gateway vm migration modal 관련 action start */
$('#button-close-modal-gateway-vm-migration').on('click', function(){
    $('#div-modal-migration-gateway-vm').hide();
});

$('#button-cancel-modal-gateway-vm-migration').on('click', function(){
    $('#div-modal-migration-gateway-vm').hide();
});

$('#button-execution-modal-gateway-vm-migration').on('click', function(){
    var valSelect = $('#form-select-gateway-vm-migration-node option:selected').val();
    if(valSelect == 'null'){
        $('#div-modal-migration-gateway-vm-select').text('선택이 잘못되었습니다. 마이그레이션할 노드를 선택해주세요.');
    }else{
        $('#dropdown-menu-cloud-cluster-status').toggle();
        $('#div-modal-migration-gateway-vm').hide();
        $('#div-modal-spinner-header-txt').text('클라우드센터VM을 마이그레이션하고 있습니다.');
        $('#div-modal-spinner').show();
        cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/cloud_cluster_status/card-cloud-cluster-status.py', 'pcsMigration', '--target', valSelect], { host: pcs_exe_host})
        .then(function(data){
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                CardCloudClusterStatus();
                createLoggerInfo("migration gateway vm select spawn success");
            }
            $('#div-modal-migration-gateway-vm-select').text('');
            $('#div-modal-spinner').hide();
        }).catch(function(data){
            createLoggerInfo("migration gateway vm select spawn error");
            console.log('div-modal-migration-gateway-vm-select spawn error');
        });
    }
});

$('#menu-item-gateway-vm-migrate').on('click', function(){
    $('#div-modal-migration-gateway-vm').show();
});
/** gateway vm migration modal 관련 action end */


// $('#cloud-cluster-connect').on('click', function(){
//     //클라우드센터 연결
//     cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/url/create_address.py', 'cloudCenter'])
//     .then(function(data){
//         var retVal = JSON.parse(data);        
//         if(retVal.code == 200){
//             window.open(retVal.val);
//         }else{
//             $("#modal-status-alert-title").html("클라우드센터 연결");
//             $("#modal-status-alert-body").html(retVal.val);
//             $('#div-modal-status-alert').show();
//         }
//         createLoggerInfo("cloud cluster connect success");
//     })
//     .catch(function(data){
//         createLoggerInfo("cloud cluster connect error");
//         console.log('cloud-cluster-connect');
//     });
// });

// // 클라우드 센터 클러스터 상태 조회 및 조회 결과값으로 화면 변경하는 함수
// function CardCloudClusterStatus(){
//     return new Promise((resolve) => {
//         //초기 상태 체크 중 표시
//         $('#cccs-status').html("상태 체크 중 &bull;&bull;&bull;&nbsp;&nbsp;&nbsp;<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
//         $("#cccs-back-color").attr('class','pf-c-label pf-m-orange');
//         $("#cccs-cluster-icon").attr('class','fas fa-fw fa-exclamation-triangle');

//         cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/cloud_cluster_status/card-cloud-cluster-status.py', 'pcsDetail' ], { host: pcs_exe_host})
//         .then(function(data){
//             cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/ablestack_json/ablestackJson.py', 'status', '--depth1', 'bootstrap', '--depth2', 'ccvm' ])
//                 .then(function (bootstrap_data){
//                     console.log("ablestackJson.py : "+bootstrap_data);
//                     var retVal = JSON.parse(bootstrap_data);
//                     var ccvmStatus = retVal.val;
//                     console.log("ccvmStatus.ccvm = " + ccvmStatus.ccvm);
//                     if(ccvmStatus.ccvm == 'false'){
//                         sessionStorage.setItem("ccvm_bootstrap_status","false");
//                         console.log('ccvm false in')
//                         $('#ccvm-after-bootstrap-run').html('');
//                         $('#ccvm-before-bootstrap-run').html('<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-bootstrap-run-ccvm" onclick="ccvm_bootstrap_run()">Bootstrap 실행</a>');
//                     }else if (ccvmStatus.ccvm == 'true'){
//                         sessionStorage.setItem("ccvm_bootstrap_status","true");
//                         console.log('ccvm true in')
//                         html_text = '<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-linkto-storage-center-ccvm" onclick="cccc_link_go()">클라우드센터 연결</a>'
//                         $('#ccvm-after-bootstrap-run').html(html_text);
//                         $('#ccvm-before-bootstrap-run').html('');
//                     }
//                 }).catch(function(data){
//                 console.log('ClusterStatusInfo spawn error(ablestackJson.py');

//             });
//             cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/ablestack_json/ablestackJson.py', 'status', '--depth1', 'monitoring', '--depth2', 'wall' ])
//                 .then(function (monitoring_data){
//                     console.log("ablestackJson.py : "+monitoring_data);
//                     var retVal = JSON.parse(monitoring_data);
//                     var wallStatus = retVal.val;
//                     console.log("wallStatus.wall = " + wallStatus.wall);
//                     if(wallStatus.wall == 'false'){
//                         sessionStorage.setItem("wall_monitoring_status","false");
//                         console.log('wall false in')
//                         $('#ccvm-before-monitoring-run').html('<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-monitoring-run-ccvm" onclick="wall_monitoring_run()">모니터링센터 구성</a>');
//                         $('#ccvm-after-monitoring-run').html('');
//                         $('#ccvm-monitoring-config-update').html('');
//                     }else if (wallStatus.wall == 'true'){
//                         sessionStorage.setItem("wall_monitoring_status","true");
//                         console.log('wall true in')
//                         $('#ccvm-before-monitoring-run').html('');
//                         $('#ccvm-after-monitoring-run').html('<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-linkto-wall" onclick="wall_link_go()">모니터링센터 대시보드 연결</a>');
//                         $('#ccvm-monitoring-config-update').html('<a class="pf-c-dropdown__menu-item" href="#" id="menu-item-update-wall-config" onclick="wall_config_update_modal()">모니터링센터 수집 정보 업데이트</a>');
//                     }
//                 }).catch(function(data){
//                     createLoggerInfo("ClusterStatusInfo spawn error(ablestackJson.py error");
//                     console.log('ClusterStatusInfo spawn error(ablestackJson.py');
//             });
//             var retVal = JSON.parse(data);
//             if(retVal.code == '200'){
//                 var nodeText = '( ';
//                 var selectHtml = '<option selected="" value="null">노드를 선택해주세요.</option>';
//                 $('#form-select-gateway-vm-migration-node option').remove();

//                 for(var i=0; i<Object.keys(retVal.val.clustered_host).length; i++){
//                     nodeText = nodeText +retVal.val.clustered_host[i];
//                     if(retVal.val.clustered_host[i] != retVal.val.started){
//                         selectHtml = selectHtml + '<option value="' + retVal.val.clustered_host[i] + '">' + retVal.val.clustered_host[i] + '</option>';
//                     }
//                     if(i == (Object.keys(retVal.val.clustered_host).length - 1)){

//                         nodeText = nodeText + ' )';
//                     }else{
//                         nodeText = nodeText + ', ';
//                     }
//                 }
//                 $('#cccs-back-color').attr('class','pf-c-label pf-m-green');
//                 $('#cccs-cluster-icon').attr('class','fas fa-fw fa-check-circle');
//                 $('#cccs-status').text('Health Ok');
//                 $('#cccs-node-info').text('총 ' + Object.keys(retVal.val.clustered_host).length + '노드로 구성됨 : ' + nodeText);
//                 sessionStorage.setItem("cc_status", "HEALTH_OK");
//                 if(retVal.val.active == 'true'){
//                     $('#cccs-resource-status').text('실행중');
//                     $('#cccs-execution-node').text(retVal.val.started);

//                     $("#button-cloud-cluster-start").addClass('pf-m-disabled');
//                     $("#button-cloud-cluster-stop").removeClass('pf-m-disabled');
//                     $("#button-cloud-cluster-cleanup").removeClass('pf-m-disabled');
//                     $("#button-cloud-cluster-migration").removeClass('pf-m-disabled');
//                     $("#button-cloud-cluster-connect").removeClass('pf-m-disabled');
//                     $("#card-action-gateway-vm-change").addClass('pf-m-disabled');
//                     $("#button-gateway-vm-snap-backup").removeClass('pf-m-disabled');
//                     $("#button-gateway-vm-snap-rollback").addClass('pf-m-disabled');
//                     $("#button-mold-service-control").removeClass('pf-m-disabled');
//                     $("#button-mold-db-control").removeClass('pf-m-disabled');
//                     $("#card-action-gateway-vm-db-dump").removeClass('pf-m-disabled');
//                     $("#menu-item-set-auto-shutdown-step-two").removeClass('pf-m-disabled');

//                     $('#form-select-gateway-vm-migration-node').append(selectHtml);
//                 }else if(retVal.val.active == 'false'){
//                     $('#cccs-resource-status').text('정지됨');
//                     $('#cccs-execution-node').text('N/A');
//                     $('#div-mold-service-status').text('N/A');
//                     $('#div-mold-db-status').text('N/A');

//                     $("#button-cloud-cluster-start").removeClass('pf-m-disabled');
//                     $("#button-cloud-cluster-stop").addClass('pf-m-disabled');
//                     $("#button-cloud-cluster-cleanup").removeClass('pf-m-disabled');
//                     $("#button-cloud-cluster-migration").addClass('pf-m-disabled');
//                     $("#button-cloud-cluster-connect").addClass('pf-m-disabled');
//                     $("#card-action-gateway-vm-change").removeClass('pf-m-disabled');
//                     $("#button-gateway-vm-snap-backup").removeClass('pf-m-disabled');
//                     $("#button-gateway-vm-snap-rollback").removeClass('pf-m-disabled');
//                     $("#button-mold-service-control").addClass('pf-m-disabled');
//                     $("#button-mold-db-control").addClass('pf-m-disabled');
//                     $("#card-action-gateway-vm-db-dump").addClass('pf-m-disabled');
//                     $("#menu-item-set-auto-shutdown-step-two").addClass('pf-m-disabled');
//                 }
//                 $('#cccs-low-info').text('클라우드센터 클러스터가 구성되었습니다.');
//                 $('#cccs-low-info').attr('style','color: var(--pf-global--success-color--100)')
//             }else if(retVal.code == '400' && retVal.val == 'cluster is not configured.'){
//                 $('#cccs-status').text('Health Err');
//                 $('#cccs-back-color').attr('class','pf-c-label pf-m-red');
//                 $('#cccs-cluster-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                 $('#cccs-low-info').text('클라우드센터 클러스터가 구성되지 않았습니다.');
//                 sessionStorage.setItem("cc_status", "HEALTH_ERR1");
//             }else if(retVal.code == '400' && retVal.val == 'resource not found.'){
//                 $('#cccs-status').text('Health Err');
//                 $('#cccs-back-color').attr('class','pf-c-label pf-m-red');
//                 $('#cccs-cluster-icon').attr('class','fas fa-fw fa-exclamation-triangle');
//                 $('#cccs-low-info').text('클라우드센터 클러스터는 구성되었으나 리소스 구성이 되지 않았습니다.');
//                 sessionStorage.setItem("cc_status", "HEALTH_ERR2");
//             }else{
//                 createLoggerInfo("ClusterStatusInfo spawn error");
//                 console.log('ClusterStatusInfo spawn error');
//             }

//             resolve();
//         }).catch(function(data){
//             createLoggerInfo("ClusterStatusInfo spawn error");
//             console.log('ClusterStatusInfo spawn error');
//             resolve();
//         });
//     });
// }

// function cccc_link_go(){
//     // 클라우드센터 연결
//     createLoggerInfo("cccc_link_go() start");
//     cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "cloudCenter"])
//         .then(function(data){
//             var retVal = JSON.parse(data);
//             if(retVal.code == 200){
//                 window.open(retVal.val);
//             }else{
//                 alert("클라우드센터에 연결할 수 없습니다.\n클라우드센터 가상머신 및 Mold 서비스를 확인해주세요.");
//             }
//         })
//         .catch(function(data){
//             //console.log(":::Error:::");
//         });
// }
