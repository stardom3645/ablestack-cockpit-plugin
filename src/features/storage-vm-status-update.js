/**
 * File Name : storage-vm-status-update.js
 * Date Created : 2020.03.17
 * Writer : 최진성
 * Description : 스토리지센터 가상머신 상태 변경시 발생하는 이벤트 처리를 위한 JavaScript
**/
// 닫기 이벤트 처리
$('#button-close1, #button-close2').on('click', function(){
  $('#div-modal-storage-vm-status-update').hide();
});

function getCockpitHttpsUrl() {
  var targetUrl = window.location.href;

  try {
    var url = new URL(window.location.href);
    url.protocol = "https:";
    url.port = "19100";
    targetUrl = url.toString();
  } catch (error) {
    targetUrl = "https://" + window.location.hostname + ":19100";
  }

  return targetUrl;
}

function reconnectCockpitHttps() {
  var targetUrl = getCockpitHttpsUrl();

  if (targetUrl == window.location.href) {
    location.reload();
    return;
  }

  window.location.replace(targetUrl);
}

function waitForCockpitHttpsAndReconnect() {
  var targetUrl = getCockpitHttpsUrl();
  var maxAttempts = 20;
  var intervalMs = 3000;
  var attempts = 0;
  var linkHtml = '<a href="' + targetUrl + '" target="_self">Cockpit 19100 포트로 접속</a>';

  function updateWaitingMessage() {
    $('#div-modal-spinner-header-txt').html(
      '전체 Cockpit HTTPS/19100 전환 작업이 진행 중입니다.<br/>' +
      'Cockpit 접속 가능 여부를 확인하고 있으며, 준비되면 자동 이동합니다.<br/>' +
      '다른 작업을 실행하지 말고 기다려 주세요.<br/>' +
      linkHtml
    );
  }

  function updateManualMessage() {
    $('#div-modal-spinner-header-txt').html(
      'Cockpit HTTPS/19100 전환 작업이 백그라운드에서 진행 중이거나 완료 확인이 지연되고 있습니다.<br/>' +
      '자동 이동되지 않으면 아래 링크로 직접 접속해 주세요.<br/>' +
      linkHtml
    );
  }

  function checkCockpitHttps() {
    attempts++;
    updateWaitingMessage();

    fetch(targetUrl, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    })
      .then(function(){
        reconnectCockpitHttps();
      })
      .catch(function(){
        if(attempts < maxAttempts){
          setTimeout(checkCockpitHttps, intervalMs);
        }else{
          updateManualMessage();
        }
      });
  }

  setTimeout(checkCockpitHttps, intervalMs);
}

function showCockpitHttpsFailed(error) {
  $('#div-modal-spinner').hide();
  $("#modal-status-alert-title").html("Cube Cockpit HTTPS 적용 예약 실패");
  $("#modal-status-alert-body").html("클라우드센터 구성은 완료되었지만 Cube Cockpit HTTPS/19100 후속 적용 작업 예약에 실패했습니다.<br/>ccvm에서 /var/log/cloud_install.log 를 확인해주세요.");
  $('#div-modal-status-alert').show();
  createLoggerInfo("schedule_cockpit_https_deploy.sh Error");
  console.log("schedule_cockpit_https_deploy.sh Error : " + error);
}

// 실행 버튼 클릭 이벤트
$('#button-storage-vm-status-update').on('click', function(){
  $('#dropdown-menu-storage-vm-status').toggle();
  $('#div-modal-storage-vm-status-update').hide();
  $('#div-modal-spinner-header-txt').text('스토리지센터 가상머신 상태 변경중입니다.');
  $('#div-modal-spinner').show();
  createLoggerInfo("button-storage-vm-status-update click");

  var cmd = $('#scvm-status-update-cmd').val();
  if(cmd == "stop"){//스토리지센터VM 정지 버튼 클릭시
    cockpit.spawn(["python3", pluginpath+"/python/scvm_status/scvm_status_update.py", "stop" ])
    .then(function(data){
      //console.log(data);
      var retVal = JSON.parse(data);
      if(retVal.code == "200"){
        console.log(data);
        location.reload();
      }else{
        createLoggerInfo(":::scvm stop Error:::");
        console.log(":::scvm stop Error::: "+ data);
      }
    })
    .catch(function(data){
      createLoggerInfo(":::scvm stop Error:::");
      console.log(":::scvm stop Error::: " + data);
        });
    }else if(cmd == "start"){//스토리지센터VM 시작 버튼 클릭시
        cockpit.spawn(["python3", pluginpath+"/python/scvm_status/scvm_status_update.py", "start" ])
        .then(function(data){
            //console.log(data);
            var retVal = JSON.parse(data);
            if(retVal.code == "200"){
                console.log(data);
                location.reload();
            }else{
                createLoggerInfo(":::scvm start Error:::");
                console.log(":::scvm start Error::: "+ data);
            }
        })
        .catch(function(data){
            createLoggerInfo(":::scvm delete Error:::");
            console.log(":::scvm delete Error::: "+data);
        });
    }else if(cmd == "delete"){//스토리지센터VM 삭제 버튼 클릭시
        cockpit.spawn(["python3", pluginpath+"/python/scvm_status/scvm_status_update.py", "delete" ])
        .then(function(data){
            //console.log(data);
            var retVal = JSON.parse(data);
            if(retVal.code == "200"){
                //scvm bootstrap 프로퍼티 초기화
                cockpit.spawn(["python3", pluginpath+"/python/ablestack_json/ablestackJson.py", "update", "--depth1", "bootstrap", "--depth2", "scvm", "--value", "false"])
                .then(function(data){
                    createLoggerInfo("Success in initializing ablestackJson's scvm setting to false");
                    console.log("Success in initializing ablestackJson's scvm setting to false");
                })
                .catch(function(err){
                    createLoggerInfo("Error in initializing ablestackJson's scvm setting to false");
                    console.log("Error in initializing ablestackJson's scvm setting to false : " + err);
                });
                console.log(data);
                location.reload();
            }else{
                createLoggerInfo(":::scvm delete Error:::");
                console.log(":::scvm delete Error::: "+ data);
            }
        })
        .catch(function(data){
            createLoggerInfo(":::scvm delete Error:::");
            console.log(":::scvm delete Error:::"+data);
        });
    }else if(cmd == "bootstrap"){//SCC bootstrap실행 버튼 클릭시
        $('#div-modal-spinner-header-txt').text('스토리지센터를 구성하고 있습니다.');
        // /root/bootstrap.sh 파일을 실행함.
        cockpit.spawn(["sh", pluginpath+"/shell/host/bootstrap_run.sh","scvm"])
        .then(function(data){
            console.log(data);
            location.reload();
        })
        .catch(function(data){
            createLoggerInfo("bootstrap_run_check() Error");
            console.log("bootstrap_run_check() Error : " + data);
        });
    }else if(cmd == "bootstrap_ccvm"){//CCC bootstrap실행 버튼 클릭시
        $('#div-modal-spinner-header-txt').text('클라우드센터를 구성하고 있습니다.');
        // /root/bootstrap.sh 파일을 실행함.
        var license_type = sessionStorage.getItem("license_type");
        cockpit.spawn(["sh", pluginpath+"/shell/host/bootstrap_run.sh","ccvm", license_type])
            .then(function(data){
                console.log(data);
                $('#div-modal-spinner-header-txt').html('클라우드센터 구성이 완료되었습니다.<br/>이제 전체 Cockpit HTTPS/19100 전환 작업을 시작합니다.<br/>잠시 후 Cockpit 연결이 끊기고 19100 포트로 자동 재접속됩니다.');
                cockpit.spawn(["sh", pluginpath+"/shell/host/schedule_cockpit_https_deploy.sh", "10"], { host: "ccvm" })
                    .then(function(scheduleData){
                        console.log(scheduleData);
                        var retVal = JSON.parse(scheduleData);

                        if(retVal.code == 200){
                            waitForCockpitHttpsAndReconnect();
                        }else{
                            showCockpitHttpsFailed(scheduleData);
                        }
                    })
                    .catch(function(scheduleError){
                        showCockpitHttpsFailed(scheduleError);
                    });
            })
            .catch(function(data){
                createLoggerInfo("bootstrap_run_check() Error");
                console.log("bootstrap_run_check() Error : " + data);
            });
    }
    $('#scvm-status-update-cmd').val("");
});
