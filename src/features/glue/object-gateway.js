/**
 * File Name : object-gateway.js
 * Date Created : 2024.04.05
 * Writer  : 배태주
 * Description : object gateway service 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function objectGatewayList(){
    //조회
    $('#button-object-gateway-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.2.11:8080/api/v1/service?service_type=rgw',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        if(data.length != 0){
            $('#object-gateway-list tr').remove();
            for(var i=0; i < data.length; i++){
                let insert_tr = "";
                insert_tr += '<tr role="row">';
                insert_tr += '    <td role="cell" data-label="이름">'+data[i].service_name+'</td>';
                insert_tr += '    <td role="cell" data-label="호스트 명">'+data[i].placement.hosts+'</td>';
                insert_tr += '    <td role="cell" data-label="PORT">'+data[i].status.ports+'</td>';
                insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
                insert_tr += '        <div class="pf-c-dropdown">';
                insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-object-gateway'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-object-gateway\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
                insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
                insert_tr += '            </button>';
                insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-object-gateway'+i+'" id="dropdown-menu-card-action-object-gateway'+i+'">';
                insert_tr += '                <li>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-object-gateway-remove" onclick=\'objectGatewayDelete("'+data[i].service_name+'")\' >Object Gateway 삭제</button>';
                insert_tr += '                </li>';
                insert_tr += '            </ul>';
                insert_tr += '        </div>';
                insert_tr += '    </td>';
                insert_tr += '</tr>';
    
                $("#object-gateway-list:last").append(insert_tr);
                $('#dropdown-menu-card-action-object-gateway'+i).hide();
            }
        }else{
            noList("object-gateway-list",3);
        }
        $('#button-object-gateway-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        noList("object-gateway-list",7);
        $('#button-object-gateway-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

function objectGatewayDelete(object_gateway_id){
    $('#div-modal-remove-object-gateway').show();
    $('#object-gateway-id').val(object_gateway_id);
    $('#object-gateway-text').text('선택하신 '+object_gateway_id+' 을(를) 삭제하시겠습니까?');
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
    // setNfsClusterNameSelectBox('form-ingress-nfs-cluster-name')
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
    if(true){
        var body_val = "";

        var service_name = $('#form-input-object-gateway-id').val();
        var zonegroup_name = $('#form-input-object-gateway-zone-group').val();
        var zone_name = $('#form-input-object-gateway-zone').val();
        var port = $('#form-input-object-gateway-port').val();

        // var service_id = $('#form-object-gateway-nfs-cluster-name option:selected').val();
        // var backend_service = $('#form-object-gateway-nfs-cluster-name option:selected').val();
        
        body_val +="service_name="+service_name+"&zonegroup_name="+zonegroup_name+"&zone_name="+zone_name+"&port="+port
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hostname="+this.value
            }
        });
        
        $('#div-modal-create-object-gateway').hide();
        $('#div-modal-spinner-header-txt').text('Object Gateway를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("Object Gateway 생성 실패");
        $("#modal-status-alert-body").html("Object Gateway 생성을 실패하였습니다.");
    
        fetch('https://10.10.2.11:8080/api/v1/rgw',{
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
                $("#modal-status-alert-body").html("Object Gateway 생성을 완료하였습니다.");
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

/** object gateway delete 관련 action start */
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
    var object_gateway_id = $('#object-gateway-id').val()
    $('#div-modal-remove-object-gateway').hide();
    $('#div-modal-spinner-header-txt').text('Object Gateway를 삭제하고 있습니다.');
    $('#div-modal-spinner').show();

    $("#modal-status-alert-title").html("Object Gateway 삭제 실패");
    $("#modal-status-alert-body").html("Object Gateway 삭제를 실패하였습니다.");
    
    fetch('https://10.10.2.11:8080/api/v1/service/'+object_gateway_id,{
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
});
/**  object gateway delete 관련 action end */

// object gateway 생성 입력값 초기화
function objectGatewayCreateInitInputValue(){
    $('#form-input-object-gateway-id').val("");
    $('#form-input-object-gateway-placement-hosts').val("");
    $('#form-input-object-gateway-port').val("");
}


function ingressCreateValidateCheck(){
    var validate_check = true;

    var service_id = $('#form-ingress-nfs-cluster-name option:selected').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
 
    var virtual_ip = $('#form-input-ingress-virtual-ip').val();
    var frontend_port = $('#form-input-ingress-frontend-port').val();
    var monitor_port = $('#form-input-ingress-monitor-port').val();
    
    if (service_id == "") {
        alert("NFS 클러스터 이름을 입력해주세요.");
        validate_check = false;
    } else if (host_cnt == 0) {
        alert("배치 호스트를 선택해주세요.");
        validate_check = false;
    } else if (virtual_ip == "") {
        alert("가상 IP를 입력해주세요.");
        validate_check = false;
    } else if (!checkIp(virtual_ip)){
        alert("가상 IP 유형이 올바르지 않습니다.");
        validate_check = true;
        return false;
    } else if (frontend_port == "") {
        alert("프론트엔드 포트 번호을 입력해주세요.");
        validate_check = false;
    } else if (!numberCheck(frontend_port)) {
        alert("프론트엔드 포트 번호는 숫자만 입력해주세요.");
        validate_check = false;
    } else if (frontend_port < 0 || frontend_port > 65535) {
        alert("프론트엔드 포트 번호는 0부터 65535까지 입력 가능합니다.");
        validate_check = false;
    } else if (monitor_port == "") {
        alert("모니터 포트 번호을 입력해주세요.");
        validate_check = false;
    } else if (!numberCheck(monitor_port)) {
        alert("모니터 포트 번호는 숫자만 입력해주세요.");
        validate_check = false;
    } else if (monitor_port < 0 || monitor_port > 65535) {
        alert("모니터 포트 번호는 0부터 65535까지 입력 가능합니다.");
        validate_check = false;
    }
 
    return validate_check;
}