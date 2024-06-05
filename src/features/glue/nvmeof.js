/**
 * File Name : nvmeof.js
 * Date Created : 2024.04.25
 * Writer  : 배태주
 * Description : nvmeof service, nvmeof target 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function nvmeofServiceList(){
    //조회
    $('#button-nvmeof-service-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service?service_type=nvmeof',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            $('#nvmeof-service-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="이름">'+data[i].service_name+'</td>';
                insert_tr += '    <td role="cell" data-label="상태">'+data[i].status.running+'/'+data[i].status.size+'</td>';
                if(data[i].placement.hosts != "" && data[i].placement.hosts != undefined){
                    insert_tr += '    <td role="cell" data-label="배치 호스트">'+data[i].placement.hosts+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="배치 호스트">'+data[i].placement.count+' 대 배치</td>';
                }
                insert_tr += '    <td role="cell" data-label="데이터 풀">'+data[i].spec.pool+'</td>';
                insert_tr += '    <td role="cell" data-label="Ports">'+data[i].status.ports+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-nvmeof-service-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-nvmeof-service-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-nvmeof-service-status'+i+'" id="dropdown-menu-card-action-nvmeof-service-status'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-nvmeof-service-remove" onclick=\'nvmeofServiceDelete("'+data[i].service_name+'")\' >NVMe-oF 서비스 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#nvmeof-service-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-nvmeof-service-status'+i).hide();
            }
        }else{
            noList("nvmeof-service-list",6);
        }
        $('#button-nvmeof-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("nvmeof-service-list",6);
        $('#button-nvmeof-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

$('#button-nvmeof-service-search').on('click', function(){
    nvmeofServiceList();
});

/** NVMe-of Service create 관련 action start */
$('#button-nvmeof-service-create').on('click', function(){
    nvmeofServiceCreateInitInputValue();
    setSelectHostsCheckbox('div-nvmeof-glue-hosts-list','form-input-nvmeof-placement-hosts');
    $('#div-modal-create-nvmeof-service').show();
});

$('#button-close-modal-create-nvmeof-service').on('click', function(){
    $('#div-modal-create-nvmeof-service').hide();
});

$('#button-cancel-modal-create-nvmeof-service').on('click', function(){
    $('#div-modal-create-nvmeof-service').hide();
});

$('#button-execution-modal-create-nvmeof-service').on('click', function(){
    if(nvmeofCreateValidateCheck()){
        var pool_name = $('#form-input-nvmeof-service-id').val();
    
        var body_val = "pool_name="+pool_name;
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hosts="+this.value;
            }
        });
    
        $('#div-modal-create-nvmeof-service').hide();
        $('#div-modal-spinner-header-txt').text('NVMe-oF Service를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("NVMe-oF Service 생성 실패");
        $("#modal-status-alert-body").html("NVMe-oF Service 생성을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/nvmeof',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("NVMe-oF Service 생성 완료");
                $("#modal-status-alert-body").html("NVMe-oF Service 생성을 완료하였습니다.<br/>조회 버튼을 클릭하여 서비스 상태를 확인할 수 있습니다.");
                $('#div-modal-status-alert').show();
                nvmeofServiceList();
                createLoggerInfo("NVMe-oF Service create success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("NVMe-oF Service create error : "+ data);
            console.log('button-execution-modal-create-nvmeof-service : '+data);
        });
    }
});
/** NVMe-of Service create 관련 action end */


/** NVMe-of Service delete 관련 action start */
function nvmeofServiceDelete(nvmeof_service_id){
    $('#input-checkbox-nvmeof-service-remove').prop('checked',false);
    $('#div-modal-remove-nvmeof-service').show();
    $('#nvmeof-service-id').val(nvmeof_service_id);
    $('#nvmeof-service-text').text('선택하신 '+nvmeof_service_id+' 을(를) 삭제하시겠습니까?');
}

$('#menu-item-nvmeof-service-remove').on('click', function(){
    $('#div-modal-remove-nvmeof-service').show();
});

$('#button-close-modal-remove-nvmeof-service').on('click', function(){
    $('#div-modal-remove-nvmeof-service').hide();
});

$('#button-cancel-modal-remove-nvmeof-service').on('click', function(){
    $('#div-modal-remove-nvmeof-service').hide();
});

$('#button-execution-modal-remove-nvmeof-service').on('click', function(){
    if($('#input-checkbox-nvmeof-service-remove').is(":checked")){
        var nvmeof_service_id = $('#nvmeof-service-id').val()
        
        $('#div-modal-remove-nvmeof-service').hide();
        $('#div-modal-spinner-header-txt').text('NVMe-of Service를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("NVMe-of Service 삭제 실패");
        $("#modal-status-alert-body").html("NVMe-of Service 삭제를 실패하였습니다.");
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service/'+nvmeof_service_id,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("NVMe-of Service 삭제 완료");
                $("#modal-status-alert-body").html("NVMe-of Service 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                createLoggerInfo("NVMe-of Service remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
            nvmeofServiceList();
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("NVMe-of Service remove error : "+ data);
            console.log('button-execution-modal-remove-nvmeof-service : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  NVMe-of Service delete 관련 action end */

// nvmeof service 생성 입력값 초기화
function nvmeofServiceCreateInitInputValue(){
    $('#form-input-nvmeof-service-id').val("");
    $('#form-input-nvmeof-placement-hosts').val("");
}

function nvmeofTargetList(){
    //조회
    $('#button-nvmeof-target-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/nvmeof/target',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length > 0 || (data.code != undefined && data.code!="no_gateways_defined")){
            $('#nvmeof-target-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="NQN">'+data[i].nqn+'</td>';
                if(data[i].listen_addresses != undefined && data[i].listen_addresses != ""){
                    var ip_list=[];
                    for(var j=0; j < data[i].listen_addresses.length; j++){
                        ip_list.push(data[i].listen_addresses[j].traddr);
                    }
                    insert_tr += '    <td role="cell" data-label="IP">'+ip_list+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="IP">N/A</td>';
                }

                if(data[i].namespaces != undefined && data[i].namespaces != ""){
                    var disk_list=[];
                    for(var j=0; j < data[i].namespaces.length; j++){
                        disk_list.push(data[i].namespaces[j].rbd_pool_name+'/'+data[i].namespaces[j].rbd_image_name);
                    }
                    insert_tr += '    <td role="cell" data-label="디스크 정보">'+disk_list+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="디스크 정보">N/A</td>';
                }               
                
                insert_tr += '    <td role="cell" data-label="세션 수">'+data[i].session+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-nvmeof-target-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-nvmeof-target-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-nvmeof-target-status'+i+'" id="dropdown-menu-card-action-nvmeof-target-status'+i+'">'
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-nvmeof-target-remove" onclick=\'nvmeofTargetDelete("'+data[i].nqn+'")\' >NVMe-of 타겟 삭제</button>'
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#nvmeof-target-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-nvmeof-target-status'+i).hide();
            }
        }else{
            noList("nvmeof-target-list",5);
        }
        $('#button-nvmeof-target-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        noList("nvmeof-target-list",5);
        $('#button-nvmeof-target-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** NVMe-of target search 관련 action start */
$('#button-nvmeof-target-search').on('click', function(){
    nvmeofTargetList();
});
/** NVMe-of target search 관련 action end */

/** NVMe-of target create 관련 action start */
$('#button-nvmeof-target-create').on('click', function(){
    nvmeofTargetCreateInitInputValue();
    $('#form-input-nqn-id').val(nqnIdCreate());
    $('#form-input-nvmeof-target-image-name').val($('#form-input-nqn-id').val().replace(':', '.'));
    // setIscsiPortalCheckbox('div-iscsi-portal-list','form-input-iscsi-portal');
    setNvmeofHostIpSelectBox('form-select-nvmeof-ip');
    setSingleImageSelectBox('form-select-nvmeof-target-image-name');
    setPoolSelectBox('form-select-nvmeof-target-image-pool');
    $('#div-modal-create-nvmeof-target').show();
});

$('#button-close-modal-create-nvmeof-target').on('click', function(){
    $('#div-modal-create-nvmeof-target').hide();
});

$('#button-cancel-modal-create-nvmeof-target').on('click', function(){
    $('#div-modal-create-nvmeof-target').hide();
});

$('#button-execution-modal-create-nvmeof-target').on('click', function(){
    if(nvmeofTargetCreateValidateCheck()){
        var yn_bool = $('input[type=checkbox][id="form-checkbox-nvmeof-existing-image-use-yn"]').is(":checked");

        var subsystem_nqn_id = $('#form-input-nqn-id').val();
        var gateway_ip = $('#form-select-nvmeof-ip option:selected').val();
        var body_val = "subsystem_nqn_id="+subsystem_nqn_id+"&gateway_ip="+gateway_ip

        if(yn_bool == true){
            var image_info = $('#form-select-nvmeof-target-image-name option:selected').val().split('/');
            body_val += "&pool_name="+image_info[0];
            body_val += "&image_name="+image_info[1];
        }else{
            var pool_name = $('#form-select-nvmeof-target-image-pool option:selected').val();
            var image_name = $('#form-input-nvmeof-target-image-name').val();
            var size = $('#form-input-nvmeof-target-image-size').val();
            body_val += "&pool_name="+pool_name+"&image_name="+image_name+"&size="+size
        }

        $('#div-modal-create-nvmeof-target').hide();
        $('#div-modal-spinner-header-txt').text('NVMe-oF Target를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("NVMe-oF Target 생성 실패");
        $("#modal-status-alert-body").html("NVMe-oF Target 생성을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/nvmeof/target',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("NVMe-oF Target 생성 완료");
                $("#modal-status-alert-body").html("NVMe-oF Target 생성을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                createLoggerInfo("NVMe-oF Target create success");
            }else{
                $('#div-modal-status-alert').show();
            }
            nvmeofTargetList();
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("NVMe-oF Target create error : "+ data);
            console.log('button-execution-modal-create-nvmeof-target : '+data);
            nvmeofTargetList();
        });
    }
});
/** NVMe-of target create 관련 action end */

/** NVMe-of target delete 관련 action start */
function nvmeofTargetDelete(nqn_id){
    $('#input-checkbox-nvmeof-target-remove').prop('checked',false);
    $('#div-modal-remove-nvmeof-target').show();
    $('#nvmeof-target-nqn-id').val(nqn_id);
    $('#nvmeof-target-text').text('선택하신 '+nqn_id+' 을(를) 삭제하시겠습니까?');
}

$('#button-close-modal-remove-nvmeof-target').on('click', function(){
    $('#div-modal-remove-nvmeof-target').hide();
});

$('#button-cancel-modal-remove-nvmeof-target').on('click', function(){
    $('#div-modal-remove-nvmeof-target').hide();
});

$('#button-execution-modal-remove-nvmeof-target').on('click', function(){
    if($('#input-checkbox-nvmeof-target-remove').is(":checked")){
        var nqn_id = $('#nvmeof-target-nqn-id').val()
        var body_val = "nqn_id="+nqn_id;
        
        $('#div-modal-remove-nvmeof-target').hide();
        $('#div-modal-spinner-header-txt').text('NVMe-of Target을 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("NVMe-of Target 삭제 실패");
        $("#modal-status-alert-body").html("NVMe-of Target 삭제를 실패하였습니다.");
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/nvmeof/subsystem?subsystem_nqn_id='+nqn_id,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("NVMe-of Target 삭제 완료");
                $("#modal-status-alert-body").html("NVMe-of Target 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                createLoggerInfo("NVMe-of Target remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
            nvmeofTargetList();
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("NVMe-of Target remove error : "+ data);
            console.log('button-execution-modal-remove-nvmeof-target : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  NVMe-of target delete 관련 action end */

function nqnIdCreate(){
    // nqn.yyyy-mm.naming-authority:unique
    var nqn_id = "";
    var nqn = "nqn";
    const date_time = new Date();
    const year = date_time.getFullYear();
    const month = date_time.getMonth() + 1;
    var month_val = month >= 10 ? month : '0' + month;
    var naming_authority = "ablecloud.io";
    var unique = Math.floor(new Date().getTime()/1000);

    nqn_id += nqn+"."+year+"-"+month_val+"."+naming_authority+":"+unique;
    return nqn_id;
}

$('#form-checkbox-nvmeof-existing-image-use-yn').on('change', function(){
    setNvmeofImage();
});

function setNvmeofImage(){
    var yn_bool = $('input[type=checkbox][id="form-checkbox-nvmeof-existing-image-use-yn"]').is(":checked");
    if(yn_bool){
        $('#div-nvmeof-target-new-rbd-pool').hide();
        $('#div-nvmeof-target-new-image-name').hide();
        $('#div-nvmeof-target-image-size').hide();
        $('#div-nvmeof-target-image-name').show();
    }else{
        $('#div-nvmeof-target-new-rbd-pool').show();
        $('#div-nvmeof-target-new-image-name').show();
        $('#div-nvmeof-target-image-size').show();
        $('#div-nvmeof-target-image-name').hide();
        $('#form-input-nvmeof-target-image-name').val($('#form-input-nqn-id').val());
    }
}

// nvmeof target 생성 입력값 초기화
function nvmeofTargetCreateInitInputValue(){
    $('#form-input-nqn-id').val("");
    $('#form-select-nvmeof-ip').val("");
    $('#form-select-nvmeof-target-image-pool').val("");
    $('#form-input-nvmeof-target-image-name').val("");
    $('#form-input-nvmeof-target-image-size').val("");

    $('input[type=checkbox][id="form-checkbox-nvmeof-existing-image-use-yn"]').prop("checked", false);
    setNvmeofImage();
}

// nvmeof target 수정 입력값 초기화
function nvmeofTargetUpdateInitInputValue(){
    $('#form-input-update-nqn-id').val("");
    $('#form-input-update-nvmeof-portal').val("");
    $('#form-input-update-nvmeof-image').val("");
}

function nvmeofCreateValidateCheck(){
    var validate_check = true;

    var service_id = $('#form-input-nvmeof-service-id').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
    
    if (service_id == "") {
        alert("이름을 입력해주세요.");
        validate_check = false;
    } else if (checkForNameDuplicates("nvmeof-service-list", 0, 'nvmeof.'+service_id)) {
        alert(service_id + "는 이미 사용중인 이름입니다.");
        validate_check = false;
    } else if (host_cnt == 0) {
        alert("배치 호스트를 선택해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}

function nvmeofTargetCreateValidateCheck(){
    var validate_check = true;

    var nqn_id = $('#form-input-nqn-id').val();
    var potal_ip = $('#form-select-nvmeof-ip option:selected').val();
    var pool = $('#form-select-nvmeof-target-image-pool option:selected').val();
    var image_name = $('#form-input-nvmeof-target-image-name').val();
    var size = $('#form-input-nvmeof-target-image-size').val();
    var yn_bool = $('input[type=checkbox][id="form-checkbox-nvmeof-existing-image-use-yn"]').is(":checked");
    var image_name_selected = $('#form-select-nvmeof-target-image-name option:selected').val();

    if (nqn_id == "") {
        alert("IQN을 입력해주세요.");
        validate_check = false;
    } else if (!checkNqn(nqn_id)) {
        alert("NQN 생성 규칙을 확인해주세요.");
        validate_check = false;
    } else if (potal_ip == "") {
        alert("포탈 IP를 입력해주세요.");
        validate_check = false;
    } else if (!checkIp(potal_ip)){
        alert("포탈 IP 유형이 올바르지 않습니다.");
        validate_check = true;
        return false;
    } else if (yn_bool == true){
        if (image_name_selected == "") {
            alert("이미지 명을 입력해주세요.");
            validate_check = false;
        }
    } else{
        if (pool == "") {
            alert("데이터 풀을 입력해주세요.");
            validate_check = false;
        } else if (image_name == "") {
            alert("이미지 명을 입력해주세요.");
            validate_check = false;
        } else if (!imageNameCheck(image_name)) {
            alert("이미지 명 생성 규칙은 영문, 숫자 특수문자 '-','_','.' 만 입력 가능하고 영문으로 시작해야 합니다.");
            validate_check = false;
        } else if (size == "") {
            alert("용량을 입력해주세요.");
            validate_check = false;
        } else if (!numberCheck(size)) {
            alert("용량은 숫자만 입력해주세요.");
            validate_check = false;
        } else if (size < 1 || size > 5000) {
            alert("용량은 1부터 5000까지 입력 가능합니다.");
            validate_check = false;
        }
    }

    return validate_check;
}