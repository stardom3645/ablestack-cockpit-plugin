/**
 * File Name : pfmp-vm-wizard.js
 * Date Created : 2020.02.19
 * Writer  : 박동혁
 * Description : 스토리지센터 VM 배포 마법사에서 발생하는 이벤트 처리를 위한 JavaScript
**/

// 변수 선언
var cur_step_wizard_pfmp_config = "1";
var xml_create_cmd;
var completed = false;
var option_pfmp = "-pfmp";

// Document.ready 시작
$(document).ready(function(){
    // 스토리지센터 가상머신 배포 마법사 페이지 준비
    $('#div-modal-wizard-pfmp-config-compute').hide();
    $('#div-modal-wizard-pfmp-config-network').hide();
    $('#div-modal-wizard-pfmp-config-additional').hide();
    $('#div-modal-wizard-pfmp-config-ssh-key').hide();
    $('#div-modal-wizard-pfmp-config-review').hide();
    $('#div-modal-wizard-pfmp-config-deploy').hide();
    $('#div-modal-wizard-pfmp-config-finish').hide();

    $('#div-accordion-pfmp-vm-device-conifg').hide();
    $('#div-accordion-pfmp-vm-additional').hide();
    $('#div-accordion-pfmp-vm-ssh-key').hide();

    $('#nav-button-pfmp-finish').addClass('pf-m-disabled');

    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);
    $('#button-cancel-config-modal-wizard-pfmp-config').attr('disabled', false);

    // 첫번째 스텝에서 시작
    cur_step_wizard_pfmp_config = "1";

    //관리 NIC용 Bridge 리스트 초기 세팅
    setNicBridge('form-select-pfmp-vm-mngt-nic');

    //ssh 개인 key 파일 선택 이벤트 세팅
    setSshKeyFileReader($('#form-input-pfmp-vm-ssh-private-key-file'), 'id_rsa', setPfmpSshPrivateKeyInfo);

    //ssh 공개 key 파일 선택 이벤트 세팅
    setSshKeyFileReader($('#form-input-pfmp-vm-ssh-public-key-file'), 'id_rsa.pub', setPfmpSshPublicKeyInfo);

    //SSH Key 정보 자동 세팅
    settingSshKey(option_pfmp);

});
// document ready 끝

// 이벤트 처리 함수
$('#button-close-modal-wizard-pfmp-vm').on('click', function(){
    $('#div-modal-wizard-pfmp-vm').hide();
    if(completed){
        //상태값 초기화 겸 페이지 리로드
        location.reload();
    }
});

// '다음' 버튼 클릭 시 이벤트를 처리하기 위한 함수
$('#button-next-step-modal-wizard-pfmp-config').on('click', function(){
    if (cur_step_wizard_pfmp_config == "1") {
        $('#div-modal-wizard-pfmp-config-overview').hide();
        $('#div-modal-wizard-pfmp-config-compute').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-overview').removeClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').addClass('pf-m-current');
        $('#nav-button-pfmp-compute').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "2";
    }
    else if (cur_step_wizard_pfmp_config == "2") {
        $('#div-modal-wizard-pfmp-config-compute').hide();
        $('#div-modal-wizard-pfmp-config-network').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-compute').removeClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').addClass('pf-m-current');
        $('#nav-button-pfmp-network').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "3";
    }
    else if (cur_step_wizard_pfmp_config == "3") {
        $('#div-modal-wizard-pfmp-config-network').hide();
        $('#div-modal-wizard-pfmp-config-additional').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-network').removeClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').removeClass('pf-m-current');
        $('#nav-button-pfmp-additional').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "4";
    }
    else if (cur_step_wizard_pfmp_config == "4") {
        $('#div-modal-wizard-pfmp-config-additional').hide();
        $('#div-modal-wizard-pfmp-config-ssh-key').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-additional').removeClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').removeClass('pf-m-current');
        $('#nav-button-pfmp-ssh-key').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "5";
    }
    else if (cur_step_wizard_pfmp_config == "5") {
        // review 정보 세팅
        PfmpsetReviewInfo();

        $('#div-modal-wizard-pfmp-config-ssh-key').hide();
        $('#div-modal-wizard-pfmp-config-review').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-ssh-key').removeClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').removeClass('pf-m-current');
        $('#nav-button-pfmp-review').addClass('pf-m-current');

        $('#button-next-step-modal-wizard-pfmp-config').html('배포');

        cur_step_wizard_pfmp_config = "6";
    }
    else if (cur_step_wizard_pfmp_config == "6") {
        $('#div-modal-pfmp-wizard-confirm').show();
    }
});

// '이전' 버튼 클릭 시 이벤트를 처리하기 위한 함수
$('#button-before-step-modal-wizard-pfmp-config').on('click', function(){
    if (cur_step_wizard_pfmp_config == "1") {
        // 이전 버튼 없음
    }
    else if (cur_step_wizard_pfmp_config == "2") {
        // 1번 스텝으로 이동
        $('#div-modal-wizard-pfmp-config-overview').show();
        $('#div-modal-wizard-pfmp-config-compute').hide();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);
        $('#nav-button-pfmp-overview').addClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').removeClass('pf-m-current');
        $('#nav-button-pfmp-compute').removeClass('pf-m-current');

        // 1번으로 변수값 변경
        cur_step_wizard_pfmp_config = "1";
    }
    else if (cur_step_wizard_pfmp_config == "3") {
        $('#div-modal-wizard-pfmp-config-compute').show();
        $('#div-modal-wizard-pfmp-config-network').hide();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-vm-config').addClass('pf-m-current');
        $('#nav-button-pfmp-network').removeClass('pf-m-current');

        cur_step_wizard_pfmp_config = "2";
    }
    else if (cur_step_wizard_pfmp_config == "4") {
        $('#div-modal-wizard-pfmp-config-network').show();
        $('#div-modal-wizard-pfmp-config-additional').hide();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-additional').removeClass('pf-m-current');
        $('#nav-button-pfmp-network').addClass('pf-m-current');
        $('#nav-button-pfmp-vm-config').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "3";
    }
    else if (cur_step_wizard_pfmp_config == "5") {
        $('#div-modal-wizard-pfmp-config-ssh-key').hide();
        $('#div-modal-wizard-pfmp-config-additional').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-ssh-key').removeClass('pf-m-current');
        $('#nav-button-pfmp-additional').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "4";
    }
    else if (cur_step_wizard_pfmp_config == "6") {
        $('#div-modal-wizard-pfmp-config-ssh-key').show();
        $('#div-modal-wizard-pfmp-config-review').hide();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
        $('#nav-button-pfmp-additional').removeClass('pf-m-current');
        $('#nav-button-pfmp-ssh-key').addClass('pf-m-current');
        $('#nav-button-pfmp-review').removeClass('pf-m-current');

        $('#button-next-step-modal-wizard-pfmp-config').html('다음');

        cur_step_wizard_pfmp_config = "5";
    }
    else if (cur_step_wizard_pfmp_config == "7") {

    }
    else if (cur_step_wizard_pfmp_config == "8") {

    }
});

// 마법사 Side 버튼 이벤트 처리
$('#nav-button-pfmp-overview').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-overview').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);
    $('#nav-button-pfmp-overview').addClass('pf-m-current');

    cur_step_wizard_pfmp_config = "1";
});

$('#nav-button-pfmp-vm-config').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-compute').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);
    $('#nav-button-pfmp-vm-config').addClass('pf-m-current');
    $('#nav-button-pfmp-compute').addClass('pf-m-current');

    cur_step_wizard_pfmp_config = "2";
});
$('#nav-button-pfmp-compute').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-compute').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);
    $('#nav-button-pfmp-vm-config').addClass('pf-m-current');
    $('#nav-button-pfmp-compute').addClass('pf-m-current');

    cur_step_wizard_pfmp_config = "2";
});

$('#nav-button-pfmp-network').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-network').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#nav-button-pfmp-vm-config').addClass('pf-m-current');
    $('#nav-button-pfmp-network').addClass('pf-m-current');

    cur_step_wizard_pfmp_config = "3";
});
$('#nav-button-pfmp-additional').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-additional').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#nav-button-pfmp-additional').addClass('pf-m-current');

    cur_step_wizard_pfmp_config = "4";
});

$('#nav-button-pfmp-ssh-key').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-ssh-key').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#nav-button-pfmp-ssh-key').addClass('pf-m-current');

    cur_step_wizard_pfmp_config = "5";
});

$('#nav-button-pfmp-review').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    // review 정보 세팅
    PfmpsetReviewInfo();

    $('#div-modal-wizard-pfmp-config-review').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#nav-button-pfmp-review').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-pfmp-config').html('배포');

    cur_step_wizard_pfmp_config = "6";
});

$('#nav-button-pfmp-finish').on('click', function(){
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-finish').show();
    $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', false);
    $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);
    $('#nav-button-pfmp-finish').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-pfmp-config').hide();
    $('#button-before-step-modal-wizard-pfmp-config').hide();
    $('#button-cancel-config-modal-wizard-pfmp-config').hide();

    cur_step_wizard_pfmp_config = "7";
});

// 설정확인 단계의 아코디언 개체에서 발생하는 이벤트의 처리
$('#button-accordion-pfmp-vm-device-conifg').on('click', function(){
    if ($('#button-accordion-pfmp-vm-device-conifg').attr("aria-expanded") == "false") {
        $('#button-accordion-pfmp-vm-device-conifg').attr("aria-expanded", "true");
        $('#button-accordion-pfmp-vm-device-conifg').addClass("pf-m-expanded");
        $('#div-accordion-pfmp-vm-device-conifg').fadeIn();
        $('#div-accordion-pfmp-vm-device-conifg').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-pfmp-vm-device-conifg').attr("aria-expanded", "false");
        $('#button-accordion-pfmp-vm-device-conifg').removeClass("pf-m-expanded");
        $('#div-accordion-pfmp-vm-device-conifg').fadeOut();
        $('#div-accordion-pfmp-vm-device-conifg').removeClass("pf-m-expanded");
    }
});

$('#button-accordion-pfmp-vm-additional').on('click', function(){
    if ($('#button-accordion-pfmp-vm-additional').attr("aria-expanded") == "false") {
        $('#button-accordion-pfmp-vm-additional').attr("aria-expanded", "true");
        $('#button-accordion-pfmp-vm-additional').addClass("pf-m-expanded");
        $('#div-accordion-pfmp-vm-additional').fadeIn();
        $('#div-accordion-pfmp-vm-additional').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-pfmp-vm-additional').attr("aria-expanded", "false");
        $('#button-accordion-pfmp-vm-additional').removeClass("pf-m-expanded");
        $('#div-accordion-pfmp-vm-additional').fadeOut();
        $('#div-accordion-pfmp-vm-additional').removeClass("pf-m-expanded");
    }
});

$('#button-accordion-pfmp-vm-ssh-key').on('click', function(){
    if ($('#button-accordion-pfmp-vm-ssh-key').attr("aria-expanded") == "false") {
        $('#button-accordion-pfmp-vm-ssh-key').attr("aria-expanded", "true");
        $('#button-accordion-pfmp-vm-ssh-key').addClass("pf-m-expanded");
        $('#div-accordion-pfmp-vm-ssh-key').fadeIn();
        $('#div-accordion-pfmp-vm-ssh-key').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-pfmp-vm-ssh-key').attr("aria-expanded", "false");
        $('#button-accordion-pfmp-vm-ssh-key').removeClass("pf-m-expanded");
        $('#div-accordion-pfmp-vm-ssh-key').fadeOut();
        $('#div-accordion-pfmp-vm-ssh-key').removeClass("pf-m-expanded");
    }
});

// 마법사 "배포 실행 버튼 모달창"
$('#button-cancel-modal-pfmp-wizard-confirm').on('click', function () {
    $('#div-modal-pfmp-wizard-confirm').hide();
});
$('#button-close-modal-pfmp-wizard-confirm').on('click', function () {
    $('#div-modal-pfmp-wizard-confirm').hide();
});
// 마법사 "배포 버튼 모달창" 실행 버튼을 눌러 가상머신 배포
$('#button-execution-modal-pfmp-wizard-confirm').on('click', function () {
    $('#div-modal-pfmp-wizard-confirm').hide();
    if(validatePfmpVm()){
        // 배포 버튼을 누르면 배포 진행 단계로 이동한다.
        PfmpHideAllMainBody();
        PfmpResetCurrentMode();

        $('#div-modal-wizard-pfmp-config-deploy').show();
        $('#button-next-step-modal-wizard-pfmp-config').attr('disabled', true);
        $('#button-before-step-modal-wizard-pfmp-config').attr('disabled', true);

        $('#nav-button-pfmp-finish').addClass('pf-m-current');

        cur_step_wizard_pfmp_config = "8";

        deployPfmpVM();
    }
});

// 마법사 "취소 버튼 모달창" show, hide
$('#button-cancel-config-modal-wizard-pfmp-config').on('click', function () {
    $('#div-modal-cancel-pfmp-wizard-cancel').show();
});
$('#button-close-modal-pfmp-wizard-cancel').on('click', function () {
    $('#div-modal-cancel-pfmp-wizard-cancel').hide();
});
$('#button-cancel-modal-pfmp-wizard-cancel').on('click', function () {
    $('#div-modal-cancel-pfmp-wizard-cancel').hide();
});
// 마법사 "취소 버튼 모달창" 실행 버튼을 눌러 취소를 실행
$('#button-execution-modal-pfmp-wizard-cancel').on('click', function () {
    //상태값 초기화 겸 페이지 리로드
    location.reload();
});

/**
 * Meathod Name : PfmpHideAllMainBody
 * Date Created : 2021.02.22
 * Writer  : 박동혁
 * Description : 마법사 대화상자의 모든 Main Body Division 숨기기
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.02.22 최초 작성
 */
function PfmpHideAllMainBody() {
    $('#div-modal-wizard-pfmp-config-overview').hide();
    $('#div-modal-wizard-pfmp-config-compute').hide();
    $('#div-modal-wizard-pfmp-config-network').hide();
    $('#div-modal-wizard-pfmp-config-additional').hide();
    $('#div-modal-wizard-pfmp-config-ssh-key').hide();
    $('#div-modal-wizard-pfmp-config-review').hide();
    $('#div-modal-wizard-pfmp-config-deploy').hide();
    $('#div-modal-wizard-pfmp-config-finish').hide();

    $('#button-next-step-modal-wizard-pfmp-config').html('다음');
}

/**
 * Meathod Name : PfmpResetCurrentMode
 * Date Created : 2021.02.22
 * Writer  : 박동혁
 * Description : 마법사 대화상자의 측면 버튼의 '현재 위치'를 모두 리셋
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.02.22 최초 작성
 */
function PfmpResetCurrentMode() {
    $('#nav-button-pfmp-overview').removeClass('pf-m-current');
    $('#nav-button-pfmp-vm-config').removeClass('pf-m-current');
    $('#nav-button-pfmp-compute').removeClass('pf-m-current');
    $('#nav-button-pfmp-network').removeClass('pf-m-current');
    $('#nav-button-pfmp-additional').removeClass('pf-m-current');
    $('#nav-button-pfmp-ssh-key').removeClass('pf-m-current');
    $('#nav-button-pfmp-review').removeClass('pf-m-current');
    $('#nav-button-pfmp-finish').removeClass('pf-m-current');
}

/**
 * Meathod Name : deployPfmpVM
 * Date Created : 2021.02.25
 * Writer  : 박동혁
 * Description : 가상머신을 배포하는 작업을 화면에 표시하도록 하는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.02.25 최초 작성
 * History  : 2021.03.17 기능 구현
 */
function deployPfmpVM() {

    var console_log = true;

    // 하단 버튼 숨김
    $('#button-next-step-modal-wizard-pfmp-config').hide();
    $('#button-before-step-modal-wizard-pfmp-config').hide();
    $('#button-cancel-config-modal-wizard-pfmp-config').hide();

    // 왼쪽 사이드 버튼 전부 비활성화
    $('#nav-button-pfmp-overview').addClass('pf-m-disabled');
    $('#nav-button-pfmp-vm-config').addClass('pf-m-disabled');
    $('#nav-button-pfmp-compute').addClass('pf-m-disabled');
    $('#nav-button-pfmp-network').addClass('pf-m-disabled');
    $('#nav-button-pfmp-ssh-key').addClass('pf-m-disabled');
    $('#nav-button-pfmp-review').addClass('pf-m-disabled');

    createLoggerInfo("deployPfmpVM start");

    //=========== 1. PFMP 가상머신 초기화 작업 ===========
    // 설정 초기화 ( 필요시 python까지 종료 )
    setPfmpProgressStep("span-pfmp-progress-step1",1);
    var reset_pfmp_vm_cmd = ['python3', pluginpath + '/python/pfmp/reset_pfmp_vm.py'];
    if(console_log){console.log(reset_pfmp_vm_cmd);}
    cockpit.spawn(reset_pfmp_vm_cmd)
        .then(function(data){
            //결과 값 json으로 return
            var reset_pfmp_result = JSON.parse(data);
            if(reset_pfmp_result.code=="200") { //정상
                //=========== 2. cloudinit iso 파일 생성 ===========
                // host 파일 /usr/share/cockpit/ablestack/tools/vmconfig/pfmp/cloudinit 경로에 hosts, ssh key 파일 저장
                setPfmpProgressStep("span-pfmp-progress-step1",2);
                setPfmpProgressStep("span-pfmp-progress-step2",1);

                var mgmt_ip = $('#form-input-pfmp-vm-mngt-ip').val();
                var mgmt_prefix = $('#form-input-pfmp-vm-mngt-nic-cidr').val();
                var mgmt_gw = $('#form-input-pfmp-vm-mngt-nic-gateway').val();
                var dns = $('#form-input-pfmp-vm-mngt-nic-dns').val();

                var create_pfmp_cloudinit_cmd = ['python3', pluginpath + '/python/pfmp/create_pfmp_cloudinit.py'
                   ,"-f1",pluginpath+"/tools/vmconfig/pfmp/id_rsa"
                   ,"-t1", $('#form-textarea-pfmp-vm-ssh-private-key-file').val()
                   ,"-f2",pluginpath+"/tools/vmconfig/pfmp/id_rsa.pub"
                   ,"-t2", $('#form-textarea-pfmp-vm-ssh-public-key-file').val()
                   ,"--mgmt-ip",mgmt_ip
                   ,"--mgmt-prefix",mgmt_prefix
                   ,"--mgmt-gw",mgmt_gw
                   ,"--dns",dns
                   ,"--ingress-ip", $('#form-input-pfmp-mngt-5-pieces').val()
                   ,"--hostname","pfmp"
                ];
                if(console_log){console.log(create_pfmp_cloudinit_cmd);}
                cockpit.spawn(create_pfmp_cloudinit_cmd)
                    .then(function(data){
                        //결과 값 json으로 return
                        var create_pfmp_cloudinit_result = JSON.parse(data);
                        if(create_pfmp_cloudinit_result.code=="200"){
                            //=========== 3. PFMP 가상머신 구성 ===========
                            setPfmpProgressStep("span-pfmp-progress-step2",2);
                            setPfmpProgressStep("span-pfmp-progress-step3",1);
                            if(console_log){console.log(xml_create_cmd);}
                            cockpit.spawn(xml_create_cmd)
                                .then(function(data){
                                    //결과 값 json으로 return
                                    var create_pfmp_xml_result = JSON.parse(data);
                                    if(create_pfmp_xml_result.code=="200"){
                                        var mgmt_monitor_ip = $('#form-input-pfmp-mngt-5-pieces').val();
                                        var pn_ip = $('#form-input-pfmp-pn-5-pieces').val();
                                        var cn_ip = $('#form-input-pfmp-cn-5-pieces').val();
                                        //=========== 4. PFMP 가상머신 배포 ===========
                                        //클러스터 생성
                                        setPfmpProgressStep("span-pfmp-progress-step3",2);
                                        setPfmpProgressStep("span-pfmp-progress-step4",1);

                                        var pfmp_setup = ['python3', pluginpath + '/python/pfmp/create_pfmp_setup.py'
                                            ,"-mgmt", mgmt_monitor_ip + " - " + IncrementIpAddress(mgmt_monitor_ip,4)
                                            ,"-data1", pn_ip + " - " + IncrementIpAddress(pn_ip,4)
                                            ,"-data2", cn_ip + " - " + IncrementIpAddress(cn_ip,4)
                                        ];
                                        if(console_log){console.log(pfmp_setup);}
                                        cockpit.spawn(pfmp_setup)
                                            .then(function(data){
                                                //결과 값 json으로 return
                                                var result = JSON.parse(data);
                                                if(result.code=="200"){
                                                    setPfmpProgressStep("span-pfmp-progress-step4",2);
                                                    createLoggerInfo("deployPfmpVM success");

                                                    //최종 화면 호출
                                                    showDivisionPfmpVMConfigFinish();
                                                } else {
                                                    setPfmpProgressFail(4);
                                                    createLoggerInfo(result.val);
                                                    alert(result.val);
                                                }
                                            })
                                            .catch(function(data){
                                                setPfmpProgressFail(4);
                                                createLoggerInfo("pfmp Center Virtual Machine Deployment Failed");
                                                alert("PFMP 가상머신 배포 실패 : "+data);
                                            });
                                    } else {
                                        setPfmpProgressFail(3);
                                        createLoggerInfo(create_pfmp_xml_result.val);
                                        alert(create_pfmp_xml_result.val);
                                    }
                                })
                                .catch(function(data){
                                    setPfmpProgressFail(3);
                                    createLoggerInfo("pfmp center virtual machine configuration failed");
                                    alert("PFMP 가상머신 구성 실패 : "+data);
                                });
                        } else {
                            setPfmpProgressFail(2);
                            createLoggerInfo(create_pfmp_cloudinit_result.val);
                            alert(create_pfmp_cloudinit_result.val);
                        }
                    })
                    .catch(function(data){
                        setPfmpProgressFail(2);
                        createLoggerInfo("Failed to create cloudinit iso file");
                        alert("cloudinit iso 파일 생성 실패 : "+data);
                    });

            } else {
                setPfmpProgressFail(1);
                createLoggerInfo(reset_pfmp_result.val);
                alert(reset_pfmp_result.val);
            }
        })
        .catch(function(data){
            setPfmpProgressFail(1);
            createLoggerInfo("pfmp center virtual machine initialization operation failed");
            alert("PFMP 가상머신 초기화 작업 실패 : "+data);
        });
}

/**
 * Meathod Name : showDivisionPfmpVMConfigFinish
 * Date Created : 2021.02.25
 * Writer  : 박동혁
 * Description : 가상머신을 배포한 후 마지막 페이지를 보여주는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.02.25 최초 작성
 */
function showDivisionPfmpVMConfigFinish() {
    PfmpHideAllMainBody();
    PfmpResetCurrentMode();

    $('#div-modal-wizard-pfmp-config-finish').show();
    $('#nav-button-pfmp-finish').addClass('pf-m-current');
    $('#nav-button-pfmp-finish').removeClass('pf-m-disabled');

    completed = true;

    cur_step_wizard_pfmp_config = "9";
}

/**
 * Meathod Name : PfmpsetReviewInfo
 * Date Created : 2021.03.17
 * Writer  : 정민철
 * Description : 설정확인을 위한 정보를 세팅하는 기능
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.17 최초 작성
 */
function PfmpsetReviewInfo(){
    xml_create_cmd = ["python3",pluginpath + "/python/pfmp/create_pfmp_xml.py"];

    //cpu
    var cpu = $('select#form-select-pfmp-vm-cpu option:checked').val();
    var cpu_text = $('select#form-select-pfmp-vm-cpu option:checked').text();

    if(cpu == '') {
        $('#span-pfmp-vm-cpu-core').text("미입력");
    } else {
        xml_create_cmd.push("-c",cpu);
        $('#span-pfmp-vm-cpu-core').text(cpu_text);
    }

    //memory
    var memory = $('select#form-select-pfmp-vm-memory option:checked').val();
    var memory_txt = $('select#form-select-pfmp-vm-memory option:checked').text();

    if(memory == '') {
        $('#span-pfmp-vm-memory').text("미입력");
    } else {
        xml_create_cmd.push("-m",memory);
        $('#span-pfmp-vm-memory').text(memory_txt);
    }


    //관리 NIC용 네트워크
    $('#span-pfmp-vm-management-traffic').empty();
    var mngt_nic = $('select#form-select-pfmp-vm-mngt-nic option:checked').val();
    var mngt_nic_txt = $('select#form-select-pfmp-vm-mngt-nic option:checked').text();

    if(mngt_nic == '') {
        $('#span-pfmp-vm-management-traffic').text("관리용 : 미입력");
    } else {
        var el = "관리용 : " + mngt_nic_txt;
        $('#span-pfmp-vm-management-traffic').append(el);
        xml_create_cmd.push("-mnb",mngt_nic);
    }

    //관리네트워크 3가지
    var mngt_ip = $('#form-input-pfmp-vm-mngt-ip').val();
    var mngt_cidr = $('#form-input-pfmp-vm-mngt-nic-cidr').val();
    var mngt_gw = $('#form-input-pfmp-vm-mngt-nic-gateway').val();
    var dns = $('#form-input-pfmp-vm-mngt-nic-dns').val();

    $('#span-pfmp-vm-pfmp-traffic').empty();
    var mngt_el = "";

    if(mngt_ip == '') {
        mngt_el += "IP Addr : 미입력</br>";
    } else {
        mngt_el += "IP Addr : "+mngt_ip+"</br>";
    }
    if(mngt_cidr == ''){
        mngt_el += "NetMask : 미입력</br>";
    }else{
        mngt_el += "NetMask : "+mngt_cidr+"</br>";
    }
    if(mngt_gw == '') {
        mngt_el += "Gateway : 미입력</br>";
    } else {
        mngt_el += "Gateway : "+mngt_gw+"</br>";
    }
    if(dns == ''){
        mngt_el += "DNS : 미입력</br>";
    }else {
        mngt_el += "DNS : "+dns+"</br>";
    }

    $('#span-pfmp-vm-pfmp-traffic').append(mngt_el);

    //추가 네트워크 3가지
    var mgmt_monitor_ip = $('#form-input-pfmp-mngt-5-pieces').val();
    var pn_ip = $('#form-input-pfmp-pn-5-pieces').val();
    var cn_ip = $('#form-input-pfmp-cn-5-pieces').val();

    if (mgmt_monitor_ip == ''){
        $('#span-pfmp-vm-mngt-monitor-ip').text("미입력");
    }else{
        $('#span-pfmp-vm-mngt-monitor-ip').text(mgmt_monitor_ip + " - "+ IncrementIpAddress(mgmt_monitor_ip,4));
    }

    if (pn_ip == ''){
        $('#span-pfmp-vm-pn-ip').text("미입력");
    }else{
        $('#span-pfmp-vm-pn-ip').text(pn_ip + " - "+ IncrementIpAddress(pn_ip,4));
    }

    if (cn_ip == ''){
        $('#span-pfmp-vm-cn-ip').text("미입력");
    }else{
        $('#span-pfmp-vm-cn-ip').text(cn_ip + " - "+ IncrementIpAddress(cn_ip,4));
    }

    //-----SSH Key 정보-----
    var ssh_private_key_url = $('#form-textarea-pfmp-vm-ssh-private-key-file').val();
    if(ssh_private_key_url == '') {
        $('#span-pfmp-vm-private-key-file').text("미입력");
    } else {
        $('#span-pfmp-vm-private-key-file').text(ssh_private_key_url);
    }

    var ssh_public_key_url = $('#form-textarea-pfmp-vm-ssh-public-key-file').val();
    if(ssh_public_key_url == '') {
        $('#span-pfmp-vm-public-key-file').text("미입력");
    } else {
        $('#span-pfmp-vm-public-key-file').text(ssh_public_key_url);
    }
}

/**
 * Meathod Name : validatePfmpVm
 * Date Created : 2021.03.17
 * Writer  : 정민철
 * Description : 스토리지 센터 가상머신 생성 전 입력받은 값의 유효성 검사
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.17 최초 작성
 */
function validatePfmpVm(){
    var validate_check = true;

    if($('select#form-select-pfmp-vm-cpu option:checked').val() == ""){ //cpu
        alert("CPU를 입력해주세요.");
        validate_check = false;
    }else if($('select#form-select-pfmp-vm-memory option:checked').val() == ""){ //memory
        alert("Memory를 입력해주세요.");
        validate_check = false;
    }else if($('select#form-select-pfmp-vm-mngt-nic option:checked').val() == ""){
        alert("관리 NIC용 Bridge를 입력해주세요.");
        validate_check = false;
    }else if($("#form-input-pfmp-vm-mngt-ip").val()  == ""){
        alert("관리 NIC IP를 입력해주세요.");
        validate_check = false;
    }else if(!checkIp($("#form-input-pfmp-vm-mngt-ip").val())){
        alert("관리 NIC IP 형식을 확인해주세요.");
        validate_check = false;
    }else if($("#form-input-pfmp-vm-mngt-nic-cidr").val() != "" && !($("#form-input-pfmp-vm-mngt-nic-cidr").val() >= 0 && $("#form-input-pfmp-vm-mngt-nic-cidr").val() <= 32)){
        alert("관리 NIC CIDR 범위는 0~32입니다.");
        validate_check = false;
    }else if($("#form-input-pfmp-vm-mngt-nic-gateway").val() != "" && !checkIp($("#form-input-pfmp-vm-mngt-nic-gateway").val())){
        alert("관리 NIC Gateway 형식을 확인해주세요.");
        validate_check = false;
    }else if (!checkIp($("#form-input-pfmp-vm-mngt-nic-dns").val()) && $("#form-input-pfmp-vm-mngt-nic-dns").val() != ""){
        alert("DNS 형식을 확인해주세요.");
        validate_check = false;
    }else if($('#form-textarea-pfmp-vm-ssh-private-key-file').val() == ""){
        alert("SSH 개인 Key 파일을 입력해주세요.");
        validate_check = false;
    }else if($('#form-textarea-pfmp-vm-ssh-public-key-file').val() == ""){
        alert("SSH 공개 Key 파일을 입력해주세요.");
        validate_check = false;
    }

    return validate_check;
}

/**
 * Meathod Name : setPfmpSshPrivateKeyInfo
 * Date Created : 2024.09.04
 * Writer  : 정민철
 * Description : 스토리지센터 가상머신에 사용할 ssh private key 파일 세팅
 * Parameter : String
 * Return  : 없음
 * History  : 2024.09.04 최초 작성
 */
 function setPfmpSshPrivateKeyInfo(ssh_private_key){
    if(ssh_private_key != ""){
        $("#form-textarea-pfmp-vm-ssh-private-key-file").val(ssh_private_key);
    } else {
        $("#form-textarea-pfmp-vm-ssh-private-key-file").val("");
    }
}

/**
 * Meathod Name : setPfmpSshPublicKeyInfo
 * Date Created : 2024.09.04
 * Writer  : 정민철
 * Description : 스토리지센터 가상머신에 사용할 ssh public key 파일 세팅
 * Parameter : String
 * Return  : 없음
 * History  : 2024.09.04 최초 작성
 */
 function setPfmpSshPublicKeyInfo(ssh_public_key){
    if(ssh_public_key != ""){
        $("#form-textarea-pfmp-vm-ssh-public-key-file").val(ssh_public_key);
    } else {
        $("#form-textarea-pfmp-vm-ssh-public-key-file").val("");
    }
}

/**
 * Meathod Name : setPfmpProgressFail
 * Date Created : 2024.09.04
 * Writer  : 정민철
 * Description : 스토리지센터 가상머신 배포 진행중 실패 단계에 따른 중단됨 UI 처리
 * Parameter : setp_num
 * Return  : 없음
 * History  : 2024.09.04 최초 작성
 */
 function setPfmpProgressFail(setp_num){
    if( setp_num == 1 || setp_num == '1' ){   // 1단계 이하 단계 전부 중단된 처리
        setPfmpProgressStep("span-pfmp-progress-step1",3);
        setPfmpProgressStep("span-pfmp-progress-step2",3);
        setPfmpProgressStep("span-pfmp-progress-step3",3);
        setPfmpProgressStep("span-pfmp-progress-step4",3);
    } else if(setp_num == 2 || setp_num == '2') {   // 2단계 이하 단계 전부 중단된 처리
        setPfmpProgressStep("span-pfmp-progress-step2",3);
        setPfmpProgressStep("span-pfmp-progress-step3",3);
        setPfmpProgressStep("span-pfmp-progress-step4",3);
    } else if(setp_num == 3 || setp_num == '3') {   // 3단계 이하 단계 전부 중단된 처리
        setPfmpProgressStep("span-pfmp-progress-step3",3);
        setPfmpProgressStep("span-pfmp-progress-step4",3);
    } else if(setp_num == 4 || setp_num == '4') {   // 4단계 이하 단계 전부 중단된 처리
        setPfmpProgressStep("span-pfmp-progress-step4",3);
    }
}
/**
 * Meathod Name : IncrementIpAddress
 * Date Created : 2024.09.05
 * Writer  : 정민철
 * Description : 추가 네트워크에서 IP 범위를 증가할 시
 * Parameter : ip_address, increment
 * Return  : 없음
 * History  : 2024.09.04 최초 작성
 */
function IncrementIpAddress(ip_address, increment) {
    // IP 주소를 숫자로 변환하는 함수
    function ipToNumber(ip) {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    }
    // 숫자를 다시 IP 주소로 변환하는 함수
    function numberToIp(number) {
      return [
        (number >>> 24) & 255,
        (number >>> 16) & 255,
        (number >>> 8) & 255,
        number & 255
      ].join('.');
    }

    // IP 주소를 숫자로 변환
    let ip_num = ipToNumber(ip_address);

    // IP 숫자에 증가값을 더함
    let incremented_ip_num = ip_num + increment;

    // 다시 IP 주소로 변환
    return numberToIp(incremented_ip_num);
  }