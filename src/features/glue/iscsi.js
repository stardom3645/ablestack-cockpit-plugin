/**
 * File Name : iscsi.js
 * Date Created : 2024.02.22
 * Writer  : 배태주
 * Description : iscsi service, iscsi target 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function iscsiServiceList(){
    //조회
    fetch('https://10.10.2.12:8080/api/v1/service?service_type=iscsi',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
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
            insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-iscsi-service-remove" onclick=\'iscsiServiceDelete("'+data[i].service_name+'")\' >iSCSI Service 삭제</button>';
            insert_tr += '                </li>';
            insert_tr += '            </ul>';
            insert_tr += '        </div>';
            insert_tr += '    </td>';
            insert_tr += '</tr>';

            $("#iscsi-service-list:last").append(insert_tr);
            $('#dropdown-menu-card-action-iscsi-service-status'+i).hide();
        }
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        $('#iscsi-service-list tr').remove();
    });
}

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

    fetch('https://10.10.2.12:8080/api/v1/iscsi',{
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
    fetch('https://10.10.2.12:8080/api/v1/service/'+iscsi_service_id,{
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

function nfsExportList(){
    //조회
    fetch('https://10.10.2.12:8080/api/v1/nfs/export',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#nfs-export-list tr').remove();
        if(data!=null){
            for(var i=0; i < data.length; i++){
                let insert_tr = "";

                insert_tr += '<tr role="row">'
                insert_tr += '    <td role="cell" data-label="내보내기 경로" id="nfs-export-name">'+data[i].pseudo+'</td>'
                insert_tr += '    <td role="cell" data-label="클러스터 명" id="nfs-export-name">'+data[i].cluster_id+'</td>'
                insert_tr += '    <td role="cell" data-label="GlueFS 명" id="nfs-export-name">'+data[i].fsal.fs_name+'</td>'
                insert_tr += '    <td role="cell" data-label="프로토콜" id="nfs-export-name">'+data[i].transports+'</td>'
                insert_tr += '    <td role="cell" data-label="접근 타입" id="nfs-export-name">'+data[i].access_type+'</td>'
                insert_tr += '    <td role="cell" data-label="Squash" id="nfs-export-name">'+data[i].squash+'</td>'
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">'
                insert_tr += '         <div class="pf-c-dropdown">'
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-nfs-export'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-nfs-export\','+i+')" aria-expanded="false" type="button" aria-label="Actions">'
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>'
                insert_tr += '            </button>'
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-nfs-export'+i+'" id="dropdown-menu-card-action-nfs-export'+i+'">'
                insert_tr += '                <li>'
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-nfs-export-edit" onclick=\'nfsExportEdit("'+data[i].export_id+'")\' >iSCSI Service 편집</button>'
                insert_tr += '                </li>'
                insert_tr += '                <li>'
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-nfs-export-remove" onclick=\'nfsExportDelete("'+data[i].export_id+'","'+data[i].pseudo+'","'+data[i].cluster_id+'")\' >iSCSI Service 삭제</button>'
                insert_tr += '                </li>'
                insert_tr += '            </ul>'
                insert_tr += '       </div>'
                insert_tr += '    </td>'
                insert_tr += '</tr>'

                $("#nfs-export-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-nfs-export'+i).hide();
            }
        }
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        $('#nfs-export-list tr').remove();
    });
}

function nfsExportEdit(id){
    $('#div-modal-remove-gluefs').show();
    $('#gluefs-remove-id').val(id);
    $('#gluefs-id').text('선택하신 '+id+' 을(를) 삭제하시겠습니까?');
}

function nfsExportDelete(export_id, pseudo, cluster_id){
    $('#div-modal-remove-nfs-export').show();
    $('#nfs-export-id').val(export_id);
    $('#iscsi-service-id').val(cluster_id);
    $('#nfs-export-text').text('선택하신 '+pseudo+" : "+cluster_id+' 을(를) 삭제하시겠습니까?');
}

/** nfs export delete 관련 action start */
$('#menu-item-nfs-export-remove').on('click', function(){
    $('#div-modal-remove-nfs-export').show();
});

$('#button-close-modal-remove-nfs-export').on('click', function(){
    $('#div-modal-remove-nfs-export').hide();
});

$('#button-cancel-modal-remove-nfs-export').on('click', function(){
    $('#div-modal-remove-nfs-export').hide();
});

$('#button-execution-modal-remove-nfs-export').on('click', function(){
    var nfs_export_id = $('#nfs-export-id').val()
    var nfs_cluster_id = $('#iscsi-service-id').val()
    
    $('#div-modal-remove-nfs-export').hide();
    $('#div-modal-spinner-header-txt').text('NFS Export를 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("NFS Export 삭제 실패");
    $("#modal-status-alert-body").html("NFS Export 삭제를 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/nfs/export/'+nfs_cluster_id+"/"+nfs_export_id,{
        method: 'DELETE',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("NFS Export 삭제 완료");
            $("#modal-status-alert-body").html("NFS Export 삭제를 완료하였습니다.");
            $('#div-modal-status-alert').show();
            nfsExportList();
            createLoggerInfo("nfs export remove success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("nfs export remove error : "+ data);
        console.log('button-execution-modal-remove-nfs-export : '+data);
    });
});
/**  nfs export delete 관련 action end */

/** nfs export create 관련 action start */
$('#button-nfs-export-create').on('click', function(){
    $('#div-modal-create-nfs-export').show();
});

$('#button-close-modal-create-nfs-export').on('click', function(){
    $('#div-modal-create-nfs-export').hide();
});

$('#button-cancel-modal-create-nfs-export').on('click', function(){
    $('#div-modal-create-nfs-export').hide();
});

$('#button-execution-modal-create-nfs-export').on('click', function(){
    var nfs_cluster_id = $('#form-input-iscsi-service-name').val();
    var access_type = $('#form-select-nfs-export-access-type').val();
    var fs_name = $('#form-input-gluefs-name').val();
    var path = $('#form-input-gluefs-path').val();
    var pseudo = $('#form-input-nfs-export-pseudo').val();
    var squash = $('#form-select-nfs-export-squash-type').val();
    var storage_name = $('#form-select-storage-type').val();
    var transports = "TCP"

    var body_val = "access_type="+access_type+"&fs_name="+fs_name+"&path="+path+"&pseudo="+pseudo+"&squash="+squash+"&storage_name="+storage_name+"&transports="+transports

    $('#div-modal-create-nfs-export').hide();
    $('#div-modal-spinner-header-txt').text('NFS Export를 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("NFS Export 생성 실패");
    $("#modal-status-alert-body").html("NFS Export 생성을 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/nfs/export/'+nfs_cluster_id,{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_val
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("NFS Export 생성 완료");
            $("#modal-status-alert-body").html("NFS Export 생성을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            nfsClusterList();
            nfsExportList();
            createLoggerInfo("nfs export create success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("nfs export create error : "+ data);
        console.log('button-execution-modal-create-nfs-export : '+data);
    });
});
/** nfs export create 관련 action end */