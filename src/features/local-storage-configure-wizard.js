/**
 * File Name : local-storage-configure-wizard.js
 * Date Created : 2025.07.17
 * Writer : 정민철
 * Description : 로컬 스토리지 구성 마법사에서 발생하는 이벤트 처리를 위한 JavaScript
**/

// 변수 선언
var cur_step_wizard_local_config = "1";
var completed = false;
var os_type = sessionStorage.getItem("os_type");

// Document.ready 시작
$(document).ready(function(){
  // 로컬 스토리지 구성 마법사 페이지 준비
  $('#div-modal-wizard-local-disk-configure').hide();
  $('#div-modal-wizard-local-nfs-size').hide();
  $('#div-modal-wizard-local-review').hide();
  $('#div-modal-wizard-local-deploy').hide();
  $('#div-modal-wizard-local-finish').hide();

  $('#div-accordion-local-disk').attr('hidden', true).hide();
  $('#div-accordion-local-nfs-size').attr('hidden', true).hide();

  // $('#nav-button-local-review').addClass('pf-m-disabled');
  $('#nav-button-local-finish').addClass('pf-m-disabled');

  $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', true);
  $('#button-cancel-config-modal-local-storage-wizard-config').attr('disabled', false);

  // 첫번째 스텝에서 시작
  cur_step_wizard_local_config = "1";

  //디스크 구성방식 초기 세팅
  setLocalDiskInfo();

});
// document ready 끝
$('#button-close-modal-local-storage-wizard-confirm, #button-cancel-modal-local-storage-wizard-confirm').on('click', function(){
  $('#div-modal-local-storage-wizard-confirm').hide();
});
// 이벤트 처리 함수
$('#button-close-modal-wizard-local').on('click', function(){
  $('#div-modal-wizard-local-storage-configure').hide();
  if(completed){
    //상태값 초기화 겸 페이지 리로드
    location.reload();
  }
});

// '다음' 버튼 클릭 시 이벤트를 처리하기 위한 함수
$('#button-next-step-modal-local-storage-wizard-config').on('click', function(){
  if (cur_step_wizard_local_config == "1") {
    setLocalDiskInfo();

    $('#div-modal-wizard-local-overview').hide();
    $('#div-modal-wizard-local-disk-configure').show();
    $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', false);
    $('#nav-button-local-overview').removeClass('pf-m-current');
    $('#nav-button-local-disk-configure').addClass('pf-m-current');

    cur_step_wizard_local_config = "2";
  }
  else if (cur_step_wizard_local_config == "2") {

    if(validateLocalStorage()){
      $('#div-modal-wizard-local-disk-configure').hide();
      $('#div-modal-wizard-local-review').show();
      $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
      $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', false);
      $('#nav-button-local-disk-configure').removeClass('pf-m-current');
      $('#nav-button-local-review').addClass('pf-m-current');
      $('#button-next-step-modal-local-storage-wizard-config').html('배포');
    }else{
      $('#div-modal-wizard-local-disk-configure').hide();
      $('#div-modal-wizard-local-review').show();
      $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', true);
      $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', false);
      $('#nav-button-local-disk-configure').removeClass('pf-m-current');
      $('#nav-button-local-review').addClass('pf-m-current');

    }

    setLocalReviewInfo();

    cur_step_wizard_local_config = "3";

  }else if (cur_step_wizard_local_config == "3"){
    $('#div-modal-local-storage-wizard-confirm').show();
  }

});

// '이전' 버튼 클릭 시 이벤트를 처리하기 위한 함수
$('#button-before-step-modal-local-storage-wizard-config').on('click', function(){
  if (cur_step_wizard_local_config == "1") {
    // 이전 버튼 없음
  }
  else if (cur_step_wizard_local_config == "2") {
    // 1번 스텝으로 이동
    $('#div-modal-wizard-local-overview').show();
    $('#div-modal-wizard-local-disk-configure').hide();
    $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
    $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', true);
    $('#nav-button-local-overview').addClass('pf-m-current');
    $('#nav-button-local-disk-configure').removeClass('pf-m-current');

    // 1번으로 변수값 변경
    cur_step_wizard_local_config = "1";
  }
  else if (cur_step_wizard_local_config == "3"){
    $('#div-modal-wizard-local-disk-configure').show();
    $('#div-modal-wizard-local-review').hide();
    $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', false);
    $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
    $('#nav-button-local-review').removeClass('pf-m-current');
    $('#nav-button-local-disk-configure').addClass('pf-m-current');

    $('#button-next-step-modal-local-storage-wizard-config').html('다음');

    cur_step_wizard_local_config = "2";
  }

});

$('#nav-button-local-overview').on('click', function(){
  localhideAllMainBody();
  localresetCurrentMode();

  $('#div-modal-wizard-local-overview').show();
  $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', true);
  $('#nav-button-local-overview').addClass('pf-m-current');

  cur_step_wizard_local_config = "1";
});



$('#nav-button-local-disk-configure').on('click', function(){
  localhideAllMainBody();
  localresetCurrentMode();

  $('#div-modal-wizard-local-disk-configure').show();
  $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#nav-button-local-disk-configure').addClass('pf-m-current');

  cur_step_wizard_local_config = "2";
});

$('#nav-button-local-review').on('click', function(){
  localhideAllMainBody();
  localresetCurrentMode();

  validateLocalStorage();
  // review 정보 세팅
  setLocalReviewInfo();

  $('#div-modal-wizard-local-review').show();
  $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#nav-button-local-review').addClass('pf-m-current');

  $('#button-next-step-modal-local-storage-wizard-config').html('배포');

  cur_step_wizard_local_config = "3";
});

$('#nav-button-local-finish').on('click', function(){
  localhideAllMainBody();
  localresetCurrentMode();

  $('#div-modal-wizard-local-finish').show();
  $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', false);
  $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', true);
  $('#nav-button-local-finish').addClass('pf-m-current');

  $('#button-next-step-modal-local-storage-wizard-config').hide();
  $('#button-before-step-modal-local-storage-wizard-config').hide();
  $('#button-cancel-config-modal-local-storage-wizard-config').hide();

  cur_step_wizard_local_config = "4";
});

// 설정확인 단계의 아코디언 개체에서 발생하는 이벤트의 처리

$('#button-accordion-local-disk').on('click', function(){
  if ($('#button-accordion-local-disk').attr("aria-expanded") == "false") {
    $('#button-accordion-local-disk').attr("aria-expanded", "true");
    $('#button-accordion-local-disk').addClass("pf-m-expanded");
    $('#div-accordion-local-disk').removeAttr('hidden').fadeIn();
    $('#div-accordion-local-disk').addClass("pf-m-expanded");
    $('#div-accordion-local-disk').closest('.pf-v6-c-accordion__item').addClass("pf-m-expanded");
  }
  else {
    $('#button-accordion-local-disk').attr("aria-expanded", "false");
    $('#button-accordion-local-disk').removeClass("pf-m-expanded");
    $('#div-accordion-local-disk').attr('hidden', true).fadeOut();
    $('#div-accordion-local-disk').removeClass("pf-m-expanded");
    $('#div-accordion-local-disk').closest('.pf-v6-c-accordion__item').removeClass("pf-m-expanded");
  }
});

// 마법사 "배포 실행 버튼 모달창"
$('#button-close-modal-wizard-local, #button-cancel-config-modal-wizard-local-config').on('click', function () {
  $('#div-modal-local-storage-wizard-confirm').hide();
});


// 마법사 "배포 버튼 모달창" 실행 버튼을 눌러 로컬 스토리지 구성
$('#button-execution-modal-local-storage-wizard-confirm').on('click', function () {
  localhideAllMainBody();
  localresetCurrentMode();

  $('#div-modal-local-storage-wizard-confirm').hide();
  $('#div-modal-wizard-local-deploy').show();
  $('#button-next-step-modal-local-storage-wizard-config').attr('disabled', true);
  $('#button-before-step-modal-local-storage-wizard-config').attr('disabled', true);

  $('#nav-button-local-finish').addClass('pf-m-current');

  cur_step_wizard_local_config = "5";

  deployLocalStorage();


});

// 마법사 "취소 버튼 모달창" show, hide
$('#button-cancel-config-modal-local-storage-wizard-config').on('click', function () {
  $('#div-modal-cancel-local-storage-wizard-cancel').show();
});
$('#button-cancel-modal-local-storage-wizard-confirm').on('click', function () {
  $('#div-modal-cancel-local-storage-wizard-cancel').show();
});
$('#button-close-modal-local-storage-wizard-cancel, #button-cancel-modal-local-storage-wizard-cancel').on('click', function () {
  $('#div-modal-cancel-local-storage-wizard-cancel').hide();
});

// 마법사 "취소 버튼 모달창" 실행 버튼을 눌러 취소를 실행
$('#button-execution-modal-storage-wizard-cancel').on('click', function () {
  //상태값 초기화 겸 페이지 리로드
  location.reload();
});

$('#button-execution-modal-local-storage-wizard-cancel').on('click', function(){
  //상태값 초기화 겸 페이지 리로드
  location.reload();
})
/**
 * Meathod Name : localhideAllMainBody
 * Date Created : 2025.07.23
 * Writer : 정민철
 * Description : 마법사 대화상자의 모든 Main Body Division 숨기기
 * Parameter : 없음
 * Return : 없음
 * History : 2025.07.23 최초 작성
 */
function localhideAllMainBody() {
  $('#div-modal-wizard-local-overview').hide();
  $('#div-modal-wizard-local-disk-configure').hide();
  $('#div-modal-wizard-local-review').hide();
  $('#div-modal-wizard-local-deploy').hide();
  $('#div-modal-wizard-local-finish').hide();

  $('#button-next-step-modal-local-storage-wizard-config').html('다음');
}

/**
 * Meathod Name : localresetCurrentMode
 * Date Created : 2025.07.23
 * Writer : 정민철
 * Description : 마법사 대화상자의 측면 버튼의 '현재 위치'를 모두 리셋
 * Parameter : 없음
 * Return : 없음
 * History : 2025.07.23 최초 작성
 */
function localresetCurrentMode() {
  $('#nav-button-local-overview').removeClass('pf-m-current');
  $('#nav-button-local-disk-configure').removeClass('pf-m-current');
  $('#nav-button-local-review').removeClass('pf-m-current');
  $('#nav-button-local-finish').removeClass('pf-m-current');
}

/**
 * Meathod Name : deployLocalStorage
 * Date Created : 2025.07.23
 * Writer : 정민철
 * Description : 가상머신을 배포하는 작업을 화면에 표시하도록 하는 함수
 * Parameter : 없음
 * Return : 없음
 * History : 2025.07.23 최초 작성
 * History : 2025.03.17 기능 구현
 */
function deployLocalStorage() {
  // 하단 버튼 숨김
  $('#button-next-step-modal-local-storage-wizard-config').hide();
  $('#button-before-step-modal-local-storage-wizard-config').hide();
  $('#button-cancel-config-modal-local-storage-wizard-config').hide();

  // 왼쪽 사이드 버튼 전부 비활성화
  $('#nav-button-local-overview').addClass('pf-m-disabled');
  $('#nav-button-local-disk-configure').addClass('pf-m-disabled');
  $('#nav-button-local-review').addClass('pf-m-disabled');

  createLoggerInfo("deployLocalStorage start");

  setLocalProgressStep("span-local-progress-step1",1);
  var disks = $('input[type=checkbox][name="form-local-storage-checkbox-disk"]:checked').val();
  //=========== 1. 로로컬 스토리지 초기화 및 파티션 구조 설계와 논리 볼륨 구성 ===========
  // 설정 초기화 ( 필요시 python까지 종료 )
  var cmd = ['python3', pluginpath + '/python/local/local_manage.py', '--reset', '--disks', disks];
  console.log(cmd);
  cockpit.spawn(cmd).then(function(data) {
    var retVal = JSON.parse(data);
    if (retVal.code == 200){
      setLocalProgressStep("span-local-progress-step1",2);
      setLocalProgressStep("span-local-progress-step2",1);
      cmd = ['python3', pluginpath + '/python/local/local_manage.py', '--create-local-disk', '--disks', disks]
      console.log(cmd);
      cockpit.spawn(cmd).then(function(data) {
        var retVal = JSON.parse(data);
        if (retVal.code == 200){
          // 로컬 스토리지 파티션 생성 및 논리 볼륨 생성 성공
          cmd = ['python3', pluginpath + '/python/ablestack_json/ablestackJson.py', "update", "--depth1", "bootstrap", "--depth2", "local_configure", "--value","true"]
          cockpit.spawn(cmd)

          setLocalProgressStep("span-local-progress-step2",2);
          showDivisionLocalConfigFinish();
        }else{
          alert("스토리지 구성 설정 중 오류가 발생했습니다.");
          setLocalProgressFail(2);
          console.log("Error during storage configuration and NFS setup. Please check the storage mount and NFS service status.");
        }
      }).catch(function() {
        alert("스토리지 구성 설정 중 오류가 발생했습니다.");
        setLocalProgressFail(2);
        console.log("Error during storage configuration and NFS setup. Please check the storage mount and NFS service status.");
      });
    }else{
      alert("로컬 스토리지 파티션 생성 및 논리 볼륨 생성 중 오류가 발생했습니다.");
      setLocalProgressFail(1);
      console.log("Error during local storage partitioning and volume creation. Please check the local disk status.");
    }
  }).catch(function() {
    alert("로컬 스토리지 파티션 생성 및 논리 볼륨 생성 중 오류가 발생했습니다.");
    setLocalProgressFail(1);
    console.log("Error during local storage partitioning and volume creation. Please check the local disk status.");
  });

}

/**
 * Meathod Name : showDivisionLocalConfigFinish
 * Date Created : 2025.07.23
 * Writer : 정민철
 * Description : 가상머신을 배포한 후 마지막 페이지를 보여주는 함수
 * Parameter : 없음
 * Return : 없음
 * History : 2025.07.23 최초 작성
 */
function showDivisionLocalConfigFinish() {
  localhideAllMainBody();
  localresetCurrentMode();

  $('#div-modal-wizard-local-finish').show();
  $('#nav-button-local-finish').addClass('pf-m-current');
  $('#nav-button-local-finish').removeClass('pf-m-disabled');

  $('#button-next-step-modal-local-storage-wizard-config').text("완료");

  $('#button-next-step-modal-local-storage-wizard-config').hide();
  $('#button-before-step-modal-local-storage-wizard-config').hide();
  $('#button-cancel-config-modal-local-storage-wizard-config').hide();

  completed = true;

  cur_step_wizard_local_config = "5";
}


/**
 * Meathod Name : setLocalReviewInfo
 * Date Created : 2025.07.17
 * Writer : 정민철
 * Description : 설정확인을 위한 정보를 세팅하는 기능
 * Parameter : 없음
 * Return : 없음
 * History : 2025.07.17 최초 작성
 */
function setLocalReviewInfo(){

  var local_disk = $('input[type=checkbox][name="form-local-storage-checkbox-disk"]:checked').val();

  $('#span-local-disk').text(local_disk);
}

/**
 * Meathod Name : validateLocalStorage
 * Date Created : 2025.07.23
 * Writer : 정민철
 * Description : 스토리지 센터 가상머신 생성 전 입력받은 값의 유효성 검사
 * Parameter : 없음
 * Return : 없음
 * History : 2025.07.23 최초 작성
 */
function validateLocalStorage() {
    var validate_check = true;
    var local_disk = $('input[type=checkbox][name="form-local-storage-checkbox-disk"]:checked').val();

    if (local_disk == "") {
      validate_check = false;
      alert("로컬 디스크를 선택해주세요.");
    }
    return validate_check;
}

/**
 * Meathod Name : setLocalProgressFail
 * Date Created : 2025.07.23
 * Writer : 정민철
 * Description : 로컬 스토리지 구성 진행중 실패 단계에 따른 중단됨 UI 처리
 * Parameter : setp_num
 * Return : 없음
 * History : 2025.07.23 최초 작성
 */
 function setLocalProgressFail(setp_num){
  if( setp_num == 1 || setp_num == '1' ){  // 1단계 이하 단계 전부 중단된 처리
    seScvmProgressStep("span-local-progress-step1",3);
    seScvmProgressStep("span-local-progress-step2",3);
    seScvmProgressStep("span-local-progress-step3",3);
    seScvmProgressStep("span-local-progress-step4",3);
  } else if(setp_num == 2 || setp_num == '2') {  // 2단계 이하 단계 전부 중단된 처리
    seScvmProgressStep("span-local-progress-step2",3);
    seScvmProgressStep("span-local-progress-step3",3);
    seScvmProgressStep("span-local-progress-step4",3);
  } else if(setp_num == 3 || setp_num == '3') {  // 3단계 이하 단계 전부 중단된 처리
    seScvmProgressStep("span-local-progress-step3",3);
  }
}
function setLocalDiskInfo(){
  var cmd = ["python3", pluginpath + "/python/disk/disk_action.py", "gfs-list"];

  createLoggerInfo("setDiskInfo() start");

  cockpit.spawn(cmd).then(function(data) {
    // 초기화
    $('#disk-local-storage-pci-list').empty();

    var el = '';
    var multipathElements = ''; // MultiPath 정보를 저장할 변수
    var result = JSON.parse(data);
    var pci_list = result.val.blockdevices;

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

              partition_text = '( Partition exists count : ' + pci_list[i].children.length + ' )';
              check_disable = 'disabled';

              var disk_name = pci_list[i].name;
              if (!displayedName.has(disk_name)) {
                el += '<div class="pf-v6-c-check">';
                el += '<input class="pf-v6-c-check__input" type="checkbox" id="form-local-storage-checkbox-disk' + i + '" name="form-local-storage-checkbox-disk" value="' + pci_list[i].path + '" ' + check_disable + ' />';
                // el += '<input class="pf-v6-c-check__input" type="checkbox" id="form-local-storage-checkbox-disk' + i + '" name="form-local-storage-checkbox-disk" value="' + pci_list[i].path + '" />';
                el += '<label class="pf-v6-c-check__label" style="margin-top:5px" for="form-local-storage-checkbox-disk' + i + '">' + pci_list[i].path + ' ' + pci_list[i].state + ' (' + pci_list[i].tran + ') ' + pci_list[i].size + ' ' + pci_list[i].model + ' ' + pci_list[i].wwn + partition_text + '</label>';
                el += '</div>';

                displayedName.add(disk_name);
              }
          }
        } else {
          if (!pci_list[i].wwn) {
            pci_list[i].wwn = ""; // 값을 공백으로 설정
          }
          el += '<div class="pf-v6-c-check">';
          el += '<input class="pf-v6-c-check__input" type="checkbox" id="form-local-storage-checkbox-disk' + i + '" name="form-local-storage-checkbox-disk" value="' + pci_list[i].path + '" ' + check_disable + ' />';
          // el += '<input class="pf-v6-c-check__input" type="checkbox" id="form-local-storage-checkbox-disk' + i + '" name="form-local-storage-checkbox-disk" value="' + pci_list[i].path + '" />';
          el += '<label class="pf-v6-c-check__label" style="margin-top:5px" for="form-local-storage-checkbox-disk' + i + '">' + pci_list[i].path + ' ' + pci_list[i].state + ' (' + pci_list[i].tran + ') ' + pci_list[i].size + ' ' + pci_list[i].model + ' ' + pci_list[i].wwn + partition_text + '</label>';
          el += '</div>';
        }
      }
    } else {
      el += '<div class="pf-v6-c-check">';
      el += '<label class="pf-v6-c-check__label" style="margin-top:5px">데이터가 존재하지 않습니다.</label>';
      el += '</div>';
    }

    // 일반 장치 정보를 먼저 추가하고, 마지막에 MultiPath 정보를 추가
    $('#disk-local-storage-pci-list').append(multipathElements + el);

  }).catch(function() {
    createLoggerInfo("setDiskInfo error");
  });
}
