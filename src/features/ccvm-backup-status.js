/** CCVM VM backup status modal actions */

const ccvmBackupStatusScript = pluginpath + "/python/backup/ccvm_backup.py";
const ccvmBackupOverviewCachePrefix = "ccvm_backup_overview_cache:";

function setBackupStatusLoading(isLoading) {
  $("#ccvm-vm-backup-status-loading").toggle(!!isLoading);
  $("#ccvm-vm-backup-status-content").toggle(!isLoading);
}

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

function renderSummaryRows($tbody, rows) {
  $tbody.empty();
  rows.forEach(([label, value]) => {
    const row = `
      <tr>
        <th scope="row">${escapeHtml(label)}</th>
        <td>${escapeHtml(value || "-")}</td>
      </tr>
    `;
    $tbody.append(row);
  });
}

function renderScheduleInfo(info) {
  const $message = $("#ccvm-vm-backup-status-schedule-message");
  const $tbody = $("#ccvm-vm-backup-status-schedule-body");
  const active = !!(info && info.active);
  const message = info && info.message ? info.message : (active ? "정기 백업이 설정되어 있습니다." : "정기 백업이 비활성화되어 있습니다.");
  $message.text(message);

  renderSummaryRows($tbody, [
    ["상태", active ? "활성화" : "비활성화"],
    ["반복", info && info.repeat_label ? info.repeat_label : "-"],
    ["실행 시간", info && info.time_label ? info.time_label : "-"],
    ["일자", info && info.day_label ? info.day_label : "-"],
    ["월", info && info.month_label ? info.month_label : "-"],
  ]);
}

function renderDeleteInfo(info) {
  const $message = $("#ccvm-vm-backup-status-delete-message");
  const $tbody = $("#ccvm-vm-backup-status-delete-body");
  const active = !!(info && info.active);
  const message = info && info.message ? info.message : (active ? "삭제 관리가 설정되어 있습니다." : "삭제 관리가 비활성화되어 있습니다.");
  $message.text(message);

  const retentionLabel = info && info.retention_label
    ? info.retention_label
    : (info && info.retention_months ? `${info.retention_months}개월` : "-");

  renderSummaryRows($tbody, [
    ["상태", active ? "활성화" : "비활성화"],
    ["보관 기간", retentionLabel],
    ["삭제 주기", info && info.repeat_label ? info.repeat_label : "-"],
    ["실행 시간", info && info.time_label ? info.time_label : "-"],
    ["일자", info && info.day_label ? info.day_label : "-"],
  ]);
}

function renderBackupList(items, message, targetDir) {
  const $tbody = $("#ccvm-vm-backup-status-files-body");
  const $empty = $("#ccvm-vm-backup-status-files-empty");
  const $emptyText = $("#ccvm-vm-backup-status-files-empty-text");
  const $wrapper = $("#ccvm-vm-backup-status-files-table-wrapper");
  const $target = $("#ccvm-vm-backup-status-target-dir");

  $tbody.empty();
  $target.text(targetDir ? `대상 경로: ${targetDir}` : "");

  if (!items || items.length === 0) {
    $emptyText.text(message || "백업 파일이 없습니다.");
    $empty.show();
    $wrapper.hide();
    return;
  }

  $empty.hide();
  $wrapper.show();

  items.forEach((item) => {
    const name = item.name || "";
    const size = item.size_human || "-";
    const created = deriveCreatedTime(name) || item.created_time || item.mtime || item.mtime_display || "-";
    const completed = item.completed_time || item.completed_display || "-";
    const row = `
      <tr>
        <td data-label="파일명">
          <span class="ccvm-backup-status-cell ccvm-backup-status-cell-wrap" style="font-family: monospace;">${escapeHtml(name)}</span>
        </td>
        <td data-label="생성 시각">
          <span class="ccvm-backup-status-cell ccvm-backup-status-time" title="${escapeHtml(created)}">${escapeHtml(created)}</span>
        </td>
        <td data-label="완료 시각">
          <span class="ccvm-backup-status-cell ccvm-backup-status-time" title="${escapeHtml(completed)}">${escapeHtml(completed)}</span>
        </td>
        <td data-label="크기">
          <span class="ccvm-backup-status-cell">${escapeHtml(size)}</span>
        </td>
      </tr>
    `;
    $tbody.append(row);
  });
}

function renderError(message) {
  const safeMessage = message || "백업 상태를 확인하지 못했습니다.";
  renderScheduleInfo({ active: false, message: safeMessage });
  renderDeleteInfo({ active: false, message: safeMessage });
  renderBackupList([], safeMessage, "");
}

function renderBackupOverview(payload) {
  if (!payload) {
    renderError();
    return;
  }

  renderScheduleInfo(payload.schedule || null);
  renderDeleteInfo(payload.delete || null);
  renderBackupList(payload.backups || [], payload.backups_message || "", payload.target_dir || "");
}

function readOverviewCache(targetDir) {
  const key = `${ccvmBackupOverviewCachePrefix}${targetDir || "default"}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed.payload ? parsed.payload : null;
  } catch (e) {
    return null;
  }
}

function writeOverviewCache(targetDir, payload) {
  const key = `${ccvmBackupOverviewCachePrefix}${targetDir || "default"}`;
  try {
    sessionStorage.setItem(key, JSON.stringify({ payload: payload, ts: Date.now() }));
  } catch (e) {
    // ignore cache errors
  }
}

function loadBackupStatus() {
  const targetDir = sessionStorage.getItem("ccvm_backup_target_dir") || "";
  const cached = readOverviewCache(targetDir);
  if (cached) {
    renderBackupOverview(cached);
    setBackupStatusLoading(false);
  } else {
    setBackupStatusLoading(true);
  }

  const cmd = ["/usr/bin/python3", "-B", ccvmBackupStatusScript, "overview"];
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
        setBackupStatusLoading(false);
        renderError("백업 상태를 해석하지 못했습니다.");
        return;
      }

      if (!retVal || retVal.code !== 200) {
        setBackupStatusLoading(false);
        renderError(retVal && retVal.val ? retVal.val : "백업 상태를 확인하지 못했습니다.");
        return;
      }

      renderBackupOverview(retVal.val);
      writeOverviewCache(targetDir, retVal.val);
      setBackupStatusLoading(false);
    })
    .catch(function () {
      setBackupStatusLoading(false);
      renderError("백업 상태를 확인하지 못했습니다.");
    });
}

window.loadCcvmBackupStatus = loadBackupStatus;
