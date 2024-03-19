/**
 * File Name : ingress.js
 * Date Created : 2024.03.11
 * Writer  : 배태주
 * Description : ingress service 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function ingressList(){
    //조회
    $('#button-ingress-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.5.11:8080/api/v1/service?service_type=ingress',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            $('#ingress-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
    
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="이름" id="ingress-name">'+data[i].service_name+'</td>';
                insert_tr += '    <td role="cell" data-label="백엔드 서비스" id="ingress-backend-service-name">'+data[i].service_id+'</td>';
                insert_tr += '    <td role="cell" data-label="배치 호스트" id="ingress-placement-hosts">'+data[i].placement.hosts+'</td>';
                insert_tr += '    <td role="cell" data-label="가상 IP" id="ingress-virtual-ip">'+data[i].spec.virtual_ip+'</td>';
                insert_tr += '    <td role="cell" data-label="프론트엔드 PORT" id="ingress-frontend-port">'+data[i].spec.frontend_port+'</td>';
                insert_tr += '    <td role="cell" data-label="모니터 포트" id="ingress-monitor-port">'+data[i].spec.monitor_port+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-ingress'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-ingress\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-ingress'+i+'" id="dropdown-menu-card-action-ingress'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-ingress-remove" onclick=\'ingressDelete("'+data[i].service_name+'")\' >INGRESS Service 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';
    
                $("#ingress-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-ingress'+i).hide();
            }
        }else{
            noList("ingress-list",7);
        }
        $('#button-ingress-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("ingress-list",7);
        $('#button-ingress-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

function ingressDelete(ingress_id){
    $('#div-modal-remove-ingress').show();
    $('#ingress-id').val(ingress_id);
    $('#ingress-text').text('선택하신 '+ingress_id+' 을(를) 삭제하시겠습니까?');
}

/** ingress search 관련 action start */
$('#button-ingress-search').on('click', function(){
    ingressList();
});
/** ingress search 관련 action end */


/** ingress create 관련 action start */
$('#button-ingress-create').on('click', function(){
    // 입력항목 초기화
    ingressCreateInitInputValue();
    setSelectHostsCheckbox('div-ingress-glue-hosts-list','form-input-ingress-placement-hosts');
    setNfsClusterNameSelectBox('form-ingress-nfs-cluster-name')
    $('#div-ingress-glue-hosts-list').hide();

    $('#div-modal-create-ingress').show();
});

$('#button-close-modal-create-ingress').on('click', function(){
    $('#div-modal-create-ingress').hide();
});

$('#button-cancel-modal-create-ingress').on('click', function(){
    $('#div-modal-create-ingress').hide();
});

$('#button-execution-modal-create-ingress').on('click', function(){
    var body_val = "";
    var service_id = $('#form-ingress-nfs-cluster-name option:selected').val();
    var backend_service = $('#form-ingress-nfs-cluster-name option:selected').val();
    
    body_val +="service_id="+service_id+"&backend_service="+backend_service
    
    $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
        if(this.checked){
            body_val += "&hostname="+this.value
        }
    });
    
    var virtual_ip = $('#form-input-ingress-virtual-ip').val();
    var frontend_port = $('#form-input-ingress-frontend-port').val();
    var monitor_port = $('#form-input-ingress-monitor-port').val();
    
    body_val += "&virtual_ip="+virtual_ip+"&frontend_port="+frontend_port+"&monitor_port="+monitor_port

    var ingress_port = $('#form-input-ingress-port').val();
    
    $('#div-modal-create-ingress').hide();
    $('#div-modal-spinner-header-txt').text('INGRESS를 생성하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("INGRESS 생성 실패");
    $("#modal-status-alert-body").html("INGRESS 생성을 실패하였습니다.");

    fetch('https://10.10.5.11:8080/api/v1/nfs/ingress',{
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_val
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("INGRESS 생성 완료");
            $("#modal-status-alert-body").html("INGRESS 생성을 완료하였습니다.");
            $('#div-modal-status-alert').show();
            ingressList();
            createLoggerInfo("ingress create success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("ingress create error : "+ data);
        console.log('button-execution-modal-create-ingress : '+data);
    });
});
/** ingress create 관련 action end */

/** ingress delete 관련 action start */
$('#menu-item-ingress-remove').on('click', function(){
    $('#div-modal-remove-ingress').show();
});

$('#button-close-modal-remove-ingress').on('click', function(){
    $('#div-modal-remove-ingress').hide();
});

$('#button-cancel-modal-remove-ingress').on('click', function(){
    $('#div-modal-remove-ingress').hide();
});

$('#button-execution-modal-remove-ingress').on('click', function(){
    var ingress_id = $('#ingress-id').val()
    $('#div-modal-remove-ingress').hide();
    $('#div-modal-spinner-header-txt').text('INGRESS를 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("INGRESS 삭제 실패");
    $("#modal-status-alert-body").html("INGRESS 삭제를 실패하였습니다.");
    
    fetch('https://10.10.5.11:8080/api/v1/service/'+ingress_id,{
        method: 'DELETE',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#div-modal-spinner').hide();
        if(data == "Success"){
            $("#modal-status-alert-title").html("INGRESS 삭제 완료");
            $("#modal-status-alert-body").html("INGRESS 삭제를 완료하였습니다.");
            $('#div-modal-status-alert').show();
            ingressList();
            createLoggerInfo("ingress remove success");
        }else{
            $('#div-modal-status-alert').show();
        }
    }).catch(function(data){
        $('#div-modal-spinner').hide();
        $('#div-modal-status-alert').show();
        createLoggerInfo("ingress remove error : "+ data);
        console.log('button-execution-modal-remove-ingress : '+data);
    });
});
/**  ingress delete 관련 action end */

// ingress 생성 입력값 초기화
function ingressCreateInitInputValue(){
    $('#form-ingress-nfs-cluster-name').val("");
    $('#form-input-ingress-placement-hosts').val("");
    $('#form-input-ingress-virtual-ip').val("");
    $('#form-input-ingress-frontend-port').val("");
    $('#form-input-ingress-monitor-port').val("");
}
