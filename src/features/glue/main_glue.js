/**
 * File Name : main_glue.js
 * Date Created : 2023.04.25
 * Writer  :배태주
 * Description : main_glue.html에서 발생하는 이벤트 처리를 위한 JavaScript
 **/

// document.ready 영역 시작
pluginpath = '/usr/share/cockpit/ablestack';
var console_log = true;

$(document).ready(function(){
    $('#div-modal-wizard-gateway-vm').load("./src/features/glue/gateway-vm-wizard.html");
    $('#div-modal-wizard-gateway-vm').hide();
    $('#iscsi-target').hide();
    $('#iscsi-non').hide();
    $('#dropdown-menu-iscsi').hide();
    $('#form-label-image-list').hide();

    gwvmInfoSet();
    setInterval(() => {
        gwvmInfoSet();
    }, 10000);

    iscsiInfoSet();
});
// document.ready 영역 끝

// 이벤트 처리 함수
$('#button-open-modal-wizard-gateway-vm').on('click', function(){
    $('#div-modal-wizard-gateway-vm').show();
});

$('#card-action-iscsi').on('click', function(){
    $('#dropdown-menu-iscsi').toggle();
});

/** 스토리지 서비스 구성 관련 action start */
$('#button-gateway-vm-setup').on('click', function(){
    $('#div-modal-gateway-vm-setup').show();
});


$('#input-checkbox-nfs').on('change', function(){
    if ($('#input-checkbox-nfs').is(':checked') == true) {
        $('#dev-nfs-info').show();
    }else{
        $('#dev-nfs-info').hide();
    }
});

$('#input-checkbox-smb').on('change', function(){
    if ($('#input-checkbox-smb').is(':checked') == true) {
        $('#dev-smb-info').show();
    }else{
        $('#dev-smb-info').hide();
    }
});

$('#input-checkbox-gluefs').on('change', function(){
    if ($('#input-checkbox-gluefs').is(':checked') == true) {
        $('#dev-gluefs-info').show();
    }else{
        $('#dev-gluefs-info').hide();
    }
});

$('#input-checkbox-iscsi').on('change', function(){
    if ($('#input-checkbox-iscsi').is(':checked') == true) {
        $('#dev-iscsi-info').show();
    }else{
        $('#dev-iscsi-info').hide();
    }
});

//div-modal-status-alert modal 닫기
$('#modal-status-alert-button-close1, #modal-status-alert-button-close2').on('click', function(){
    $('#div-modal-status-alert').hide();
});

/** iSCSI 관련 action start */
// iSCSI 구성
$('#menu-item-iscsi-config').on('click', function(){
    $('#div-modal-config-iscsi').show();
});

$('#button-close-modal-config-iscsi').on('click', function(){
    $('#div-modal-config-iscsi').hide();
});

$('#button-cancel-modal-config-iscsi').on('click', function(){
    $('#div-modal-config-iscsi').hide();
});

$('#button-execution-modal-config-iscsi').on('click', function(){
    $('#div-modal-config-iscsi').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI를 구성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI 구성");
    $("#modal-status-alert-body").html("iSCSI 구성을 실패하였습니다.");

    cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'config'])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-body").html("iSCSI 구성을 성공하였습니다");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI 구성 실패 : " + retVal.val);
        }
    })
    .catch(function(error){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("iSCSI 구성 실패 : " + error);
    });
});

// iSCSI 삭제
$('#menu-item-iscsi-destroy').on('click', function(){
    $('#div-modal-destroy-iscsi').show();
});

$('#button-close-modal-destroy-iscsi').on('click', function(){
    $('#div-modal-destroy-iscsi').hide();
});

$('#button-cancel-modal-destroy-iscsi').on('click', function(){
    $('#div-modal-destroy-iscsi').hide();
});

$('#button-execution-modal-destroy-iscsi').on('click', function(){
    $('#div-modal-destroy-iscsi').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI를 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI 삭제");
    $("#modal-status-alert-body").html("iSCSI 삭제를 실패하였습니다.");

    cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'destroy'])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-body").html("iSCSI 삭제를 성공하였습니다");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI 삭제 실패 : " + retVal.val);
        }
    })
    .catch(function(error){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("iSCSI 삭제 실패 : " + error);
    });
});

// iSCSIS 서비스 제어
$('#menu-item-iscsi-control').on('click', function(){
    $('#div-modal-iscsi-service-control').show();
});

$('#button-close-iscsi-service-control').on('click', function(){
    $('#div-modal-iscsi-service-control').hide();
});

$('#button-cancel-modal-iscsi-service-control').on('click', function(){
    $('#div-modal-iscsi-service-control').hide();
});

$('#button-execution-modal-iscsi-service-control').on('click', function(){
    var valSelect = $('#form-select-iscsi-service-control option:selected').val();
    var txtSelect = $('#form-select-iscsi-service-control option:selected').text();
    if(txtSelect != "선택하십시오"){
        $('#div-modal-iscsi-service-control').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI 서비스를 '+txtSelect+'하고 있습니다.');
        $('#div-modal-spinner').show();

        $("#modal-status-alert-title").html("iSCSI 서비스 "+txtSelect+" 실패");
        $("#modal-status-alert-body").html("iSCSI 서비스 "+txtSelect+"을(를) 실패하였습니다. iSCSI 상태를 점검해주십시오.");

        cockpit.spawn(['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'daemon', '--control', valSelect])
        .then(function(data){
            $('#div-modal-spinner').hide();
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                $("#modal-status-alert-title").html("iSCSI 서비스 "+txtSelect+" 완료");
                $("#modal-status-alert-body").html("iSCSI 서비스 "+txtSelect+"을(를) 완료하였습니다.");
                $('#div-modal-status-alert').show();
            } else {
                $('#div-modal-spinner').hide();
                $('#div-modal-status-alert').show();
                createLoggerInfo("iSCSI 서비스 제어 실패 : " + retVal.val);
            }
        }).catch(function(error){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI 서비스 제어 실패 : " + error);
        });
    }
});

// iSCSI 타겟 생성
$('#menu-item-iscsi-target-create').on('click', function(){
    var iqn = lunMasking();
    $('input[name=input-target-iqn]').attr('value', iqn);
    $('#div-modal-create-iscsi-target').show();
});

$('#button-close-modal-create-iscsi-target').on('click', function(){
    $('#div-modal-create-iscsi-target').hide();
});

$('#button-cancel-modal-create-iscsi-target').on('click', function(){
    $('#div-modal-create-iscsi-target').hide();
});

$('#button-execution-modal-create-iscsi-target').on('click', function(){
    if(validateTarget()){
        $('#div-modal-create-iscsi-target').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI 타겟을 생성하고 있습니다.');
        $('#div-modal-spinner').show();
        $("#modal-status-alert-title").html("iSCSI 타겟 생성");
        $("#modal-status-alert-body").html("iSCSI 타겟 생성에 실패하였습니다.");
        var iqn = document.getElementById('input-target-iqn').value;
        var name = document.getElementById('image-name').value;
        var num = document.getElementById('image-size').value;
        var type = $("#form-modal-select-image-size option:selected").val();
        var path = $("#form-select-target-image option:selected").val();
    
        if (path != undefined){
            var cmd = ['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'create', '--iqn', iqn, '--name', path.substring(path.indexOf("/")+1)];
        }else{
            var cmd = ['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'create', '--iqn', iqn, '--name', name, '--size', num+type];
        }
        cockpit.spawn(cmd).then(function(data){
            var retVal = JSON.parse(data);
            if(retVal.code == 200){
                $('#div-modal-spinner').hide();
                $("#modal-status-alert-body").html("iSCSI 타겟 생성을 성공하였습니다");
                $('#div-modal-status-alert').show();
            }else{
                $('#div-modal-spinner').hide();
                $('#div-modal-status-alert').show();
                createLoggerInfo("iSCSI 타겟 생성 실패 : " + retVal.val);
            }
        })
        .catch(function(error){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI 타겟 생성 실패 : " + error);
        });
    }
});

$("input[name='radio-image']").change(function(){
    if($("input[name='radio-image']:checked").val() == 'new'){
        $('#form-label-image-name').show();
        $('#form-label-image-size').show();
        $('#form-label-image-list').hide();
    }else{
        setImageInfo('form-select-target-image');
        $('#form-label-image-name').hide();
        $('#form-label-image-size').hide();
        $('#form-label-image-list').show();
        $('#form-target-image').remove();
    } 
});

// iSCSI ACL 연결
$('#menu-item-iscsi-acl').on('click', function(){
    // storageCenter url 링크 주소 가져오기
    cockpit.spawn(["python3", pluginpath+"/python/url/create_address.py", "storageCenter"])
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            // 스토리지센터 연결
            window.open(retVal.val+'/#/iscsi');
        }else{
            $("#modal-status-alert-title").html("ACL 설정 연결");
            $("#modal-status-alert-body").html("ACL 설정 연결에 실패하였습니다.");
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI ACL 연결 실패 : " + retVal.val);
        }
    })
    .catch(function(error){
        $("#modal-status-alert-title").html("ACL 설정 연결");
        $("#modal-status-alert-body").html("ACL 설정 연결에 실패하였습니다.");
        $('#div-modal-status-alert').show();
        createLoggerInfo("iSCSI ACL 연결 실패 : " + error);
    });
});

// iSCSI 타겟 편집
function targetEdit(e){
    var tr = $(e).parent();
    var td = tr.children();
    var image = td.eq(2).text();
    document.getElementById("image").innerHTML = image;
    if (image){
        $('#div-modal-edit-iscsi-target').show();
    }
}

$('#button-close-modal-edit-iscsi-target').on('click', function(){
    $('#div-modal-edit-iscsi-target').hide();
});

$('#button-cancel-modal-edit-iscsi-target').on('click', function(){
    $('#div-modal-edit-iscsi-target').hide();
});

$('#button-execution-modal-edit-iscsi-target').on('click', function(){
    $('#div-modal-edit-iscsi-target').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI 타겟을 편집하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI 타겟 편집");
    $("#modal-status-alert-body").html("iSCSI 타겟 편집에 실패하였습니다.");

    var image = document.getElementById("image").innerText;
    var name = image.substring(image.indexOf("/")+1);
    var num = document.getElementById('imageSize').value;
    var type = $("#form-modal-select-image-size option:selected").val();
    var cmd = ['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'edit', '--name', name, '--size', num+type.charAt(0).toLowerCase()];
    cockpit.spawn(cmd)
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-body").html("iSCSI 타겟 편집을 성공하였습니다");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI 타겟 편집 실패 : " + retVal.val);
        }
    })
    .catch(function(error){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("iSCSI 타겟 편집 실패 : " + error);
    });
});

// iSCSI 타겟 삭제
function targetDelete(e){
    var tr = $(e).parent();
    var td = tr.children();
    var iqn = td.eq(0).text();
    var image = td.eq(2).text();
    document.getElementById("iqn").innerHTML = iqn;
    document.getElementById("image").innerHTML = image;
    var disable = document.getElementById("delete-iscsi-target-disable")
    if(image){
        disable.style.display = 'block';
    } else {
        disable.style.display = 'none';
    }
    $('#div-modal-delete-iscsi-target').show();
}

$('#button-close-modal-delete-iscsi-target').on('click', function(){
    $('#div-modal-delete-iscsi-target').hide();
});

$('#button-cancel-modal-delete-iscsi-target').on('click', function(){
    $('#div-modal-delete-iscsi-target').hide();
});

$('#button-execution-modal-delete-iscsi-target').on('click', function(){
    $('#div-modal-delete-iscsi-target').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI 타겟을 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI 타겟 삭제");
    $("#modal-status-alert-body").html("iSCSI 타겟 삭제에 실패하였습니다.");

    var iqn = document.getElementById("iqn").innerText;
    var image = document.getElementById("image").innerText
    var name = image.substring(image.indexOf("/")+1);
    var image_check = $('input[type=checkbox][id="check-delete-iscsi-target"]').is(":checked");
    if(image_check){
        var cmd = ['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'delete', '--iqn', iqn, '--name', name];
    } else {
        var cmd = ['/usr/bin/python3', pluginpath + '/python/glue/iscsi.py', 'delete', '--iqn', iqn];
    }
    cockpit.spawn(cmd)
    .then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == 200){
            $('#div-modal-spinner').hide();
            $("#modal-status-alert-body").html("iSCSI 타겟 삭제를 성공하였습니다");
            $('#div-modal-status-alert').show();
        }else{
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI 타겟 삭제 실패 : " + retVal.val);
        }
    })
    .catch(function(error){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("iSCSI 타겟 삭제 실패 : " + error);
    });
});

/**
 * Method Name : validateGatewayVm
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

    var cmd = ['python3', pluginpath + '/python/gwvm/gwvm_status_check.py',"check"];

    if(console_log){console.log(cmd);}
    cockpit.spawn(cmd).then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == "200"){
            if(retVal.val["role"] == "Started"){
                var started_host = retVal.val["started"];
                var core = retVal.val['CPU(s)'];
                var mem = toBytes(retVal.val['Max memory'])
                var ip = retVal.val["ip"];
                var prefix = retVal.val["prefix"];
                var gw = retVal.val["gw"];
                var disk_cap = retVal.val["disk_cap"];
                var disk_phy = retVal.val["disk_phy"];
                var disk_usage_rate = retVal.val["disk_usage_rate"];
    
                $("#gwvm-status").text("Running");
                $("#gwvm-back-color").attr('class','pf-c-label pf-m-green');
                $("#gwvm-cluster-icon").attr('class','fas fa-fw fa-check-circle');

                $('#td_gwvm_started_host').text(retVal.val["started"]);
                $('#td_gwvm_cpu_mem').text(retVal.val['CPU(s)'] + " vCore / " + toBytes(retVal.val['Max memory']));
                $('#td_gwvm_ip_prefix').text(retVal.val["ip"] + "/" + retVal.val["prefix"]);
                $('#td_gwvm_gw').text(retVal.val["gw"]);
                $('#td_gwvm_root_disk').text(retVal.val["disk_cap"] + " (사용가능 " + retVal.val["disk_phy"] + " / 사용률 " + retVal.val["disk_usage_rate"] + ")");
            }else{
                $("#gwvm-status").text("Stopped");
                cleanGwvmInfo();
            }
        } else if (retVal.code == "400"){
            cleanGwvmInfo();
            $("#gwvm-back-color").attr('class','pf-c-label pf-m-orange');
            $("#gwvm-cluster-icon").attr('class','fas fa-fw fa-exclamation-triangle');
            $("#gwvm-status").text("N/A");
        } else {
            cleanGwvmInfo();
            $("#gwvm-status").text("Health Err");
        }
    })
    .catch(function(data){
        cleanGwvmInfo()
        $("#gwvm-status").text("Health Err");
        createLoggerInfo("게이트웨이 가상머신 정보 조회 실패");
    });
}

function cleanGwvmInfo(){
    $("#gwvm-back-color").attr('class','pf-c-label pf-m-red');
    $("#gwvm-cluster-icon").attr('class','fas fa-fw fa-exclamation-triangle');
    $('#td_gwvm_started_host').text("N/A");
    $('#td_gwvm_cpu_mem').text("N/A");
    $('#td_gwvm_ip_prefix').text("N/A");
    $('#td_gwvm_gw').text("N/A");
    $('#td_gwvm_root_disk').text("N/A");
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
    const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let l = 0, n = parseInt(bytes, 10) || 0;
    while(n >= 1024 && ++l){
        n = n/1024;
    }
    return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l]);
}

function lunMasking(){
    // ex) iqn.2023-05.io.ablecloud:1685505023774
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth();
    month += 1;
    if(month <= 9){
        month = "0" + month;
    }
    let num = ''
    for(let i = 0; i < 13; i++){
        num += Math.floor(Math.random() * 10)
    }
    return "iqn."+year+"-"+month+".io.ablecloud:"+num
}


/**
 * Method Name : iscsiInfoSet
 * Date Created : 2023.05.25
 * Writer  : 박다정
 * Description : iSCSI 카드 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.25 최초 작성
 */
function iscsiInfoSet(){
    var cmd = ['python3', pluginpath + '/python/glue/iscsi.py',"list"];
    cockpit.spawn(cmd).then(function(data){
        var retVal = JSON.parse(data);
        var iscsiArr = new Array();
        var cnt = 0;
        if(retVal.code == "200"){
            var list = JSON.parse(retVal.val);
            var table = document.getElementById('iscsi-target-list');
            if(list.length == 0){
                var row = `<tr>
                                <td role="cell" style="text-align:center; color:gray;" colspan="6">iSCSI 타겟이 없습니다.</td>
                            </tr>`;
                table.innerHTML += row
            }else{
                for(var i=0; i<list.length; i++){
                    var diskList = list[i].disks;
                    if (diskList.length != 0) {
                        iscsiArr.push({'iqn': list[i].target_iqn, 'ip': list[i].portals[0].ip, 'image': diskList[0].pool+'/'+diskList[0].image, 'size': ''});
                        var rbd = ['python3', pluginpath + '/python/glue/iscsi.py', "image", "--name", diskList[0].image];
                        cockpit.spawn(rbd).then(function(data){
                            var retVal = JSON.parse(data);
                            if(retVal.code == "200"){ 
                                var name = JSON.parse(retVal.val).name
                                var size = JSON.parse(retVal.val).size;
                                var index = iscsiArr.findIndex((item) => item.image.substring(item.image.indexOf("/")+1) == name);
                                iscsiArr[index].size = size
                            }
                        })
                        .catch(function(error){
                        });
                    }else{
                        iscsiArr.push({'iqn': list[i].target_iqn, 'ip': list[i].portals[0].ip, 'image': '', 'size': ''});
                    }
                }
                for(var j=0; j<iscsiArr.length; j++){
                    var row = `<tr id='iscsi-tr${j}'>
                                    <td role="cell" data-label="대상" id="iscsi-target-iqn">${iscsiArr[j].iqn}</td>
                                    <td role="cell" data-label="포털" id="iscsi-target-ip">${iscsiArr[j].ip}</td>
                                    <td role="cell" data-label="이미지" id="iscsi-target-image">${iscsiArr[j].image}</td>
                                    <td role="cell" data-label="이미지" id="iscsi-target-size">${bytesToSize(iscsiArr[j].size)}</td>
                                    <td class="pf-c-table__inline-edit-action" role="cell" onClick="targetEdit(this)">
                                        <div class="pf-c-inline-edit__action pf-m-enable-editable">
                                            <button class="pf-c-button pf-m-plain" type="button" id="iscsi-target-edit" aria-label="Edit">
                                                <i class="fas fa-edit" aria-hidden="true"></i>
                                            </button>
                                        </div>
                                    </td>
                                    <td class="pf-c-table__inline-edit-action" role="cell" onClick="targetDelete(this)">
                                        <div class="pf-c-inline-edit__action pf-m-enable-editable">
                                            <button class="pf-c-button pf-m-plain" type="button" id="iscsi-target-delete" aria-label="Delete" data-toggle="modal" data-target="#div-modal-delete-iscsi-target  data-title="data">
                                            <i class="fas fa-trash" aria-hidden="true"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>`;
                    table.innerHTML += row
                }
            }
            $('#iscsi-target').show();
            $("#menu-item-iscsi-config").addClass('pf-m-disabled');
            $("#menu-item-iscsi-destroy").removeClass('pf-m-disabled');
            $("#menu-item-iscsi-control").removeClass('pf-m-disabled');
            $("#menu-item-iscsi-target-create").removeClass('pf-m-disabled');
            $("#menu-item-iscsi-acl").removeClass('pf-m-disabled');
        }else{
            $('#iscsi').empty();
            $('#iscsi-non').show();
            $("#menu-item-iscsi-config").removeClass('pf-m-disabled');
            createLoggerInfo("iSCSI 목록 조회 실패 : "+retVal.val);
        }
    })
    .catch(function(error){
        $('#iscsi').empty();
        $('#iscsi-non').show();
        $("#menu-item-iscsi-config").removeClass('pf-m-disabled');
        createLoggerInfo("iSCSI 목록 조회 실패 : "+error);
    });
}

/**
 * Method Name : setImageInfo
 * Date Created : 2023.05.25
 * Writer  : 박다정
 * Description : iSCSI 타겟에 연결할 이미지 조회
 * Parameter : 없음
 * Return  : 없음
 * History  : 2023.05.25 최초 작성
 */
function setImageInfo(select_box_id){
    var cmd = ['python3', pluginpath + '/python/glue/iscsi.py',"image"];
    cockpit.spawn(cmd).then(function(data){
        $('#'+select_box_id).empty();
        var el=''
        var imageArr = [];
        var retVal = JSON.parse(data);
        if(retVal.code == "200"){
            var result = JSON.parse(retVal.val);
            var targetArr = targetImageList();
            for(var i=0; i<result.length; i++){
                for(var j=0; j<result[i].value.length; j++){
                    imageArr.push(result[i].value[j].pool_name+'/'+result[i].value[j].name);  
                }
            }
            imageArr.filter((item)=>!item.includes(targetArr.name));
            el += '<option value="" selected>선택하십시오</option>';
            for(var k=0; k<imageArr.length; k++){
                el += '<option value="'+imageArr[k]+'">'+imageArr[k]+'</option>';
            }
            $('#'+select_box_id).append(el);
        }else{
            createLoggerInfo("iSCSI 타겟에 연결할 이미지 조회 실패 : "+retVal.val);
            alert("iSCSI 타겟에 연결할 이미지 조회 실패 : "+retVal.val);
        }
    })
    .catch(function(error){
        createLoggerInfo("iSCSI 타겟에 연결할 이미지 조회 실패 : "+error);
        alert("iSCSI 타겟에 연결할 이미지 조회 실패 : "+error);
    });
}

function validateTarget(){
    var validate_check = true;
    // 이미지 생성시 최대 10TB 체크
    var num = document.getElementById('image-size').value;
    var type = $("#form-modal-select-image-size option:selected").val();
    if((type=="g" && num>10000)||(type=="t" && num>10)) {
        validate_check = false;
        alert("최대 10TB까지 입력할 수 있습니다.");
    }
    // 이미지 선택하지 않은 경우와 이미지가 없는 경우 체크
    var path = $("#form-select-target-image option:selected").val();
    if($("input[name='radio-image']:checked").val() != 'new'){
        if(path==""){
            validate_check = false;
            alert("이미지를 선택하거나, 이미지가 없는 경우 신규 생성을 선택하여 진행해주십시오."); 
        }
        var list = rbdImageList();
        if(list == undefined) {
            validate_check = false;
        }else if(list.length !== 0) {
            // 이미지 이름 중복 체크
            var name = document.getElementById('image-name').value;
            for(var i=0; i<list.length; i++){
                if(list[i].name = name){
                    validate_check = false;
                    alert("동일한 명의 이미지가 존재합니다.");
                }
            }
        }
    }
    return validate_check;
}

/**
 * Method Name : targetImageList
 * Date Created : 2023.05.25
 * Writer  : 박다정
 * Description : iSCSI 타겟에 연결된 이미지 조회
 * Parameter : 없음
 * Return  : rbd 이미지 이름, 크기
 * History  : 2023.05.25 최초 작성
 */
function targetImageList(callback){
    var imageArr = [];
    var cmd = ['python3', pluginpath + '/python/glue/iscsi.py',"list"];
    cockpit.spawn(cmd).then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == "200"){
            var list = JSON.parse(retVal.val);
            for(var i=0; i<list.length; i++){
                var diskList = list[i].disks;
                if(diskList.length != 0){
                    var rbd = ['python3', pluginpath + '/python/glue/iscsi.py', "image", "--name", diskList[0].image];
                    cockpit.spawn(rbd).then(function(data){
                        var retVal = JSON.parse(data);
                        if(retVal.code == "200"){ 
                            var name = JSON.parse(retVal.val).name
                            var size = JSON.parse(retVal.val).size;
                            imageArr.push({'name':name, 'size':size});
                            callback(imageArr);
                        }else{
                            createLoggerInfo("iSCSI 타겟에 연결된 이미지 조회 실패 : "+retVal.val);
                            alert("iSCSI 타겟에 연결된 이미지 조회 실패 : "+retVal.val);
                        }
                    })
                    .catch(function(error){
                        createLoggerInfo("iSCSI 타겟에 연결된 이미지 조회 실패 : "+error);
                        alert("iSCSI 타겟에 연결된 이미지 조회 실패 : "+error);
                    });
                }
            }
        }else{
            createLoggerInfo("iSCSI 조회 실패 : "+retVal.val);
            alert("iSCSI 조회 실패 : "+retVal.val);
        }
    })
    .catch(function(error){
        createLoggerInfo("iSCSI 조회 실패 : "+error);
        alert("iSCSI 조회 실패 : "+error);
    });
}

/**
 * Method Name : rbdImageList
 * Date Created : 2023.05.25
 * Writer  : 박다정
 * Description : rbd 이미지 조회
 * Parameter : 없음
 * Return  : rbd 이미지 이름, 크기
 * History  : 2023.05.25 최초 작성
 */
function rbdImageList(callback){
    var imageArr = [];
    var cmd = ['python3', pluginpath + '/python/glue/iscsi.py',"image"];
    cockpit.spawn(cmd).then(function(data){
        var retVal = JSON.parse(data);
        if(retVal.code == "200"){
            var result = JSON.parse(retVal.val);
            for(var i=0; i<result.length; i++){
                for(var j=0; j<result[i].value.length; j++){
                    imageArr.push({'name':result[i].value[j].name, 'size':result[i].value[j].size});
                }
            }
            callback(imageArr);
        }else{
            createLoggerInfo("rbd 이미지 조회 실패 : "+retVal.val);
            alert("rbd 이미지 조회 실패 : "+retVal.val);
        }
    })
    .catch(function(error){
        createLoggerInfo("rbd 이미지 조회 실패 : "+error);
        alert("rbd 이미지 조회 실패 : "+error);
    });
}