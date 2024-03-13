/**
 * File Name : iscsi.js
 * Date Created : 2024.02.22
 * Writer  : 배태주
 * Description : iscsi service, iscsi target 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function iscsiServiceList(){
    //조회
    $('#button-iscsi-service-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.2.11:8080/api/v1/service?service_type=iscsi',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.code!=500){
            $('#iscsi-service-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                                                        
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="이름" id="iscsi-service-name">'+data[i].service_name+'</td>';
                insert_tr += '    <td role="cell" data-label="상태" id="iscsi-service-status">'+data[i].status.running+'/'+data[i].status.size+'</td>';
                insert_tr += '    <td role="cell" data-label="서비스 호스트" id="iscsi-service-host">'+data[i].placement.hosts+'</td>';
                insert_tr += '    <td role="cell" data-label="스토리지 풀" id="iscsi-service-pool">'+data[i].spec.pool+'</td>';
                insert_tr += '    <td role="cell" data-label="API Port" id="iscsi-service-api-port">'+data[i].spec.api_port+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-iscsi-service-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-iscsi-service-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-iscsi-service-status'+i+'" id="dropdown-menu-card-action-iscsi-service-status'+i+'">';
                insert_tr += '                <li>';
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

function iscsiServiceDelete(iscsi_service_id){
    $('#div-modal-remove-iscsi-service').show();
    $('#iscsi-service-id').val(iscsi_service_id);
    $('#iscsi-service-text').text('선택하신 '+iscsi_service_id+' 을(를) 삭제하시겠습니까?');
}

/** iSCSI Service create 관련 action start */
$('#button-iscsi-service-create').on('click', function(){
    $('#div-modal-create-iscsi-service').show();
});

$('#button-close-modal-create-iscsi-service').on('click', function(){
    $('#div-modal-create-iscsi-service').hide();
});

$('#button-cancel-modal-create-iscsi-service').on('click', function(){
    $('#div-modal-create-iscsi-service').hide();
});

$('#button-execution-modal-create-iscsi-service').on('click', function(){
    var hosts = $('#form-input-placement-hosts').val();
    var service_id = $('#form-input-iscsi-service-id').val();
    var pool = $('#form-input-iscsi-service-pool').val();
    var api_port = $('#form-input-iscsi-service-api-port').val();
    var api_user = $('#form-input-iscsi-service-api-user').val();
    var api_password = $('#form-input-iscsi-service-api-password').val();

    var body_val = "hosts="+hosts+"&service_id="+service_id+"&pool="+pool+"&api_port="+api_port+"&api_user="+api_user+"&api_password="+api_password
    
    $('#div-modal-create-iscsi-service').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI Service를 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI Service 생성 실패");
    $("#modal-status-alert-body").html("iSCSI Service 생성을 실패하였습니다.");

    fetch('https://10.10.2.11:8080/api/v1/iscsi',{
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
});
/** iSCSI Service create 관련 action end */

/** iSCSI Service delete 관련 action start */
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
    var iscsi_service_id = $('#iscsi-service-id').val()
    
    $('#div-modal-remove-iscsi-service').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI Service를 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI Service 삭제 실패");
    $("#modal-status-alert-body").html("iSCSI Service 삭제를 실패하였습니다.");
    fetch('https://10.10.2.11:8080/api/v1/service/'+iscsi_service_id,{
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
});
/**  iSCSI Service delete 관련 action end */

function iscsiTargetList(){
    //조회
    $('#button-iscsi-target-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.2.11:8080/api/v1/iscsi/target',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        //iscis target 상태에 따른 차이값 확인 필요
        if(data.length>0 || (data.code != undefined && data.code!="no_gateways_defined")){
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
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-iscsi-target-remove" onclick=\'iscsiTargetDelete("'+data[i].target_iqn+'")\' >iSCSI target 삭제</button>'
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
        //조회되는 데이터가 없음
        noList("iscsi-target-list",5);
        $('#button-iscsi-target-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** iSCSI target search 관련 action start */
$('#button-iscsi-target-search').on('click', function(){
    iscsiTargetList();
});
/** iSCSI target search 관련 action end */

function iscsiTargetDelete(iqn_id){
    $('#div-modal-remove-iscsi-target').show();
    $('#iscsi-target-iqn-id').val(iqn_id);
    $('#iscsi-target-text').text('선택하신 '+iqn_id+' 을(를) 삭제하시겠습니까?');
}

/** iSCSI target create 관련 action start */
$('#button-iscsi-target-create').on('click', function(){
    $('#form-input-iqn-id').val(iqnIdCreate());
    $('#div-modal-create-iscsi-target').show();
});

$('#button-close-modal-create-iscsi-target').on('click', function(){
    $('#div-modal-create-iscsi-target').hide();
});

$('#button-cancel-modal-create-iscsi-target').on('click', function(){
    $('#div-modal-create-iscsi-target').hide();
});

$('#button-execution-modal-create-iscsi-target').on('click', function(){
    var portalSelect = $('#form-select-target-portal option:selected').val();
        
    var iqn_id = $('#form-input-iqn-id').val();
    var hostname = portalSelect.split(':')[0];
    var ip_address = portalSelect.split(':')[1];
    var pool_name = $('#form-select-target-image-pool option:selected').val();
    var image_name = $('#form-input-target-image-name option:selected').val();

    // var yn_bool = $('input[type=checkbox][id="form-checkbox-existing-image-use-yn"]').is(":checked");

    var body_val = "iqn_id="+iqn_id+"&hostname="+hostname+"&ip_address="+ip_address+"&pool_name="+pool_name+"&image_name="+image_name+"&acl_enabled=false"
    
    $('#div-modal-create-iscsi-target').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI Target을 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI Target 생성 실패");
    $("#modal-status-alert-body").html("iSCSI Target 생성을 실패하였습니다.");

    fetch('https://10.10.2.11:8080/api/v1/iscsi/target',{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_val
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
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
});
/** iSCSI target create 관련 action end */

/** iSCSI target delete 관련 action start */
$('#menu-item-iscsi-target-remove').on('click', function(){
    $('#div-modal-remove-iscsi-target').show();
});

$('#button-close-modal-remove-iscsi-target').on('click', function(){
    $('#div-modal-remove-iscsi-target').hide();
});

$('#button-cancel-modal-remove-iscsi-target').on('click', function(){
    $('#div-modal-remove-iscsi-target').hide();
});

$('#button-execution-modal-remove-iscsi-target').on('click', function(){
    var iqn_id = $('#iscsi-target-iqn-id').val()
    var body_val = "iqn_id="+iqn_id;
    
    $('#div-modal-remove-iscsi-target').hide();
    $('#div-modal-spinner-header-txt').text('iSCSI Target을 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("iSCSI Target 삭제 실패");
    $("#modal-status-alert-body").html("iSCSI Target 삭제를 실패하였습니다.");
    fetch('https://10.10.2.11:8080/api/v1/iscsi/target?iqn_id='+iqn_id,{
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

$('#form-checkbox-existing-image-use-yn').on('click', function(){
    var yn_bool = $('input[type=checkbox][id="form-checkbox-existing-image-use-yn"]').is(":checked");
    if(yn_bool){
        $('#div-target-image-size').hide();
        $('#div-target-image-name').show();
    }else{
        $('#div-target-image-size').show();
        $('#div-target-image-name').hide();
    }
});
