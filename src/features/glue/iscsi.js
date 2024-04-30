/**
 * File Name : iscsi.js
 * Date Created : 2024.02.22
 * Writer  : 배태주
 * Description : iscsi service, iscsi target 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function iscsiServiceList(){
    //조회
    $('#button-iscsi-service-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+api_ip+':'+api_port+'/api/v1/service?service_type=iscsi',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0 && data.code!=500){
            $('#iscsi-service-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="이름" id="iscsi-service-name">'+data[i].service_name+'</td>';
                insert_tr += '    <td role="cell" data-label="상태" id="iscsi-service-status">'+data[i].status.running+'/'+data[i].status.size+'</td>';
                if(data[i].placement.hosts != "" && data[i].placement.hosts != undefined){
                    insert_tr += '    <td role="cell" data-label="배치 호스트" id="iscsi-service-host">'+data[i].placement.hosts+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="배치 호스트" id="iscsi-service-host">'+data[i].placement.count+' 대 배치</td>';
                }
                insert_tr += '    <td role="cell" data-label="스토리지 풀" id="iscsi-service-pool">'+data[i].spec.pool+'</td>';
                insert_tr += '    <td role="cell" data-label="API Port" id="iscsi-service-api-port">'+data[i].spec.api_port+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-iscsi-service-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-iscsi-service-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-iscsi-service-status'+i+'" id="dropdown-menu-card-action-iscsi-service-status'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-iscsi-service-remove" onclick=\'iscsiServiceEdit("'+data[i].service_name+'")\' >iSCSI 서비스 수정</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-iscsi-service-remove" onclick=\'iscsiServiceDelete("'+data[i].service_name+'")\' >iSCSI 서비스 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#iscsi-service-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-iscsi-service-status'+i).hide();
            }
        }else{
            noList("iscsi-service-list",6);
        }
        $('#button-iscsi-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("iscsi-service-list",6);
        $('#button-iscsi-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

$('#button-iscsi-service-search').on('click', function(){
    iscsiServiceList();
});

/** iSCSI Service create 관련 action start */
$('#button-iscsi-service-create').on('click', function(){
    iscsiServiceCreateInitInputValue();
    setSelectHostsCheckbox('div-iscsi-glue-hosts-list','form-input-iscsi-placement-hosts');
    setPoolSelectBox('form-select-iscsi-service-pool');
    $('#div-modal-create-iscsi-service').show();
});

$('#button-close-modal-create-iscsi-service').on('click', function(){
    $('#div-modal-create-iscsi-service').hide();
});

$('#button-cancel-modal-create-iscsi-service').on('click', function(){
    $('#div-modal-create-iscsi-service').hide();
});

$('#button-execution-modal-create-iscsi-service').on('click', function(){
    if(iscsiCreateValidateCheck()){
        var pool = $('#form-select-iscsi-service-pool option:selected').val();
        var service_id = $('#form-input-iscsi-service-id').val();
        var api_port = $('#form-input-iscsi-service-api-port').val();
        var api_user = $('#form-input-iscsi-service-api-user').val();
        var api_password = $('#form-input-iscsi-service-api-password').val();
    
        var body_val = "service_id="+service_id+"&pool="+pool+"&api_port="+api_port+"&api_user="+api_user+"&api_password="+api_password;
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hosts="+this.value;
            }
        });
    
        $('#div-modal-create-iscsi-service').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI Service를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("iSCSI Service 생성 실패");
        $("#modal-status-alert-body").html("iSCSI Service 생성을 실패하였습니다.");
    
        fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("iSCSI Service 생성 완료");
                $("#modal-status-alert-body").html("iSCSI Service 생성을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                iscsiServiceList();
                createLoggerInfo("iSCSI Service create success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI Service create error : "+ data);
            console.log('button-execution-modal-create-iscsi-service : '+data);
        });
    }
});
/** iSCSI Service create 관련 action end */
/** iSCSI Service update 관련 action start */
function iscsiServiceEdit(iscsi_id){
    fetch('https://'+api_ip+':'+api_port+'/api/v1/service?service_type=iscsi&service_name='+iscsi_id,{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#form-input-update-iscsi-service-id').val(data[0].service_id);
        setSelectHostsCheckbox('div-update-iscsi-glue-hosts-list','form-input-update-iscsi-placement-hosts',data[0].placement.hosts);
        setPoolSelectBox('form-select-update-iscsi-service-pool',data[0].spec.pool);
        $('#form-input-update-iscsi-service-api-port').val(data[0].spec.api_port);
        $('#form-input-update-iscsi-service-api-user').val(data[0].spec.api_user);
        $('#form-input-update-iscsi-service-api-password').val(data[0].spec.api_password);

        $('#div-modal-update-iscsi-service').show();
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-iscsi-service').on('click', function(){
    $('#div-modal-update-iscsi-service').hide();
});

$('#button-cancel-modal-update-iscsi-service').on('click', function(){
    $('#div-modal-update-iscsi-service').hide();
});

$('#button-execution-modal-update-iscsi-service').on('click', function(){
    if(iscsiUpdateValidateCheck()){
        var pool = $('#form-select-update-iscsi-service-pool option:selected').val();
        var service_id = $('#form-input-update-iscsi-service-id').val();
        var api_port = $('#form-input-update-iscsi-service-api-port').val();
        var api_user = $('#form-input-update-iscsi-service-api-user').val();
        var api_password = $('#form-input-update-iscsi-service-api-password').val();
    
        var body_val = "service_id="+service_id+"&pool="+pool+"&api_port="+api_port+"&api_user="+api_user+"&api_password="+api_password;
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hosts="+this.value;
            }
        });
    
        $('#div-modal-update-iscsi-service').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI Service를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("iSCSI Service 생성 실패");
        $("#modal-status-alert-body").html("iSCSI Service 생성을 실패하였습니다.");
    
        fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("iSCSI Service 생성 완료");
                $("#modal-status-alert-body").html("iSCSI Service 생성을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                iscsiServiceList();
                createLoggerInfo("iSCSI Service update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI Service update error : "+ data);
            console.log('button-execution-modal-update-iscsi-service : '+data);
        });
    }
});
/** iSCSI Service update 관련 action end */

/** iSCSI Service delete 관련 action start */
function iscsiServiceDelete(iscsi_service_id){
    $('#input-checkbox-iscsi-service-remove').prop('checked',false);
    $('#div-modal-remove-iscsi-service').show();
    $('#iscsi-service-id').val(iscsi_service_id);
    $('#iscsi-service-text').text('선택하신 '+iscsi_service_id+' 을(를) 삭제하시겠습니까?');
}

$('#menu-item-iscsi-service-remove').on('click', function(){
    $('#div-modal-remove-iscsi-service').show();
});

$('#button-close-modal-remove-iscsi-service').on('click', function(){
    $('#div-modal-remove-iscsi-service').hide();
});

$('#button-cancel-modal-remove-iscsi-service').on('click', function(){
    $('#div-modal-remove-iscsi-service').hide();
});

$('#button-execution-modal-remove-iscsi-service').on('click', function(){
    if($('#input-checkbox-iscsi-service-remove').is(":checked")){
        var iscsi_service_id = $('#iscsi-service-id').val()
        
        $('#div-modal-remove-iscsi-service').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI Service를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("iSCSI Service 삭제 실패");
        $("#modal-status-alert-body").html("iSCSI Service 삭제를 실패하였습니다.");
        fetch('https://'+api_ip+':'+api_port+'/api/v1/service/'+iscsi_service_id,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("iSCSI Service 삭제 완료");
                $("#modal-status-alert-body").html("iSCSI Service 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                iscsiServiceList();
                createLoggerInfo("iSCSI Service remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI Service remove error : "+ data);
            console.log('button-execution-modal-remove-iscsi-service : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  iSCSI Service delete 관련 action end */

// iscsi service 생성 입력값 초기화
function iscsiServiceCreateInitInputValue(){
    $('#form-input-iscsi-service-id').val("");
    $('#form-input-iscsi-placement-hosts').val("");
    $('#form-select-iscsi-service-pool').val("");
    $('#form-input-iscsi-service-api-port').val("");
    $('#form-input-iscsi-service-api-user').val("");
    $('#form-input-iscsi-service-api-password').val("");
}

function iscsiTargetList(){
    //조회
    $('#button-iscsi-target-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi/target',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        //iscis target 상태에 따른 차이값 확인 필요
        if(data.length > 0 || (data.code != undefined && data.code!="no_gateways_defined")){
            $('#iscsi-target-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="IQN" id="target_iqn">'+data[i].target_iqn+'</td>';
                
                if(data[i].portals != undefined && data[i].portals != ""){
                    var portal_list=[];
                    for(var j=0; j < data[i].portals.length; j++){
                        portal_list.push(data[i].portals[j].host+':'+data[i].portals[j].ip);
                    }
                    insert_tr += '    <td role="cell" data-label="포탈" id="portals">'+portal_list+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="포탈" id="portals">N/A</td>';
                }

                if(data[i].disks != undefined && data[i].disks != ""){
                    var disk_list=[];
                    for(var j=0; j < data[i].disks.length; j++){
                        disk_list.push(data[i].disks[j].pool+'/'+data[i].disks[j].image+':['+data[i].disks[j].lun+']');
                    }
                    insert_tr += '    <td role="cell" data-label="디스크 정보" id="disks">'+disk_list+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="디스크 정보" id="disks">N/A</td>';
                }

                if(data[i].info != undefined){
                    insert_tr += '    <td role="cell" data-label="세션 수" id="num_sessions">'+data[i].info.num_sessions+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="세션 수" id="num_sessions">N/A</td>';
                }
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-iscsi-target-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-iscsi-target-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-iscsi-target-status'+i+'" id="dropdown-menu-card-action-iscsi-target-status'+i+'">'
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-iscsi-target-remove" onclick=\'iscsiTargeEdit("'+data[i].target_iqn+'")\' >iSCSI 타겟 수정</button>'
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-iscsi-target-remove" onclick=\'iscsiTargetDelete("'+data[i].target_iqn+'")\' >iSCSI 타겟 삭제</button>'
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#iscsi-target-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-iscsi-target-status'+i).hide();
            }
        }else{
            noList("iscsi-target-list",5);
        }
        $('#button-iscsi-target-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        noList("iscsi-target-list",5);
        $('#button-iscsi-target-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** iSCSI target search 관련 action start */
$('#button-iscsi-target-search').on('click', function(){
    iscsiTargetList();
});
/** iSCSI target search 관련 action end */

/** iSCSI target create 관련 action start */
$('#button-iscsi-target-create').on('click', function(){
    iscsiTargetCreateInitInputValue();
    $('#form-input-iqn-id').val(iqnIdCreate());
    $('#form-input-target-image-name').val($('#form-input-iqn-id').val().replace(':', '.'));
    setIscsiPortalCheckbox('div-iscsi-portal-list','form-input-iscsi-portal');
    setPoolSelectBox('form-select-target-image-pool');
    setImageSelectBox('div-iscsi-image-list','form-input-iscsi-image');
    $('#div-modal-create-iscsi-target').show();
});

$('#button-close-modal-create-iscsi-target').on('click', function(){
    $('#div-modal-create-iscsi-target').hide();
});

$('#button-cancel-modal-create-iscsi-target').on('click', function(){
    $('#div-modal-create-iscsi-target').hide();
});

$('#button-execution-modal-create-iscsi-target').on('click', async function(){
    if(await iscsiTargetCreateValidateCheck()){
        var yn_bool = $('input[type=checkbox][id="form-checkbox-existing-image-use-yn"]').is(":checked");
        var body_val = "";
        var iqn_id = $('#form-input-iqn-id').val();
        var pool_name = $('#form-select-target-image-pool option:selected').val();
        var image_name = "";
        
        if(yn_bool == true){
            body_val = "iqn_id="+iqn_id+"&acl_enabled=false"
            $('input[type=checkbox][name="iscsi-image-list"]').each(function() {
                if(this.checked){
                    var image_info = this.value.split('/');
                    body_val += "&pool_name="+image_info[0];
                    body_val += "&image_name="+image_info[1];
                }
            });
        }else{
            image_name = $('#form-input-target-image-name').val().replace(':', '.');
            body_val = "iqn_id="+iqn_id+"&pool_name="+pool_name+"&image_name="+image_name+"&acl_enabled=false"
        }
        
        $('input[type=checkbox][name="iscsi-portal-list"]').each(function() {
            if(this.checked){
                var portalInfo = this.value.split(':');
                body_val += "&hostname="+portalInfo[0];
            }
        });
        
        $('input[type=checkbox][name="iscsi-portal-list"]').each(function() {
            if(this.checked){
                var portalInfo = this.value.split(':');
                body_val += "&ip_address="+portalInfo[1];
            }
        });
    
        if(yn_bool == true){
            createIscsiTarget(body_val);
        } else {
    
            var size = $('#form-input-target-image-size').val();
            //이미지 생성
            fetch('https://'+api_ip+':'+api_port+'/api/v1/image',{
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "image_name="+image_name+"&pool_name="+pool_name+"&size="+size
            }).then(res => res.json()).then(data => {
                if(data == "Success"){
                    createIscsiTarget(body_val);
                }else{
                    $("#modal-status-alert-title").html("iSCSI Target 이미지 생성 실패");
                    $("#modal-status-alert-body").html("iSCSI Target 생성을 실패하였습니다.");
                    $('#div-modal-status-alert').show();
                }
            }).catch(function(data){
                $("#modal-status-alert-title").html("iSCSI Target 이미지 생성 실패");
                $("#modal-status-alert-body").html("iSCSI Target 생성을 실패하였습니다.");
                $('#div-modal-status-alert').show();
                createLoggerInfo("iSCSI Target image create error : "+ data);
                console.log('button-execution-modal-create-iscsi-target : '+data);
            });
        }
    }

});

function createIscsiTarget(body_val){
    $('#div-modal-create-iscsi-target').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI Target을 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI Target 생성 실패");
    $("#modal-status-alert-body").html("iSCSI Target 생성을 실패하였습니다.");

    fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi/target',{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_val
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success" || data.name == "iscsi/target/create"){
            $("#modal-status-alert-title").html("iSCSI Target 생성 완료");
            $("#modal-status-alert-body").html("iSCSI Target 생성을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            iscsiTargetList()
            createLoggerInfo("iSCSI Target create success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("iSCSI Target create error : "+ data);
        console.log('button-execution-modal-create-iscsi-target : '+data);
    });
}
/** iSCSI target create 관련 action end */

/** iSCSI target update 관련 action start */
function iscsiTargeEdit(iqn_id){
    iscsiTargetUpdateInitInputValue();
    fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi/target?iqn_id='+iqn_id,{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data != null){
            $('#form-input-update-iqn-id').val(iqn_id);
            setIscsiPortalCheckbox('div-update-iscsi-portal-list','form-input-update-iscsi-portal', data.portals);
            setImageSelectBox('div-update-iscsi-image-list','form-input-update-iscsi-image', data.disks);
            $('#div-modal-update-iscsi-target').show();
        }
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-iscsi-target').on('click', function(){
    $('#div-modal-update-iscsi-target').hide();
});

$('#button-cancel-modal-update-iscsi-target').on('click', function(){
    $('#div-modal-update-iscsi-target').hide();
});

$('#button-execution-modal-update-iscsi-target').on('click', function(){
    if(iscsiTargetUpdateValidateCheck()){
        var body_val = "";
        var iqn_id = $('#form-input-update-iqn-id').val();
        var new_iqn_id = $('#form-input-update-iqn-id').val();
        body_val = "iqn_id="+iqn_id+"&acl_enabled=false"+"&new_iqn_id="+new_iqn_id
        
        $('input[type=checkbox][name="iscsi-image-list"]').each(function() {
            if(this.checked){
                var image_info = this.value.split('/');
                body_val += "&pool_name="+image_info[0];
                body_val += "&image_name="+image_info[1];
            }
        });
    
        $('input[type=checkbox][name="iscsi-portal-list"]').each(function() {
            if(this.checked){
                var portalInfo = this.value.split(':');
                body_val += "&hostname="+portalInfo[0];
            }
        });
        
        $('input[type=checkbox][name="iscsi-portal-list"]').each(function() {
            if(this.checked){
                var portalInfo = this.value.split(':');
                body_val += "&ip_address="+portalInfo[1];
            }
        });

        $('#div-modal-update-iscsi-target').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI Target을 수정하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("iSCSI Target 수정 실패");
        $("#modal-status-alert-body").html("iSCSI Target 수정을 실패하였습니다.");
    
        fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi/target',{
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            console.log(data)
            if(data == null || data == "Success" || data.name == "iscsi/target/edit"){
                $("#modal-status-alert-title").html("iSCSI Target 수정 완료");
                $("#modal-status-alert-body").html("iSCSI Target 수정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                iscsiTargetList()
                createLoggerInfo("iSCSI Target update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI Target update error : "+ data);
            console.log('button-execution-modal-update-iscsi-target : '+data);
        });
    }
});

/** iSCSI target update 관련 action end */

/** iSCSI target delete 관련 action start */
function iscsiTargetDelete(iqn_id){
    $('#input-checkbox-iscsi-target-remove').prop('checked',false);
    $('#div-modal-remove-iscsi-target').show();
    $('#iscsi-target-iqn-id').val(iqn_id);
    $('#iscsi-target-text').text('선택하신 '+iqn_id+' 을(를) 삭제하시겠습니까?');
}

// $('#menu-item-iscsi-target-remove').on('click', function(){
//     $('#div-modal-remove-iscsi-target').show();
// });

$('#button-close-modal-remove-iscsi-target').on('click', function(){
    $('#div-modal-remove-iscsi-target').hide();
});

$('#button-cancel-modal-remove-iscsi-target').on('click', function(){
    $('#div-modal-remove-iscsi-target').hide();
});

$('#button-execution-modal-remove-iscsi-target').on('click', function(){
    if($('#input-checkbox-iscsi-target-remove').is(":checked")){
        var iqn_id = $('#iscsi-target-iqn-id').val()
        var body_val = "iqn_id="+iqn_id;
        
        $('#div-modal-remove-iscsi-target').hide();
        $('#div-modal-spinner-header-txt').text('iSCSI Target을 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("iSCSI Target 삭제 실패");
        $("#modal-status-alert-body").html("iSCSI Target 삭제를 실패하였습니다.");
        fetch('https://'+api_ip+':'+api_port+'/api/v1/iscsi/target?iqn_id='+iqn_id,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("iSCSI Target 삭제 완료");
                $("#modal-status-alert-body").html("iSCSI Target 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                iscsiTargetList();
                createLoggerInfo("iSCSI Target remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("iSCSI Target remove error : "+ data);
            console.log('button-execution-modal-remove-iscsi-target : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  iSCSI target delete 관련 action end */

function iqnIdCreate(){
    // iqn.yyyy-mm.naming-authority:unique
    var iqn_id = "";
    var iqn = "iqn";
    const date_time = new Date();
    const year = date_time.getFullYear();
    const month = date_time.getMonth() + 1;
    var month_val = month >= 10 ? month : '0' + month;
    var naming_authority = "ablecloud.io";
    var unique = Math.floor(new Date().getTime()/1000);

    iqn_id += iqn+"."+year+"-"+month_val+"."+naming_authority+":"+unique;
    return iqn_id;
}

$('#form-checkbox-existing-image-use-yn').on('change', function(){
    setiscsiImage();
});
function setiscsiImage(){
    var yn_bool = $('input[type=checkbox][id="form-checkbox-existing-image-use-yn"]').is(":checked");
    if(yn_bool){
        $('#div-target-new-rbd-pool').hide();
        $('#div-target-new-image-name').hide();
        $('#div-target-image-size').hide();
        $('#div-target-image-name').show();
    }else{
        $('#div-target-new-rbd-pool').show();
        $('#div-target-new-image-name').show();
        $('#div-target-image-size').show();
        $('#div-target-image-name').hide();
        $('#form-input-target-image-name').val($('#form-input-iqn-id').val());
    }
}

// iscsi target 생성 입력값 초기화
function iscsiTargetCreateInitInputValue(){
    $('#form-input-iqn-id').val("");
    $('#form-input-iscsi-portal').val("");
    $('#form-select-target-image-pool').val("");
    $('#form-input-target-image-name').val("");
    $('#form-input-target-image-size').val("");
    $('#form-input-iscsi-image').val("");
    
    $('input[type=checkbox][id="form-checkbox-existing-image-use-yn"]').prop("checked", false);
    setiscsiImage();
}

// iscsi target 수정 입력값 초기화
function iscsiTargetUpdateInitInputValue(){
    $('#form-input-update-iqn-id').val("");
    $('#form-input-update-iscsi-portal').val("");
    $('#form-input-update-iscsi-image').val("");
}

function iscsiCreateValidateCheck(){
    var validate_check = true;

    var service_id = $('#form-input-iscsi-service-id').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
    var pool = $('#form-select-iscsi-service-pool option:selected').val();

    var api_port = $('#form-input-iscsi-service-api-port').val();
    var api_user = $('#form-input-iscsi-service-api-user').val();
    var api_password = $('#form-input-iscsi-service-api-password').val();
    
    if (service_id == "") {
        alert("이름을 입력해주세요.");
        validate_check = false;
    } else if (host_cnt == 0) {
        alert("배치 호스트를 선택해주세요.");
        validate_check = false;
    } else if (pool == "") {
        alert("데이터 풀을 입력해주세요.");
        validate_check = false;
    } else if (api_port == "") {
        alert("포트 번호을 입력해주세요.");
        validate_check = false;
    } else if (!numberCheck(api_port)) {
        alert("포트 번호는 숫자만 입력해주세요.");
        validate_check = false;
    } else if (api_port < 0 || api_port > 65535) {
        alert("포트 번호는 0부터 65535까지 입력 가능합니다.");
        validate_check = false;
    } else if (api_user == "") {
        alert("API 유저 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(api_user)) {
        alert("API 유저 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (api_password == "") {
        alert("API 유저 패스워드을 입력해주세요.");
        validate_check = false;
    } 
 
    return validate_check;
}

function iscsiUpdateValidateCheck(){
    var validate_check = true;

    var service_id = $('#form-input-update-iscsi-service-id').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
    var pool = $('#form-select-update-iscsi-service-pool option:selected').val();

    var api_port = $('#form-input-update-iscsi-service-api-port').val();
    var api_user = $('#form-input-update-iscsi-service-api-user').val();
    var api_password = $('#form-input-update-iscsi-service-api-password').val();
    
    if (service_id == "") {
        alert("이름을 입력해주세요.");
        validate_check = false;
    } else if (host_cnt == 0) {
        alert("배치 호스트를 선택해주세요.");
        validate_check = false;
    } else if (pool == "") {
        alert("데이터 풀을 입력해주세요.");
        validate_check = false;
    } else if (api_port == "") {
        alert("포트 번호을 입력해주세요.");
        validate_check = false;
    } else if (!numberCheck(api_port)) {
        alert("포트 번호는 숫자만 입력해주세요.");
        validate_check = false;
    } else if (api_port < 0 || api_port > 65535) {
        alert("포트 번호는 0부터 65535까지 입력 가능합니다.");
        validate_check = false;
    } else if (api_user == "") {
        alert("API 유저 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(api_user)) {
        alert("API 유저 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (api_password == "") {
        alert("API 유저 패스워드을 입력해주세요.");
        validate_check = false;
    } 
 
    return validate_check;
}

async function iscsiTargetCreateValidateCheck(){
    var validate_check = true;

    var iqn_id = $('#form-input-iqn-id').val();
    var portal_cnt = $('input[type=checkbox][name="iscsi-portal-list"]:checked').length

    var yn_bool = $('input[type=checkbox][id="form-checkbox-existing-image-use-yn"]').is(":checked");

    var pool = $('#form-select-target-image-pool option:selected').val();
    var image_name = $('#form-input-target-image-name').val();
    var size = $('#form-input-target-image-size').val();

    var checked_image_cnt = $('input[type=checkbox][name="iscsi-image-list"]:checked').length
    
    if (iqn_id == "") {
        alert("IQN을 입력해주세요.");
        validate_check = false;
    } else if (portal_cnt == 0) {
        alert("포탈을 선택해주세요.");
        validate_check = false;
    } else if (yn_bool == true){
        if (checked_image_cnt == 0) {
            alert("이미지를 선택해주세요.");
            validate_check = false;
        }
    }else{
        if (pool == "") {
            alert("데이터 풀을 입력해주세요.");
            validate_check = false;
        } else if (image_name == "") {
            alert("이미지 명을 입력해주세요.");
            validate_check = false;
        } else if (!imageNameCheck(image_name)) {
            alert("이미지 명 생성 규칙은 영문, 숫자 특수문자 '-','_','.' 만 입력 가능하고 영문으로 시작해야 합니다.");
            validate_check = false;
        } else if (await duplicatImageNameCheck(pool,image_name)) {
            alert(image_name + "는 이미 사용중인 이미지 명입니다.");
            validate_check = false;
        }  else if (size == "") {
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

function iscsiTargetUpdateValidateCheck(){
    var validate_check = true;
    
    var new_iqn_id = $('#form-input-update-iqn-id').val();
    var portal_cnt = $('input[type=checkbox][name="iscsi-portal-list"]:checked').length
    var checked_image_cnt = $('input[type=checkbox][name="iscsi-image-list"]:checked').length

    if (new_iqn_id == "") {
        alert("IQN을 입력해주세요.");
        validate_check = false;
    } else if (portal_cnt == 0) {
        alert("포탈을 선택해주세요.");
        validate_check = false;
    } else if (checked_image_cnt == 0) {
        alert("이미지를 선택해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}