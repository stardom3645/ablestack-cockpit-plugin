/**
 * File Name : index.js
 * Date Created : 2023.04.25
 * Writer : 배태주
 * Description : index.html에서 출력할 메인 페이지를 분기하는 스크립트
 **/

const cockpitDarkClasses = [
  "pf-v6-theme-dark",
  "pf-v5-theme-dark",
  "pf-theme-dark",
  "theme-dark",
  "pf-m-dark"
];

function getParentDocument() {
  try {
    if (window.parent && window.parent !== window) {
      return window.parent.document;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function hasDarkTheme(doc) {
  if (!doc) {
    return false;
  }
  const roots = [doc.documentElement, doc.body].filter(Boolean);
  for (const root of roots) {
    for (const cls of cockpitDarkClasses) {
      if (root.classList.contains(cls)) {
        return true;
      }
    }
    const dataTheme = root.getAttribute && root.getAttribute("data-theme");
    if (dataTheme && dataTheme.toLowerCase() === "dark") {
      return true;
    }
  }
  return false;
}

function applyThemeFromCockpit() {
  const parentDoc = getParentDocument();
  if (parentDoc) {
    document.documentElement.classList.toggle("pf-v6-theme-dark", hasDarkTheme(parentDoc));
    return;
  }
  if (hasDarkTheme(document)) {
    document.documentElement.classList.add("pf-v6-theme-dark");
    return;
  }
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("pf-v6-theme-dark");
  } else {
    document.documentElement.classList.remove("pf-v6-theme-dark");
  }
}

function observeThemeChanges() {
  const parentDoc = getParentDocument();
  const target = parentDoc ? parentDoc.documentElement || parentDoc.body : document.documentElement;
  if (!target || typeof MutationObserver === "undefined") {
    return;
  }
  const observer = new MutationObserver(function () {
    applyThemeFromCockpit();
  });
  observer.observe(target, { attributes: true, attributeFilter: ["class", "data-theme"] });
}

// document.ready 영역 시작
$(document).ready(function(){
  applyThemeFromCockpit();
  observeThemeChanges();

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
 * Writer : 정민철
 * Description : 운영 체재를 sessionstroage에 저장하는 함수
 * History : 2024.09.11 수정
 */
function checkOSType() {
  return new Promise(function (resolve) {
    sessionStorage.clear();
    cockpit.file('/usr/share/cockpit/ablestack/tools/properties/cluster.json').read().then(function(data) {
      let retVal = JSON.parse(data);
      sessionStorage.setItem('os_type', retVal.clusterConfig.type);
      sessionStorage.setItem("iscsi_check", retVal.clusterConfig.iscsi_storage);
      console.log(sessionStorage.getItem('os_type'));
      resolve();
    });
  });
}
