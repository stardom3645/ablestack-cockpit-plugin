/**
 * File Name : nfs.js
 * Date Created : 2024.02.06
 * Writer  : 배태주
 * Description : NFS cluster, export 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function nfsClusterList(){
    //조회
    $('#button-nfs-cluster-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.2.11:8080/api/v1/nfs',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        nfs_cluster_names = Object.keys(data);
        if(nfs_cluster_names.length != 0){
            $('#nfs-cluster-list tr').remove();
            for(var i=0; i < nfs_cluster_names.length; i++){
                let insert_tr = "";
    
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="이름" id="nfs-cluster-name">'+nfs_cluster_names[i]+'</td>';
    
                if(data[nfs_cluster_names[i]].backend.length > 0){
                    var hostList=[];
                    var ipList=[];
                    for(var j=0; j < data[nfs_cluster_names[i]].backend.length ; j++){
                        hostList.push(data[nfs_cluster_names[i]].backend[j].hostname)
                        ipList.push(data[nfs_cluster_names[i]].backend[j].ip)
                    }
                    insert_tr += '    <td role="cell" data-label="호스트 명" id="nfs-cluster-host-name">'+hostList+'</td>';
                    insert_tr += '    <td role="cell" data-label="IP" id="nfs-cluster-ip">'+ipList+'</td>';
                    insert_tr += '    <td role="cell" data-label="PORT" id="nfs-cluster-port">'+data[nfs_cluster_names[i]].backend[0].port+'</td>';
                }else{
                    insert_tr += '    <td role="cell" data-label="호스트 명" id="nfs-cluster-host-name">N/A</td>';
                    insert_tr += '    <td role="cell" data-label="IP" id="nfs-cluster-ip">N/A</td>';
                    insert_tr += '    <td role="cell" data-label="PORT" id="nfs-cluster-port">N/A</td>';
                }
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-nfs-cluster'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-nfs-cluster\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-nfs-cluster'+i+'" id="dropdown-menu-card-action-nfs-cluster'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-nfs-cluster-remove" onclick=\'nfsClusterDelete("'+nfs_cluster_names[i]+'")\' >NFS Cluster 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';
    
                $("#nfs-cluster-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-nfs-cluster'+i).hide();
            }
        }else{
            noList("nfs-cluster-list",5);
        }
        $('#button-nfs-cluster-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("nfs-cluster-list",5);
        $('#button-nfs-cluster-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

function nfsClusterDelete(cluster_id){
    $('#div-modal-remove-nfs-cluster').show();
    $('#nfs-cluster-id').val(cluster_id);
    $('#nfs-cluster-text').text('선택하신 '+cluster_id+' 을(를) 삭제하시겠습니까?');
}

/** nfs cluster search 관련 action start */
$('#button-nfs-cluster-search').on('click', function(){
    nfsClusterList();
});
/** nfs cluster search 관련 action end */


/** nfs cluster create 관련 action start */
$('#button-nfs-cluster-create').on('click', function(){
    // 입력항목 초기화
    setSelectHostsCheckbox('div-glue-hosts-list','form-input-nfs-cluster-placement-hosts');
    $('#div-glue-hosts-list').hide();

    $('#div-modal-create-nfs-cluster').show();
});

$('#button-close-modal-create-nfs-cluster').on('click', function(){
    $('#div-modal-create-nfs-cluster').hide();
});

$('#button-cancel-modal-create-nfs-cluster').on('click', function(){
    $('#div-modal-create-nfs-cluster').hide();
});

$('#button-execution-modal-create-nfs-cluster').on('click', function(){
    var body_val = "";
    var nfs_cluster_id = $('#form-input-nfs-cluster-id').val();
    var cnt=0
    $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
        if(this.checked){
            if(cnt==0){
                body_val = "hostname="+this.value
            }else{
                body_val += "&hostname="+this.value
            }
            cnt++
        }
    });

    var nfs_cluster_port = $('#form-input-nfs-cluster-port').val();
    
    $('#div-modal-create-nfs-cluster').hide();
    $('#div-modal-spinner-header-txt').text('NFS Cluster를 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("NFS Cluster 생성 실패");
    $("#modal-status-alert-body").html("NFS Cluster 생성을 실패하였습니다.");

    fetch('https://10.10.2.11:8080/api/v1/nfs/'+nfs_cluster_id+'/'+nfs_cluster_port,{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_val
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("NFS Cluster 생성 완료");
            $("#modal-status-alert-body").html("NFS Cluster 생성을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            nfsClusterList();
            nfsExportList();
            createLoggerInfo("nfs cluster create success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("nfs cluster create error : "+ data);
        console.log('button-execution-modal-create-nfs-cluster : '+data);
    });
});
/** nfs cluster create 관련 action end */

/** nfs cluster delete 관련 action start */
$('#menu-item-nfs-cluster-remove').on('click', function(){
    $('#div-modal-remove-nfs-cluster').show();
});

$('#button-close-modal-remove-nfs-cluster').on('click', function(){
    $('#div-modal-remove-nfs-cluster').hide();
});

$('#button-cancel-modal-remove-nfs-cluster').on('click', function(){
    $('#div-modal-remove-nfs-cluster').hide();
});

$('#button-execution-modal-remove-nfs-cluster').on('click', function(){
    var nfs_cluster_id = $('#nfs-cluster-id').val()
    
    $('#div-modal-remove-nfs-cluster').hide();
    $('#div-modal-spinner-header-txt').text('NFS Cluster 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("NFS Cluster 삭제 실패");
    $("#modal-status-alert-body").html("NFS Cluster 삭제를 실패하였습니다.");

    fetch('https://10.10.2.11:8080/api/v1/nfs/'+nfs_cluster_id,{
        method: 'DELETE',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("NFS Cluster 삭제 완료");
            $("#modal-status-alert-body").html("NFS Cluster 삭제를 완료하였습니다.");
            $('#div-modal-status-alert').show();
            nfsClusterList();
            nfsExportList();
            createLoggerInfo("nfs cluster remove success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("nfs cluster remove error : "+ data);
        console.log('button-execution-modal-remove-nfs-cluster : '+data);
    });
});
/**  nfs cluster delete 관련 action end */

function nfsExportList(){
    //조회
    $('#button-nfs-export-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.2.11:8080/api/v1/nfs/export',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            $('#nfs-export-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";

                insert_tr += '<tr role="row">'
                insert_tr += '    <td role="cell" data-label="내보내기 경로" id="nfs-export-name">'+data[i].pseudo+'</td>';
                insert_tr += '    <td role="cell" data-label="클러스터 명" id="nfs-export-name">'+data[i].cluster_id+'</td>';
                insert_tr += '    <td role="cell" data-label="GlueFS 명" id="nfs-export-name">'+data[i].fsal.fs_name+'</td>';
                insert_tr += '    <td role="cell" data-label="GlueFS 경로" id="nfs-export-name">'+data[i].path+'</td>';
                insert_tr += '    <td role="cell" data-label="프로토콜" id="nfs-export-name">'+data[i].transports+'</td>';
                insert_tr += '    <td role="cell" data-label="접근 타입" id="nfs-export-name">'+data[i].access_type+'</td>';
                insert_tr += '    <td role="cell" data-label="Squash" id="nfs-export-name">'+data[i].squash+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '         <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-nfs-export'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-nfs-export\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-nfs-export'+i+'" id="dropdown-menu-card-action-nfs-export'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-nfs-export-edit" onclick=\'nfsExportEdit("'+data[i].export_id+'")\' >NFS Cluster 수정</button>';
                insert_tr += '                </li>';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-nfs-export-remove" onclick=\'nfsExportDelete("'+data[i].export_id+'","'+data[i].pseudo+'","'+data[i].cluster_id+'")\' >NFS Cluster 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '       </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';

                $("#nfs-export-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-nfs-export'+i).hide();
            }
        }else{
            noList("nfs-export-list",8);
        }
        $('#button-nfs-export-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("nfs-export-list",8);
        $('#button-nfs-export-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** nfs export search 관련 action start */
$('#button-nfs-export-search').on('click', function(){
    nfsExportList();
});
/** nfs export search 관련 action end */

function nfsExportEdit(id){
    // $('#div-modal-remove-gluefs').show();
    // $('#gluefs-remove-id').val(id);
    // $('#gluefs-id').text('선택하신 '+id+' 을(를) 삭제하시겠습니까?');
}

function nfsExportDelete(export_id, pseudo, cluster_id){
    $('#div-modal-remove-nfs-export').show();
    $('#nfs-export-id').val(export_id);
    $('#nfs-cluster-id').val(cluster_id);
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
    var nfs_cluster_id = $('#nfs-cluster-id').val()
    
    $('#div-modal-remove-nfs-export').hide();
    $('#div-modal-spinner-header-txt').text('NFS Export를 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("NFS Export 삭제 실패");
    $("#modal-status-alert-body").html("NFS Export 삭제를 실패하였습니다.");

    fetch('https://10.10.2.11:8080/api/v1/nfs/export/'+nfs_cluster_id+"/"+nfs_export_id,{
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
    var nfs_cluster_id = $('#form-input-nfs-cluster-name').val();
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

    fetch('https://10.10.2.11:8080/api/v1/nfs/export/'+nfs_cluster_id,{
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