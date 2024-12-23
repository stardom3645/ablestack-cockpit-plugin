/**
 * File Name : cloud-vm-wizard.js
 * Date Created : 2020.03.03
 * Writer  : 박동혁
 * Description : 클라우드센터 VM 배포 마법사 UI를 컨트롤하기 위한 스크립트
**/

// 변수 선언
var cur_step_wizard_cloud_vm = "1";
var xml_create_cmd;
var completed = false;
var option_ccvm = "-ccvm";
var os_type = sessionStorage.getItem("os_type");
/* Document Ready 이벤트 처리 시작 */

$(document).ready(function(){

    // 마법사 페이지 준비
    $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').hide();
    $('#div-modal-wizard-cloud-vm-failover-cluster').hide();
    $('#div-modal-wizard-cloud-vm-compute').hide();
    $('#div-modal-wizard-cloud-vm-network').hide();
    $('#div-modal-wizard-cloud-vm-additional').hide();
    $('#div-modal-wizard-cloud-vm-ssh-key').hide();
    $('#div-modal-wizard-cloud-vm-review').hide();
    $('#div-modal-wizard-cloud-vm-deploy').hide();
    $('#div-modal-wizard-cloud-vm-finish').hide();
    // gfs용 화면
    $('#div-modal-wizard-cloud-vm-disk').hide();
    $('#div-modal-wizard-cloud-vm-ipmi').hide();

    $('#div-form-hosts-file-ccvm').hide();
    $('#div-form-hosts-table-ccvm').hide();

    $('#div-accordion-cloud-vm-failover-cluster').hide();
    $('#div-accordion-cloud-vm-compute-network').hide();
    $('#div-accordion-cloud-vm-ipmi').hide();
    $('#div-accordion-cloud-vm-additional').hide();
    $('#div-accordion-cloud-vm-ssh-key').hide();

    // $('#nav-button-cloud-vm-review').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-finish').addClass('pf-m-disabled');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', true);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    // 첫번째 스텝에서 시작
    cur_step_wizard_cloud_vm = "1";

    //관리네트워크 리스트 초기 세팅
    setNicBridge('form-select-cloud-vm-mngt-parent');

    //서비스네트워크 리스트 초기 세팅
    setNicBridge('form-select-cloud-vm-svc-parent');

    //호스트 파일 셋팅
    clusterConfigProfile(os_type);

    cockpit.spawn(["cat", pluginpath + "/tools/properties/cluster.json"])
    .then(function(data){
        var clusterJsonConf = JSON.parse(data);

        var count = clusterJsonConf.clusterConfig.hosts.length;

        //장애조치 클러스터 동적 셋팅
        updateHostFields(count);

        //IPMI 동적 셋팅
        updateIPMIcredentials(count,$('input[name="radio-ipmi-ccvm"]:checked').val());

        settingProfile(clusterJsonConf, option_ccvm, os_type);
    })
    .catch(function(data){
        createLoggerInfo("cluster.json 파일 읽기 실패");
        console.log("cluster.json 파일 읽기 실패" + data);
    });
    //gfs용 disk 정보
    setGfsDiskInfo();

    //ssh 개인 key 파일 선택 이벤트 세팅
    setSshKeyFileReader($('#form-input-cloud-vm-ssh-private-key-file'), 'id_rsa', setCcvmSshPrivateKeyInfo);

    //ssh 공개 key 파일 선택 이벤트 세팅
    setSshKeyFileReader($('#form-input-cloud-vm-ssh-public-key-file'), 'id_rsa.pub', setCcvmSshPublicKeyInfo);

    //os type 별로 화면 처리
    setTypeByChange();

    //SSH Key 정보 자동 세팅
    settingSshKey(option_ccvm);

    //현재 호스트 명 세팅
    checkHostName(option_ccvm);

    $('#form-radio-hosts-file-ccvm').click();
});
/* Title 영역에서 발생하는 이벤트 처리 시작 */

$('#button-close-modal-wizard-cloud-vm').on('click', function(){
    $('#div-modal-wizard-cloud-vm').hide();
    if(completed){
        //상태값 초기화 겸 페이지 리로드
        location.reload();
    }
});

/* Title 영역에서 발생하는 이벤트 처리 끝 */

/* 사이드 메뉴 영역에서 발생하는 이벤트 처리 시작 */

$('#nav-button-cloud-vm-overview').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-overview').show();
    $('#nav-button-cloud-vm-overview').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    cur_step_wizard_cloud_vm = "1";
});
$('#nav-button-cloud-vm-appliance').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
    $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
    $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    cur_step_wizard_cloud_vm = "2";
});

$('#nav-button-cloud-vm-cluster-sync-mechanism').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
    $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
    $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    cur_step_wizard_cloud_vm = "2";
})
$('#nav-button-cloud-vm-compute').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-compute').show();
    $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
    $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    cur_step_wizard_cloud_vm = "3";
});

$('#nav-button-cloud-vm-network').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-network').show();
    $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
    $('#nav-button-cloud-vm-network').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    cur_step_wizard_cloud_vm = "4";
});

$('#nav-button-cloud-vm-disk').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-disk').show();
    $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
    $('#nav-button-cloud-vm-disk').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    cur_step_wizard_cloud_vm = "5";
});

$('#nav-button-cloud-vm-additional').on('click',function(){
    resetCloudVMWizard();
    setGfsDiskInfo();
    $('#div-modal-wizard-cloud-vm-additional').show();
    $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    if (os_type == "general-virtualization"){
        cur_step_wizard_cloud_vm = "6";
    }else{
        cur_step_wizard_cloud_vm = "5";
    }
});

$('#nav-button-cloud-vm-ipmi').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-ipmi').show();
    $('#nav-button-cloud-vm-ipmi').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    if (os_type == "general-virtualization"){
        cur_step_wizard_cloud_vm = "7";
    }else{
        cur_step_wizard_cloud_vm = "6";
    }
});

$('#nav-button-cloud-vm-ssh-key').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-ssh-key').show();
    $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    if (os_type == "PowerFlex"){
        cur_step_wizard_cloud_vm = "7";
    }else if(os_type == "general-virtualization"){
        cur_step_wizard_cloud_vm = "8";
    }else{
        cur_step_wizard_cloud_vm = "6";
    }
});

$('#nav-button-cloud-vm-cluster').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-failover-cluster').show();
    $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    if (os_type == "PowerFlex"){
        cur_step_wizard_cloud_vm = "8";
    }else if(os_type == "general-virtualization"){
        cur_step_wizard_cloud_vm = "9";
    }else{
        cur_step_wizard_cloud_vm = "7";
    }
});

$('#nav-button-cloud-vm-review').on('click',function(){

    setCcvmReviewInfo();

    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-review').show();
    $('#nav-button-cloud-vm-review').addClass('pf-m-current');
    //$('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

    $('#button-next-step-modal-wizard-cloud-vm').html('배포');
    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    if (os_type == "PowerFlex"){
        cur_step_wizard_cloud_vm = "9";
    }else if(os_type == "general-virtualization"){
        cur_step_wizard_cloud_vm = "10";
    }else{
        cur_step_wizard_cloud_vm = "8";
    }
});

$('#nav-button-cloud-vm-finish').on('click',function(){
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-finish').show();
    $('#nav-button-cloud-vm-finish').addClass('pf-m-current');

    $('#button-next-step-modal-wizard-cloud-vm').html('완료');
    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', true);
    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    if (os_type == "PowerFlex"){
        cur_step_wizard_cloud_vm = "10";
    }else if(os_type == "general-virtualization"){
        cur_step_wizard_cloud_vm = "11";
    }else{
        cur_step_wizard_cloud_vm = "9";
    }
});

/* 사이드 메뉴 영역에서 발생하는 이벤트 처리 시작 */

/* Footer 영역에서 발생하는 이벤트 처리 시작 */

$('#button-next-step-modal-wizard-cloud-vm').on('click', function(){
    // OS Type이  PowerFlex일 때의 다음버튼의 행동 처리
    if (os_type == "PowerFlex"){
        if (cur_step_wizard_cloud_vm == "1") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "2";
        }
        else if (cur_step_wizard_cloud_vm == "2") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-compute').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "3";
        }
        else if (cur_step_wizard_cloud_vm == "3") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-network').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-network').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "4";
        }
        else if (cur_step_wizard_cloud_vm == "4") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-additional').show();
            $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "5";
        }
        else if (cur_step_wizard_cloud_vm == "5") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ipmi').show();
            $('#nav-button-cloud-vm-ipmi').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "6") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ssh-key').show();
            $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', true);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);
            var host_names = [];
            for (let i = 1; i <= $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length ; i++) {
                const hostElement = document.getElementById(`form-input-cloud-vm-failover-cluster-host${i}-name`);
                if (hostElement) {
                    const hostName = $(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val();
                    if (hostName) {
                        host_names.push(hostName); // 유효한 이름만 배열에 추가
                    }
                }
            }
            var ipmi_port = "623";
            var ipmi_check_value = $('input[name="radio-ipmi-ccvm"]:checked').val();

            var ipmi_config = ""; // 최종 IPMI 설정 문자열 초기화
            var ipmi_data = [];  // IPMI 데이터를 담을 배열
            if (ipmi_check_value === "individual") {
                // 개별 자격 증명 처리
                for (let i = 0; i < host_names.length; i++) {
                    // 동적으로 각 IPMI 입력값 가져오기
                    let ip = $(`#form-input-individual-credentials-ipmi-ip${i+1}`).val() || '';
                    let user = $(`#form-input-individual-credentials-ipmi-user${i+1}`).val() || '';
                    let password = $(`#form-input-individual-credentials-ipmi-password${i+1}`).val() || '';

                    if (!ip) break; // IP가 없으면 더 이상 처리하지 않음
                    ipmi_data.push({ ip, user, password }); // 배열에 추가
                }
            } else {
                // 공통 자격 증명 처리
                for (let i = 0; i < host_names.length; i++) {
                    // 동적으로 각 IPMI 입력값 가져오기
                    let ip = $(`#form-input-common-credentials-ipmi-ip${i+1}`).val() || '';
                    if (!ip) break; // IP가 없으면 더 이상 처리하지 않음

                    // 공통 사용자 정보 추가
                    let user = $('#form-input-common-credentials-ipmi-user').val();
                    let password = $('#form-input-common-credentials-ipmi-password').val();

                    ipmi_data.push({ ip, user, password }); // 배열에 추가
                }
            }
            ipmi_data.forEach((entry, index) => {
                ipmi_config += `${index > 0 ? ";" : ""}${entry.ip},${ipmi_port},${entry.user},${entry.password}`;
            });
            check_ipmi_cmd = ['python3',pluginpath + '/python/pcs/gfs-manage.py' , '--check-ipmi', '--stonith', ipmi_config];
            console.log(check_ipmi_cmd);
            cockpit.spawn(check_ipmi_cmd)
            .then(function(data){
                var retVal = JSON.parse(data);
                console.log(retVal)
                if (retVal.code == "200"){
                    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
                    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
                    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

                    cur_step_wizard_cloud_vm = "7";
                }else{
                    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', true);
                    cur_step_wizard_cloud_vm = "7";
                    alert(retVal.val.message + " 이전으로 돌아가 정확한 자격증명을 입력하시길 바랍니다.");
                }
            })
            .catch(function(){
                $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', true);
                cur_step_wizard_cloud_vm = "7";
                alert("이전으로 돌아가 정확한 자격증명을 입력하시길 바랍니다.");
            })
            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "7") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-failover-cluster').show();
            $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "8";
        }
        else if (cur_step_wizard_cloud_vm == "8") {
            resetCloudVMWizard();

            setCcvmReviewInfo();

            $('#div-modal-wizard-cloud-vm-review').show();
            $('#nav-button-cloud-vm-review').addClass('pf-m-current');
            //$('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

            $('#button-next-step-modal-wizard-cloud-vm').html('배포');
            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "9";
        }
        else if (cur_step_wizard_cloud_vm == "9") {
            $('#div-modal-cloud-wizard-confirm').show();
        }
        else if (cur_step_wizard_cloud_vm == "10") {
            $('#div-modal-wizard-cloud-vm').hide();
        }
    }else if(os_type == "general-virtualization"){ // OS Type이 general-virtualization 일 경우의 다음버튼의 행동 처리
        if (cur_step_wizard_cloud_vm == "1") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "2";
        }
        else if (cur_step_wizard_cloud_vm == "2") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-compute').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "3";
        }
        else if (cur_step_wizard_cloud_vm == "3") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-network').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-network').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "4";
        }
        else if (cur_step_wizard_cloud_vm == "4") {
            resetCloudVMWizard();
            setGfsDiskInfo();
            $('#div-modal-wizard-cloud-vm-disk').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-disk').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "5";

        }
        else if (cur_step_wizard_cloud_vm == "5") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-additional').show();
            $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);


            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "6") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ipmi').show();
            $('#nav-button-cloud-vm-ipmi').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "7";
        }
        else if (cur_step_wizard_cloud_vm == "7") {
            resetCloudVMWizard();
            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', true);

            $('#div-modal-wizard-cloud-vm-ssh-key').show();
            $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

            var host_names = [];
            for (let i = 1; i <= $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length ; i++) {
                const hostElement = document.getElementById(`form-input-cloud-vm-failover-cluster-host${i}-name`);
                if (hostElement) {
                    const hostName = $(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val();
                    if (hostName) {
                        host_names.push(hostName); // 유효한 이름만 배열에 추가
                    }
                }
            }
            var ipmi_port = "623";
            var ipmi_check_value = $('input[name="radio-ipmi-ccvm"]:checked').val();

            var ipmi_config = ""; // 최종 IPMI 설정 문자열 초기화
            var ipmi_data = [];  // IPMI 데이터를 담을 배열
            if (ipmi_check_value === "individual") {
                // 개별 자격 증명 처리
                for (let i = 0; i < host_names.length; i++) {
                    // 동적으로 각 IPMI 입력값 가져오기
                    let ip = $(`#form-input-individual-credentials-ipmi-ip${i+1}`).val() || '';
                    let user = $(`#form-input-individual-credentials-ipmi-user${i+1}`).val() || '';
                    let password = $(`#form-input-individual-credentials-ipmi-password${i+1}`).val() || '';

                    if (!ip) break; // IP가 없으면 더 이상 처리하지 않음
                    ipmi_data.push({ ip, user, password }); // 배열에 추가
                }
            } else {
                // 공통 자격 증명 처리
                for (let i = 0; i < host_names.length; i++) {
                    // 동적으로 각 IPMI 입력값 가져오기
                    let ip = $(`#form-input-common-credentials-ipmi-ip${i+1}`).val() || '';
                    if (!ip) break; // IP가 없으면 더 이상 처리하지 않음

                    // 공통 사용자 정보 추가
                    let user = $('#form-input-common-credentials-ipmi-user').val();
                    let password = $('#form-input-common-credentials-ipmi-password').val();

                    ipmi_data.push({ ip, user, password }); // 배열에 추가
                }
            }
            ipmi_data.forEach((entry, index) => {
                ipmi_config += `${index > 0 ? ";" : ""}${entry.ip},${ipmi_port},${entry.user},${entry.password}`;
            });
            check_ipmi_cmd = ['python3',pluginpath + '/python/pcs/gfs-manage.py' , '--check-ipmi', '--stonith', ipmi_config];
            console.log(check_ipmi_cmd);
            cockpit.spawn(check_ipmi_cmd)
            .then(function(data){
                var retVal = JSON.parse(data);
                console.log(retVal)
                if (retVal.code == "200"){
                    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
                    $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
                    $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

                    cur_step_wizard_cloud_vm = "8";
                }else{
                    $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', true);
                    cur_step_wizard_cloud_vm = "8";
                    alert(retVal.val.message + " 이전으로 돌아가 정확한 자격증명을 입력하시길 바랍니다.");
                }
            })
            .catch(function(){
                $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', true);
                cur_step_wizard_cloud_vm = "8";
                alert("이전으로 돌아가 정확한 자격증명을 입력하시길 바랍니다.");
            })

        }
        else if (cur_step_wizard_cloud_vm == "8") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-failover-cluster').show();
            $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "9";
        }
        else if (cur_step_wizard_cloud_vm == "9") {
            resetCloudVMWizard();

            setCcvmReviewInfo();

            $('#div-modal-wizard-cloud-vm-review').show();
            $('#nav-button-cloud-vm-review').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').html('배포');
            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "10";
        }
        else if (cur_step_wizard_cloud_vm == "10") {
            $('#div-modal-cloud-wizard-confirm').show();
        }
        else if (cur_step_wizard_cloud_vm == "11"){
            $('#div-modal-wizard-cloud-vm').hide();
        }
    }else{ // OS Type이 ABLESTACK-HCI 일 경우의 다음버튼의 행동 처리
        if (cur_step_wizard_cloud_vm == "1") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "2";
        }
        else if (cur_step_wizard_cloud_vm == "2") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-compute').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "3";
        }
        else if (cur_step_wizard_cloud_vm == "3") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-network').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-network').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "4";
        }
        else if (cur_step_wizard_cloud_vm == "4") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-additional').show();
            $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "5";
        }
        else if (cur_step_wizard_cloud_vm == "5") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ssh-key').show();
            $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "6") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-failover-cluster').show();
            $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "7";
        }
        else if (cur_step_wizard_cloud_vm == "7") {
            resetCloudVMWizard();

            setCcvmReviewInfo();

            $('#div-modal-wizard-cloud-vm-review').show();
            $('#nav-button-cloud-vm-review').addClass('pf-m-current');
            //$('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

            $('#button-next-step-modal-wizard-cloud-vm').html('배포');
            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "8";
        }
        else if (cur_step_wizard_cloud_vm == "8") {
            $('#div-modal-cloud-wizard-confirm').show();
        }
        else if (cur_step_wizard_cloud_vm == "9") {
            $('#div-modal-wizard-cloud-vm').hide();
        }
    }

});

$('#button-before-step-modal-wizard-cloud-vm').on('click', function(){
        // OS Type이 ABLESTACK이 아닐 때의 이전버튼의 행동 처리
    if (os_type == "PowerFlex"){
        if (cur_step_wizard_cloud_vm == "1") {
            // 이벤트 처리 없음
        }
        else if (cur_step_wizard_cloud_vm == "2") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-overview').show();
            $('#nav-button-cloud-vm-overview').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', true);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "1";
        }
        else if (cur_step_wizard_cloud_vm == "3") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "2";
        }
        else if (cur_step_wizard_cloud_vm == "4") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-compute').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "3";
        }
        else if (cur_step_wizard_cloud_vm == "5") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-network').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-network').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "4";
        }
        else if (cur_step_wizard_cloud_vm == "6") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-additional').show();
            $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "5";
        }
        else if (cur_step_wizard_cloud_vm == "7") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ipmi').show();
            $('#nav-button-cloud-vm-ipmi').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "8") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ssh-key').show();
            $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "7";
        }
        else if (cur_step_wizard_cloud_vm == "9") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-failover-cluster').show();
            $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "8";
        }
        else if (cur_step_wizard_cloud_vm == "10") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-review').show();
            $('#nav-button-cloud-vm-review').addClass('pf-m-current');
            $('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "9";
        }
    }else if (os_type == "general-virtualization") {  // OS Type이 general-virtualization 경우의 이전버튼의 행동 처리
        if (cur_step_wizard_cloud_vm == "1") {
            // 이벤트 처리 없음
        }
        else if (cur_step_wizard_cloud_vm == "2") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-overview').show();
            $('#nav-button-cloud-vm-overview').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', true);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "1";
        }
        else if (cur_step_wizard_cloud_vm == "3") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "2";
        }
        else if (cur_step_wizard_cloud_vm == "4") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-compute').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "3";
        }
        else if (cur_step_wizard_cloud_vm == "5") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-network').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-network').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "4";
        }
        else if (cur_step_wizard_cloud_vm == "6") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-disk').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-disk').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);


            cur_step_wizard_cloud_vm = "5";
        }
        else if (cur_step_wizard_cloud_vm == "7") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-additional').show();
            $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "8") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ipmi').show();
            $('#nav-button-cloud-vm-ipmi').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "7";
        }
        else if (cur_step_wizard_cloud_vm == "9") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ssh-key').show();
            $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "8";
        }
        else if (cur_step_wizard_cloud_vm == "10") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-failover-cluster').show();
            $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "9";
        }
        else if (cur_step_wizard_cloud_vm == "11"){
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-review').show();
            $('#nav-button-cloud-vm-review').addClass('pf-m-current');
            $('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "10";
        }
    }else{ // OS Type이 ABLESTACK일 경우의 이전버튼의 행동 처리
        if (cur_step_wizard_cloud_vm == "1") {
            // 이벤트 처리 없음
        }
        else if (cur_step_wizard_cloud_vm == "2") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-overview').show();
            $('#nav-button-cloud-vm-overview').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', true);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "1";
        }
        else if (cur_step_wizard_cloud_vm == "3") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "2";
        }
        else if (cur_step_wizard_cloud_vm == "4") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-compute').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-compute').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "3";
        }
        else if (cur_step_wizard_cloud_vm == "5") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-network').show();
            $('#nav-button-cloud-vm-appliance').addClass('pf-m-current');
            $('#nav-button-cloud-vm-network').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "4";
        }
        else if (cur_step_wizard_cloud_vm == "6") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-additional').show();
            $('#nav-button-cloud-vm-additional').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "5";
        }
        else if (cur_step_wizard_cloud_vm == "7") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-ssh-key').show();
            $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "6";
        }
        else if (cur_step_wizard_cloud_vm == "8") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-failover-cluster').show();
            $('#nav-button-cloud-vm-cluster').addClass('pf-m-current');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "7";
        }
        else if (cur_step_wizard_cloud_vm == "9") {
            resetCloudVMWizard();

            $('#div-modal-wizard-cloud-vm-review').show();
            $('#nav-button-cloud-vm-review').addClass('pf-m-current');
            $('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

            $('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-before-step-modal-wizard-cloud-vm').attr('disabled', false);
            $('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

            cur_step_wizard_cloud_vm = "8";
        }
    }

});

/* Footer 영역에서 발생하는 이벤트 처리 끝 */

/* HTML Object에서 발생하는 이벤트 처리 시작 */

// 설정확인 단계의 아코디언 개체에서 발생하는 이벤트의 처리
$('#button-accordion-cloud-vm-failover-cluster').on('click', function(){
    if ($('#button-accordion-cloud-vm-failover-cluster').attr("aria-expanded") == "false") {
        $('#button-accordion-cloud-vm-failover-cluster').attr("aria-expanded", "true");
        $('#button-accordion-cloud-vm-failover-cluster').addClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-failover-cluster').fadeIn();
        $('#div-accordion-cloud-vm-failover-cluster').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-cloud-vm-failover-cluster').attr("aria-expanded", "false");
        $('#button-accordion-cloud-vm-failover-cluster').removeClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-failover-cluster').fadeOut();
        $('#div-accordion-cloud-vm-failover-cluster').removeClass("pf-m-expanded");
    }
});

$(document).on('click', '#button-accordion-cloud-vm-ipmi', function () {
    const button = $(this); // 현재 클릭된 버튼
    const content = $('#div-accordion-cloud-vm-ipmi'); // 아코디언 내용 영역

    if (button.attr("aria-expanded") == "false") {
        button.attr("aria-expanded", "true");
        button.addClass("pf-m-expanded");
        content.fadeIn();
        content.addClass("pf-m-expanded");
    } else {
        button.attr("aria-expanded", "false");
        button.removeClass("pf-m-expanded");
        content.fadeOut();
        content.removeClass("pf-m-expanded");
    }
});

$('#button-accordion-cloud-vm-compute-network').on('click', function(){
    if ($('#button-accordion-cloud-vm-compute-network').attr("aria-expanded") == "false") {
        $('#button-accordion-cloud-vm-compute-network').attr("aria-expanded", "true");
        $('#button-accordion-cloud-vm-compute-network').addClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-compute-network').fadeIn();
        $('#div-accordion-cloud-vm-compute-network').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-cloud-vm-compute-network').attr("aria-expanded", "false");
        $('#button-accordion-cloud-vm-compute-network').removeClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-compute-network').fadeOut();
        $('#div-accordion-cloud-vm-compute-network').removeClass("pf-m-expanded");
    }
});

$('#button-accordion-cloud-vm-additional').on('click', function(){
    if ($('#button-accordion-cloud-vm-additional').attr("aria-expanded") == "false") {
        $('#button-accordion-cloud-vm-additional').attr("aria-expanded", "true");
        $('#button-accordion-cloud-vm-additional').addClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-additional').fadeIn();
        $('#div-accordion-cloud-vm-additional').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-cloud-vm-additional').attr("aria-expanded", "false");
        $('#button-accordion-cloud-vm-additional').removeClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-additional').fadeOut();
        $('#div-accordion-cloud-vm-additional').removeClass("pf-m-expanded");
    }
});

$('#button-accordion-cloud-vm-ssh-key').on('click', function(){
    if ($('#button-accordion-cloud-vm-ssh-key').attr("aria-expanded") == "false") {
        $('#button-accordion-cloud-vm-ssh-key').attr("aria-expanded", "true");
        $('#button-accordion-cloud-vm-ssh-key').addClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-ssh-key').fadeIn();
        $('#div-accordion-cloud-vm-ssh-key').addClass("pf-m-expanded");
    }
    else {
        $('#button-accordion-cloud-vm-ssh-key').attr("aria-expanded", "false");
        $('#button-accordion-cloud-vm-ssh-key').removeClass("pf-m-expanded");
        $('#div-accordion-cloud-vm-ssh-key').fadeOut();
        $('#div-accordion-cloud-vm-ssh-key').removeClass("pf-m-expanded");
    }
});
$(document).on('click', '#button-accordion-cloud-vm-failover-cluster', function () {
    const button = $(this); // 현재 클릭된 버튼
    const content = $('#div-accordion-cloud-vm-failover-cluster'); // 아코디언 내용 영역

    if (button.attr("aria-expanded") == "false") {
        button.attr("aria-expanded", "true");
        button.addClass("pf-m-expanded");
        content.fadeIn();
        content.addClass("pf-m-expanded");
    } else {
        button.attr("aria-expanded", "false");
        button.removeClass("pf-m-expanded");
        content.fadeOut();
        content.removeClass("pf-m-expanded");
    }
});
// 네트워크 구성에서 "서비스네트워크"의 선택여부가 변경되었을 때의 이벤트 처리
$('#form-checkbox-svc-network').on('change', function(){
    if ($('#form-checkbox-svc-network').is(':checked') == true) {
        // 서비스네트워크를 사용하으로 선택한 경우 서비스네트워크 브릿지 선택상자를 활성화 함
        $('#form-select-cloud-vm-svc-parent').attr('disabled', false);

        // 추가 네트워크 정보에서 서비스 NIC 정보를 입력할 수 있도록 활성화 해야 함
        $('#form-input-cloud-vm-svc-nic-ip').attr('disabled', false);
        $('#form-input-cloud-vm-svc-vlan').attr('disabled', false);
        $('#form-input-cloud-vm-svc-gw').attr('disabled', false);
        $('#form-input-cloud-vm-svc-dns').attr('disabled', false);
    }
    else {
        // 서비스네트워크를 사용하지 않음으로 선택한 경우 서비스네트워크 브릿지 선택상자를 비활성화 함
        $('#form-select-cloud-vm-svc-parent').attr('disabled', true);

        // 추가 네트워크 정보에서 서비스 NIC 정보를 입력할 수 없도록 비활성화 해야 함
        $('#form-input-cloud-vm-svc-nic-ip').attr('disabled', true);
        $('#form-input-cloud-vm-svc-vlan').attr('disabled', true);
        $('#form-input-cloud-vm-svc-gw').attr('disabled', true);
        $('#form-input-cloud-vm-svc-dns').attr('disabled', true);
    }
});

// Host 파일 준비 방법 중 신규생성을 클릭하는 경우 Host 프로파일 디비전을 보여주고 Hosts 파일 디비전은 숨긴다.
$('#form-radio-hosts-new-ccvm').on('click', function () {
    $('#div-form-hosts-profile-ccvm').show();
    $('#div-form-hosts-file-ccvm').hide();
    $('#div-form-hosts-table-ccvm').hide();
    $('#div-form-hosts-input-number-ccvm').show();
    $('#div-form-hosts-input-current-number-ccvm').show();
    $('#form-input-cluster-config-host-number-ccvm').val(3);
    // "기존 파일 사용"에서 "신규 생성"을 클릭하면 초기화 된다.
    $("#form-table-tbody-cluster-config-new-host-profile-ccvm").empty();
    clusterConfigTableChange("form-input-cluster-config-host-number-ccvm", "form-table-tbody-cluster-config-new-host-profile-ccvm",os_type);
    resetCcvmNetworkInfo();
    // $('#form-input-cluster-config-current-host-number-ccvm').val(1);
    $('#form-input-cluster-config-host-number-plus-ccvm').removeAttr('disabled');
    $('#form-input-cluster-config-host-number-minus-ccvm').removeAttr('disabled');
    $('#form-input-cluster-config-host-number-ccvm').removeAttr('disabled');
    $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').remove();
    // $('#form-input-cloud-vm-hosts-file').val("");
});

// Host 파일 준비 방법 중 기존 파일 사용을 클릭하는 경우 Host 프로파일 디비전을 숨기고 Hosts 파일 디비전은 보여준다.
$('#form-radio-hosts-file-ccvm').on('click', function () {
    $('#div-form-hosts-profile-ccvm').hide();
    $('#div-form-hosts-file-ccvm').show();
    $('#div-form-hosts-table-ccvm').show();
    $('#div-form-hosts-input-number-ccvm').show();
    $('#div-form-hosts-input-current-number-ccvm').show();
    $('#form-input-cluster-config-host-number-ccvm').val(0);
    $("#form-table-tbody-cluster-config-existing-host-profile-ccvm").empty();
    clusterConfigTableChange("form-input-cluster-config-host-number-ccvm", "form-table-tbody-cluster-config-existing-host-profile-ccvm",os_type);
    resetCcvmNetworkInfo();
    // $('#form-input-cluster-config-current-host-number-ccvm').val(1);
    $('#form-input-cluster-config-host-number-plus-ccvm').attr('disabled', 'true');
    $('#form-input-cluster-config-host-number-minus-ccvm').attr('disabled', 'true');
    $('#form-input-cluster-config-host-number-ccvm').attr('disabled', 'true');
});
//IPMI 정보에서 개별 자격 즘명을 클릭할 시
$('#form-radio-ipmi-individual-credentials').on('click', function() {
    resetIpmiValues();

    $('#div-individual-credentials').show();
    $('#div-common-credentials').hide();
});
//IPMI 정보에서 공통 자격 즘명을 클릭할 시
$('#form-radio-ipmi-common-credentials').on('click', function() {
    resetIpmiValues();

    $('#div-individual-credentials').hide();
    $('#div-common-credentials').show();
});
// Host 파일 준비 중 "구성할 호스트"를 변경하는 '+', '-' 기능
$('#form-input-cluster-config-host-number-plus-ccvm').on('click', function () {
    let num = $("#form-input-cluster-config-host-number-ccvm").val();
    $("#form-input-cluster-config-host-number-ccvm").val(num * 1 + 1);

    clusterConfigTableChange("form-input-cluster-config-host-number-ccvm", "form-table-tbody-cluster-config-new-host-profile-ccvm",os_type);
});
$('#form-input-cluster-config-host-number-minus-ccvm').on('click', function () {
    let num = $("#form-input-cluster-config-host-number-ccvm").val();
    var os_type = $('#selected-cluster-type').val()
    if(num > 3){
        $('#form-input-cluster-config-host-number-ccvm').val(num * 1 - 1)
        clusterConfigTableChange("form-input-cluster-config-host-number-ccvm", "form-table-tbody-cluster-config-new-host-profile-ccvm",os_type);
    }
});

$('#form-input-cluster-config-host-number-ccvm').on('change', function () {

    var os_type = $('#selected-cluster-type').val()
    if (this.value < 3 || this.value > 99) {
        this.value = 3;
        alert("3~99까지의 숫자만 입력할 수 있습니다.")
        clusterConfigTableChange("form-input-cluster-config-host-number-ccvm", "form-table-tbody-cluster-config-new-host-profile-ccvm",os_type);
        return;
    } else {
        clusterConfigTableChange("form-input-cluster-config-host-number-ccvm", "form-table-tbody-cluster-config-new-host-profile-ccvm",os_type);
    }
});

// 마법사 "배포 실행 버튼 모달창"
$('#button-cancel-modal-cloud-wizard-confirm').on('click', function () {
    $('#div-modal-cloud-wizard-confirm').hide();
});
$('#button-close-modal-cloud-wizard-confirm').on('click', function () {
    $('#div-modal-cloud-wizard-confirm').hide();
});
// 마법사 "배포 버튼 모달창" 실행 버튼을 눌러 가상머신 배포
$('#button-execution-modal-cloud-wizard-confirm').on('click', function () {
    $('#div-modal-cloud-wizard-confirm').hide();
    if(validateCloudCenterVm()){
        deployCloudCenterVM();
        if(os_type == "PowerFlex"){
            cur_step_wizard_cloud_vm = "10";
        }else if(os_type == "general-virtualization"){
            cur_step_wizard_cloud_vm = "11";
        }else{
            cur_step_wizard_cloud_vm = "9";
        }
    }
});

// 마법사 "취소 버튼 모달창" show, hide
$('#button-cancel-config-modal-wizard-cloud-vm').on('click', function () {
    $('#div-modal-cancel-cloud-wizard-cancel').show();
});
$('#button-close-modal-cloud-wizard-cancel').on('click', function () {
    $('#div-modal-cancel-cloud-wizard-cancel').hide();
});
$('#button-cancel-modal-cloud-wizard-cancel').on('click', function () {
    $('#div-modal-cancel-cloud-wizard-cancel').hide();
});
// 마법사 "취소 버튼 모달창" 실행 버튼을 눌러 취소를 실행
$('#button-execution-modal-cloud-wizard-cancel').on('click', function () {
    //상태값 초기화 겸 페이지 리로드
    location.reload();
});
$('[name="radio-ipmi-ccvm"]').on('change', function () {
    updateIPMIcredentials($('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length,$('input[name="radio-ipmi-ccvm"]:checked').val())

});
/* HTML Object에서 발생하는 이벤트 처리 끝 */

/* 함수 정의 시작 */

/**
 * Meathod Name : resetCloudVMWizard
 * Date Created : 2021.03.08
 * Writer  : 박동혁
 * Description : 마법사 대화상자의 모든 디비전 및 사이드버튼 속성을 초기화
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.08 최초 작성
 */
function resetCloudVMWizard(){
    // 모든 디비전 숨기기
    $('#div-modal-wizard-cloud-vm-overview').hide();
    $('#div-modal-wizard-cloud-vm-cluster-sync-mechanism').hide();
    $('#div-modal-wizard-cloud-vm-failover-cluster').hide();
    $('#div-modal-wizard-cloud-vm-compute').hide();
    $('#div-modal-wizard-cloud-vm-network').hide();
    $('#div-modal-wizard-cloud-vm-additional').hide();
    $('#div-modal-wizard-cloud-vm-ssh-key').hide();
    $('#div-modal-wizard-cloud-vm-review').hide();
    $('#div-modal-wizard-cloud-vm-deploy').hide();
    $('#div-modal-wizard-cloud-vm-finish').hide();

    // 일반가상화 GFS용 일때
    $('#div-modal-wizard-cloud-vm-disk').hide();
    $('#div-modal-wizard-cloud-vm-ipmi').hide();
    $('#nav-button-cloud-vm-disk').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-ipmi').removeClass('pf-m-current');

    // 모든 사이드버튼 '기본' 속성 삭제
    $('#nav-button-cloud-vm-overview').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-cluster-sync-mechanism').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-cluster').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-appliance').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-compute').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-network').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-disk').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-additional').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-ssh-key').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-review').removeClass('pf-m-current');
    $('#nav-button-cloud-vm-finish').removeClass('pf-m-current');

    // footer 버튼 속성 설정
    $('#button-next-step-modal-wizard-cloud-vm').html('다음');
}

/**
 * Meathod Name : deployCloudCenterVM
 * Date Created : 2021.03.17
 * Writer  : 박동혁
 * Description : 클라우드센터 가상머신을 배포하는 작업을 화면에 표시하도록 하는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.17 최초 작성
 */
function deployCloudCenterVM() {

    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-deploy').show();
    $('#nav-button-cloud-vm-finish').addClass('pf-m-current');

    // 하단 버튼 숨김
    $('#button-next-step-modal-wizard-cloud-vm').hide();
    $('#button-before-step-modal-wizard-cloud-vm').hide();
    $('#button-cancel-config-modal-wizard-cloud-vm').hide();

    // 왼쪽 사이드 버튼 전부 비활성화
    $('#nav-button-cloud-vm-overview').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-cluster-sync-mechanism').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-cluster').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-appliance').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-compute').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-ipmi').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-network').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-additional').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-ssh-key').addClass('pf-m-disabled');
    $('#nav-button-cloud-vm-review').addClass('pf-m-disabled');

    // 일반 가상화 GFS용 일 때
    $('#nav-button-cloud-vm-ipmi').addClass('pf-m-disabled');

    // ccvm 정보
    var host_name = $('#form-input-cloud-vm-hostname').val();
    var mgmt_ip = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[0];
    var mgmt_prefix = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[1];
    var mngt_gw = $('#form-input-cloud-vm-mngt-gw').val();

    var cluster_sync_mechanism = String(Number($('#form-input-cloud-vm-cluster-sync-mechanism').val()) * 1000);
    console.log(cluster_sync_mechanism);
    // pcs 클러스터 구성할 호스트 1~3번 정보
    var all_host_name = "";
    var host_names = [];
    for (let i = 1; i <= $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length ; i++) {
        const hostElement = document.getElementById(`form-input-cloud-vm-failover-cluster-host${i}-name`);
        if (hostElement) {
            const hostName = $(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val();
            all_host_name += (all_host_name ? " " : "") + hostName;
            if (hostName) {
                host_names.push(hostName); // 유효한 이름만 배열에 추가
            }
        }
    }

    // hosts 파일 > config 파일 쓰는 부분
    let host_file_type = $('input[name=radio-hosts-file-ccvm]:checked').val();

    let ret_json_string = tableToClusterConfigJsonString(host_file_type, option_ccvm, os_type);

    if (os_type == "ABLESTACK-HCI"){
    //=========== 1. 클러스터 구성 host 네트워크 연결 테스트 ===========
    setProgressStep("span-ccvm-progress-step1",1);
    var console_log = true;
    createLoggerInfo("deployCloudCenterVM start");
    var host_ping_test_and_cluster_config_cmd = ['python3', pluginpath + '/python/cluster/cluster_config.py', 'insertScvmHost', '-t', os_type, '-js', ret_json_string, '-cmi', mgmt_ip, '-pcl', all_host_name];
    if(console_log){console.log(host_ping_test_and_cluster_config_cmd);}
    cockpit.spawn(host_ping_test_and_cluster_config_cmd)
        .then(function(data){
            //결과 값 json으로 return
            var ping_test_result = JSON.parse(data);
            if(ping_test_result.code=="200") { //정상
                //=========== 2. 클러스터 초기화 작업 ===========
                // 설정 초기화 ( 필요시 python까지 종료 )
                setProgressStep("span-ccvm-progress-step1",2);
                setProgressStep("span-ccvm-progress-step2",1);
                var reset_cloud_center_cmd = ['python3', pluginpath + '/python/vm/reset_cloud_center.py'];
                if(console_log){console.log(reset_cloud_center_cmd);}
                cockpit.spawn(reset_cloud_center_cmd)
                    .then(function(data){
                        //결과 값 json으로 return
                        var reset_cloud_center_result = JSON.parse(data);
                        if(reset_cloud_center_result.code=="200") { //정상
                            //=========== 3. cloudinit iso 파일 생성 ===========
                            // host 파일 /usr/share/cockpit/ablestack/tools/vmconfig/ccvm/cloudinit 경로에 hosts, ssh key 파일 저장
                            setProgressStep("span-ccvm-progress-step2",2);
                            setProgressStep("span-ccvm-progress-step3",1);
                            var host_name = $('#form-input-cloud-vm-hostname').val();
                            var mgmt_ip = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[0];
                            var mgmt_prefix = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[1];
                            var mngt_gw = $('#form-input-cloud-vm-mngt-gw').val();
                            var dns = $('#form-input-cloud-vm-dns').val();

                            create_ccvm_cloudinit_cmd = ['python3', pluginpath + '/python/vm/create_ccvm_cloudinit.py'
                                                    ,"-f1",pluginpath+"/tools/vmconfig/ccvm/hosts","-t1", $("#div-textarea-cluster-config-confirm-hosts-file-ccvm").val() // hosts 파일
                                                    ,"-f2",pluginpath+"/tools/vmconfig/ccvm/id_rsa","-t2", $("#form-textarea-cloud-vm-ssh-private-key-file").val() // ssh 개인 key 파일
                                                    ,"-f3",pluginpath+"/tools/vmconfig/ccvm/id_rsa.pub","-t3", $("#form-textarea-cloud-vm-ssh-public-key-file").val() // ssh 공개 key 파일
                                                    ,'--hostname',host_name
                                                    ,'-hns', all_host_name
                                                    ,'--mgmt-nic','enp0s20'
                                                    ,'--mgmt-ip',mgmt_ip
                                                    ,'--mgmt-prefix',mgmt_prefix
                                                ];
                            //GATEWAY가 공백이 아닐 시 삽입
                            if(mngt_gw != ""){
                                create_ccvm_cloudinit_cmd.push('--mgmt-gw',mngt_gw);
                            }
                            // DNS가 공백이 아닐 시 삽입
                            if(dns != ""){
                                create_ccvm_cloudinit_cmd.push('--dns',dns);
                            }
                            var svc_bool = $('input[type=checkbox][id="form-checkbox-svc-network"]').is(":checked");
                            if(svc_bool){
                                var sn_ip = $('#form-input-cloud-vm-svc-nic-ip').val().split("/")[0];
                                var sn_prefix = $('#form-input-cloud-vm-svc-nic-ip').val().split("/")[1];
                                var sn_gw = $('#form-input-cloud-vm-svc-gw').val();
                                var sn_dns = $('#form-input-cloud-vm-svc-dns').val();
                                create_ccvm_cloudinit_cmd.push('--sn-nic','enp0s21','--sn-ip',sn_ip,'--sn-prefix',sn_prefix,'--sn-gw',sn_gw,'--sn-dns',sn_dns);
                            }
                            if(console_log){console.log(create_ccvm_cloudinit_cmd);}
                            cockpit.spawn(create_ccvm_cloudinit_cmd)
                                .then(function(data){
                                    //결과 값 json으로 return
                                    var create_ccvm_cloudinit_result = JSON.parse(data);
                                    if(create_ccvm_cloudinit_result.code=="200"){
                                        //=========== 4. 클라우드센터 가상머신 구성 ===========
                                        setProgressStep("span-ccvm-progress-step3",2);
                                        setProgressStep("span-ccvm-progress-step4",1);
                                        xml_create_cmd.push("-hns",all_host_name);
                                        if(console_log){console.log(xml_create_cmd);}
                                        cockpit.spawn(xml_create_cmd)
                                            .then(function(data){
                                                //결과 값 json으로 return
                                                var create_ccvm_xml_result = JSON.parse(data);
                                                if(create_ccvm_xml_result.code=="200"){
                                                    //=========== 5. 클러스터 구성 및 클라우드센터 가상머신 배포 ===========
                                                    //클러스터 생성
                                                    setProgressStep("span-ccvm-progress-step4",2);
                                                    setProgressStep("span-ccvm-progress-step5",1);
                                                    var pcs_config = ['python3', pluginpath + '/python/vm/setup_pcs_cluster.py', '-hns', all_host_name];
                                                    if(console_log){console.log(pcs_config);}
                                                    cockpit.spawn(pcs_config)
                                                        .then(function(data){
                                                            //결과 값 json으로 return
                                                            var ccvm_result = JSON.parse(data);
                                                            if(ccvm_result.code=="200"){
                                                                var cluster_sync_mechanism_cmd = ['python3', pluginpath + '/python/pcs/main.py', 'sync', '--time', cluster_sync_mechanism];
                                                                if(console_log){console.log(cluster_sync_mechanism_cmd);}
                                                                cockpit.spawn(cluster_sync_mechanism_cmd)
                                                                .then(function(data){
                                                                    var cluster_sync_mechanism_result = JSON.parse(data);
                                                                    if (cluster_sync_mechanism_result.code == "200"){
                                                                        createLoggerInfo("deployCloudCenterVM success");
                                                                        setProgressStep("span-ccvm-progress-step5",2);
                                                                        //최종 화면 호출
                                                                        showDivisionCloudVMConfigFinish();
                                                                    }
                                                                    else{
                                                                         setProgressFail(5);
                                                                         createLoggerInfo(cluster_sync_mechanism_result.val);
                                                                         alert(cluster_sync_mechanism_result.val);

                                                                    }
                                                                })
                                                                .catch(function(data){
                                                                    setProgressFail(5);
                                                                    createLoggerInfo("Cluster configuration and cloud center virtual machine deployment failed");
                                                                    alert("클러스터 구성 및 클라우드센터 가상머신 배포 및 클러스터 민감도 설정 실패 : "+data);
                                                                });
                                                            } else {
                                                                setProgressFail(5);
                                                                createLoggerInfo(ccvm_result.val);
                                                                alert(ccvm_result.val);
                                                            }
                                                        })
                                                        .catch(function(data){
                                                            setProgressFail(5);
                                                            createLoggerInfo("Cluster configuration and cloud center virtual machine deployment failed");
                                                            alert("클러스터 구성 및 클라우드센터 가상머신 배포 실패 : "+data);
                                                        });
                                                } else {
                                                    setProgressFail(4);
                                                    createLoggerInfo(create_ccvm_xml_result.val);
                                                    alert(create_ccvm_xml_result.val);
                                                }
                                            })
                                            .catch(function(data){
                                                setProgressFail(4);
                                                createLoggerInfo("Cloud Center Virtual Machine XML Creation Failed");
                                                alert("클라우드센터 가상머신 XML 생성 실패 : "+data);
                                            });
                                    } else {
                                        setProgressFail(3);
                                        createLoggerInfo(create_ccvm_cloudinit_result.val);
                                        alert(create_ccvm_cloudinit_result.val);
                                    }
                                })
                                .catch(function(data){
                                    setProgressFail(3);
                                    createLoggerInfo("Failed to create cloudinit iso file");
                                    alert("cloudinit iso 파일 생성 실패 : "+data);
                                });

                        } else {
                            setProgressFail(2);
                            createLoggerInfo(reset_cloud_center_result.val);
                            alert(reset_cloud_center_result.val);
                        }
                    })
                    .catch(function(data){
                        setProgressFail(2);
                        createLoggerInfo("Failed to initialize cluster configuration settings");
                        alert("클러스터 구성 설정 초기화 작업 실패 : "+data);
                    });

            } else {
                setProgressFail(1);
                createLoggerInfo(ping_test_result.val);
                alert(ping_test_result.val);
            }
        })
        .catch(function(data){
            setProgressFail(1);
            createLoggerInfo("Failed to check connection status of host to configure cluster");
            alert("클러스터 구성할 host 연결 상태 확인 및 cluster.json config 실패 : "+data);
        });
    }else if(os_type == "PowerFlex"){
            // PowerFlex 일반 가상화 GFS용 일 때
    var all_host_name = "";
    var host_names = [];
    for (let i = 1; i <= $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length ; i++) {
        const hostElement = document.getElementById(`form-input-cloud-vm-failover-cluster-host${i}-name`);
        if (hostElement) {
            const hostName = $(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val();
            all_host_name += (all_host_name ? " " : "") + hostName;
            if (hostName) {
                host_names.push(hostName); // 유효한 이름만 배열에 추가
            }
        }
    }
    var ipmi_port = "623";
    var ipmi_check_value = $('input[name="radio-ipmi-ccvm"]:checked').val();

    var ipmi_config = ""; // 최종 IPMI 설정 문자열 초기화
    var ipmi_data = [];  // IPMI 데이터를 담을 배열
    if (ipmi_check_value === "individual") {
        // 개별 자격 증명 처리
        for (let i = 0; i < host_names.length; i++) {
            // 동적으로 각 IPMI 입력값 가져오기
            let ip = $(`#form-input-individual-credentials-ipmi-ip${i+1}`).val() || '';
            let user = $(`#form-input-individual-credentials-ipmi-user${i+1}`).val() || '';
            let password = $(`#form-input-individual-credentials-ipmi-password${i+1}`).val() || '';

            if (!ip) break; // IP가 없으면 더 이상 처리하지 않음
            ipmi_data.push({ ip, user, password }); // 배열에 추가
        }
    } else {
        // 공통 자격 증명 처리
        for (let i = 0; i < host_names.length; i++) {
            // 동적으로 각 IPMI 입력값 가져오기
            let ip = $(`#form-input-common-credentials-ipmi-ip${i+1}`).val() || '';
            if (!ip) break; // IP가 없으면 더 이상 처리하지 않음

            // 공통 사용자 정보 추가
            let user = $('#form-input-common-credentials-ipmi-user').val();
            let password = $('#form-input-common-credentials-ipmi-password').val();

            ipmi_data.push({ ip, user, password }); // 배열에 추가
        }
    }
    ipmi_data.forEach((entry, index) => {
        ipmi_config += `${index > 0 ? ";" : ""}${entry.ip},${ipmi_port},${entry.user},${entry.password}`;
    });
    var journal_nums = String(host_names.length + 1);
    var gfs_cluster_name = "cloudcenter_res";
    var gfs_mount_point = "/mnt/glue-gfs";
    var gfs_name = "glue-gfs";
    var gfs_vg_name = "vg_glue";
    var gfs_lv_name = "lv_glue";
    //=========== 1. 클러스터 구성 host 네트워크 연결 및 초기화 작업 ===========
    $('[name=span-ccvm-progress-step1-name]').text("클러스터 구성 Host 네트워크 연결 및 초기화 작업");
    $('[name=span-ccvm-progress-step2-name]').text("GFS 구성 설정 및 PCS 설정");
    setProgressStep("span-ccvm-progress-step1",1);
    var console_log = true;
    createLoggerInfo("deployCloudCenterVM start");
    var host_ping_test_and_cluster_config_cmd = ['python3', pluginpath + '/python/cluster/cluster_config.py', 'insertScvmHost', '-js', ret_json_string, '-cmi', mgmt_ip, '-pcl', all_host_name];
    if(console_log){console.log(host_ping_test_and_cluster_config_cmd);}
    cockpit.spawn(host_ping_test_and_cluster_config_cmd)
        .then(function(data){
            //결과 값 json으로 return
            var ping_test_result = JSON.parse(data);
            if(ping_test_result.code=="200") { //정상
                var reset_cloud_center_cmd = ['python3', pluginpath + '/python/vm/reset_cloud_center.py'];
                if(console_log){console.log(reset_cloud_center_cmd);}
                cockpit.spawn(reset_cloud_center_cmd)
                    .then(function(data){
                        //결과 값 json으로 return
                        var reset_cloud_center_result = JSON.parse(data);
                        if(reset_cloud_center_result.code=="200") { //정상
                            setProgressStep("span-ccvm-progress-step1",2);
                            setProgressStep("span-ccvm-progress-step2",1);
                            //=========== 2. GFS 구성 설정 및 Pcs 설정 ===========
                            // 설정 초기화 ( 필요시 python까지 종료 )
                            var set_lvm_conf_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--modify-lvm-conf', '--list-ip', all_host_name];
                            console.log(set_lvm_conf_cmd);
                            cockpit.spawn(set_lvm_conf_cmd)
                            .then(function(data){
                                var set_lvm_conf_result = JSON.parse(data);
                                var powerflex_disk_name = set_lvm_conf_result.val.split(',')[1];
                                console.log(set_lvm_conf_result)
                                if (set_lvm_conf_result.code == "200"){
                                    var set_password_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--set-password', 'password', '--list-ip', all_host_name];
                                    console.log(set_password_cmd);
                                    cockpit.spawn(set_password_cmd)
                                    .then(function(data){
                                        var set_password_result = JSON.parse(data);
                                        console.log(set_password_result)
                                        if (set_password_result.code == "200"){
                                            var auth_hosts_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--auth-hosts', 'password', '--list-ip', all_host_name];
                                            console.log(auth_hosts_cmd);
                                            cockpit.spawn(auth_hosts_cmd)
                                            .then(function(data){
                                                var auth_hosts_result = JSON.parse(data);
                                                console.log(auth_hosts_result)
                                                if (auth_hosts_result.code == "200"){
                                                    var setup_cluster_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--setup-cluster', gfs_cluster_name, '--list-ip', all_host_name];
                                                    console.log(setup_cluster_cmd);
                                                    cockpit.spawn(setup_cluster_cmd)
                                                    .then(function(data){
                                                        var setup_cluster_result = JSON.parse(data);
                                                        console.log(setup_cluster_result)
                                                        if (setup_cluster_result.code == "200"){
                                                            var set_configure_stonith_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--configure-stonith',
                                                                                            ipmi_config, '--list-ip', all_host_name];
                                                            console.log(set_configure_stonith_cmd);
                                                            cockpit.spawn(set_configure_stonith_cmd)
                                                            .then(function(data){
                                                                var set_configure_stonith_result = JSON.parse(data);
                                                                console.log(set_configure_stonith_result);
                                                                if (set_configure_stonith_result.code == "200"){
                                                                    setProgressStep("span-ccvm-progress-step2",4);
                                                                    var create_gfs_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--create-gfs',
                                                                                            '--disks', '/dev/' + powerflex_disk_name, '--vg-name', gfs_vg_name, '--lv-name', gfs_lv_name,
                                                                                            '--gfs-name', gfs_name, '--mount-point', gfs_mount_point, '--cluster-name', gfs_cluster_name,
                                                                                            '--journal-nums', journal_nums, '--list-ip', all_host_name]
                                                                    console.log(create_gfs_cmd);
                                                                    cockpit.spawn(create_gfs_cmd)
                                                                    .then(function(data){
                                                                        var create_gfs_result = JSON.parse(data);
                                                                        console.log(create_gfs_result);
                                                                        if (create_gfs_result.code == "200"){
                                                                            //=========== 3. cloudinit iso 파일 생성 ===========
                                                                            // host 파일 /usr/share/cockpit/ablestack/tools/vmconfig/ccvm/cloudinit 경로에 hosts, ssh key 파일 저장
                                                                            setProgressStep("span-ccvm-progress-step2",2);
                                                                            setProgressStep("span-ccvm-progress-step3",1);
                                                                            var host_name = $('#form-input-cloud-vm-hostname').val();
                                                                            var mgmt_ip = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[0];
                                                                            var mgmt_prefix = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[1];
                                                                            var mngt_gw = $('#form-input-cloud-vm-mngt-gw').val();
                                                                            var dns = $('#form-input-cloud-vm-dns').val();
                                                                            create_ccvm_cloudinit_cmd = ['python3', pluginpath + '/python/vm/create_ccvm_cloudinit.py'
                                                                                                    ,"-f1",pluginpath+"/tools/vmconfig/ccvm/hosts","-t1", $("#div-textarea-cluster-config-confirm-hosts-file-ccvm").val() // hosts 파일
                                                                                                    ,"-f2",pluginpath+"/tools/vmconfig/ccvm/id_rsa","-t2", $("#form-textarea-cloud-vm-ssh-private-key-file").val() // ssh 개인 key 파일
                                                                                                    ,"-f3",pluginpath+"/tools/vmconfig/ccvm/id_rsa.pub","-t3", $("#form-textarea-cloud-vm-ssh-public-key-file").val() // ssh 공개 key 파일
                                                                                                    ,'--hostname',host_name
                                                                                                    ,'-hns', all_host_name
                                                                                                    ,'--mgmt-nic','enp0s20'
                                                                                                    ,'--mgmt-ip',mgmt_ip
                                                                                                    ,'--mgmt-prefix',mgmt_prefix
                                                                                                ];
                                                                            //GATEWAY가 공백이 아닐 시 삽입
                                                                            if(mngt_gw != ""){
                                                                                create_ccvm_cloudinit_cmd.push('--mgmt-gw',mngt_gw);
                                                                            }
                                                                            // DNS가 공백이 아닐 시 삽입
                                                                            if(dns != ""){
                                                                                create_ccvm_cloudinit_cmd.push('--dns',dns);
                                                                            }
                                                                            var svc_bool = $('input[type=checkbox][id="form-checkbox-svc-network"]').is(":checked");
                                                                            if(svc_bool){
                                                                                var sn_ip = $('#form-input-cloud-vm-svc-nic-ip').val().split("/")[0];
                                                                                var sn_prefix = $('#form-input-cloud-vm-svc-nic-ip').val().split("/")[1];
                                                                                var sn_gw = $('#form-input-cloud-vm-svc-gw').val();
                                                                                var sn_dns = $('#form-input-cloud-vm-svc-dns').val();
                                                                                create_ccvm_cloudinit_cmd.push('--sn-nic','enp0s21','--sn-ip',sn_ip,'--sn-prefix',sn_prefix,'--sn-gw',sn_gw,'--sn-dns',sn_dns);
                                                                            }
                                                                            if(console_log){console.log(create_ccvm_cloudinit_cmd);}
                                                                            cockpit.spawn(create_ccvm_cloudinit_cmd)
                                                                                .then(function(data){
                                                                                    //결과 값 json으로 return
                                                                                    var create_ccvm_cloudinit_result = JSON.parse(data);
                                                                                    if(create_ccvm_cloudinit_result.code=="200"){
                                                                                        //=========== 4. 클라우드센터 가상머신 구성 ===========
                                                                                        setProgressStep("span-ccvm-progress-step3",2);
                                                                                        setProgressStep("span-ccvm-progress-step4",1);
                                                                                        xml_create_cmd.push("-hns",all_host_name, "-gmp", gfs_mount_point);
                                                                                        if(console_log){console.log(xml_create_cmd);}
                                                                                        cockpit.spawn(xml_create_cmd)
                                                                                            .then(function(data){
                                                                                                //결과 값 json으로 return
                                                                                                var create_ccvm_xml_result = JSON.parse(data);
                                                                                                if(create_ccvm_xml_result.code=="200"){
                                                                                                    //=========== 5. 클러스터 구성 및 클라우드센터 가상머신 배포 ===========
                                                                                                    //클러스터 생성
                                                                                                    setProgressStep("span-ccvm-progress-step4",2);
                                                                                                    setProgressStep("span-ccvm-progress-step5",1);
                                                                                                    var pcs_config = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--create-ccvm-cluster', '--gfs-name', gfs_name, '--mount-point', gfs_mount_point, '--cluster-name', gfs_cluster_name,'--list-ip', all_host_name];
                                                                                                    if(console_log){console.log(pcs_config);}
                                                                                                    cockpit.spawn(pcs_config)
                                                                                                        .then(function(data){
                                                                                                            //결과 값 json으로 return
                                                                                                            var ccvm_result = JSON.parse(data);
                                                                                                            if(ccvm_result.code=="200"){
                                                                                                                var cluster_sync_mechanism_cmd = ['python3', pluginpath + '/python/pcs/main.py', 'sync', '--time', cluster_sync_mechanism];
                                                                                                                if(console_log){console.log(cluster_sync_mechanism_cmd);}
                                                                                                                cockpit.spawn(cluster_sync_mechanism_cmd)
                                                                                                                .then(function(data){
                                                                                                                    var cluster_sync_mechanism_result = JSON.parse(data);
                                                                                                                    if (cluster_sync_mechanism_result.code == "200"){
                                                                                                                        createLoggerInfo("deployCloudCenterVM success");
                                                                                                                        setProgressStep("span-ccvm-progress-step5",2);
                                                                                                                        //최종 화면 호출
                                                                                                                        showDivisionCloudVMConfigFinish();
                                                                                                                    }
                                                                                                                    else{
                                                                                                                         setProgressFail(5);
                                                                                                                         createLoggerInfo(cluster_sync_mechanism_result.val);
                                                                                                                         alert(cluster_sync_mechanism_result.val);

                                                                                                                    }
                                                                                                                })
                                                                                                                .catch(function(data){
                                                                                                                    setProgressFail(5);
                                                                                                                    createLoggerInfo("Cluster configuration and cloud center virtual machine deployment failed");
                                                                                                                    alert("클러스터 구성 및 클라우드센터 가상머신 배포 및 클러스터 민감도 설정 실패 : "+data);
                                                                                                                });
                                                                                                            } else {
                                                                                                                setProgressFail(5);
                                                                                                                createLoggerInfo(ccvm_result.val);
                                                                                                                alert(ccvm_result.val);
                                                                                                            }
                                                                                                        })
                                                                                                        .catch(function(data){
                                                                                                            setProgressFail(5);
                                                                                                            createLoggerInfo("Cluster configuration and cloud center virtual machine deployment failed");
                                                                                                            alert("클러스터 구성 및 클라우드센터 가상머신 배포 실패 : "+data);
                                                                                                        });
                                                                                                } else {
                                                                                                    setProgressFail(4);
                                                                                                    createLoggerInfo(create_ccvm_xml_result.val);
                                                                                                    alert(create_ccvm_xml_result.val);
                                                                                                }
                                                                                            })
                                                                                            .catch(function(data){
                                                                                                setProgressFail(4);
                                                                                                createLoggerInfo("Cloud Center Virtual Machine XML Creation Failed");
                                                                                                alert("클라우드센터 가상머신 XML 생성 실패 : "+data);
                                                                                            });
                                                                                    } else {
                                                                                        setProgressFail(3);
                                                                                        createLoggerInfo(create_ccvm_cloudinit_result.val);
                                                                                        alert(create_ccvm_cloudinit_result.val);
                                                                                    }
                                                                                })
                                                                                .catch(function(data){
                                                                                    setProgressFail(3);
                                                                                    createLoggerInfo("Failed to create cloudinit iso file");
                                                                                    alert("cloudinit iso 파일 생성 실패 : "+data);
                                                                                });
                                                                        }else{
                                                                            setProgressFail(2);
                                                                            createLoggerInfo(create_gfs_result.val);
                                                                            alert(create_gfs_result.val);
                                                                        }
                                                                    }).catch(function(data){
                                                                        setProgressFail(2);
                                                                        createLoggerInfo("GFS configuration settings and Pcs task Pcs resource settings failed");
                                                                        alert("GFS 구성 설정 및 Pcs 작업 6. Pcs 리소스 설정 실패 : "+data);
                                                                    });
                                                                }else{
                                                                    setProgressFail(2);
                                                                    createLoggerInfo(set_configure_stonith_result.val);
                                                                    alert(set_configure_stonith_result.val);
                                                                }
                                                            }).catch(function(data){
                                                                setProgressFail(2);
                                                                createLoggerInfo("Failed to set GFS configuration and Pcs task IPMI information");
                                                                alert("GFS 구성 설정 및 Pcs 작업 5. IPMI 정보 설정 실패 : "+data);
                                                            })
                                                        }else{
                                                            setProgressFail(2);
                                                            createLoggerInfo(setup_cluster_result.val);
                                                            alert(setup_cluster_result.val);
                                                        }
                                                    }).catch(function(data){
                                                        setProgressFail(2);
                                                        createLoggerInfo("GFS configuration setup and Pcs task cluster setup failed");
                                                        alert("GFS 구성 설정 및 Pcs 작업 4. 클러스터 설정 실패 : "+data);
                                                    });
                                                }else{
                                                    setProgressFail(2);
                                                    createLoggerInfo(auth_hosts_result.val);
                                                    alert(auth_hosts_result.val);
                                                }
                                            }).catch(function(data){
                                                setProgressFail(2);
                                                createLoggerInfo("Failed to set GFS configuration and Pcs task host authentication settings");
                                                alert("GFS 구성 설정 및 Pcs 작업 3. 호스트 인증 설정 실패 : "+data);
                                            });
                                        }else{
                                            setProgressFail(2);
                                            createLoggerInfo(set_password_result.val);
                                            alert(set_password_result.val);
                                        }
                                    }).catch(function(data){
                                        setProgressFail(2);
                                        createLoggerInfo("Failed to set GFS configuration and Pcs task password");
                                        alert("GFS 구성 설정 및 Pcs 작업 2. 패스워드 설정 실패 : "+data);
                                    });
                                }else{
                                    setProgressFail(2);
                                    createLoggerInfo(set_lvm_conf_result.val);
                                    alert(set_lvm_conf_result.val);
                                }
                            }).catch(function(data){
                                setProgressFail(2);
                                createLoggerInfo("Failed to set LVM CONF file during GFS configuration setup and Pcs operation");
                                alert("GFS 구성 설정 및 Pcs 작업 1. LVM CONF 파일 설정 실패 : "+data);
                            });
                        } else {
                            setProgressFail(1);
                            createLoggerInfo(reset_cloud_center_result.val);
                            alert(reset_cloud_center_result.val);
                        }
                    })
                    .catch(function(data){
                        setProgressFail(1);
                        createLoggerInfo("Failed to initialize cluster configuration settings");
                        alert("클러스터 구성 설정 초기화 작업 실패 : "+data);
                    });

            } else {
                setProgressFail(1);
                createLoggerInfo(ping_test_result.val);
                alert(ping_test_result.val);
            }
        })
        .catch(function(data){
            setProgressFail(1);
            createLoggerInfo("Failed to check connection status of host to configure cluster");
            alert("클러스터 구성할 host 연결 상태 확인 및 cluster.json config 실패 : "+data);
        });
    }else if (os_type == "general-virtualization"){
        var all_host_name = "";
        var host_names = [];
        for (let i = 1; i <= $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length ; i++) {
            const hostElement = document.getElementById(`form-input-cloud-vm-failover-cluster-host${i}-name`);
            if (hostElement) {
                const hostName = $(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val();
                all_host_name += (all_host_name ? " " : "") + hostName;
                if (hostName) {
                    host_names.push(hostName); // 유효한 이름만 배열에 추가
                }
            }
        }
        var ipmi_port = "623";
        var ipmi_check_value = $('input[name="radio-ipmi-ccvm"]:checked').val();

        var ipmi_config = ""; // 최종 IPMI 설정 문자열 초기화
        var ipmi_data = [];  // IPMI 데이터를 담을 배열
        if (ipmi_check_value === "individual") {
            // 개별 자격 증명 처리
            for (let i = 0; i < host_names.length; i++) {
                // 동적으로 각 IPMI 입력값 가져오기
                let ip = $(`#form-input-individual-credentials-ipmi-ip${i+1}`).val() || '';
                let user = $(`#form-input-individual-credentials-ipmi-user${i+1}`).val() || '';
                let password = $(`#form-input-individual-credentials-ipmi-password${i+1}`).val() || '';

                if (!ip) break; // IP가 없으면 더 이상 처리하지 않음
                ipmi_data.push({ ip, user, password }); // 배열에 추가
            }
        } else {
            // 공통 자격 증명 처리
            for (let i = 0; i < host_names.length; i++) {
                // 동적으로 각 IPMI 입력값 가져오기
                let ip = $(`#form-input-common-credentials-ipmi-ip${i+1}`).val() || '';
                if (!ip) break; // IP가 없으면 더 이상 처리하지 않음

                // 공통 사용자 정보 추가
                let user = $('#form-input-common-credentials-ipmi-user').val();
                let password = $('#form-input-common-credentials-ipmi-password').val();

                ipmi_data.push({ ip, user, password }); // 배열에 추가
            }
        }
        ipmi_data.forEach((entry, index) => {
            ipmi_config += `${index > 0 ? ";" : ""}${entry.ip},${ipmi_port},${entry.user},${entry.password}`;
        });
        var journal_nums = String(host_names.length + 1);
        // 체크된 디스크 이름들을 동적으로 가져옴
        var general_virtual_disk_name = $('input[type=checkbox][name="form-cloud-checkbox-disk"]:checked')
            .map(function () {
                return $(this).val(); // 체크된 값 가져오기
            })
            .get() // jQuery 객체를 배열로 변환
            .join(','); // 쉼표로 연결

        // 결과 출력 (디스크가 하나든 여러 개든 자동 처리)
        var gfs_cluster_name = "cloudcenter_res";
        var gfs_mount_point = "/mnt/glue-gfs";
        var gfs_name = "glue-gfs";
        var gfs_vg_name = "vg_glue";
        var gfs_lv_name = "lv_glue";
        //=========== 1. 클러스터 구성 host 네트워크 연결 및 초기화 작업 ===========
        $('[name=span-ccvm-progress-step1-name]').text("클러스터 구성 Host 네트워크 연결 및 초기화 작업");
        $('[name=span-ccvm-progress-step2-name]').text("GFS 구성 설정 및 PCS 설정");
        setProgressStep("span-ccvm-progress-step1",1);
        var console_log = true;
        createLoggerInfo("deployCloudCenterVM start");
        var host_ping_test_and_cluster_config_cmd = ['python3', pluginpath + '/python/cluster/cluster_config.py', 'check', '-js', ret_json_string, '-cmi', mgmt_ip, '-pcl', all_host_name];
        if(console_log){console.log(host_ping_test_and_cluster_config_cmd);}
        cockpit.spawn(host_ping_test_and_cluster_config_cmd)
            .then(function(data){
                //결과 값 json으로 return
                var ping_test_result = JSON.parse(data);
                if(ping_test_result.code=="200") { //정상
                    var reset_cloud_center_cmd = ['python3', pluginpath + '/python/vm/reset_cloud_center.py'];
                    if(console_log){console.log(reset_cloud_center_cmd);}
                    cockpit.spawn(reset_cloud_center_cmd)
                        .then(function(data){
                            //결과 값 json으로 return
                            var reset_cloud_center_result = JSON.parse(data);
                            if(reset_cloud_center_result.code=="200") { //정상
                                setProgressStep("span-ccvm-progress-step1",2);
                                setProgressStep("span-ccvm-progress-step2",1);
                                //=========== 2. GFS 구성 설정 및 Pcs 설정 ===========
                                // 설정 초기화 ( 필요시 python까지 종료 )
                                var set_lvm_conf_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--modify-lvm-conf', '--list-ip', all_host_name];
                                console.log(set_lvm_conf_cmd);
                                cockpit.spawn(set_lvm_conf_cmd)
                                .then(function(data){
                                    var set_lvm_conf_result = JSON.parse(data);
                                    console.log(set_lvm_conf_result);
                                    if (set_lvm_conf_result.code == "200"){
                                        var set_password_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--set-password', 'password', '--list-ip', all_host_name];
                                        console.log(set_password_cmd);
                                        cockpit.spawn(set_password_cmd)
                                        .then(function(data){
                                            var set_password_result = JSON.parse(data);
                                            console.log(set_password_result)
                                            if (set_password_result.code == "200"){
                                                var auth_hosts_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--auth-hosts', 'password', '--list-ip', all_host_name];
                                                console.log(auth_hosts_cmd);
                                                cockpit.spawn(auth_hosts_cmd)
                                                .then(function(data){
                                                    var auth_hosts_result = JSON.parse(data);
                                                    console.log(auth_hosts_result)
                                                    if (auth_hosts_result.code == "200"){
                                                        var setup_cluster_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--setup-cluster', gfs_cluster_name, '--list-ip', all_host_name];
                                                        console.log(setup_cluster_cmd);
                                                        cockpit.spawn(setup_cluster_cmd)
                                                        .then(function(data){
                                                            var setup_cluster_result = JSON.parse(data);
                                                            console.log(setup_cluster_result)
                                                            if (setup_cluster_result.code == "200"){
                                                                var set_configure_stonith_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--configure-stonith',
                                                                                                    ipmi_config, '--list-ip', all_host_name];
                                                                console.log(set_configure_stonith_cmd);
                                                                cockpit.spawn(set_configure_stonith_cmd)
                                                                .then(function(data){
                                                                    var set_configure_stonith_result = JSON.parse(data);
                                                                    console.log(set_configure_stonith_result);
                                                                    if (set_configure_stonith_result.code == "200"){
                                                                        setProgressStep("span-ccvm-progress-step2",4);
                                                                        var create_gfs_cmd = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--create-gfs',
                                                                                                '--disks', general_virtual_disk_name , '--vg-name', gfs_vg_name, '--lv-name', gfs_lv_name,
                                                                                                '--gfs-name', gfs_name, '--mount-point', gfs_mount_point, '--cluster-name', gfs_cluster_name,
                                                                                                '--journal-nums', journal_nums, '--list-ip', all_host_name]
                                                                        console.log(create_gfs_cmd);
                                                                        cockpit.spawn(create_gfs_cmd)
                                                                        .then(function(data){
                                                                            var create_gfs_result = JSON.parse(data);
                                                                            console.log(create_gfs_result);
                                                                            if (create_gfs_result.code == "200"){
                                                                                //=========== 3. cloudinit iso 파일 생성 ===========
                                                                                // host 파일 /usr/share/cockpit/ablestack/tools/vmconfig/ccvm/cloudinit 경로에 hosts, ssh key 파일 저장
                                                                                setProgressStep("span-ccvm-progress-step2",2);
                                                                                setProgressStep("span-ccvm-progress-step3",1);
                                                                                var host_name = $('#form-input-cloud-vm-hostname').val();
                                                                                var mgmt_ip = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[0];
                                                                                var mgmt_prefix = $('#form-input-cloud-vm-mngt-nic-ip').val().split("/")[1];
                                                                                var mngt_gw = $('#form-input-cloud-vm-mngt-gw').val();
                                                                                var dns = $('#form-input-cloud-vm-dns').val();

                                                                                create_ccvm_cloudinit_cmd = ['python3', pluginpath + '/python/vm/create_ccvm_cloudinit.py'
                                                                                                        ,"-f1",pluginpath+"/tools/vmconfig/ccvm/hosts","-t1", $("#div-textarea-cluster-config-confirm-hosts-file-ccvm").val() // hosts 파일
                                                                                                        ,"-f2",pluginpath+"/tools/vmconfig/ccvm/id_rsa","-t2", $("#form-textarea-cloud-vm-ssh-private-key-file").val() // ssh 개인 key 파일
                                                                                                        ,"-f3",pluginpath+"/tools/vmconfig/ccvm/id_rsa.pub","-t3", $("#form-textarea-cloud-vm-ssh-public-key-file").val() // ssh 공개 key 파일
                                                                                                        ,'--hostname',host_name
                                                                                                        ,'-hns', all_host_name
                                                                                                        ,'--mgmt-nic','enp0s20'
                                                                                                        ,'--mgmt-ip',mgmt_ip
                                                                                                        ,'--mgmt-prefix',mgmt_prefix
                                                                                                    ];
                                                                                //GATEWAY가 공백이 아닐 시 삽입
                                                                                if(mngt_gw != ""){
                                                                                    create_ccvm_cloudinit_cmd.push('--mgmt-gw',mngt_gw);
                                                                                }
                                                                                // DNS가 공백이 아닐 시 삽입
                                                                                if(dns != ""){
                                                                                    create_ccvm_cloudinit_cmd.push('--dns',dns);
                                                                                }
                                                                                var svc_bool = $('input[type=checkbox][id="form-checkbox-svc-network"]').is(":checked");
                                                                                if(svc_bool){
                                                                                    var sn_ip = $('#form-input-cloud-vm-svc-nic-ip').val().split("/")[0];
                                                                                    var sn_prefix = $('#form-input-cloud-vm-svc-nic-ip').val().split("/")[1];
                                                                                    var sn_gw = $('#form-input-cloud-vm-svc-gw').val();
                                                                                    var sn_dns = $('#form-input-cloud-vm-svc-dns').val();
                                                                                    create_ccvm_cloudinit_cmd.push('--sn-nic','enp0s21','--sn-ip',sn_ip,'--sn-prefix',sn_prefix,'--sn-gw',sn_gw,'--sn-dns',sn_dns);
                                                                                }
                                                                                if(console_log){console.log(create_ccvm_cloudinit_cmd);}
                                                                                cockpit.spawn(create_ccvm_cloudinit_cmd)
                                                                                    .then(function(data){
                                                                                        //결과 값 json으로 return
                                                                                        var create_ccvm_cloudinit_result = JSON.parse(data);
                                                                                        if(create_ccvm_cloudinit_result.code=="200"){
                                                                                            if(host_names.length == 2){
                                                                                                gfs_mount_point = "/mnt"
                                                                                            }
                                                                                            //=========== 4. 클라우드센터 가상머신 구성 ===========
                                                                                            setProgressStep("span-ccvm-progress-step3",2);
                                                                                            setProgressStep("span-ccvm-progress-step4",1);
                                                                                            xml_create_cmd.push("-hns",all_host_name, "-gmp", gfs_mount_point);
                                                                                            if(console_log){console.log(xml_create_cmd);}
                                                                                            cockpit.spawn(xml_create_cmd)
                                                                                                .then(function(data){
                                                                                                    //결과 값 json으로 return
                                                                                                    var create_ccvm_xml_result = JSON.parse(data);
                                                                                                    if(create_ccvm_xml_result.code=="200"){
                                                                                                        //=========== 5. 클러스터 구성 및 클라우드센터 가상머신 배포 ===========
                                                                                                        //클러스터 생성
                                                                                                        setProgressStep("span-ccvm-progress-step4",2);
                                                                                                        setProgressStep("span-ccvm-progress-step5",1);
                                                                                                        var pcs_config = ['python3', pluginpath + '/python/pcs/gfs-manage.py', '--create-ccvm-cluster', '--gfs-name', gfs_name, '--mount-point', gfs_mount_point, '--cluster-name', gfs_cluster_name, '--list-ip', all_host_name];
                                                                                                        if(console_log){console.log(pcs_config);}
                                                                                                        cockpit.spawn(pcs_config)
                                                                                                            .then(function(data){
                                                                                                                //결과 값 json으로 return
                                                                                                                var ccvm_result = JSON.parse(data);
                                                                                                                if(ccvm_result.code=="200"){
                                                                                                                    var cluster_sync_mechanism_cmd = ['python3', pluginpath + '/python/pcs/main.py', 'sync', '--time', cluster_sync_mechanism];
                                                                                                                    if(console_log){console.log(cluster_sync_mechanism_cmd);}
                                                                                                                    cockpit.spawn(cluster_sync_mechanism_cmd)
                                                                                                                    .then(function(data){
                                                                                                                        var cluster_sync_mechanism_result = JSON.parse(data);
                                                                                                                        if (cluster_sync_mechanism_result.code == "200"){
                                                                                                                            createLoggerInfo("deployCloudCenterVM success");
                                                                                                                            setProgressStep("span-ccvm-progress-step5",2);
                                                                                                                            //최종 화면 호출
                                                                                                                            showDivisionCloudVMConfigFinish();
                                                                                                                        }
                                                                                                                        else{
                                                                                                                             setProgressFail(5);
                                                                                                                             createLoggerInfo(cluster_sync_mechanism_result.val);
                                                                                                                             alert(cluster_sync_mechanism_result.val);

                                                                                                                        }
                                                                                                                    })
                                                                                                                    .catch(function(data){
                                                                                                                        setProgressFail(5);
                                                                                                                        createLoggerInfo("Cluster configuration and cloud center virtual machine deployment failed");
                                                                                                                        alert("클러스터 구성 및 클라우드센터 가상머신 배포 및 클러스터 민감도 설정 실패 : "+data);
                                                                                                                    });
                                                                                                                } else {
                                                                                                                    setProgressFail(5);
                                                                                                                    createLoggerInfo(ccvm_result.val);
                                                                                                                    alert(ccvm_result.val);
                                                                                                                }
                                                                                                            })
                                                                                                            .catch(function(data){
                                                                                                                setProgressFail(5);
                                                                                                                createLoggerInfo("Cluster configuration and cloud center virtual machine deployment failed");
                                                                                                                alert("클러스터 구성 및 클라우드센터 가상머신 배포 실패 : "+data);
                                                                                                            });
                                                                                                    } else {
                                                                                                        setProgressFail(4);
                                                                                                        createLoggerInfo(create_ccvm_xml_result.val);
                                                                                                        alert(create_ccvm_xml_result.val);
                                                                                                    }
                                                                                                })
                                                                                                .catch(function(data){
                                                                                                    setProgressFail(4);
                                                                                                    createLoggerInfo("Cloud Center Virtual Machine XML Creation Failed");
                                                                                                    alert("클라우드센터 가상머신 XML 생성 실패 : "+data);
                                                                                                });
                                                                                        } else {
                                                                                            setProgressFail(3);
                                                                                            createLoggerInfo(create_ccvm_cloudinit_result.val);
                                                                                            alert(create_ccvm_cloudinit_result.val);
                                                                                        }
                                                                                    })
                                                                                    .catch(function(data){
                                                                                        setProgressFail(3);
                                                                                        createLoggerInfo("Failed to create cloudinit iso file");
                                                                                        alert("cloudinit iso 파일 생성 실패 : "+data);
                                                                                    });
                                                                            }else{
                                                                                setProgressFail(2);
                                                                                createLoggerInfo(create_gfs_result.val);
                                                                                alert(create_gfs_result.val);
                                                                            }
                                                                        }).catch(function(data){
                                                                            setProgressFail(2);
                                                                            createLoggerInfo("GFS configuration settings and Pcs task Pcs resource settings failed");
                                                                            alert("GFS 구성 설정 및 Pcs 작업 6. Pcs 리소스 설정 실패 : "+data);
                                                                        });
                                                                    }else{
                                                                        setProgressFail(2);
                                                                        createLoggerInfo(set_configure_stonith_result.val);
                                                                        alert(set_configure_stonith_result.val);
                                                                    }
                                                                }).catch(function(data){
                                                                    setProgressFail(2);
                                                                    createLoggerInfo("Failed to set GFS configuration and Pcs task IPMI information");
                                                                    alert("GFS 구성 설정 및 Pcs 작업 5. IPMI 정보 설정 실패 : "+data);
                                                                })
                                                            }else{
                                                                setProgressFail(2);
                                                                createLoggerInfo(setup_cluster_result.val);
                                                                alert(setup_cluster_result.val);
                                                            }
                                                        }).catch(function(data){
                                                            setProgressFail(2);
                                                            createLoggerInfo("GFS configuration setup and Pcs task cluster setup failed");
                                                            alert("GFS 구성 설정 및 Pcs 작업 4. 클러스터 설정 실패 : "+data);
                                                        });
                                                    }else{
                                                        setProgressFail(2);
                                                        createLoggerInfo(auth_hosts_result.val);
                                                        alert(auth_hosts_result.val);
                                                    }
                                                }).catch(function(data){
                                                    setProgressFail(2);
                                                    createLoggerInfo("Failed to set GFS configuration and Pcs task host authentication settings");
                                                    alert("GFS 구성 설정 및 Pcs 작업 3. 호스트 인증 설정 실패 : "+data);
                                                });
                                            }else{
                                                setProgressFail(2);
                                                createLoggerInfo(set_password_result.val);
                                                alert(set_password_result.val);
                                            }
                                        }).catch(function(data){
                                            setProgressFail(2);
                                            createLoggerInfo("Failed to set GFS configuration and Pcs task password");
                                            alert("GFS 구성 설정 및 Pcs 작업 2. 패스워드 설정 실패 : "+data);
                                        });
                                    }else{
                                        setProgressFail(2);
                                        createLoggerInfo(set_lvm_conf_result.val);
                                        alert(set_lvm_conf_result.val);
                                    }
                                }).catch(function(data){
                                    setProgressFail(2);
                                    createLoggerInfo("Failed to set LVM CONF file during GFS configuration setup and Pcs operation");
                                    alert("GFS 구성 설정 및 Pcs 작업 1. LVM CONF 파일 설정 실패 : "+data);
                                });
                            } else {
                                setProgressFail(1);
                                createLoggerInfo(reset_cloud_center_result.val);
                                alert(reset_cloud_center_result.val);
                            }
                        })
                        .catch(function(data){
                            setProgressFail(1);
                            createLoggerInfo("Failed to initialize cluster configuration settings");
                            alert("클러스터 구성 설정 초기화 작업 실패 : "+data);
                        });

                } else {
                    setProgressFail(1);
                    createLoggerInfo(ping_test_result.val);
                    alert(ping_test_result.val);
                }
            })
            .catch(function(data){
                setProgressFail(1);
                createLoggerInfo("Failed to check connection status of host to configure cluster");
                alert("클러스터 구성할 host 연결 상태 확인 및 cluster.json config 실패 : "+data);
            });

    }

}

/**
 * Meathod Name : setProgressFail
 * Date Created : 2021.03.24
 * Writer  : 배태주
 * Description : 클라우드센터 가상머신 배포 진행중 실패 단계에 따른 중단됨 UI 처리
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.24 최초 작성
 */
function setProgressFail(setp_num){
    if( setp_num == 1 || setp_num == '1' ){   // 1단계 이하 단계 전부 중단된 처리
        setProgressStep("span-ccvm-progress-step1",3);
        setProgressStep("span-ccvm-progress-step2",3);
        setProgressStep("span-ccvm-progress-step3",3);
        setProgressStep("span-ccvm-progress-step4",3);
        setProgressStep("span-ccvm-progress-step5",3);
    } else if(setp_num == 2 || setp_num == '2') {   // 2단계 이하 단계 전부 중단된 처리
        setProgressStep("span-ccvm-progress-step2",3);
        setProgressStep("span-ccvm-progress-step3",3);
        setProgressStep("span-ccvm-progress-step4",3);
        setProgressStep("span-ccvm-progress-step5",3);
    } else if(setp_num == 3 || setp_num == '3') {   // 3단계 이하 단계 전부 중단된 처리
        setProgressStep("span-ccvm-progress-step3",3);
        setProgressStep("span-ccvm-progress-step4",3);
        setProgressStep("span-ccvm-progress-step5",3);
    } else if(setp_num == 4 || setp_num == '4') {   // 4단계 이하 단계 전부 중단된 처리
        setProgressStep("span-ccvm-progress-step4",3);
        setProgressStep("span-ccvm-progress-step5",3);
    } else if(setp_num == 5 || setp_num == '5') {   // 5단계 이하 단계 전부 중단된 처리
        setProgressStep("span-ccvm-progress-step5",3);
    }
}


/**
 * Meathod Name : showDivisionCloudVMConfigFinish
 * Date Created : 2021.03.17
 * Writer  : 박동혁
 * Description : 클라우드센터 가상머신을 배포한 후 마지막 페이지를 보여주는 함수
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.17 최초 작성
 */
function showDivisionCloudVMConfigFinish() {
    resetCloudVMWizard();

    $('#div-modal-wizard-cloud-vm-finish').show();

    $('#nav-button-cloud-vm-finish').addClass('pf-m-current');
    $('#nav-button-cloud-vm-finish').removeClass('pf-m-disabled');

    $('#button-next-step-modal-wizard-cloud-vm').html('완료');
    //$('#button-next-step-modal-wizard-cloud-vm').attr('disabled', false);
    //$('#button-before-step-modal-wizard-cloud-vm').attr('disabled', true);
    //$('#button-cancel-config-modal-wizard-cloud-vm').attr('disabled', false);

    $('#button-next-step-modal-wizard-cloud-vm').hide();
    $('#button-before-step-modal-wizard-cloud-vm').hide();
    $('#button-cancel-config-modal-wizard-cloud-vm').hide();

    completed = true;

    cur_step_wizard_cloud_vm = "8";
}

$('input[type=checkbox][id="form-checkbox-svc-network"]').on('change', function(){
    resetSvcNetworkValues();
});

/**
 * Meathod Name : resetSvcNetworkValues
 * Date Created : 2021.03.18
 * Writer  : 배태주
 * Description : 서비스네트워크 체크박스 클릭에 따른 세팅값 초기화 이벤트
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.18 최초 작성
 */
function resetSvcNetworkValues(){
    var svc_bool = $('input[type=checkbox][id="form-checkbox-svc-network"]').is(":checked");
    //체크 해제시 관련 설정값 초기화
    if(!svc_bool){
        //서비스네트워크 셀렉트 박스
        $('select#form-select-cloud-vm-svc-parent').val("");
        //추가 네트워크 정보
        $("#form-input-cloud-vm-svc-nic-ip").val("");
        $("#form-input-cloud-vm-svc-vlan").val("");
        $("#form-input-cloud-vm-svc-gw").val("");
        $("#form-input-cloud-vm-svc-dns").val("");
    }
}

/**
 * Meathod Name : resetCcvmNetworkInfo
 * Date Created : 2021.03.19
 * Writer  : 배태주
 * Description : 클라우드센터 가상머신 추가 네트워크 정보를 초기화하는 기능
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.19 최초 작성
 */
function resetCcvmNetworkInfo(){
    //input 초기화
    // $("#form-input-cloud-vm-hostname").val("");
    $("#form-input-cloud-vm-mngt-nic-ip").val("");
    $("#form-input-cloud-vm-mngt-vlan").val("");
    $("#form-input-cloud-vm-mngt-gw").val("");
    $("#form-input-cloud-vm-dns").val("");
    $("#form-input-cloud-vm-svc-nic-ip").val("");
    $("#form-input-cloud-vm-svc-vlan").val("");
    $("#form-input-cloud-vm-svc-gw").val("");
    $("#form-input-cloud-vm-svc-dns").val("");
    $("#form-input-cloud-vm-failover-cluster-host1-name").val("");
    $("#form-input-cloud-vm-failover-cluster-host2-name").val("");
    $("#form-input-cloud-vm-failover-cluster-host3-name").val("");
}

/**
 * Meathod Name : setCcvmSshPrivateKeyInfo
 * Date Created : 2021.03.19
 * Writer  : 배태주
 * Description : 클라우드센터 가상머신에 사용할 ssh private key 파일 세팅
 * Parameter : String
 * Return  : 없음
 * History  : 2021.03.19 최초 작성
 */
function setCcvmSshPrivateKeyInfo(ssh_private_key){
    if(ssh_private_key != ""){
        $("#form-textarea-cloud-vm-ssh-private-key-file").val(ssh_private_key);
    } else {
        $("#form-textarea-cloud-vm-ssh-private-key-file").val("");
    }
}

/**
 * Meathod Name : setCcvmSshPublicKeyInfo
 * Date Created : 2021.03.29
 * Writer  : 배태주
 * Description : 클라우드센터 가상머신에 사용할 ssh public key 파일 세팅
 * Parameter : String
 * Return  : 없음
 * History  : 2021.03.29 최초 작성
 */
 function setCcvmSshPublicKeyInfo(ssh_public_key){
    if(ssh_public_key != ""){
        $("#form-textarea-cloud-vm-ssh-public-key-file").val(ssh_public_key);
    } else {
        $("#form-textarea-cloud-vm-ssh-public-key-file").val("");
    }
}

/**
 * Meathod Name : setCcvmReviewInfo
 * Date Created : 2021.03.18
 * Writer  : 배태주
 * Description : 클라우드센터 VM 배포 전 설정확인을 위한 정보를 세팅하는 기능
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.18 최초 작성
 */
function setCcvmReviewInfo(){

    //클라우드센터 가상머신 XML 생성 커맨드 기본 텍스트
    xml_create_cmd = ["python3",pluginpath + "/python/vm/create_ccvm_xml.py"];

    //-----장애조치 클러스터 설정-----
    //클러스터 호스트1, 호스트2, 호스트3 이름
    createAccordion("failover",$('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length)

    //-----클라우드센트 VM 설정-----
    // 클러스터 민감도

    $('#span-cloud-vm-cluster-sync-mechanism').text($('#form-input-cloud-vm-cluster-sync-mechanism').val() + "초");
    //cpu
    var cpu = $('select#form-modal-select-cloud-vm-compute-cpu-core option:checked').val();
    var cpu_text = $('select#form-modal-select-cloud-vm-compute-cpu-core option:checked').text();

    if(cpu == '') {
        $('#span-cloud-vm-cpu-core').text("미입력");
    } else {
        xml_create_cmd.push("-c",cpu);
        $('#span-cloud-vm-cpu-core').text(cpu_text);
    }

    //memory
    var memory = $('select#form-modal-select-cloud-vm-compute-memory option:checked').val();
    var memory_txt = $('select#form-modal-select-cloud-vm-compute-memory option:checked').text();

    if(memory == '') {
        $('#span-cloud-vm-memory').text("미입력");
    } else {
        xml_create_cmd.push("-m",memory);
        $('#span-cloud-vm-memory').text(memory_txt);
    }

    //네트워크 구성 mngt_bool은 필수 값이므로 값이 항상 true
    var mngt_bool = $('input[type=checkbox][id="form-checkbox-mngt-network"]').is(":checked");
    var svc_bool = $('input[type=checkbox][id="form-checkbox-svc-network"]').is(":checked");

    if(mngt_bool && svc_bool) {
        $('#span-cloud-vm-network-config').text("관리네트워크, 서비스네트워크");
    } else {
        $('#span-cloud-vm-network-config').text("관리네트워크");
    }

    //관리용 bridge
    var mngt_nic = $('select#form-select-cloud-vm-mngt-parent option:checked').val();
    var mngt_nic_txt = $('select#form-select-cloud-vm-mngt-parent option:checked').text();

    if(mngt_nic == '') {
        $('#span-cloud-vm-mgmt-nic-bridge').text("미입력");
    } else {
        xml_create_cmd.push("-mnb",mngt_nic);
        $('#span-cloud-vm-mgmt-nic-bridge').html(mngt_nic_txt + "</br>");
    }
    //서비스용 bridge
    if(svc_bool){
        var svc_nic = $('select#form-select-cloud-vm-svc-parent option:checked').val();
        var svc_nic_txt = $('select#form-select-cloud-vm-svc-parent option:checked').text();
        if(svc_nic == '') {
            $('#span-cloud-vm-svc-nic-bridge').text("미입력");
        } else {
            xml_create_cmd.push("-snb",svc_nic);
            $('#span-cloud-vm-svc-nic-bridge').text(svc_nic_txt);
        }
    } else {
        $('#span-cloud-vm-svc-nic-bridge').text("N/A");
    }
    // GFS용 디스크
    $('#span-cloud-vm-data-disk').empty();
    $('input[type=checkbox][name="form-cloud-checkbox-disk"]').each(function() {
        if(this.checked){
            var el = "";
            el += $('label[for="'+this.id+'"]').text()+"</br>";

            $('#span-cloud-vm-data-disk').append(el);
        }
    });

    // 선택된 디스크가 없을 경우 "미입력" 표기
    if($('#span-cloud-vm-data-disk').text() == ''){
        $('#span-cloud-vm-data-disk').append("미입력");
    }

    //-----추가 네트워크 정보-----
    //정보입력 소스
    var host_file_setting = $('input[type=checkbox][id="form-input-cloud-vm-additional-file"]').is(":checked");
    if(host_file_setting) {
        $('#span-cloud-vm-additional-hosts-source').text("Hosts 파일 입력");
    } else {
        $('#span-cloud-vm-additional-hosts-source').text("직접 입력");
    }

    //hosts 파일
    // 변경된 hosts file 내용을 설정 확인에 반영
    let host_file_type = $('input[name=radio-hosts-file-ccvm]:checked').val();

    putHostsValueIntoTextarea(host_file_type, option_ccvm,os_type);

    //호스트명
    var ccvm_name = $('#form-input-cloud-vm-hostname').val();
    if(ccvm_name == '') {
        $('#span-cloud-vm-additional-hostname').text("미입력");
    } else {
        $('#span-cloud-vm-additional-hostname').text(ccvm_name);
    }

    //관리 NIC IP
    var ccvm_mngt_nic_ip = $('#form-input-cloud-vm-mngt-nic-ip').val();
    if(ccvm_mngt_nic_ip == '') {
        $('#span-cloud-vm-additional-mgmt-ipaddr').text("미입력");
    } else {
        $('#span-cloud-vm-additional-mgmt-ipaddr').text(ccvm_mngt_nic_ip);
    }

    //관리 VLAN ID
    var ccvm_mngt_vlan_id = $('#form-input-cloud-vm-mngt-vlan').val();
    if(ccvm_mngt_vlan_id == '') {
        $('#span-cloud-vm-additional-mgmt-vlan-id').text("N/A");
    } else {
        $('#span-cloud-vm-additional-mgmt-vlan-id').text(ccvm_mngt_vlan_id);
    }

    //관리 NIC Gateway
    var ccvm_mngt_gateway = $('#form-input-cloud-vm-mngt-gw').val();
    if(ccvm_mngt_gateway == '') {
        $('#span-cloud-vm-additional-mgmt-gateway').text("미입력");
    } else {
        $('#span-cloud-vm-additional-mgmt-gateway').text(ccvm_mngt_gateway);
    }
    //DNS
    var ccvm_dns = $('#form-input-cloud-vm-dns').val();
    if(ccvm_dns == '') {
        $('#span-cloud-vm-additional-dns').text("미입력");
    } else {
        $('#span-cloud-vm-additional-dns').text(ccvm_dns);
    }

    if(svc_bool){
        //서비스 NIC IP
        var ccvm_svc_nic_ip = $('#form-input-cloud-vm-svc-nic-ip').val();
        if(ccvm_svc_nic_ip == '') {
            $('#span-cloud-vm-additional-svc-ipaddr').text("미입력");
        } else {
            $('#span-cloud-vm-additional-svc-ipaddr').text(ccvm_svc_nic_ip);
        }

        //서비스 VLAN ID
        var ccvm_svc_vlan_id = $('#form-input-cloud-vm-svc-vlan').val();
        if(ccvm_svc_vlan_id == '') {
            $('#span-cloud-vm-additional-svc-vlan-id').text("N/A");
        } else {
            $('#span-cloud-vm-additional-svc-vlan-id').text(ccvm_svc_vlan_id);
        }

        //서비스 NIC Gateway
        var ccvm_svc_gateway = $('#form-input-cloud-vm-svc-gw').val();
        if(ccvm_svc_gateway == '') {
            $('#span-cloud-vm-additional-svc-gateway').text("미입력");
        } else {
            $('#span-cloud-vm-additional-svc-gateway').text(ccvm_svc_gateway);
        }

        //서비스 DNS
        var ccvm_svc_dns = $('#form-input-cloud-vm-svc-dns').val();
        if(ccvm_svc_dns == ''){
            $('#span-cloud-vm-additional-svc-dns').text("미입력");
        } else {
            $('#span-cloud-vm-additional-svc-dns').text(ccvm_svc_dns);
        }
    } else {
        $('#span-cloud-vm-additional-svc-ipaddr').text("N/A");
        $('#span-cloud-vm-additional-svc-vlan-id').text("N/A");
        $('#span-cloud-vm-additional-svc-gateway').text("N/A");
        $('#span-cloud-vm-additional-svc-dns').text("N/A");
    }
    //-----SSH Key 정보-----
    var ssh_private_key_url = $('#form-textarea-cloud-vm-ssh-private-key-file').val();
    if(ssh_private_key_url == '') {
        $('#span-cloud-vm-ssh-private-key-file').text("미입력");
    } else {
        $('#span-cloud-vm-ssh-private-key-file').text(ssh_private_key_url);
    }

    var ssh_public_key_url = $('#form-textarea-cloud-vm-ssh-public-key-file').val();
    if(ssh_public_key_url == '') {
        $('#span-cloud-vm-ssh-public-key-file').text("미입력");
    } else {
        $('#span-cloud-vm-ssh-public-key-file').text(ssh_public_key_url);
    }
    var ipmi_check_val = $('input[name="radio-ipmi-ccvm"]:checked').val();

    createAccordion("ipmi",$('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length, ipmi_check_val);
}

/**
 * Meathod Name : validateCloudCenterVm
 * Date Created : 2021.03.18
 * Writer  : 배태주
 * Description : 클라우드센터 가상머신 생성 전 입력받은 값의 유효성 검사
 * Parameter : 없음
 * Return  : 없음
 * History  : 2021.03.18 최초 작성
 */
function validateCloudCenterVm(){

    var validate_check = true;
    let host_file_type = $('input[name=radio-hosts-file-ccvm]:checked').val();
    var svc_bool = $('input[type=checkbox][id="form-checkbox-svc-network"]').is(":checked");

    var ipmi_check_value = $('input[name="radio-ipmi-ccvm"]:checked').val();

    let pcs_host1 = $('#form-input-cloud-vm-failover-cluster-host1-name')
    let pcs_host2 = $('#form-input-cloud-vm-failover-cluster-host2-name')
    let pcs_host3 = $('#form-input-cloud-vm-failover-cluster-host3-name')

    var host_names = [];
    for (let i = 1; i <= 3; i++) {
        const hostElement = document.getElementById(`form-input-cloud-vm-failover-cluster-host${i}-name`);
        if (hostElement) {
            const hostName = $(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val();
            if (hostName) {
                host_names.push(hostName); // 유효한 이름만 배열에 추가
            }
        }
    }

    if ($('select#form-modal-select-cloud-vm-compute-cpu-core option:checked').val() == "") { //cpu
        alert("CPU core를 입력해주세요.");
        validate_check = false;
    } else if ($('select#form-select-cloud-vm-compute-memory option:checked').val() == "") { //memory
        alert("Memory를 입력해주세요.");
        validate_check = false;
    } else if ($('select#form-select-cloud-vm-mngt-parent option:checked').val() == "") { //관리용 bridge
        alert("관리용네트워크를 입력해주세요.");
        validate_check = false;
    } else if (svc_bool && $('select#form-select-cloud-vm-svc-parent option:checked').val() == "") {//서비스용 bridge
        alert("서비스네트워크를 입력해주세요.");
        validate_check = false;
    } else if($('#div-textarea-cluster-config-confirm-hosts-file-ccvm').val().trim() == "") {
        alert("클러스터 구성 프로파일 정보를 확인해 주세요.");
        validate_check = false;
    } else if(validateClusterConfigProfile(host_file_type, option_ccvm, os_type)) { // config 유효성 검사
        validate_check = false;
    } else if ($('#form-input-cloud-vm-hostname').val() == "") { //클라우드센터 가상머신 호스트명
        alert("클라우드센터 가상머신의 호스트명 입력해주세요.");
        validate_check = false;
    } else if ($('#form-input-cloud-vm-mngt-nic-ip').val() == "") { //관리 NIC IP
        alert("관리 NIC IP를 입력해주세요.");
        validate_check = false;
    } else if($("#form-input-cloud-vm-dns").val() != "" && !checkIp($("#form-input-cloud-vm-dns").val())){
        alert("DNS 형식을 확인해주세요.");
        validate_check = false;
    } else if (svc_bool && $('#form-input-cloud-vm-svc-nic-ip').val() == "") { //서비스 NIC IP
        alert("서비스 NIC IP를 입력해주세요.");
        validate_check = false;
    } else if (svc_bool && $('#form-input-cloud-vm-svc-gw').val() == "") { //서비스 NIC Gateway
        alert("서비스 NIC Gateway를 입력해주세요.");
        validate_check = false;
    } else if(!checkHostFormat($("#form-input-cloud-vm-hostname").val())){
        alert("호스트명 입력 형식을 확인해주세요.");
        validate_check = false;
    } else if(!checkCidrFormat($("#form-input-cloud-vm-mngt-nic-ip").val())){
        alert("관리 NIC IP 형식을 확인해주세요.");
        validate_check = false;
    } else if(!checkIp($("#form-input-cloud-vm-mngt-gw").val()) && $('#form-input-cloud-vm-mngt-gw').val() != ""){
        alert("관리 NIC Gateway 형식을 확인해주세요.");
        validate_check = false;
    } else if(svc_bool && !checkCidrFormat($("#form-input-cloud-vm-svc-nic-ip").val())){
        alert("서비스 NIC IP 형식을 확인해주세요.");
        validate_check = false;
    } else if(svc_bool && !checkIp($("#form-input-cloud-vm-svc-gw").val())){
        alert("서비스 NIC Gateway 형식을 확인해주세요.");
        validate_check = false;
    } else if(svc_bool && !checkIp($("#form-input-cloud-vm-svc-dns").val()) && $("#form-input-cloud-vm-svc-dns").val() != "") {
        alert("서비스 DNS 형식을 확인해주세요.");
        validate_check = false;
    } else if ( $('#form-textarea-cloud-vm-ssh-private-key-file').val() == "") { //SSH 개인 Key 정보
        alert("SSH 개인 Key 파일을 입력해주세요.");
        validate_check = false;
    } else if ( $('#form-textarea-cloud-vm-ssh-public-key-file').val() == "") { //SSH 공개 Key 정보
        alert("SSH 공개 Key 파일을 입력해주세요.");
        validate_check = false;
    } else if(os_type == "PowerFlex"){
        if (pcs_host1.val() == "") {
            alert("PCS 호스트1 PN IP를 입력해주세요.");
            validate_check = false;
        } else if(!checkIp(pcs_host1.val())){
            alert("PCS 호스트1 PN IP 형식을 확인해주세요.");
            validate_check = false;
        } else if (pcs_host2 == ""){
            if (pcs_host2.val() == "") {
                alert("PCS 호스트2 PN IP를 입력해주세요.");
                validate_check = false;
            } else if(!checkIp(pcs_host2.val())){
                alert("PCS 호스트2 PN IP 형식을 확인해주세요.");
                validate_check = false;
            } else if(pcs_host1.val() == pcs_host2.val()){
                alert("중복된 PCS 호스트 PN IP가 존재합니다.");
                validate_check = false;
            }
        } else if (pcs_host3 == "") {
            if (pcs_host3.val() == "") {
                alert("PCS 호스트3 PN IP를 입력해주세요.");
                validate_check = false;
            } else if(!checkIp(pcs_host3.val())){
                alert("PCS 호스트3 PN IP 형식을 확인해주세요.");
                validate_check = false;
            } else if(pcs_host1.val() == pcs_host2.val() || pcs_host1.val() == pcs_host3.val() || pcs_host2.val() == pcs_host3.val()){
                alert("중복된 PCS 호스트 PN IP가 존재합니다.");
                validate_check = false;
            }
        } else if (pcsHostPnIpCheck(host_file_type, pcs_host1.val(), option_ccvm)) { //host1 name
            validate_check = false;
        } else if (pcsHostPnIpCheck(host_file_type, pcs_host2.val(), option_ccvm)) { //host2 name
            validate_check = false;
        } else if (pcsHostPnIpCheck(host_file_type, pcs_host3.val(), option_ccvm)) { //host3 name
            validate_check = false;
        } else if (ipmi_check_value == "individual"){
            if ($('#form-input-individual-credentials-ipmi-ip1').val() == ''){
                alert("1번 호스트 IPMI IP를 입력해주세요.");
                validate_check = false;
            }else if (!checkIp($('#form-input-individual-credentials-ipmi-ip1').val())){
                alert("1번 호스트 IPMI IP 형식을 확인해주세요.");
                validate_check = false;
            }else if ($('#form-input-individual-credentials-ipmi-user1').val() == ''){
                alert("1번 호스트 IPMI 아이디를 입력해주세요.");
                validate_check = false;
            }else if ($('#form-input-individual-credentials-ipmi-password1-check').val() == '' || $('#form-input-individual-credentials-ipmi-password1').val() == ''){
                alert("1번 호스트 IPMI 비밀번호를 입력해주세요.");
                validate_check = false;
            }else if ($('#form-input-individual-credentials-ipmi-password1').val() != $('#form-input-individual-credentials-ipmi-password1-check').val()){
                alert("1번 호스트 IPMI 비밀번호를 확인해주세요.");
                validate_check = false;
            }else if ($('#form-input-individual-credentials-ipmi-ip2')){
                if ($('#form-input-individual-credentials-ipmi-ip2').val() == ''){
                    alert("2번 호스트 IPMI IP를 입력해주세요.");
                    validate_check = false;
                }else if (!checkIp($('#form-input-individual-credentials-ipmi-ip2').val())){
                    alert("2번 호스트 IPMI IP 형식을 확인해주세요.");
                    validate_check = false;
                }else if ($('#form-input-individual-credentials-ipmi-user2').val() == ''){
                    alert("2번 호스트 IPMI 아이디를 입력해주세요.");
                    validate_check = false;
                }else if ($('#form-input-individual-credentials-ipmi-password2-check').val() == '' || $('#form-input-individual-credentials-ipmi-password2').val() == ''){
                    alert("2번 호스트 IPMI 비밀번호를 입력해주세요.");
                    validate_check = false;
                }else if ($('#form-input-individual-credentials-ipmi-password2').val() != $('#form-input-individual-credentials-ipmi-password2-check').val()){
                    alert("2번 호스트 IPMI 비밀번호를 확인해주세요.");
                    validate_check = false;
                }
            }else if ($('#form-input-individual-credentials-ipmi-ip3')){
                if ($('#form-input-individual-credentials-ipmi-ip3').val() == ''){
                    alert("3번 호스트 IPMI IP를 입력해주세요.");
                    validate_check = false;
                }else if (!checkIp($('#form-input-individual-credentials-ipmi-ip3').val())){
                    alert("3번 호스트 IPMI IP 형식을 확인해주세요.");
                    validate_check = false;
                }else if ($('#form-input-individual-credentials-ipmi-user3').val() == ''){
                    alert("3번 호스트 IPMI 아이디를 입력해주세요.");
                    validate_check = false;
                }else if ($('#form-input-individual-credentials-ipmi-password3-check').val() == '' || $('#form-input-individual-credentials-ipmi-password3').val() == ''){
                    alert("3번 호스트 IPMI 비밀번호를 입력해주세요.");
                    validate_check = false;
                }else if ($('#form-input-individual-credentials-ipmi-password3').val() != $('#form-input-individual-credentials-ipmi-password3-check').val()){
                    alert("3번 호스트 IPMI 비밀번호를 확인해주세요.");
                    validate_check = false;
                }
            }
        } else if (ipmi_check_value == "common"){
            if ($('#form-input-common-credentials-ipmi-ip1').val() == ''){
                alert("1번 호스트 IPMI IP를 입력해주세요.");
                validate_check = false;
            } else if (!checkIp($('#form-input-common-credentials-ipmi-ip1').val())){
                alert("1번 호스트 IPMI IP 형식을 확인해주세요.");
                validate_check = false;
            } else if ($('#form-input-common-credentials-ipmi-ip2')){
                if ($('#form-input-common-credentials-ipmi-ip2').val() == ''){
                    alert("2번 호스트 IPMI IP를 입력해주세요.");
                    validate_check = false;
                } else if (!checkIp($('#form-input-common-credentials-ipmi-ip2').val())){
                    alert("2번 호스트 IPMI IP 형식을 확인해주세요.");
                    validate_check = false;
                }
            } else if ($('#form-input-common-credentials-ipmi-ip3')){
                if ($('#form-input-common-credentials-ipmi-ip3').val() == ''){
                    alert("3번 호스트 IPMI IP를 입력해주세요.");
                    validate_check = false;
                } else if (!checkIp($('#form-input-common-credentials-ipmi-ip3').val())){
                    alert("3번 호스트 IPMI IP 형식을 확인해주세요.");
                    validate_check = false;
                }
            } else if ($('#form-input-common-credentials-ipmi-user').val() == ''){
                alert("모든 호스트 IPMI 아이디를 입력해주세요.");
                validate_check = false;
            } else if ($('#form-input-common-credentials-ipmi-password').val() == '' || $('#form-input-common-credentials-ipmi-password-check').val() == ''){
                alert("모든 호스트 IPMI 비밀번호를 입력해주세요.");
                validate_check = false;
            }else if ($('#form-input-common-credentials-ipmi-password').val() != $('#form-input-common-credentials-ipmi-password-check').val()){
                alert("모든 호스트 IPMI 비밀번호를 확인해주세요.");
                validate_check = false;
            }
        }
    } else if (os_type == "general-virtualization"){
        if (ipmi_check_value === "individual") {
            for (let i = 1; i <= host_names.length; i++) {
                if (!validateIpmiCredentials(i, "individual")) {
                    validate_check = false;
                    break;
                }
            }
        } else if (ipmi_check_value === "common") {
            for (let i = 1; i <= host_names.length; i++) {
                if (!validateIpmiCredentials(i, "common")) {
                    validate_check = false;
                    break;
                }
            }
        }
    }
    return validate_check;
}

/**
 * Meathod Name : checkValueNull
 * Date Created : 2021.03.22
 * Writer  : 배태주
 * Description : 입력된 값이 없는지 체크하여 값이 있을 경우 true return, 없을 경우 false 리턴
 * Parameter : String, String
 * Return  : bool
 * History  : 2021.03.22 최초 작성
 */
function checkValueNull(value, errorText){
    if(value == ""){
        alert(errorText);
        return false;
    } else {
        return;
    }
}
/**
 * Meathod Name : validateIpmiCredentials
 * Date Created : 2024.11.26
 * Writer  : 정민철
 * Description : 입력된 값이 없는지 체크하여 값이 있을 경우 true return, 없을 경우 false 리턴
 * Parameter : int, String
 * Return  : bool
 * History  : 2024.11.26 최초 작성
 */
function validateIpmiCredentials(index, type) {
    let prefix = type === "individual" ? `form-input-individual-credentials-ipmi` : `form-input-common-credentials-ipmi`;
    let ip = $(`#${prefix}-ip${index}`).val() || '';
    let user = type === "individual" ? $(`#${prefix}-user${index}`).val() || '' : $('#form-input-common-credentials-ipmi-user').val();
    let password = type === "individual" ? $(`#${prefix}-password${index}`).val() || '' : $('#form-input-common-credentials-ipmi-password').val();

    if (!ip) {
        alert(`${index}번 호스트 IPMI IP를 입력해주세요.`);
        return false;
    }
    if (!checkIp(ip)) {
        alert(`${index}번 호스트 IPMI IP 형식을 확인해주세요.`);
        return false;
    }
    if (!user) {
        alert(`${index}번 호스트 IPMI 아이디를 입력해주세요.`);
        return false;
    }
    if (!password) {
        alert(`${index}번 호스트 IPMI 비밀번호를 입력해주세요.`);
        return false;
    }

    return true;
}


/**
 * Meathod Name : resetIpmiValues
 * Date Created : 2024.09.10
 * Writer  : 정민철
 * Description : 일반 가상화를 사용할 시 ccvm에서 바뀌는 화면 처리
 * History  : 2024.09.10 최초 작성
 */
function resetIpmiValues() {
    const check_value = $('input[name="radio-ipmi-ccvm"]:checked').val();
    const maxHosts = $('#form-table-tbody-cluster-config-existing-host-profile-ccvm tr').length; // 최대 호스트 수 (필요 시 변경 가능)

    if (check_value === "common") {
        // 공통 자격 증명 처리
        for (let i = 1; i <= maxHosts; i++) {
            $(`#form-input-common-credentials-ipmi-ip${i}`).val("");
        }
        $('#form-input-common-credentials-ipmi-user').val("");
        $('#form-input-common-credentials-ipmi-password').val("");
    } else {
        // 개별 자격 증명 처리
        for (let i = 1; i <= maxHosts; i++) {
            $(`#form-input-individual-credentials-ipmi-ip${i}`).val("");
            $(`#form-input-individual-credentials-ipmi-user${i}`).val("");
            $(`#form-input-individual-credentials-ipmi-password${i}`).val("");
        }
    }
}

/**
 * Meathod Name : setTypeByChange
 * Date Created : 2024.09.05
 * Writer  : 정민철
 * Description : cluster.json의 type 값에 따라 화면 교체
 * History  : 2024.09.05 최초 작성
 */
function setTypeByChange(){
    if (os_type == "PowerFlex"){
        // 루트 디스크
        $('#form-select-cloud-vm-root-disk-size').text("500 GiB (THIN Provisioning)");
        $('#span-cloud-vm-root-disk-size').text("500 GiB");
        // gfs용 화면 처리
        $('#nav-button-cloud-vm-ipmi').show();
        $('#div-accordion-cloud-ipmi').show();
        $('#span-ccvm-progress-step2-text').text("GFS 구성 설정 및 Pcs 설정");
        $('#span-ccvm-progress-step1-text').text("클러스터 구성 HOST 네트워크 연결 및 초기화 작업");
        $('#gfs-li').show();
        $('#gfs-li').text("일반 가상화를 위한 각 호스트의 IPMI 정보");
    }else if (os_type == "general-virtualization"){
        // gfs용 디스크
        $('#nav-button-cloud-vm-disk').show();
        // 루트 디스크
        $('#form-select-cloud-vm-root-disk-size').text("500 GiB (THIN Provisioning)");
        $('#span-cloud-vm-root-disk-size').text("500 GiB");
        // gfs용 화면 처리
        $('#nav-button-cloud-vm-ipmi').show();
        $('#div-accordion-cloud-ipmi').show();
        $('#span-ccvm-progress-step2-text').text("GFS 구성 설정 및 Pcs 설정");
        $('#span-ccvm-progress-step1-text').text("클러스터 구성 HOST 네트워크 연결 및 초기화 작업");
        $('#gfs-li').show();
        $('#gfs-li').text("일반 가상화를 위한 각 호스트의 IPMI 정보");
    }
}

function setGfsDiskInfo(){
    var cmd = ["python3", pluginpath + "/python/disk/disk_action.py", "gfs-list"];

    createLoggerInfo("setDiskInfo() start");

    cockpit.spawn(cmd).then(function(data) {
        // 초기화
        $('#disk-cloud-vm-pci-list').empty();

        var el = '';
        var multipathElements = ''; // MultiPath 정보를 저장할 변수
        var result = JSON.parse(data);
        var pci_list = result.val.blockdevices;

        // MultiPath 중복 제거용 세트
        var displayedMultipaths = new Set();
        var displayedName = new Set();

        if (pci_list.length > 0) {
            for (var i = 0; i < pci_list.length; i++) {
                var partition_text = '';
                var check_disable = '';

                if (pci_list[i].children != undefined) {
                    for (var j = 0; j < pci_list[i].children.length; j++) {
                        if (!pci_list[i].wwn) {
                            pci_list[i].wwn = ""; // 값을 공백으로 설정
                        }
                        var mpathName = pci_list[i].children[j].name;
                        if (pci_list[i].children[j].name.includes('mpath')) {
                            if (pci_list[i].children[j].children != undefined) {
                                partition_text = '( Partition exists count : ' + pci_list[i].children[j].children.length + ' )';
                                check_disable = 'disabled';
                            }
                            // MultiPath가 이미 표시된 경우 스킵
                            if (!displayedMultipaths.has(mpathName)) {
                                var mpathHtml = '';
                                mpathHtml += '<div class="pf-c-check">';
                                // mpathHtml += '<input class="pf-c-check__input" type="checkbox" id="form-cloud-checkbox-disk' + i + '" name="form-cloud-checkbox-disk" value="' + pci_list[i].children[j].path + '" ' + check_disable + ' />';
                                mpathHtml += '<input class="pf-c-check__input" type="checkbox" id="form-cloud-checkbox-disk' + i + '" name="form-cloud-checkbox-disk" value="' + pci_list[i].children[j].path + '" />';
                                mpathHtml += '<label class="pf-c-check__label" style="margin-top:5px" for="form-cloud-checkbox-disk' + i + '">' + pci_list[i].children[j].path + ' ' + pci_list[i].children[j].state + ' (' + pci_list[i].children[j].type + ') ' + pci_list[i].children[j].size + ' ' + ' ' + pci_list[i].vendor + ' ' + pci_list[i].wwn  + ' ' + partition_text + '</label>';
                                mpathHtml += '</div>';

                                multipathElements += mpathHtml; // MultiPath 요소를 multipathElements에 저장

                                displayedMultipaths.add(mpathName);  // MultiPath 이름을 Set에 추가
                            }
                        } else {
                            partition_text = '( Partition exists count : ' + pci_list[i].children.length + ' )';
                            check_disable = 'disabled';

                            var disk_name = pci_list[i].name;
                            if (!displayedName.has(disk_name)) {
                                el += '<div class="pf-c-check">';
                                // el += '<input class="pf-c-check__input" type="checkbox" id="form-cloud-checkbox-disk' + i + '" name="form-cloud-checkbox-disk" value="' + pci_list[i].path + '" ' + check_disable + ' />';
                                el += '<input class="pf-c-check__input" type="checkbox" id="form-cloud-checkbox-disk' + i + '" name="form-cloud-checkbox-disk" value="' + pci_list[i].path + '" />';
                                el += '<label class="pf-c-check__label" style="margin-top:5px" for="form-cloud-checkbox-disk' + i + '">' + pci_list[i].path + ' ' + pci_list[i].state + ' (' + pci_list[i].tran + ') ' + pci_list[i].size + ' ' + pci_list[i].model + ' ' + pci_list[i].wwn + partition_text + '</label>';
                                el += '</div>';

                                displayedName.add(disk_name);
                            }
                        }
                    }
                } else {
                    if (!pci_list[i].wwn) {
                        pci_list[i].wwn = ""; // 값을 공백으로 설정
                    }
                    el += '<div class="pf-c-check">';
                    // el += '<input class="pf-c-check__input" type="checkbox" id="form-cloud-checkbox-disk' + i + '" name="form-cloud-checkbox-disk" value="' + pci_list[i].path + '" ' + check_disable + ' />';
                    el += '<input class="pf-c-check__input" type="checkbox" id="form-cloud-checkbox-disk' + i + '" name="form-cloud-checkbox-disk" value="' + pci_list[i].path + '" />';
                    el += '<label class="pf-c-check__label" style="margin-top:5px" for="form-cloud-checkbox-disk' + i + '">' + pci_list[i].path + ' ' + pci_list[i].state + ' (' + pci_list[i].tran + ') ' + pci_list[i].size + ' ' + pci_list[i].model + ' ' + pci_list[i].wwn + partition_text + '</label>';
                    el += '</div>';
                }
            }
        } else {
            el += '<div class="pf-c-check">';
            el += '<label class="pf-c-check__label" style="margin-top:5px">데이터가 존재하지 않습니다.</label>';
            el += '</div>';
        }

        // 일반 장치 정보를 먼저 추가하고, 마지막에 MultiPath 정보를 추가
        $('#disk-cloud-vm-pci-list').append(multipathElements + el);

    }).catch(function() {
        createLoggerInfo("setDiskInfo error");
    });
}

/**
 * Meathod Name : updateHostFields
 * Date Created : 2024.11.13
 * Writer  : 정민철
 * Description : 장애조치 클러스터 설정 동적으로 생성
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.11.13 최초 작성
 */
function updateHostFields(count) {
    const hostCount = count;
    $('#form-input-cloud-vm-failover-cluster-member-number').val(count);
    const formSection = document.getElementById("failover-cluster-section"); // 상위 컨테이너

    for (let i = 1; i <= hostCount; i++) {
        // 각 호스트 정보를 위한 HTML 생성
        if (os_type == "general-virtualization"){
            var hostFieldHTML = `
            <div class="pf-c-form__field-group">
                <div class="pf-c-form__field-group-header" style="padding-bottom:8px;">
                    <div class="pf-c-form__field-group-header-main">
                        <div class="pf-c-form__field-group-header-title">
                            <div class="pf-c-form__field-group-header-title-text">PCS 호스트 #${i} 정보</div>
                        </div>
                    </div>
                </div>
                <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                    <div class="pf-c-form__group" style="padding:0px;">
                        <div class="pf-c-form__group-label">
                            <label class="pf-c-form__label" for="form-input-cloud-vm-failover-cluster-host${i}-name">
                                <span class="pf-c-form__label-text">MGMT IP</span>
                                <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                            </label>
                        </div>
                        <div class="pf-c-form__group-control">
                            <input class="pf-c-form-control" style="width:70%" type="text" id="form-input-cloud-vm-failover-cluster-host${i}-name" name="form-input-cloud-vm-failover-cluster-host${i}-name" required />
                        </div>
                    </div>
                </div>
            </div>
        `;
        }else{
            var hostFieldHTML = `
            <div class="pf-c-form__field-group">
                <div class="pf-c-form__field-group-header" style="padding-bottom:8px;">
                    <div class="pf-c-form__field-group-header-main">
                        <div class="pf-c-form__field-group-header-title">
                            <div class="pf-c-form__field-group-header-title-text">PCS 호스트 #${i} 정보</div>
                        </div>
                    </div>
                </div>
                <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                    <div class="pf-c-form__group" style="padding:0px;">
                        <div class="pf-c-form__group-label">
                            <label class="pf-c-form__label" for="form-input-cloud-vm-failover-cluster-host${i}-name">
                                <span class="pf-c-form__label-text">PN IP</span>
                                <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                            </label>
                        </div>
                        <div class="pf-c-form__group-control">
                            <input class="pf-c-form-control" style="width:70%" type="text" id="form-input-cloud-vm-failover-cluster-host${i}-name" name="form-input-cloud-vm-failover-cluster-host${i}-name" required />
                        </div>
                    </div>
                </div>
            </div>
        `;
        }
        // 상위 컨테이너에 바로 호스트 정보 HTML을 추가
        formSection.insertAdjacentHTML('beforeend', hostFieldHTML);
    }
}
/**
 * Meathod Name : updateIPMIcredentials
 * Date Created : 2024.11.14
 * Writer  : 정민철
 * Description : 호스트 수에 따른 IPMI 자격 증명 동적 화면
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.11.14 최초 작성
 */
function updateIPMIcredentials(count,credentials_type) {
    const hostCount = count;
    const credentials = document.getElementById("div-ipmi-credentials");
    credentials.innerHTML = "";
    if (credentials_type == "individual"){
        for (let i = 1; i <= hostCount; i++) {
            const individual_HTML = `
                        <div class="pf-c-form__field-group">
                            <div class="pf-c-form__field-group-header"  style="padding-bottom:8px;">
                                <div class="pf-c-form__field-group-header-main">
                                    <div class="pf-c-form__field-group-header-title">
                                        <div class="pf-c-form__field-group-header-title-text" style="padding-top: 15px;">${i}번 호스트 정보</div>
                                    </div>
                                </div>
                            </div>
                            <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                                <div class="pf-c-form__group" style="padding:0px;">
                                    <div class="pf-c-form__group-label">
                                        <label class="pf-c-form__label" for="form-input-individual-credentials-ipmi-ip${i}">
                                            <span class="pf-c-form__label-text">IPMI IP</span>
                                            <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                                        </label>
                                    </div>
                                    <div class="pf-c-form__group-control">
                                        <input class="pf-c-form-control" style="width:70%" type="text" id="form-input-individual-credentials-ipmi-ip${i}" name="form-input-individual-credentials-ipmi-ip${i}" placeholder="xxx.xxx.xxx.xxx 형식으로 입력" required/>
                                    </div>
                                </div>
                            </div>
                            <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                                <div class="pf-c-form__group" style="padding:0px;">
                                    <div class="pf-c-form__group-label">
                                        <label class="pf-c-form__label" for="form-input-individual-credentials-ipmi-user${i}">
                                            <span class="pf-c-form__label-text">IPMI 아이디</span>
                                            <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                                        </label>
                                    </div>
                                    <div class="pf-c-form__group-control">
                                        <input class="pf-c-form-control" style="width:70%" type="text" id="form-input-individual-credentials-ipmi-user${i}" name="form-input-individual-credentials-ipmi-user${i}" placeholder="아이디를 입력하세요." required />
                                    </div>
                                </div>
                            </div>
                            <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                                <div class="pf-c-form__group" style="padding:0px;">
                                    <div class="pf-c-form__group-label">
                                        <label class="pf-c-form__label" for="form-input-individual-credentials-ipmi-password${i}">
                                            <span class="pf-c-form__label-text">IPMI 비밀번호</span>
                                            <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                                        </label>
                                    </div>
                                    <div class="pf-c-form__group-control">
                                        <input class="pf-c-form-control" style="width:70%" type="password" autocomplete="off" id="form-input-individual-credentials-ipmi-password${i}" name="form-input-individual-credentials-ipmi-password1-check${i}" placeholder="비밀번호를 입력하세요." required />
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                        credentials.insertAdjacentHTML('beforeend',individual_HTML);
        }
    }else{
        for (let i = 1; i <= hostCount; i++) {
            const common_HTML = `
                    <div class="pf-c-form__field-group">
                        <div class="pf-c-form__field-group-header"  style="padding-bottom:8px;">
                            <div class="pf-c-form__field-group-header-main">
                                <div class="pf-c-form__field-group-header-title">
                                    <div class="pf-c-form__field-group-header-title-text" style="padding-top: 15px;">${i}번 호스트 정보</div>
                                </div>
                            </div>
                        </div>
                        <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                            <div class="pf-c-form__group" style="padding:0px;">
                                <div class="pf-c-form__group-label">
                                    <label class="pf-c-form__label" for="form-input-common-credentials-ipmi-ip${i}">
                                        <span class="pf-c-form__label-text">IPMI IP</span>
                                        <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                                    </label>
                                </div>
                                <div class="pf-c-form__group-control">
                                    <input class="pf-c-form-control" style="width:70%" type="text" id="form-input-common-credentials-ipmi-ip${i}" name="form-input-common-credentials-ipmi-ip${i}"  placeholder="xxx.xxx.xxx.xxx 형식으로 입력" required />
                                </div>
                            </div>
                        </div>
                    </div>
            `;

            credentials.insertAdjacentHTML('beforeend',common_HTML);
        }
        const common_credentials_HTML= `
            <div class="pf-c-form__field-group">
                <div class="pf-c-form__field-group-header"  style="padding-bottom:8px;">
                    <div class="pf-c-form__field-group-header-main">
                        <div class="pf-c-form__field-group-header-title">
                            <div class="pf-c-form__field-group-header-title-text" style="margin-top: 20px;">모든 호스트 자격 증명</div>
                        </div>
                    </div>
                </div>
                <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                    <div class="pf-c-form__group" style="padding:0px;">
                        <div class="pf-c-form__group-label">
                            <label class="pf-c-form__label" for="form-input-common-credentials-ipmi-user">
                                <span class="pf-c-form__label-text">IPMI 아이디</span>
                                <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                            </label>
                        </div>
                        <div class="pf-c-form__group-control">
                            <input class="pf-c-form-control" style="width:70%" type="text" id="form-input-common-credentials-ipmi-user" name="form-input-common-credentials-ipmi-user" placeholder="아이디를 입력하세요." required />
                        </div>
                    </div>
                </div>
                <div class="pf-c-form__field-group-body" style="padding-top:0px;">
                    <div class="pf-c-form__group" style="padding:0px;">
                        <div class="pf-c-form__group-label">
                            <label class="pf-c-form__label" for="form-input-common-credentials-ipmi-password">
                                <span class="pf-c-form__label-text">IPMI 비밀번호</span>
                                <span class="pf-c-form__label-required" aria-hidden="true">&#42;</span>
                            </label>
                        </div>
                        <div class="pf-c-form__group-control">
                            <input class="pf-c-form-control" style="width:70%" type="password" autocomplete="off" id="form-input-common-credentials-ipmi-password" name="form-input-common-credentials-ipmi-password-check" placeholder="비밀번호를 입력하세요." required />
                        </div>
                    </div>
                </div>
            </div>
    `;

    credentials.insertAdjacentHTML('beforeend',common_credentials_HTML);

    }

}
/**
 * Meathod Name : createAccordion
 * Date Created : 2024.12.19
 * Writer  : 정민철
 * Description : 호스트 수에 따른 IPMI 자격 증명, 페일오버 클러스터 등 동적 화면(설정 확인)
 * Parameter : 없음
 * Return  : 없음
 * History  : 2024.12.19 최초 작성
 */
function createAccordion(type, hostCount, ipmiCheckVal) {
    // Get the existing container by ID
    let accordionContainer;
    let expandedContentId;
    let toggleText_name;
    let toggleButton_name;

    if (type == "ipmi") {
        accordionContainer = document.getElementById("div-accordion-cloud-ipmi");
        toggleText_name = "IPMI 정보";
        expandedContentId = "div-accordion-cloud-vm-ipmi";
        toggleButton_name = "button-accordion-cloud-vm-ipmi";
    } else if (type == "failover") {
        accordionContainer = document.getElementById("div-accordion-cloud-failover-cluster");
        toggleText_name = "장애조치 클러스터 설정";
        expandedContentId = "div-accordion-cloud-vm-failover-cluster";
        toggleButton_name = "button-accordion-cloud-vm-failover-cluster";
    }

    // Clear existing content to avoid duplication
    accordionContainer.innerHTML = "";

    // Create toggle button
    const toggleButton = document.createElement("button");
    toggleButton.className = "pf-c-accordion__toggle";
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.id = toggleButton_name;

    const toggleText = document.createElement("span");
    toggleText.className = "pf-c-accordion__toggle-text";
    toggleText.innerText = toggleText_name;

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "pf-c-accordion__toggle-icon";
    toggleIcon.innerHTML = '<i class="fas fa-angle-right" aria-hidden="true"></i>';

    toggleButton.appendChild(toggleText);
    toggleButton.appendChild(toggleIcon);

    // Append toggle button
    const heading = document.createElement("h3");
    heading.appendChild(toggleButton);
    accordionContainer.appendChild(heading);

    // Create expanded content
    const expandedContent = document.createElement("div");
    expandedContent.className = "pf-c-accordion__expanded-content";
    expandedContent.id = expandedContentId;
    expandedContent.style.display = "none"; // 기본적으로 닫힌 상태

    const expandedBody = document.createElement("div");
    expandedBody.className = "pf-c-accordion__expanded-content-body";

    const descriptionList = document.createElement("dl");
    descriptionList.className = "pf-c-description-list pf-m-horizontal";
    descriptionList.style = "--pf-c-description-list--RowGap: 10px; margin-left: 10px;";

    // Add 'IPMI 구성 준비' group
    if (type == "ipmi"){
        descriptionList.appendChild(createDescriptionGroup("IPMI 구성 준비", ""));

        // Add host-specific IPMI groups
        for (let i = 1; i <= hostCount; i++) {
            const hostGroup = createDescriptionGroup(
                `${i}번 호스트`,
                `
                IPMI IP: <span id="span-cloud-vm-ipmi-ip${i}"></span><br/>
                <span id="span-cloud-vm-ipmi-user${i}"></span><br/>
                <span id="span-cloud-vm-ipmi-password${i}"></span>
                `
            );
            descriptionList.appendChild(hostGroup);
        }

        // Add '모든 호스트 자격 증명' group
        const commonGroup = createDescriptionGroup(
            "모든 호스트 자격 증명",
            `
            IPMI 아이디: <span id="span-cloud-vm-ipmi-user"></span><br/>
            IPMI 비밀번호: <span id="span-cloud-vm-ipmi-password"></span>
            `
        );
        commonGroup.id = "accordion-common-ipmi";
        commonGroup.style.display = "none";
        descriptionList.appendChild(commonGroup);
    } else if (type == "failover"){
        descriptionList.appendChild(createDescriptionGroup("클러스터 멤버 수", hostCount));

        // Add host-specific IPMI groups
        for (let i = 1; i <= hostCount; i++) {
            const hostGroup = createDescriptionGroup(
                `PCS 호스트 #${i}`,
                `PN IP : <span id="span-cloud-vm-failover-cluster-host${i}-name"></span><br/>`
            );
            descriptionList.appendChild(hostGroup);
        }
    }

    expandedBody.appendChild(descriptionList);
    expandedContent.appendChild(expandedBody);
    accordionContainer.appendChild(expandedContent);

    // Update spans with IPMI values
    updateSpans(type, hostCount, ipmiCheckVal);
}

function createDescriptionGroup(title, contentHtml) {
    const group = document.createElement("div");
    group.className = "pf-c-description-list__group";

    const term = document.createElement("dt");
    term.className = "pf-c-description-list__term";
    term.innerHTML = `<span class="pf-c-description-list__text">${title}</span>`;

    const description = document.createElement("dd");
    description.className = "pf-c-description-list__description";

    const textContainer = document.createElement("div");
    textContainer.className = "pf-c-description-list__text";
    textContainer.innerHTML = contentHtml;

    description.appendChild(textContainer);
    group.appendChild(term);
    group.appendChild(description);

    return group;
}

function updateSpans(type, hostCount, ipmiCheckVal) {
    if (type == "ipmi"){
        if (ipmiCheckVal === "individual") {
            $('#accordion-common-ipmi').hide();
            for (let i = 1; i <= hostCount; i++) {
                $(`#span-cloud-vm-ipmi-ip${i}`).text($(`#form-input-individual-credentials-ipmi-ip${i}`).val());
                $(`#span-cloud-vm-ipmi-user${i}`).html("IPMI 아이디: " + $(`#form-input-individual-credentials-ipmi-user${i}`).val() + "<br/>");
                $(`#span-cloud-vm-ipmi-password${i}`).text("IPMI 비밀번호: " + $(`#form-input-individual-credentials-ipmi-password${i}`).val());
            }
        } else {
            $('#accordion-common-ipmi').show();
            for (let i = 1; i <= hostCount; i++) {
                $(`#span-cloud-vm-ipmi-ip${i}`).text($(`#form-input-common-credentials-ipmi-ip${i}`).val());
            }
            $('#span-cloud-vm-ipmi-user').text($('#form-input-common-credentials-ipmi-user').val());
            $('#span-cloud-vm-ipmi-password').text($('#form-input-common-credentials-ipmi-password').val());
        }
    } else if (type == "failover"){
            for (let i = 1; i <= hostCount; i++) {
                $(`#span-cloud-vm-failover-cluster-host${i}-name`).text($(`#form-input-cloud-vm-failover-cluster-host${i}-name`).val());
            }
        }

}
