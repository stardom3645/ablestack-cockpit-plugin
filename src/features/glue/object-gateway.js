/**
 * File Name : object-gateway.js
 * Date Created : 2024.04.05
 * Writer  : 배태주
 * Description : object gateway service 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function objectGatewayList(){
    //조회
    $('#button-object-gateway-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service?service_type=rgw',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/glue/hosts',{
                method: 'GET'
            }).then(res => res.json()).then(hosts_data => {
                $('#object-gateway-list tr').remove();
                for(var i=0; i < data.length; i++){
                    var host_ip = [];
                    
                    for(var j=0; j < hosts_data.length ; j++){
                        for(var x=0; x < data[i].placement.hosts.length ; x++){
                            
                            if(hosts_data[j].hostname == data[i].placement.hosts[x]){
                                host_ip.push(hosts_data[j].ip_address)
                            }    
                        }
                    }

                    let insert_tr = "";
                    insert_tr += '<tr role="row">';
                    insert_tr += '    <td role="cell" data-label="이름">'+data[i].service_name+'</td>';
                    insert_tr += '    <td role="cell" data-label="상태">'+data[i].status.running+"/"+data[i].status.size+'</td>';
                    insert_tr += '    <td role="cell" data-label="호스트 명">'+data[i].placement.hosts+'</td>';
                    insert_tr += '    <td role="cell" data-label="IP">'+host_ip+'</td>';
                    insert_tr += '    <td role="cell" data-label="PORT">'+data[i].status.ports+'</td>';
                    insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                    insert_tr += '        <div class="pf-c-dropdown">';
                    insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-object-gateway'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-object-gateway\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                    insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                    insert_tr += '            </button>';
                    insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-object-gateway'+i+'" id="dropdown-menu-card-action-object-gateway'+i+'">';
                    insert_tr += '                <li>';
                    insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayEdit("'+data[i].service_name+'")\' >Object Gateway 수정</button>';
                    insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayDelete("'+data[i].service_name+'")\' >Object Gateway 삭제</button>';
                    insert_tr += '                </li>';
                    insert_tr += '            </ul>';
                    insert_tr += '        </div>';
                    insert_tr += '    </td>';
                    insert_tr += '</tr>';
        
                    $("#object-gateway-list:last").append(insert_tr);
                    $('#dropdown-menu-card-action-object-gateway'+i).hide();
                }
            }).catch(function(data){
                console.log("error : "+data);
                //조회되는 데이터가 없음
                noList("object-gateway-list",6);
                $('#button-object-gateway-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
            });
        }else{
            noList("object-gateway-list",6);
        }
        $('#button-object-gateway-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("object-gateway-list",6);
        $('#button-object-gateway-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** object gateway search 관련 action start */
$('#button-object-gateway-search').on('click', function(){
    objectGatewayList();
});
/** object gateway search 관련 action end */


/** object gateway create 관련 action start */
$('#button-object-gateway-create').on('click', function(){
    // 입력항목 초기화
    objectGatewayCreateInitInputValue();
    setSelectHostsCheckbox('div-object-gateway-hosts-list','form-input-object-gateway-placement-hosts');
    $('#div-object-gateway-glue-hosts-list').hide();

    $('#div-modal-create-object-gateway').show();
});

$('#button-close-modal-create-object-gateway').on('click', function(){
    $('#div-modal-create-object-gateway').hide();
});

$('#button-cancel-modal-create-object-gateway').on('click', function(){
    $('#div-modal-create-object-gateway').hide();
});

$('#button-execution-modal-create-object-gateway').on('click', function(){
    if(objectGatewayCreateValidateCheck()){
        var body_val = "";

        var service_name = $('#form-input-object-gateway-id').val();
        var zonegroup_name = $('#form-input-object-gateway-zone-group').val();
        var zone_name = $('#form-input-object-gateway-zone').val();
        var port = $('#form-input-object-gateway-port').val();
        
        body_val +="service_name="+service_name+"&zonegroup_name="+zonegroup_name+"&zone_name="+zone_name+"&port="+port
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hosts="+this.value
            }
        });
        
        $('#div-modal-create-object-gateway').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway 생성 실패");
        $("#modal-status-alert-body").html("Object Gateway 생성을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway 생성 완료");
                $("#modal-status-alert-body").html("Object Gateway 생성을 완료하였습니다.<br/>새로고침 버튼을 클릭하여 서비스 상태를 확인할 수 있습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayList();
                createLoggerInfo("Object Gateway create success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("Object Gateway create error : "+ data);
            console.log('button-execution-modal-create-object-gateway : '+data);
        });
    }
});
/** object gateway create 관련 action end */
/** object gateway update 관련 action start */
function objectGatewayEdit(obj_gw_id){
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service?service_type=rgw&service_name='+obj_gw_id,{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#form-input-update-object-gateway-id').val(data[0].service_id);
        setSelectHostsCheckbox('div-update-object-gateway-hosts-list','form-input-update-object-gateway-placement-hosts',data[0].placement.hosts);
        $('#form-input-update-object-gateway-port').val(data[0].spec.rgw_frontend_port);
        $('#div-modal-update-object-gateway').show();
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-object-gateway').on('click', function(){
    $('#div-modal-update-object-gateway').hide();
});

$('#button-cancel-modal-update-object-gateway').on('click', function(){
    $('#div-modal-update-object-gateway').hide();
});

$('#button-execution-modal-update-object-gateway').on('click', function(){
    if(objectGatewayUpdateValidateCheck()){
        var body_val = "";

        var service_id = $('#form-input-update-object-gateway-id').val();
        // var zonegroup_name = $('#form-input-update-object-gateway-zone-group').val();
        // var zone_name = $('#form-input-update-object-gateway-zone').val();
        var port = $('#form-input-update-object-gateway-port').val();
        
        // body_val +="service_id="+service_id+"&zonegroup_name="+zonegroup_name+"&zone_name="+zone_name+"&port="+port
        body_val +="service_id="+service_id+"&port="+port
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hosts="+this.value
            }
        });

        $('#div-modal-update-object-gateway').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway를 수정하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway 수정 실패");
        $("#modal-status-alert-body").html("Object Gateway 수정을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw',{
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway 수정 완료");
                $("#modal-status-alert-body").html("Object Gateway 수정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayList();
                createLoggerInfo("Object Gateway update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("Object Gateway update error : "+ data);
            console.log('button-execution-modal-update-object-gateway : '+data);
        });
    }
});
/** object gateway update 관련 action end */
/** object gateway delete 관련 action start */
function objectGatewayDelete(object_gateway_id){
    $('#input-checkbox-object-gateway-remove').prop('checked',false);
    $('#div-modal-remove-object-gateway').show();
    $('#object-gateway-id').val(object_gateway_id);
    $('#object-gateway-text').text('선택하신 '+object_gateway_id+' 을(를) 삭제하시겠습니까?');
}

$('#menu-item-object-gateway-remove').on('click', function(){
    $('#div-modal-remove-object-gateway').show();
});

$('#button-close-modal-remove-object-gateway').on('click', function(){
    $('#div-modal-remove-object-gateway').hide();
});

$('#button-cancel-modal-remove-object-gateway').on('click', function(){
    $('#div-modal-remove-object-gateway').hide();
});

$('#button-execution-modal-remove-object-gateway').on('click', function(){
    if($('#input-checkbox-object-gateway-remove').is(":checked")){
        var object_gateway_id = $('#object-gateway-id').val()
        $('#div-modal-remove-object-gateway').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway 삭제 실패");
        $("#modal-status-alert-body").html("Object Gateway 삭제를 실패하였습니다.");
        
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service/'+object_gateway_id,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway 삭제 완료");
                $("#modal-status-alert-body").html("Object Gateway 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayList();
                createLoggerInfo("object gateway remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway remove error : "+ data);
            console.log('button-execution-modal-remove-object-gateway : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  object gateway delete 관련 action end */

function objectGatewayUserList(){
    //조회
    $('#button-object-gateway-user-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data != null && data.length != 0){
            $('#object-gateway-user-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="사용자 이름">'+data[i].user_id+'</td>';
                insert_tr += '    <td role="cell" data-label="전체 이름">'+data[i].display_name+'</td>';
                insert_tr += '    <td role="cell" data-label="일시중단">'+(data[i].suspended == 0 ? "" : "일시중지")+'</td>';
                insert_tr += '    <td role="cell" data-label="이메일">'+data[i].email+'</td>';
                insert_tr += '    <td role="cell" data-label="최대 버킷">'+data[i].max_buckets+'</td>';
                insert_tr += '    <td role="cell" data-label="용량 제한">'+(data[i].user_quota.max_size == -1 ? "제한 없음" : Byte(data[i].user_quota.max_size))+'</td>';
                insert_tr += '    <td role="cell" data-label="오브젝트 제한">'+(data[i].user_quota.max_objects == -1 ? "제한 없음" : data[i].user_quota.max_objects)+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '         <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-object-gateway-user'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-object-gateway-user\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-object-gateway-user'+i+'" id="dropdown-menu-card-action-object-gateway-user'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayUserEdit("'+data[i].user_id+'")\' >User 수정</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayUserDelete("'+data[i].user_id+'")\' >User 삭제</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayUserS3keySearch("'+data[i].user_id+'")\' >User S3 키 조회</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayUserQuotaEdit("'+data[i].user_id+'")\' >User Quota 수정</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '       </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#object-gateway-user-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-object-gateway-user'+i).hide();
            }
        }else{
            noList("object-gateway-user-list",8);
        }
        $('#button-object-gateway-user-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("object-gateway-usert-list",8);
        $('#button-object-gateway-user-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** object gateway user search 관련 action start */
$('#button-object-gateway-user-search').on('click', function(){
    objectGatewayUserList();
});
/** object gateway user search 관련 action end */

/** object gateway user delete 관련 action start */
function objectGatewayUserDelete(rgw_user_id){
    if(rgw_user_id == "dashboard"){
        alert("dashboard 사용자는 삭제할 수 없습니다.");
        return;
    }
    $('#input-checkbox-object-gateway-user-remove').prop('checked',false);
    $('#div-modal-remove-object-gateway-user').show();
    $('#object-gateway-user-id').val(rgw_user_id);
    $('#object-gateway-user-text').text('선택하신 '+rgw_user_id+' 을(를) 삭제하시겠습니까?');
}

$('#menu-item-object-gateway-user-remove').on('click', function(){
    $('#div-modal-remove-object-gateway-user').show();
});

$('#button-close-modal-remove-object-gateway-user').on('click', function(){
    $('#div-modal-remove-object-gateway-user').hide();
});

$('#button-cancel-modal-remove-object-gateway-user').on('click', function(){
    $('#div-modal-remove-object-gateway-user').hide();
});

$('#button-execution-modal-remove-object-gateway-user').on('click', function(){
    if($('#input-checkbox-object-gateway-user-remove').is(":checked")){
        var object_gateway_user = $('#object-gateway-user-id').val()
        
        $('#div-modal-remove-object-gateway-user').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway User를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway User 삭제 실패");
        $("#modal-status-alert-body").html("Object Gateway User 삭제를 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user?username='+object_gateway_user,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway User 삭제 완료");
                $("#modal-status-alert-body").html("Object Gateway User 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayUserList();
                createLoggerInfo("object gateway user remove success");
            }else if(data.code=="500" && data.message =="could not remove user: unable to remove user, must specify purge data to remove user with buckets"){
                $("#modal-status-alert-body").html("Object Gateway User 삭제를 실패하였습니다.<br/>사용자가 버킷을 사용중입니다. 확인후 삭제해주세요.");
                $('#div-modal-status-alert').show();
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway user remove error : "+ data);
            console.log('button-execution-modal-remove-object-gateway-user : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  object gateway user delete 관련 action end */

/** object gateway user create 관련 action start */
$('#button-object-gateway-user-create').on('click', function(){
    objectGatewayUserCreateInitInputValue();
    $('#div-modal-create-object-gateway-user').show();
});

$('#button-close-modal-create-object-gateway-user').on('click', function(){
    $('#div-modal-create-object-gateway-user').hide();
});

$('#button-cancel-modal-create-object-gateway-user').on('click', function(){
    $('#div-modal-create-object-gateway-user').hide();
});

$('#button-execution-modal-create-object-gateway-user').on('click', function(){
    if(objectGatewayUserCreateValidateCheck()){
        var username = $('#form-input-object-gateway-user-name').val();
        var display_name = $('#form-input-object-gateway-user-display-name').val();
        var email = $('#form-input-object-gateway-user-email').val();
        
        var body_val = "username="+username+"&display_name="+display_name
        if(email != "") body_val+="&email="+email

        $('#div-modal-create-object-gateway-user').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway User를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway User 생성 실패");
        $("#modal-status-alert-body").html("Object Gateway User 생성을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway User 생성 완료");
                $("#modal-status-alert-body").html("Object Gateway User 생성을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayUserList();
                createLoggerInfo("object gateway user create success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway user create error : "+ data);
            console.log('button-execution-modal-create-object-gateway-user : '+data);
        });
    }
});
/** object gateway user create 관련 action end */

/** object gateway user update 관련 action start */
function objectGatewayUserEdit(user_id){
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            for(var i=0; i < data.length; i++){
                if(data[i].user_id == user_id){
                    $('#form-input-update-object-gateway-user-name').val(data[i].user_id);
                    $('#form-input-update-object-gateway-user-display-name').val(data[i].display_name);
                    $('#form-input-update-object-gateway-user-email').val(data[i].email);
                    $('#div-modal-update-object-gateway-user').show();                    
                }
            }
        }
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-object-gateway-user').on('click', function(){
    $('#div-modal-update-object-gateway-user').hide();
});

$('#button-cancel-modal-update-object-gateway-user').on('click', function(){
    $('#div-modal-update-object-gateway-user').hide();
});

$('#button-execution-modal-update-object-gateway-user').on('click', function(){    
    if(objectGatewayUserUpdateValidateCheck()){
        var username = $('#form-input-update-object-gateway-user-name').val();
        var display_name = $('#form-input-update-object-gateway-user-display-name').val();
        var email = $('#form-input-update-object-gateway-user-email').val();
        var body_val = "username="+username+"&display_name="+display_name;
        
        if(email != ""){
            body_val+="&email="+email;
        }else{
            body_val+="&email=";
        }
        
        $('#div-modal-update-object-gateway-user').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway User를 수정하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway User 수정 실패");
        $("#modal-status-alert-body").html("Object Gateway User 수정을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user',{
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway User 수정 완료");
                $("#modal-status-alert-body").html("Object Gateway User 수정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayUserList()
                createLoggerInfo("object gateway user update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway user update error : "+ data);
            console.log('button-execution-modal-update-object-gateway-user : '+data);
        });
    }
});
/** object gateway user update 관련 action end */

/** object gateway user s3 key search 관련 action start */
function objectGatewayUserS3keySearch(user_id){
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#form-input-search-object-gateway-user-access-key').val("")
        $('#form-input-search-object-gateway-user-secret-key').val("")
        if(data.length != 0){
            for(var i=0; i < data.length; i++){
                if(data[i].user_id == user_id){
                    var el ='';
                    el += '<option value="" selected>선택하십시오.</option>';
                    if(data[i].keys.length > 0){
                        for(var j = 0 ; j < data[i].keys.length ; j ++ ){
                            el += '<option value='+JSON.stringify(data[i].keys[j])+'>'+data[i].keys[j].user+' ['+j+']</option>';
                        }
                    }
                
                    $('#form-select-search-object-gateway-user-s3key').empty();
                    $('#form-select-search-object-gateway-user-s3key').append(el);
                    
                    $('#form-select-search-object-gateway-user-s3key').off('change');
                    $('#form-select-search-object-gateway-user-s3key').on('change',function(){
                        var s3key = JSON.parse($('#form-select-search-object-gateway-user-s3key option:selected').val());
                        $('#form-input-search-object-gateway-user-access-key').val(s3key.access_key)
                        $('#form-input-search-object-gateway-user-secret-key').val(s3key.secret_key)
                    });

                    $('#div-modal-search-object-gateway-user-s3key').show();
                }
            }
        }
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-copy-user-access-key').on('click', function(){
    if($('#form-input-search-object-gateway-user-access-key').val() == ""){
        alert("복사할 접근 키 값이 없습니다.");
    }else{
        navigator.clipboard.writeText($('#form-input-search-object-gateway-user-access-key').val())    
        alert("접근 키 값을 복사하였습니다.");
    }
});

$('#button-copy-user-secret-key').on('click', function(){
    if($('#form-input-search-object-gateway-user-secret-key').val() == ""){
        alert("복사할 비밀 키 값이 없습니다.");
    }else{
        navigator.clipboard.writeText($('#form-input-search-object-gateway-user-secret-key').val())
        alert("비밀 키 값을 복사하였습니다.");
    }
});

$('#button-close-modal-search-object-gateway-user-s3key').on('click', function(){
    $('#div-modal-search-object-gateway-user-s3key').hide();
});

$('#button-cancel-modal-search-object-gateway-user-s3key').on('click', function(){
    $('#div-modal-search-object-gateway-user-s3key').hide();
});
/** object gateway user s3 key search 관련 action end */


/** object gateway user quota update 관련 action start */
function objectGatewayUserQuotaEdit(user_id){
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/user',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            for(var i=0; i < data.length; i++){
                if(data[i].user_id == user_id){
                    $('#form-input-quota-update-object-gateway-user-name').val(data[i].user_id);
                    $('#form-input-quota-update-object-gateway-user-max-size').val((data[i].user_quota.max_size == -1 ? "-1" :byteOnlyGib(data[i].user_quota.max_size)));
                    $('#form-input-quota-update-object-gateway-user-max-objects').val(data[i].user_quota.max_objects);
                    $('#div-modal-update-object-gateway-user-quota').show();                    
                }
            }
        }
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-object-gateway-user-quota').on('click', function(){
    $('#div-modal-update-object-gateway-user-quota').hide();
});

$('#button-cancel-modal-update-object-gateway-user-quota').on('click', function(){
    $('#div-modal-update-object-gateway-user-quota').hide();
});

$('#button-execution-modal-update-object-gateway-user-quota').on('click', function(){    
    if(objectGatewayUserQuotaCreateValidateCheck()){
        var username = $('#form-input-quota-update-object-gateway-user-name').val();
        var max_objects = $('#form-input-quota-update-object-gateway-user-max-objects').val();
        var max_size = $('#form-input-quota-update-object-gateway-user-max-size').val()+"G";
        var scope = "user";
        var state = "enable";
    
        var body_val = "username="+username+"&max_objects="+max_objects+"&max_size="+max_size+"&scope="+scope+"&state="+state
    
        $('#div-modal-update-object-gateway-user-quota').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway User Quota를 수정하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway User Quota 수정 실패");
        $("#modal-status-alert-body").html("Object Gateway User Quota 수정을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/quota',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway User Quota 수정 완료");
                $("#modal-status-alert-body").html("Object Gateway User Quota 수정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayUserList()
                createLoggerInfo("object gateway user quota update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway user quota update error : "+ data);
            console.log('button-execution-modal-update-object-gateway-user-quota : '+data);
        });
    }
});
/** object gateway user quota update 관련 action end */

function objectGatewayBucketList(){
    //조회
    $('#button-object-gateway-bucket-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/bucket?detail=true',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data != null && data.length != 0){
            $('#object-gateway-bucket-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="버킷 이름">'+data[i].bucket+'</td>';
                insert_tr += '    <td role="cell" data-label="소유자">'+data[i].owner+'</td>';
                insert_tr += '    <td role="cell" data-label="사용된 용량">'+(data[i]["usage"]["rgw.main"] == null ? Byte(0) : Byte(data[i]["usage"]["rgw.main"]["size_actual"]))+'</td>';
                insert_tr += '    <td role="cell" data-label="용량 제한">'+(data[i].bucket_quota.max_size == -1 ? "제한 없음" : Byte(data[i].bucket_quota.max_size))+'</td>';
                insert_tr += '    <td role="cell" data-label="오브젝트">'+(data[i]["usage"]["rgw.main"] == null ? 0 : data[i]["usage"]["rgw.main"]["num_objects"])+'</td>';
                insert_tr += '    <td role="cell" data-label="오브젝트 제한">'+(data[i].bucket_quota.max_objects == -1 ? "제한 없음" : data[i].bucket_quota.max_objects)+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '         <div class="pf-c-dropdown pf-m-top">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-object-gateway-bucket'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-object-gateway-bucket\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-object-gateway-bucket'+i+'" id="dropdown-menu-card-action-object-gateway-bucket'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayBucketEdit("'+data[i].bucket+'","'+data[i].id+'")\' >Bucket 수정</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" onclick=\'objectGatewayBucketDelete("'+data[i].bucket+'")\' >Bucket 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '       </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#object-gateway-bucket-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-object-gateway-bucket'+i).hide();
            }
        }else{
            noList("object-gateway-bucket-list",7);
        }
        $('#button-object-gateway-bucket-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("object-gateway-bucket-list",7);
        $('#button-object-gateway-bucket-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** object gateway bucket search 관련 action start */
$('#button-object-gateway-bucket-search').on('click', function(){
    objectGatewayBucketList();
});
/** object gateway bucket search 관련 action end */

/** object gateway bucket delete 관련 action start */
function objectGatewayBucketDelete(rgw_bucket_id){
    $('#input-checkbox-object-gateway-bucket-remove').prop('checked',false);
    $('#div-modal-remove-object-gateway-bucket').show();
    $('#object-gateway-bucket-id').val(rgw_bucket_id);
    $('#object-gateway-bucket-text').text('선택하신 '+rgw_bucket_id+' 을(를) 삭제하시겠습니까?');
}

$('#menu-item-object-gateway-bucket-remove').on('click', function(){
    $('#div-modal-remove-object-gateway-bucket').show();
});

$('#button-close-modal-remove-object-gateway-bucket').on('click', function(){
    $('#div-modal-remove-object-gateway-bucket').hide();
});

$('#button-cancel-modal-remove-object-gateway-bucket').on('click', function(){
    $('#div-modal-remove-object-gateway-bucket').hide();
});

$('#button-execution-modal-remove-object-gateway-bucket').on('click', function(){
    if($('#input-checkbox-object-gateway-bucket-remove').is(":checked")){
        var object_gateway_bucket = $('#object-gateway-bucket-id').val()
        
        $('#div-modal-remove-object-gateway-bucket').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway Bucket를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway Bucket 삭제 실패");
        $("#modal-status-alert-body").html("Object Gateway Bucket 삭제를 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/bucket?bucket_name='+object_gateway_bucket,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway Bucket 삭제 완료");
                $("#modal-status-alert-body").html("Object Gateway Bucket 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayBucketList();
                createLoggerInfo("object gateway bucket remove success");
            }else if(data.include("non-empty bucket")){
                $("#modal-status-alert-body").html("Object Gateway Bucket 삭제를 실패하였습니다.<br/>오브젝트가 존재하여 삭제할 수 없습니다.");
                $('#div-modal-status-alert').show();
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway bucket remove error : "+ data);
            console.log('button-execution-modal-remove-object-gateway-bucket : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  object gateway bucket delete 관련 action end */

/** object gateway bucket create 관련 action start */
$('#button-object-gateway-bucket-create').on('click', function(){
    objectGatewayBucketCreateInitInputValue();
    setRgwUserSelectBox('form-select-object-gateway-bucket-user-name');
    $('#div-modal-create-object-gateway-bucket').show();
});

$('#button-close-modal-create-object-gateway-bucket').on('click', function(){
    $('#div-modal-create-object-gateway-bucket').hide();
});

$('#button-cancel-modal-create-object-gateway-bucket').on('click', function(){
    $('#div-modal-create-object-gateway-bucket').hide();
});

$('#button-execution-modal-create-object-gateway-bucket').on('click', function(){
    if(objectGatewayBucketCreateValidateCheck()){
        var bucket_name = $('#form-input-object-gateway-bucket-name').val();
        var username = $('#form-select-object-gateway-bucket-user-name option:selected').val();
        var lock_enabled = false;

        var body_val = "bucket_name="+bucket_name+"&username="+username+"&lock_enabled="+lock_enabled

        $('#div-modal-create-object-gateway-bucket').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway Bucket을 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway Bucket 생성 실패");
        $("#modal-status-alert-body").html("Object Gateway Bucket 생성을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/bucket',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway Bucket 생성 완료");
                $("#modal-status-alert-body").html("Object Gateway Bucket 생성을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayBucketList();
                createLoggerInfo("object gateway bucket create success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway bucket create error : "+ data);
            console.log('button-execution-modal-create-object-gateway-bucket : '+data);
        });
    }
});
/** object gateway bucket create 관련 action end */

/** object gateway bucket update 관련 action start */
function objectGatewayBucketEdit(bucket_name, bucket_id){
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/bucket?bucket_name='+bucket_name+'&detail=true',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#form-input-update-object-gateway-bucket-name').val(bucket_name);
        $('#form-input-update-object-gateway-bucket-id').val(bucket_id);
        setRgwUserSelectBox('form-select-update-object-gateway-bucket-user-name',data.owner);
        $('#div-modal-update-object-gateway-bucket').show();
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-object-gateway-bucket').on('click', function(){
    $('#div-modal-update-object-gateway-bucket').hide();
});

$('#button-cancel-modal-update-object-gateway-bucket').on('click', function(){
    $('#div-modal-update-object-gateway-bucket').hide();
});

$('#button-execution-modal-update-object-gateway-bucket').on('click', function(){    
    if(objectGatewayBucketUpdateValidateCheck()){

        var bucket_name = $('#form-input-update-object-gateway-bucket-name').val();
        var username = $('#form-select-update-object-gateway-bucket-user-name option:selected').val();
        var lock_enabled = false;
        
        var body_val = "bucket_name="+bucket_name+"&username="+username+"&lock_enabled="+lock_enabled

        $('#div-modal-update-object-gateway-bucket').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway Bucket를 수정하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway Bucket 수정 실패");
        $("#modal-status-alert-body").html("Object Gateway Bucket 수정을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/rgw/bucket',{
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("Object Gateway Bucket 수정 완료");
                $("#modal-status-alert-body").html("Object Gateway Bucket 수정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                objectGatewayBucketList()
                createLoggerInfo("object gateway bucket update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("object gateway bucket update error : "+ data);
            console.log('button-execution-modal-update-object-gateway-bucket : '+data);
        });
    }
});
/** object gateway bucket update 관련 action end */


// object gateway 생성 입력값 초기화
function objectGatewayCreateInitInputValue(){
    $('#form-input-object-gateway-id').val("");
    $('#form-input-object-gateway-placement-hosts').val("");
    $('#form-input-object-gateway-port').val("");
}

function objectGatewayUserCreateInitInputValue(){
    $('#form-input-object-gateway-user-name').val("");
    $('#form-input-object-gateway-user-display-name').val("");
    $('#form-input-object-gateway-user-email').val("");
}

function objectGatewayBucketCreateInitInputValue(){
    $('#form-input-object-gateway-bucket-name').val("");
    $('#form-input-object-gateway-bucket-user-name').val("");
}

function objectGatewayCreateValidateCheck(){
    var validate_check = true;

    var service_name = $('#form-input-object-gateway-id').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
    var port = $('#form-input-object-gateway-port').val();
    
    if (service_name == "") {
        alert("이름을 입력해주세요.");
        validate_check = false;
    } else if (checkForNameDuplicates("object-gateway-list", 0, 'rgw.'+service_name)) {
        alert(service_name + "는 이미 사용중인 이름입니다.");
        validate_check = false;
    }  else if (!nameCheck(service_name)) {
        alert("이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (host_cnt == 0) {
        alert("배치 호스트를 선택해주세요.");
        validate_check = false;
    } else if (port == "") {
        alert("포트 번호을 입력해주세요.");
        validate_check = false;
    } else if (!numberCheck(port)) {
        alert("포트 번호는 숫자만 입력해주세요.");
        validate_check = false;
    } else if (port < 0 || port > 65535) {
        alert("포트 번호는 0부터 65535까지 입력 가능합니다.");
        validate_check = false;
    }
 
    return validate_check;
}

function objectGatewayUpdateValidateCheck(){
    var validate_check = true;

    var service_name = $('#form-input-update-object-gateway-id').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
    var port = $('#form-input-update-object-gateway-port').val();
    
    if (service_name == "") {
        alert("이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(service_name)) {
        alert("이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (host_cnt == 0) {
        alert("배치 호스트를 선택해주세요.");
        validate_check = false;
    } else if (port == "") {
        alert("포트 번호을 입력해주세요.");
        validate_check = false;
    } else if (!numberCheck(port)) {
        alert("포트 번호는 숫자만 입력해주세요.");
        validate_check = false;
    } else if (port < 0 || port > 65535) {
        alert("포트 번호는 0부터 65535까지 입력 가능합니다.");
        validate_check = false;
    }
 
    return validate_check;
}

function objectGatewayUserCreateValidateCheck(){
    var validate_check = true;

    var username = $('#form-input-object-gateway-user-name').val();
    var display_name = $('#form-input-object-gateway-user-display-name').val();
    var email = $('#form-input-object-gateway-user-email').val();
    
    if (username == "") {
        alert("사용자 이름을 입력해주세요.");
        validate_check = false;
    } else if (!pathNameCheck(username)) {
        alert("사용자 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능합니다.");
        validate_check = false;
    } else if (display_name == "") {
        alert("전체 이름을 입력해주세요.");
        validate_check = false;
    } else if (!pathNameCheck(display_name)) {
        alert("전체 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능합니다.");
        validate_check = false;
    } else if (email != "" && !checkEmail(email)) {
        alert("이메일 주소 형식을 확인해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}

function objectGatewayUserUpdateValidateCheck(){
    var validate_check = true;

    var username = $('#form-input-update-object-gateway-user-name').val();
    var display_name = $('#form-input-update-object-gateway-user-display-name').val();
    var email = $('#form-input-update-object-gateway-user-email').val();
    
    if (display_name == "") {
        alert("전체 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck2(display_name)) {
        alert("전체 이름 생성 규칙은 영문, 숫자 특수문자 '-','_',공백 만 입력 가능합니다.");
        validate_check = false;
    } else if (email != "" && !checkEmail(email)) {
        alert("이메일 주소 형식을 확인해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}

function objectGatewayUserQuotaCreateValidateCheck(){
    var validate_check = true;

    var max_objects = $('#form-input-quota-update-object-gateway-user-max-size').val();
    var max_size = $('#form-input-quota-update-object-gateway-user-max-objects').val();
    
    if (max_objects == "") {
        alert("최대 용량을 입력해주세요.");
        validate_check = false;
    } else if (!integerCheck(max_objects)) {
        alert("최대 용량은 정수만 입력해주세요.");
        validate_check = false;
    } else if (max_objects < -1 || max_objects > 5000) {
        alert("용량은 -1 부터 5000까지 입력 가능합니다.");
        validate_check = false;
    } else if (max_size == "") {
        alert("최대 오브젝트를 입력해주세요.");
        validate_check = false;
    } else if (!integerCheck(max_size)) {
        alert("최대 오브젝트는 정수만 입력해주세요.");
        validate_check = false;
    } else if (max_size < -1 || max_size > 10000) {
        alert("용량은 -1 부터 10000까지 입력 가능합니다.");
        validate_check = false;
    }

    return validate_check;
}

function objectGatewayBucketCreateValidateCheck(){
    var validate_check = true;

    var bucketname = $('#form-input-object-gateway-bucket-name').val();
    var username = $('#form-select-object-gateway-bucket-user-name option:selected').val();
    
    if (bucketname == "") {
        alert("버킷 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(bucketname)) {
        alert("버킷 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (username == "") {
        alert("사용자 이름을 입력해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}

function objectGatewayBucketUpdateValidateCheck(){
    var validate_check = true;

    var bucketname = $('#form-input-update-object-gateway-bucket-name').val();
    var username = $('#form-select-update-object-gateway-bucket-user-name option:selected').val();
    
    if (bucketname == "") {
        alert("버킷 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(bucketname)) {
        alert("버킷 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (username == "") {
        alert("사용자 이름을 입력해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}