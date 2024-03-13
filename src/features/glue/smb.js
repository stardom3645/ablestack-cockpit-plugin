/**
 * File Name : smb.js
 * Date Created : 2024.02.22
 * Writer  : 배태주
 * Description : smb service, user 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function smbServiceList(){
    //조회
    $('#button-smb-service-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.2.11:8080/api/v1/smb',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        console.log(11111)
        console.log(data)
        $('#smb-service-list tr').remove();
        let insert_tr = "";
        var i=0;
        insert_tr += '<tr role="row">';
        insert_tr += '    <td role="cell" data-label="호스트" id="smb-service-host-name">'+data.hostname+'</td>';
        insert_tr += '    <td role="cell" data-label="IP" id="smb-service-ip">'+data.ip_address+'</td>';
        insert_tr += '    <td role="cell" data-label="상태" id="smb-service-status">'+data.status+'</td>';
        insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-port">'+data.port+'</td>';
        insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-folder-name">'+data.folder_name+'</td>';
        insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-path">'+data.path+'</td>';
        insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-fs-name">'+data.fs_name+'</td>';
        insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-volume-path">'+data.volume_path+'</td>';
        insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
        insert_tr += '        <div class="pf-c-dropdown">';
        insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-smb-service-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-smb-service-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
        insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
        insert_tr += '            </button>';
        insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-smb-service-status'+i+'" id="dropdown-menu-card-action-smb-service-status'+i+'">';
        insert_tr += '                <li>';
        insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbServiceDelete()\' >SMB 서비스 삭제</button>';
        insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbServiceDelete()\' >유저 생성</button>';
        insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbServiceDelete()\' >유저 비밀번호 변경</button>';
        insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbServiceDelete()\' >유저 삭제</button>';
        insert_tr += '                </li>';
        insert_tr += '            </ul>';
        insert_tr += '        </div>';
        insert_tr += '    </td>';
        insert_tr += '</tr>';

        $("#smb-service-list:last").append(insert_tr);
        $('#dropdown-menu-card-action-smb-service-status'+i).hide();
        $('#button-smb-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        $('#smb-service-list tr').remove();
        $('#button-smb-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** smb -service search 관련 action start */
$('#button-smb-service-search').on('click', function(){
    smbServiceList();
});
/** smb service search 관련 action end */

function smbServiceDelete(){
    $('#div-modal-remove-smb-service').show();
    // $('#smb-service-id').val(iscsi_service_id);
    // $('#smb-service-text').text('선택하신 '+iscsi_service_id+' 을(를) 삭제하시겠습니까?');
}

/** SMB Service create 관련 action start */
$('#button-smb-service-create').on('click', function(){
    $('#div-modal-create-smb-service').show();
});

$('#button-close-modal-create-smb-service').on('click', function(){
    $('#div-modal-create-smb-service').hide();
});

$('#button-cancel-modal-create-smb-service').on('click', function(){
    $('#div-modal-create-smb-service').hide();
});

$('#button-execution-modal-create-smb-service').on('click', function(){
    var folder_name = $('#form-input-smb-share-folder-name').val();
    var path = $('#form-input-smb-actual-shared-path').val();
    var username = $('#form-input-smb-user-name').val();
    var password = $('#form-input-smb-user-password').val();

    var body_val = "folder_name="+folder_name+"&path="+path+"&username="+username+"&password="+password
    
    $('#div-modal-create-smb-service').hide();
    $('#div-modal-spinner-header-txt').text('SMB Service를 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("SMB Service 생성 실패");
    $("#modal-status-alert-body").html("SMB Service 생성을 실패하였습니다.");

    fetch('https://10.10.2.11:8080/api/v1/smb',{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_val
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("SMB Service 생성 완료");
            $("#modal-status-alert-body").html("SMB Service 생성을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            smbServiceList();
            createLoggerInfo("SMB Service create success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("SMB Service create error : "+ data);
        console.log('button-execution-modal-create-smb-service : '+data);
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