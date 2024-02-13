/**
 * File Name : gluefs.js
 * Date Created : 2024.02.05
 * Writer  : 배태주
 * Description : Glue File System 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function gluefsList(){
    //조회
    fetch('https://10.10.2.12:8080/api/v1/gluefs',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#gluefs-list tr').remove();
        for(var i=0; i < data.list.length; i++){
            let insert_tr = "";
            var used = 0;
            var avail = 0;
            var active = "";
            for(var j=0; j < data.status.pools.length; j++){
                if(data.list[i].data_pools[0] == data.status.pools[j].name){
                    used = data.status.pools[j].used
                    avail = data.status.pools[j].avail
                }
            }
            
            for(var j=0; j < data.status.mdsmap.length; j++){
                if(data.list[i].name == data.status.mdsmap[j].name.split('.')[0]){
                    if(active==""){
                        active += data.status.mdsmap[j].state
                    }else{
                        active += "/"+data.status.mdsmap[j].state
                    }
                }
            }
            insert_tr += '<tr role="row">';
            insert_tr += '    <td role="cell" data-label="이름" id="gluefs-name">'+data.list[i].name+'</td>';
            insert_tr += '    <td role="cell" data-label="상태" id="gluefs-status">'+active+'</td>';
            insert_tr += '    <td role="cell" data-label="사용량" id="gluefs-usage">'+bytesToSize(used)+'</td>';
            insert_tr += '    <td role="cell" data-label="전체용량" id="gluefs-total-capacity">'+bytesToSize(avail)+'</td>';
            insert_tr += '    <td role="cell" data-label="데이터 풀" id="gluefs-data-pool">'+data.list[i].data_pools+'</td>';
            insert_tr += '    <td role="cell" data-label="메타 데이터 풀" id="gluefs-meta-data-pool">'+data.list[i].metadata_pool+'</td>';
            insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
            insert_tr += '       <div class="pf-c-dropdown">';
            insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-glue-file-system-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-glue-file-system-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
            insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
            insert_tr += '            </button>';
            insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right  pf-m-disabled" aria-labelledby="card-action-glue-file-system-status'+i+'" id="dropdown-menu-card-action-glue-file-system-status'+i+'">';
            insert_tr += '                <li>';
            insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-gluefs-remove" onclick=\'glueFsDelete("'+data.list[i].name+'")\' >GlueFS 삭제</button>';
            insert_tr += '                </li>';
            insert_tr += '             </ul>';
            insert_tr += '        </div>';
            insert_tr += '    </td>';
            insert_tr += '</tr>';

            $("#gluefs-list:last").append(insert_tr);
            $('#dropdown-menu-card-action-glue-file-system-status'+i).hide();
        }
    }).catch(function(data){
        console.log("error2 : "+data);
        $('#gluefs-list tr').remove();
    });
}

function glueFsDelete(id){
    $('#div-modal-remove-gluefs').show();
    $('#gluefs-remove-id').val(id);
    $('#gluefs-id').text('선택하신 '+id+' 을(를) 삭제하시겠습니까?');
}

/** glue fs create 관련 action start */
$('#button-gluefs-create').on('click', function(){
    $('#div-modal-create-gluefs').show();
});

$('#button-close-modal-create-gluefs').on('click', function(){
    $('#div-modal-create-gluefs').hide();
});

$('#button-cancel-modal-create-gluefs').on('click', function(){
    $('#div-modal-create-gluefs').hide();
});

$('#button-execution-modal-create-gluefs').on('click', function(){
    var gluefs_id = $('#form-input-glue-fs-name').val()
    
    $('#div-modal-create-gluefs').hide();
    $('#div-modal-spinner-header-txt').text('Glue File System을 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("Glue File System 생성 실패");
    $("#modal-status-alert-body").html("Glue File System 생성을 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/gluefs/'+gluefs_id,{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("Glue File System 생성 완료");
            $("#modal-status-alert-body").html("Glue File System 생성을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            gluefsList();
            createLoggerInfo("gluefs create success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("gluefs create error : "+ data);
        console.log('button-execution-modal-create-gluefs : '+data);
    });
});
/**  glue fs create 관련 action end */

/** glue fs delete 관련 action start */
$('#menu-item-gluefs-remove').on('click', function(){
    $('#div-modal-remove-gluefs').show();
});

$('#button-close-modal-remove-gluefs').on('click', function(){
    $('#div-modal-remove-gluefs').hide();
});

$('#button-cancel-modal-remove-gluefs').on('click', function(){
    $('#div-modal-remove-gluefs').hide();
});

$('#button-execution-modal-remove-gluefs').on('click', function(){
    var gluefs_id = $('#gluefs-remove-id').val()
    
    // $('#dropdown-menu-gateway-vm-status').toggle();
    $('#div-modal-remove-gluefs').hide();
    $('#div-modal-spinner-header-txt').text('Glue File System을 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("Glue File System 삭제 실패");
    $("#modal-status-alert-body").html("Glue File System 삭제를 실패하였습니다.");

    fetch('https://10.10.2.12:8080/api/v1/gluefs/'+gluefs_id,{
        method: 'DELETE',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("Glue File System 삭제 완료");
            $("#modal-status-alert-body").html("Glue File System 삭제를 완료하였습니다.");
            $('#div-modal-status-alert').show();
            gluefsList();
            createLoggerInfo("gluefs remove success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("gluefs remove error : "+ data);
        console.log('button-execution-modal-remove-gluefs : '+data);
    });
});
/**  glue fs delete 관련 action end */