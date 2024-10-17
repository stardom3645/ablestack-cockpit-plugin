/**
 * File Name : index.js
 * Date Created : 2023.04.25
 * Writer  : 배태주
 * Description : index.html에서 출력할 메인 페이지를 분기하는 스크립트
 **/

// document.ready 영역 시작
$(document).ready(function(){
    cockpit.script(["hostname"])
    .then(function (hostname) {
        if (hostname.includes("scvm")) {
            cockpit.script(["whoami"])
            .then(function (whoami) {
                if(whoami.includes("root")){
                    $('#index-page').load("main-glue.html");
                }else{
                    $('#index-page').load("main-glue-no-permission.html");
                }
            })
        } else {
            $('#index-page').load("main.html");
        }
    })
    .catch(function (error) {
        $('#index-page').load("main.html");
    });

    checkOSType();
});

/**
 * Meathod Name : checkOSType
 * Date Created : 2024.09.11
 * Writer  : 정민철
 * Description : 운영 체재를 sessionstroage에 저장하는 함수
 * History  : 2024.09.11 수정
 */
function checkOSType() {
    return new Promise(function (resolve) {
        sessionStorage.clear();
        cockpit.file('/usr/share/cockpit/ablestack/tools/properties/cluster.json').read().then(function(data) {
            let retVal = JSON.parse(data);
            sessionStorage.setItem('os_type', retVal.clusterConfig.type);
            console.log(sessionStorage.getItem('os_type'));
            resolve();
        });
    });
}