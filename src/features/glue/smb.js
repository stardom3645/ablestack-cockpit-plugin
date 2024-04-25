/**
 * File Name : smb.js
 * Date Created : 2024.02.22
 * Writer  : 배태주
 * Description : smb service, user 관련 발생하는 이벤트 처리를 위한 JavaScript
**/

function smbServiceList(){
    //조회
    $('#button-smb-service-search').html("<svg class='pf-c-spinner pf-m-md' role='progressbar' aria-valuetext='Loading...' viewBox='0 0 100 100' ><circle class='pf-c-spinner__path' cx='50' cy='50' r='45' fill='none'></circle></svg>");
    fetch('https://10.10.3.11:8080/api/v1/smb',{
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(res => res.json()).then(data => {
        $('#smb-service-list tr').remove();
        for(var i=0; i < data.length; i++){
            let insert_tr = "";

            var user_cnt = "-";
            if(data[i].users!=null){
                user_cnt = data[i].users.length
            }
            var port = data[i].port;
            if(data[i].port==null || data[i].port==""){
                port = "-";
            }
            var folder_name = data[i].folder_name;
            if(data[i].folder_name==null || data[i].folder_name==""){
                folder_name = "-";
            }
            var path = data[i].path;
            if(data[i].path==null || data[i].path==""){
                path = "-";
            }
            var fs_name = data[i].fs_name;
            if(data[i].fs_name==null || data[i].fs_name==""){
                fs_name = "-";
            }
            var volume_path = data[i].volume_path;
            if(data[i].volume_path==null || data[i].volume_path==""){
                volume_path = "-";
            }

            insert_tr += '<tr role="row">';
            insert_tr += '    <td role="cell" data-label="호스트" id="smb-service-host-name">'+data[i].hostname+'</td>';
            insert_tr += '    <td role="cell" data-label="IP" id="smb-service-ip">'+data[i].ip_address+'</td>';
            insert_tr += '    <td role="cell" data-label="상태" id="smb-service-status">'+data[i].status+'</td>';
            insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-user-cnt">'+user_cnt+'</td>';
            insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-port">'+port+'</td>';
            insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-folder-name">'+folder_name+'</td>';
            insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-path">'+path+'</td>';
            insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-fs-name">'+fs_name+' ( '+volume_path+' )</td>';
            // insert_tr += '    <td role="cell" data-label="PORT" id="smb-service-volume-path">'+volume_path+'</td>';
            insert_tr += '    <td class="pf-c-table__icon" role="cell" data-label="편집">';
            insert_tr += '        <div class="pf-c-dropdown">';
            insert_tr += '            <button class="pf-c-dropdown__toggle pf-m-plain" id="card-action-smb-service-status'+i+'" onclick="toggleAction(\'dropdown-menu-card-action-smb-service-status\','+i+')" aria-expanded="false" type="button" aria-label="Actions">';
            insert_tr += '                <i class="fas fa-ellipsis-v" aria-hidden="true"></i>';
            insert_tr += '            </button>';
            insert_tr += '            <ul class="pf-c-dropdown__menu pf-m-align-right" aria-labelledby="card-action-smb-service-status'+i+'" id="dropdown-menu-card-action-smb-service-status'+i+'">';
            insert_tr += '                <li>';
            if(data[i].status == 'active'){
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbServiceDelete("'+data[i].hostname+'")\' >SMB 서비스 삭제</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbUserList("'+data[i].users+'")\' >유저 목록</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbUserCreate("'+data[i].hostname+'")\' >유저 생성</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbUserPasswdUpdate("'+data[i].hostname+'","'+data[i].users+'")\' >유저 비밀번호 변경</button>';
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbUserDelete("'+data[i].hostname+'","'+data[i].users+'")\' >유저 삭제</button>';
            }else{
                insert_tr += '                    <button class="pf-c-dropdown__menu-item pf-m-enabled" type="button" id="menu-item-set-smb-service-remove" onclick=\'smbServiceCreate("'+data[i].hostname+'")\' >SMB 서비스 구성</button>';
            }
            insert_tr += '                </li>';
            insert_tr += '            </ul>';
            insert_tr += '        </div>';
            insert_tr += '    </td>';
            insert_tr += '</tr>';
    
            $("#smb-service-list:last").append(insert_tr);
            $('#dropdown-menu-card-action-smb-service-status'+i).hide();
        }

        $('#button-smb-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    }).catch(function(data){
        console.log("error : "+data);
        //조회되는 데이터가 없음
        $('#smb-service-list tr').remove();
        $('#button-smb-service-search').html("<i class='fas fa-fw fa-redo' aria-hidden='true'></i>");
    });
}

/** smb-service search 관련 action start */
$('#button-smb-service-search').on('click', function(){
    smbServiceList();
});
/** smb service search 관련 action end */

/** SMB Service create 관련 action start */
function smbServiceCreate(hostname){
    smbServiceCreateInitInputValue();
    $('#form-input-smb-hostname').val(hostname);
    setGlueFsSelectBox("form-select-smb-gluefs-name","form-select-smb-gluefs-path");
    $('#div-modal-create-smb-service').show();
}

$('#button-close-modal-create-smb-service').on('click', function(){
    $('#div-modal-create-smb-service').hide();
});

$('#button-cancel-modal-create-smb-service').on('click', function(){
    $('#div-modal-create-smb-service').hide();
});

$('#button-execution-modal-create-smb-service').on('click', function(){
    if(smbServiceCreateValidateCheck()){
        var hostname = $('#form-input-smb-hostname').val();
        var folder_name = $('#form-input-smb-share-folder-name').val();
        var path = $('#form-input-smb-actual-shared-path').val();
        var username = $('#form-input-smb-user-name').val();
        var password = $('#form-input-smb-user-password').val();
        var fs_name = $('#form-select-smb-gluefs-name option:selected').val();
        var volume_path = $('#form-select-smb-gluefs-path option:selected').val();
    
        var body_val = "hostname="+hostname+"&folder_name="+folder_name+"&path="+path+"&username="+username+"&password="+password+"&fs_name="+fs_name+"&volume_path="+volume_path
        
        $('#div-modal-create-smb-service').hide();
        $('#div-modal-spinner-header-txt').text('SMB Service를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("SMB Service 생성 실패");
        $("#modal-status-alert-body").html("SMB Service 생성을 실패하였습니다.");
    
        fetch('https://10.10.3.11:8080/api/v1/smb',{
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
    }
});
/** SMB Service create 관련 action end */

/** SMB Service delete 관련 action start */
function smbServiceDelete(hostname){
    $('#input-checkbox-smb-service-remove').prop('checked',false);
    $('#div-modal-remove-smb-service').show();
    $('#smb-service-hostname').val(hostname);
    $('#smb-service-text').text('선택하신 '+hostname+' 을(를) 삭제하시겠습니까?');
}

$('#menu-item-smb-service-remove').on('click', function(){
    $('#div-modal-remove-smb-service').show();
});

$('#button-close-modal-remove-smb-service').on('click', function(){
    $('#div-modal-remove-smb-service').hide();
});

$('#button-cancel-modal-remove-smb-service').on('click', function(){
    $('#div-modal-remove-smb-service').hide();
});

$('#button-execution-modal-remove-smb-service').on('click', function(){
    if($('#input-checkbox-smb-service-remove').is(":checked")){
        var hostname = $('#smb-service-hostname').val()
        
        $('#div-modal-remove-smb-service').hide();
        $('#div-modal-spinner-header-txt').text('SMB Service를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("SMB Service 삭제 실패");
        $("#modal-status-alert-body").html("SMB Service 삭제를 실패하였습니다.");
        fetch('https://10.10.3.11:8080/api/v1/smb?hostname='+hostname,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("SMB Service 삭제 완료");
                $("#modal-status-alert-body").html("SMB Service 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                smbServiceList();
                createLoggerInfo("SMB Service remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("SMB Service remove error : "+ data);
            console.log('button-execution-modal-remove-smb-service : '+data);
        });
    }else{
        alert("삭제 여부를 체크해주세요.");
    }
});
/** SMB Service delete 관련 action end */

/** SMB User List 관련 action start */
function smbUserList(users){
    $('#smb-user-list tr').remove();
    if(users!=null){
        var user_list = users.split(",")
        var insert_tr = "";
        for(var i=0; i < user_list.length; i++){
            insert_tr += '<tr role="row">';
            insert_tr += '    <td role="cell" data-label="사용자 이름" >'+user_list[i]+'</td>';
            insert_tr += '</tr>';
        }
        $("#smb-user-list:last").append(insert_tr);
    }else{
        noList("smb-user-list",1);
    }
    $('#div-modal-search-smb-user').show();
}

$('#button-close-modal-search-smb-user').on('click', function(){
    $('#div-modal-search-smb-user').hide();
});

$('#button-cancel-modal-search-smb-user').on('click', function(){
    $('#div-modal-search-smb-user').hide();
});

/** SMB User List 관련 action end */


/** SMB User create 관련 action start */
function smbUserCreate(hostname){
    smbUserCreateInitInputValue();
    $('#div-modal-create-smb-user').show();
    $('#form-input-smb-create-user-hostname').val(hostname);
}

$('#button-smb-user-create').on('click', function(){
    $('#div-modal-create-smb-user').show();
});

$('#button-close-modal-create-smb-user').on('click', function(){
    $('#div-modal-create-smb-user').hide();
});

$('#button-cancel-modal-create-smb-user').on('click', function(){
    $('#div-modal-create-smb-user').hide();
});

$('#button-execution-modal-create-smb-user').on('click', function(){
    if(smbUserCreateValidateCheck()){
        var hostname = $('#form-input-smb-create-user-hostname').val();
        var username = $('#form-input-smb-create-user-name').val();
        var password = $('#form-input-smb-create-user-password').val();
    
        
        var body_val = "hostname="+hostname+"&username="+username+"&password="+password    
        
        $('#div-modal-create-smb-user').hide();
        $('#div-modal-spinner-header-txt').text('SMB User를 생성하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("SMB User 생성 실패");
        $("#modal-status-alert-body").html("SMB User 생성을 실패하였습니다.");
    
        fetch('https://10.10.3.11:8080/api/v1/smb/user',{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("SMB User 생성 완료");
                $("#modal-status-alert-body").html("SMB User 생성을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                smbServiceList();
                createLoggerInfo("SMB User create success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("SMB User create error : "+ data);
            console.log('button-execution-modal-create-smb-user : '+data);
        });
    }
});
/** SMB User create 관련 action end */

/** SMB User update 관련 action start */
function smbUserPasswdUpdate(hostname, users){
    smbUserPasswordUpdateInitInputValue();
    $('#smb-update-user-hostname').val(hostname);
    setSmbUserSelectBox("form-select-update-smb-user",users)
    
    $('#div-modal-update-smb-user').show();
}

$('#menu-item-smb-user-update').on('click', function(){
    $('#div-modal-update-smb-user').show();
});

$('#button-close-modal-update-smb-user').on('click', function(){
    $('#div-modal-update-smb-user').hide();
});

$('#button-cancel-modal-update-smb-user').on('click', function(){
    $('#div-modal-update-smb-user').hide();
});

$('#button-execution-modal-update-smb-user').on('click', function(){
    if(smbUserUpdateValidateCheck()){
        var hostname = $('#smb-update-user-hostname').val();
        var username = $('select#form-select-update-smb-user option:checked').val();
        var password = $('#form-input-update-smb-user-password').val();
    
        var body_val = "hostname="+hostname+"&username="+username+"&password="+password
    
        $('#div-modal-update-smb-user').hide();
        $('#div-modal-spinner-header-txt').text('SMB User 비밀번호를 변경하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("SMB User 비밀번호 변경 실패");
        $("#modal-status-alert-body").html("SMB User 비밀번호 변경을 실패하였습니다.");
        fetch('https://10.10.3.11:8080/api/v1/smb/user',{
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body_val
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("SMB User 비밀번호 변경 완료");
                $("#modal-status-alert-body").html("SMB User 비밀번호 변경을 완료하였습니다.");
                $('#div-modal-status-alert').show();
                smbServiceList();
                createLoggerInfo("SMB User update success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("SMB User update error : "+ data);
            console.log('button-execution-modal-update-smb-user : '+data);
        });
    }
});
/** SMB User update 관련 action end */

/** SMB User delete 관련 action start */
function smbUserDelete(hostname, users){
    $('#smb-remove-user-hostname').val(hostname);
    setSmbUserSelectBox("form-select-remove-smb-user",users)
    
    $('#div-modal-remove-smb-user').show();
}

$('#menu-item-smb-user-remove').on('click', function(){
    $('#div-modal-remove-smb-user').show();
});

$('#button-close-modal-remove-smb-user').on('click', function(){
    $('#div-modal-remove-smb-user').hide();
});

$('#button-cancel-modal-remove-smb-user').on('click', function(){
    $('#div-modal-remove-smb-user').hide();
});

$('#button-execution-modal-remove-smb-user').on('click', function(){
    if(smbUserDeleteValidateCheck()){
        var hostname = $('#smb-remove-user-hostname').val()
        var username = $('select#form-select-remove-smb-user option:checked').val();
        
        $('#div-modal-remove-smb-user').hide();
        $('#div-modal-spinner-header-txt').text('SMB User를 삭제하고 있습니다.');
        $('#div-modal-spinner').show();
    
        $("#modal-status-alert-title").html("SMB User 삭제 실패");
        $("#modal-status-alert-body").html("SMB User 삭제를 실패하였습니다.");
        fetch('https://10.10.3.11:8080/api/v1/smb/user?hostname='+hostname+'&username='+username,{
            method: 'DELETE',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res.json()).then(data => {
            $('#div-modal-spinner').hide();
            if(data == "Success"){
                $("#modal-status-alert-title").html("SMB User 삭제 완료");
                $("#modal-status-alert-body").html("SMB User 삭제를 완료하였습니다.");
                $('#div-modal-status-alert').show();
                smbServiceList();
                createLoggerInfo("SMB User remove success");
            }else{
                $('#div-modal-status-alert').show();
            }
        }).catch(function(data){
            $('#div-modal-spinner').hide();
            $('#div-modal-status-alert').show();
            createLoggerInfo("SMB User remove error : "+ data);
            console.log('button-execution-modal-remove-smb-user : '+data);
        });
    }
});
/** SMB User delete 관련 action end */

// smb 생성 입력값 초기화
function smbServiceCreateInitInputValue(){
    $('#form-input-smb-share-folder-name').val("");
    $('#form-input-smb-user-name').val("");
    $('#form-input-smb-user-password').val("");

    var init_txt = '<option value="" selected>선택하십시오.</option>';
    $('#form-select-smb-gluefs-name option').remove();
    $('#form-select-smb-gluefs-name:last').append(init_txt);
    $('#form-select-smb-gluefs-path option').remove();
    $('#form-select-smb-gluefs-path:last').append(init_txt);
}

// smb user 생성 입력값 초기화
function smbUserCreateInitInputValue(){
    $('#form-input-smb-create-user-name').val("");
    $('#form-input-smb-create-user-password').val("");
}

// smb user 비밀번호 변경 입력값 초기화
function smbUserPasswordUpdateInitInputValue(){
    $('#form-input-update-smb-user-password').val("");
    $('#form-input-update-smb-user-password-confirm').val("");
}

function smbServiceCreateValidateCheck(){
    var validate_check = true;
    
    var folder_name = $('#form-input-smb-share-folder-name').val();
    var username = $('#form-input-smb-user-name').val();
    var password = $('#form-input-smb-user-password').val();
    var fs_name = $('#form-select-smb-gluefs-name option:selected').val();
    var volume_path = $('#form-select-smb-gluefs-path option:selected').val();

    if (folder_name == "") {
        alert("SMB 공유 폴더 명을 입력해주세요.");
        validate_check = false;
    } else if(!nameCheck(folder_name)) {
        alert("SMB 공유 폴더 명 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능합니다.");
        validate_check = false;
    } else if (username == "") {
        alert("사용자 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(username)) {
        alert("사용자 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (unavailableIdCheck(username)) {
        alert(username+" 은(는) 사용할 수 없는 사용자 명입니다.");
        validate_check = false;
    } else if (password == "") {
        alert("비밀번호를 입력해주세요.");
        validate_check = false;
    } else if (fs_name == "") {
        alert("GlueFS 이름을 선택해주세요.");
        validate_check = false;
    } else if (volume_path == undefined || volume_path == "") {
        alert("GlueFS 경로를 선택해주세요.");
        validate_check = false;
    }
 
    return validate_check;
}

function smbUserCreateValidateCheck(){
    var validate_check = true;

    var username = $('#form-input-smb-create-user-name').val();
    var password = $('#form-input-smb-create-user-password').val();

    if (username == "") {
        alert("사용자 이름을 입력해주세요.");
        validate_check = false;
    } else if (!nameCheck(username)) {
        alert("사용자 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (unavailableIdCheck(username)) {
        alert(username+" 은(는) 사용할 수 없는 사용자 명입니다.");
        validate_check = false;
    }  else if (password == "") {
        alert("비밀번호를 입력해주세요.");
        validate_check = false;
    } 
 
    return validate_check;
}

function smbUserUpdateValidateCheck(){
    var validate_check = true;

    var username = $('select#form-select-update-smb-user option:checked').val();
    var password = $('#form-input-update-smb-user-password').val();
    var password_confirm = $('#form-input-update-smb-user-password-confirm').val();

    if (username == "") {
        alert("사용자를 선택해주세요.");
        validate_check = false;
    } else if (!nameCheck(username)) {
        alert("사용자 이름 생성 규칙은 영문, 숫자 특수문자 '-','_' 만 입력 가능하고 영문으로 시작해야 합니다.");
        validate_check = false;
    } else if (password == "") {
        alert("비밀번호를 입력해주세요.");
        validate_check = false;
    } else if (password_confirm == "") {
        alert("비밀번호 확인을 입력해주세요.");
        validate_check = false;
    } else if (password != password_confirm) {
        alert("비밀번호가 일치하지 않습니다.");
        validate_check = false;
    } 
 
    return validate_check;
}

function smbUserDeleteValidateCheck(){
    var validate_check = true;

    var username = $('select#form-select-remove-smb-user option:checked').val();

    if (username == "") {
        alert("사용자를 선택해주세요.");
        validate_check = false;
    }

    return validate_check;
}