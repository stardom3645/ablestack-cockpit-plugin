/** CCVM VM restore modal actions */

const ccvmRestoreScript = pluginpath + "/python/backup/ccvm_backup.py";
const ccvmRestoreListCachePrefix = "ccvm_backup_list_cache:";

let selectedRestorePath = "";
let selectedRestoreName = "";

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function (char) {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function deriveCreatedTime(name) {
  const match = /(\d{8})_(\d{6})/.exec(name || "");
  if (!match) {
    return "";
  }
  const date = match[1];
  const time = match[2];
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
}

function setRestoreLoading(isLoading) {
  $("#ccvm-vm-restore-list-loading").toggle(!!isLoading);
}

function showRestoreEmpty(message) {
  $("#ccvm-vm-restore-empty-text").text(message || "백업 파일이 없습니다.");
  $("#ccvm-vm-restore-list-empty").show();
  $("#ccvm-vm-restore-table-wrapper").hide();
}

function showRestoreTable() {
  $("#ccvm-vm-restore-list-empty").hide();
  $("#ccvm-vm-restore-table-wrapper").show();
}

function setRestoreButtonEnabled(enabled) {
  const $btn = $("#ccvm-vm-restore-button-execution");
  $btn.prop("disabled", !enabled);
  $btn.attr("aria-disabled", enabled ? "false" : "true");
  $btn.toggleClass("pf-m-disabled", !enabled);
}

function showSpinner(headerText, bodyHtml) {
  $("#div-modal-spinner-header-txt").text(headerText || "");
  $("#div-modal-spinner-body-txt").html(bodyHtml || "");
  $("#div-modal-spinner").show();
}

function hideSpinner() {
  $("#div-modal-spinner").hide();
}

function showStatusAlert(title, bodyHtml) {
  $("#modal-status-alert-title").html(title || "");
  $("#modal-status-alert-body").html(bodyHtml || "");
  $("#div-modal-status-alert").show();
}

function renderRestoreList(items) {
  const $tbody = $("#ccvm-vm-restore-table-body");
  $tbody.empty();
  selectedRestorePath = "";
  selectedRestoreName = "";
  setRestoreButtonEnabled(false);

  if (!items || items.length === 0) {
    showRestoreEmpty("백업 파일이 없습니다.");
    return;
  }

  showRestoreTable();

  items.forEach((item, index) => {
    const name = item.name || "";
    const path = item.path || "";
    const size = item.size_human || "-";
    const created = deriveCreatedTime(name) || item.created_time || item.mtime || item.mtime_display || "-";
    const completed = item.completed_time || item.completed_display || "-";
    const radioId = `ccvm-restore-select-${index}`;

    const row = `
      <tr>
        <td data-label="선택">
          <input type="radio" name="ccvm-restore-select" id="${radioId}" value="${escapeHtml(path)}" data-name="${escapeHtml(name)}">
        </td>
        <td data-label="파일명">
          <label for="${radioId}" class="ccvm-restore-cell" style="font-family: monospace;">${escapeHtml(name)}</label>
        </td>
        <td data-label="생성 시각">
          <span class="ccvm-restore-cell ccvm-restore-time" title="${escapeHtml(created)}">${escapeHtml(created)}</span>
        </td>
        <td data-label="완료 시각">
          <span class="ccvm-restore-cell ccvm-restore-time" title="${escapeHtml(completed)}">${escapeHtml(completed)}</span>
        </td>
        <td data-label="크기">
          <span class="ccvm-restore-cell">${escapeHtml(size)}</span>
        </td>
      </tr>
    `;
    $tbody.append(row);
  });
}

function readRestoreCache(targetDir) {
  const key = `${ccvmRestoreListCachePrefix}${targetDir || "default"}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed.items ? parsed.items : null;
  } catch (e) {
    return null;
  }
}

function writeRestoreCache(targetDir, items) {
  const key = `${ccvmRestoreListCachePrefix}${targetDir || "default"}`;
  try {
    sessionStorage.setItem(key, JSON.stringify({ items: items, ts: Date.now() }));
  } catch (e) {
    // ignore cache errors
  }
}

function loadRestoreList() {
  const targetDir = sessionStorage.getItem("ccvm_backup_target_dir") || "";
  const cached = readRestoreCache(targetDir);
  if (cached) {
    renderRestoreList(cached);
    setRestoreLoading(false);
  } else {
    setRestoreLoading(true);
    showRestoreTable();
  }

  const cmd = ["/usr/bin/python3", "-B", ccvmRestoreScript, "list"];
  if (targetDir) {
    cmd.push("--target-dir", targetDir);
  }
  console.log(cmd);

  cockpit
    .spawn(cmd)
    .then(function (data) {
      let retVal;
      try {
        retVal = JSON.parse(data);
      } catch (e) {
        setRestoreLoading(false);
        showRestoreEmpty("백업 목록을 해석하지 못했습니다.");
        return;
      }

      if (retVal.code !== 200) {
        setRestoreLoading(false);
        showRestoreEmpty(retVal.val || "백업 목록을 불러오지 못했습니다.");
        return;
      }

      renderRestoreList(retVal.val);
      writeRestoreCache(targetDir, retVal.val);
      setRestoreLoading(false);
    })
    .catch(function () {
      setRestoreLoading(false);
      showRestoreEmpty("백업 목록을 불러오지 못했습니다.");
    });
}

$(document).on("change", "input[name='ccvm-restore-select']", function () {
  const $selected = $("input[name='ccvm-restore-select']:checked");
  selectedRestorePath = $selected.val() || "";
  selectedRestoreName = $selected.data("name") || "";
  setRestoreButtonEnabled(!!selectedRestorePath);
});

$(document).on("click", "#ccvm-vm-restore-button-execution", function () {
  if (!selectedRestorePath) {
    showStatusAlert("클라우드센터 복구 실패", "복구할 백업 파일을 선택해 주세요.");
    return;
  }

  const confirmText = `선택한 백업 파일로 복구를 진행합니다.\n${selectedRestoreName}\n계속 진행하시겠습니까?`;
  if (!window.confirm(confirmText)) {
    return;
  }

  $("#div-modal-ccvm-restore").hide();
  $("#ccvm-vm-restore-div-modal-cloud-vm-restore").hide();

  showSpinner("클라우드센터 복구를 진행 중입니다.", `대상 파일: ${escapeHtml(selectedRestorePath)}`);

  const cmd = ["/usr/bin/python3", "-B", ccvmRestoreScript, "restore", "--target-file", selectedRestorePath];
  console.log(cmd);
  cockpit
    .spawn(cmd)
    .then(function (data) {
      let retVal;
      try {
        retVal = JSON.parse(data);
      } catch (e) {
        hideSpinner();
        showStatusAlert("클라우드센터 복구 실패", "복구 응답을 해석하지 못했습니다.");
        $("#div-modal-ccvm-restore").show();
        $("#ccvm-vm-restore-div-modal-cloud-vm-restore").show();
        return;
      }

      hideSpinner();
      if (retVal.code !== 200) {
        showStatusAlert("클라우드센터 복구 실패", retVal.val || "복구를 실패했습니다.");
        $("#div-modal-ccvm-restore").show();
        $("#ccvm-vm-restore-div-modal-cloud-vm-restore").show();
        return;
      }

      showStatusAlert("클라우드센터 복구 완료", "복구를 완료했습니다. ccvm을 시작해 주세요.");
    })
    .catch(function () {
      hideSpinner();
      showStatusAlert("클라우드센터 복구 실패", "복구를 실패했습니다.");
      $("#div-modal-ccvm-restore").show();
      $("#ccvm-vm-restore-div-modal-cloud-vm-restore").show();
    });
});

$(document).on("click", "#button-cloud-vm-restore", function () {
  loadRestoreList();
});

$(document).on("click", "#ccvm-vm-restore-button-refresh", function () {
  loadRestoreList();
});
