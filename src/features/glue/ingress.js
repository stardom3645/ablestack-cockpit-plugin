/**
 * File Name : ingress.js
 * Date Created : 2024.03.11
 * Writer  : 배태주
 * Description : ingress service 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function ingressList(){
    //조회
    $('#button-ingress-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service?service_type=ingress',{
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
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-ingress-remove" onclick=\'ingressEdit("'+data[i].service_name+'")\' >INGRESS 서비스 수정</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-ingress-remove" onclick=\'ingressDelete("'+data[i].service_name+'")\' >INGRESS 서비스 삭제</button>';
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
    setIngressBackendSelectBox('form-select-ingress-backend-service-name')
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
    if(ingressCreateValidateCheck()){
        var body_val = "";
        var service_id = $('#form-select-ingress-backend-service-name option:selected').val();
        var backend_service = $('#form-select-ingress-backend-service-name option:selected').val();
        
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
        
        $('#div-modal-create-ingress').hide();
        $('#div-modal-spinner-header-txt').text('INGRESS를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("INGRESS 생성 실패");
        $("#modal-status-alert-body").html("INGRESS 생성을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/nfs/ingress',{
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
    }
});
/** ingress create 관련 action end */
/** ingress update 관련 action start */
function ingressEdit(ingress_id){
    fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service?service_name='+ingress_id,{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#form-select-update-ingress-backend-service-name').val(data[0].service_id)
        setSelectHostsCheckbox('div-update-ingress-glue-hosts-list','form-input-update-ingress-placement-hosts',data[0].placement.hosts);
        $('#form-input-update-ingress-virtual-ip').val(data[0].spec.virtual_ip);
        $('#form-input-update-ingress-frontend-port').val(data[0].spec.frontend_port);
        $('#form-input-update-ingress-monitor-port').val(data[0].spec.monitor_port);

        $('#div-modal-update-ingress').show();
    }).catch(function(data){
        console.log("error : "+data);
    });
}

$('#button-close-modal-update-ingress').on('click', function(){
    $('#div-modal-update-ingress').hide();
});

$('#button-cancel-modal-update-ingress').on('click', function(){
    $('#div-modal-update-ingress').hide();
});

$('#button-execution-modal-update-ingress').on('click', function(){
    if(ingressUpdateValidateCheck()){
        var body_val = "";
        var service_id = $('#form-select-update-ingress-backend-service-name').val();
        var backend_service = $('#form-select-update-ingress-backend-service-name').val();
        
        body_val +="service_id="+service_id+"&backend_service="+backend_service
        
        $('input[type=checkbox][name="glue-hosts-list"]').each(function() {
            if(this.checked){
                body_val += "&hostname="+this.value
            }
        });
        
        var virtual_ip = $('#form-input-update-ingress-virtual-ip').val();
        var frontend_port = $('#form-input-update-ingress-frontend-port').val();
        var monitor_port = $('#form-input-update-ingress-monitor-port').val();
        
        body_val += "&virtual_ip="+virtual_ip+"&frontend_port="+frontend_port+"&monitor_port="+monitor_port
        
        $('#div-modal-update-ingress').hide();
        $('#div-modal-spinner-header-txt').text('INGRESS를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("INGRESS 수정 실패");
        $("#modal-status-alert-body").html("INGRESS 수정을 실패하였습니다.");
    
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/nfs/ingress',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("INGRESS 수정 완료");
                $("#modal-status-alert-body").html("INGRESS 수정을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                ingressList();
                createLoggerInfo("ingress update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("ingress update error : "+ data);
            console.log('button-execution-modal-update-ingress : '+data);
        });
    }
});
/** ingress update 관련 action end */
/** ingress delete 관련 action start */
function ingressDelete(ingress_id){
    $('#input-checkbox-ingress-remove').prop('checked',false);
    $('#div-modal-remove-ingress').show();
    $('#ingress-id').val(ingress_id);
    $('#ingress-text').text('선택하신 '+ingress_id+' 을(를) 삭제하시겠습니까?');
}

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
    if($('#input-checkbox-ingress-remove').is(":checked")){
        var ingress_id = $('#ingress-id').val()
        $('#div-modal-remove-ingress').hide();
        $('#div-modal-spinner-header-txt').text('INGRESS를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("INGRESS 삭제 실패");
        $("#modal-status-alert-body").html("INGRESS 삭제를 실패하였습니다.");
        
        fetch('https://'+glue_api_ip+':'+glue_api_port+'/api/v1/service/'+ingress_id,{
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
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/**  ingress delete 관련 action end */

// ingress 생성 입력값 초기화
function ingressCreateInitInputValue(){
    $('#form-select-ingress-backend-service-name').val("");
    $('#form-input-ingress-placement-hosts').val("");
    $('#form-input-ingress-virtual-ip').val("");
    $('#form-input-ingress-frontend-port').val("");
    $('#form-input-ingress-monitor-port').val("");
}

function ingressCreateValidateCheck(){
    var validate_check = true;

    var service_id = $('#form-select-ingress-backend-service-name option:selected').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
 
    var virtual_ip = $('#form-input-ingress-virtual-ip').val();
    var frontend_port = $('#form-input-ingress-frontend-port').val();
    var monitor_port = $('#form-input-ingress-monitor-port').val();
    
    if (service_id == "") {
        alert("백엔드 이름을 입력해주세요.");
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

function ingressUpdateValidateCheck(){
    var validate_check = true;

    var service_id = $('#form-select-update-ingress-backend-service-name').val();
    var host_cnt = $('input[type=checkbox][name="glue-hosts-list"]:checked').length
 
    var virtual_ip = $('#form-input-update-ingress-virtual-ip').val();
    var frontend_port = $('#form-input-update-ingress-frontend-port').val();
    var monitor_port = $('#form-input-update-ingress-monitor-port').val();
    
    if (service_id == "") {
        alert("백엔드 이름을 입력해주세요.");
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