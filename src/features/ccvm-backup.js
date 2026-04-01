/** CCVM VM backup modal actions */

const ccvmBackupDir = "/mnt/glue-gfs/backup/ccvm";
const ccvmBackupScript = pluginpath + "/python/backup/ccvm_backup.py";
const ccvmBackupStatusPollIntervalMs = 3000;
const ccvmBackupStatusMaxPolls = 200;

let ccvmBackupStatusInterval = null;
let ccvmBackupStatusPollCount = 0;
let ccvmBackupStatusSeenActive = false;
let ccvmBackupInProgress = false;
let ccvmBackupTargetFile = "";

function setBackupButtonState(isBusy) {
  const $btn = $("#ccvm-vm-backup-button-execution-modal-cloud-vm-dump");
  $btn.prop("disabled", isBusy);
  $btn.toggleClass("pf-m-disabled", isBusy);
  $btn.attr("aria-disabled", isBusy ? "true" : "false");
  $btn.text(isBusy ? "백업 진행 중..." : "백업 시작");
}

function setScheduleMessage(message, isError) {
  const $message = $("#ccvm-vm-backup-schedule-message");
  $message.text(message || "");
  if (isError) {
    $message.css("color", "var(--pf-t--global--color--status--danger--default)");
  } else {
    $message.css("color", "");
  }
}

function setDeleteMessage(message, isError) {
  const $message = $("#ccvm-vm-backup-delete-message");
  $message.text(message || "");
  if (isError) {
    $message.css("color", "var(--pf-t--global--color--status--danger--default)");
  } else {
    $message.css("color", "");
  }
}

function setScheduleEnabled(enabled) {
  $("#ccvm-vm-backup-select-repeat").prop("disabled", !enabled);
  $("#ccvm-vm-backup-input-schedule-time").prop("disabled", !enabled);
  $("#ccvm-vm-backup-input-schedule-minute").prop("disabled", !enabled);
  $("#ccvm-vm-backup-select-schedule-day").prop("disabled", !enabled);
  $("#ccvm-vm-backup-select-schedule-month").prop("disabled", !enabled);
}

function setDeleteEnabled(enabled) {
  $("#ccvm-vm-backup-input-retention-months").prop("disabled", !enabled);
  $("#ccvm-vm-backup-select-delete-repeat").prop("disabled", !enabled);
  $("#ccvm-vm-backup-select-delete-day").prop("disabled", !enabled);
  $("#ccvm-vm-backup-input-delete-time").prop("disabled", !enabled);
}

function normalizeTimeInput(value) {
  const trimmed = String(value || "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

function normalizeMinuteInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const hourRaw = match[1];
  const minuteRaw = match[2];
  const hour = parseInt(hourRaw, 10);
  const minute = minuteRaw !== undefined ? parseInt(minuteRaw, 10) : parseInt(hourRaw, 10);
  if (Number.isNaN(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (minuteRaw !== undefined && minute === 0 && !Number.isNaN(hour) && hour >= 0 && hour <= 59) {
    return String(hour).padStart(2, "0");
  }
  return String(minute).padStart(2, "0");
}

function detachScheduleTimepicker() {
  let $input = $("#ccvm-vm-backup-input-schedule-time");
  if ($.fn.timepicker && $input.hasClass("ui-timepicker-input")) {
    try {
      $input.timepicker("remove");
    } catch (e) {
      // ignore
    }
    try {
      $input.timepicker("destroy");
    } catch (e) {
      // ignore
    }
  }
  if ($input.hasClass("ui-timepicker-input")) {
    const $clone = $input.clone(false);
    $clone.removeClass("ui-timepicker-input");
    $input.replaceWith($clone);
    $input = $clone;
  }
  return $input;
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

function showSpinner(headerText, bodyHtml) {
  $("#div-modal-spinner-header-txt").text(headerText || "");
  $("#div-modal-spinner-body-txt").html(bodyHtml || "");
  $("#div-modal-spinner").show();
}

function hideSpinner() {
  $("#div-modal-spinner").hide();
}

function updateSpinnerBody(lines) {
  if (!lines || lines.length === 0) {
    $("#div-modal-spinner-body-txt").html("");
    return;
  }
  const blankIndex = lines.indexOf("");
  const headerLines = blankIndex >= 0 ? lines.slice(0, blankIndex) : lines.slice(0);
  const bodyLines = blankIndex >= 0 ? lines.slice(blankIndex + 1) : [];

  let html = "";
  if (headerLines.length > 0) {
    html += `<div style="text-align: left;">${headerLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>`;
  }
  if (bodyLines.length > 0) {
    html += `<div style="height: 10px;"></div>`;
    html += `<div style="text-align: center;">${bodyLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>`;
  }
  $("#div-modal-spinner-body-txt").html(html);
}

function showStatusAlert(title, bodyHtml) {
  $("#modal-status-alert-title").html(title || "");
  $("#modal-status-alert-body").html(bodyHtml || "");
  $("#div-modal-status-alert").show();
}

function clearBackupStatusInterval() {
  if (ccvmBackupStatusInterval) {
    clearInterval(ccvmBackupStatusInterval);
    ccvmBackupStatusInterval = null;
  }
}

function buildStatusLines(payload, targetDir, targetFile) {
  const lines = [];
  if (targetDir) {
    lines.push(`대상 경로: ${targetDir}`);
  }
  if (targetFile) {
    lines.push(`대상 파일: ${targetFile}`);
  }
  if ((payload && payload.fields && Object.keys(payload.fields).length > 0) || (payload && payload.message)) {
    lines.push("");
  }
  if (payload && payload.fields) {
    Object.entries(payload.fields).forEach(([key, value]) => {
      lines.push(`${key}: ${value}`);
    });
  }
  if (payload && payload.message) {
    lines.push(payload.message);
  }
  return lines;
}

function finishBackupSuccess(targetFile) {
  clearBackupStatusInterval();
  ccvmBackupInProgress = false;
  setBackupButtonState(false);
  hideSpinner();
  const detail = targetFile ? `<br/>대상 파일: ${escapeHtml(targetFile)}` : "";
  showStatusAlert("클라우드센터 백업 완료", `백업을 완료했습니다.${detail}`);
}

function finishBackupFailure(message) {
  clearBackupStatusInterval();
  ccvmBackupInProgress = false;
  setBackupButtonState(false);
  hideSpinner();
  showStatusAlert("클라우드센터 백업 실패", escapeHtml(message || "백업을 실패했습니다."));
  $("#div-modal-ccvm-backup").show();
}

function pollBackupStatus(targetDir, targetFile) {
  ccvmBackupStatusPollCount += 1;
  if (ccvmBackupStatusPollCount > ccvmBackupStatusMaxPolls) {
    finishBackupFailure("백업 상태 확인 시간이 초과되었습니다.");
    return;
  }

  const statusCmd = ["/usr/bin/python3", "-B", ccvmBackupScript, "status"];
  console.log(statusCmd);
  cockpit
    .spawn(statusCmd)
    .then(function (data) {
      let retVal;
      try {
        retVal = JSON.parse(data);
      } catch (e) {
        updateSpinnerBody([
          "백업 상태를 해석하지 못했습니다.",
          "잠시 후 다시 시도합니다.",
        ]);
        return;
      }

      if (retVal.code !== 200) {
        updateSpinnerBody([
          retVal.val || "백업 상태를 확인하지 못했습니다.",
          "잠시 후 다시 시도합니다.",
        ]);
        return;
      }

      const payload = retVal.val || {};
      if (payload.active) {
        ccvmBackupStatusSeenActive = true;
        updateSpinnerBody(buildStatusLines(payload, targetDir, targetFile));
        return;
      }

      if (ccvmBackupStatusSeenActive || ccvmBackupStatusPollCount > 2) {
        finishBackupSuccess(targetFile);
      }
    })
    .catch(function () {
      updateSpinnerBody([
        "백업 상태를 확인하지 못했습니다.",
        "잠시 후 다시 시도합니다.",
      ]);
    });
}

function startBackupStatusPolling(targetDir, targetFile) {
  ccvmBackupStatusPollCount = 0;
  ccvmBackupStatusSeenActive = false;
  clearBackupStatusInterval();
  pollBackupStatus(targetDir, targetFile);
  ccvmBackupStatusInterval = setInterval(function () {
    pollBackupStatus(targetDir, targetFile);
  }, ccvmBackupStatusPollIntervalMs);
}

function updateScheduleFields() {
  const repeat = $("#ccvm-vm-backup-select-repeat").val();
  const $timeInput = $("#ccvm-vm-backup-input-schedule-time");
  const $minuteInput = $("#ccvm-vm-backup-input-schedule-minute");
  const $timeHelp = $("#ccvm-vm-backup-schedule-time-help");
  $("#ccvm-vm-backup-schedule-day-group").hide();
  $("#ccvm-vm-backup-schedule-month-group").hide();

  if (repeat === "monthly") {
    $("#ccvm-vm-backup-schedule-day-group").show();
  } else if (repeat === "yearly") {
    $("#ccvm-vm-backup-schedule-day-group").show();
    $("#ccvm-vm-backup-schedule-month-group").show();
  }

  if (repeat === "hourly") {
    detachScheduleTimepicker();
    $timeHelp.text("시간 반복은 분(0~59)만 입력합니다. 예: 30 → 매시간 30분에 실행");
    $timeInput.hide();
    $minuteInput.show();
    $minuteInput.attr("placeholder", "MM");
    $minuteInput.attr("inputmode", "numeric");
    const minuteOnly = normalizeMinuteInput($minuteInput.val() || $timeInput.val());
    if (minuteOnly !== null) {
      $minuteInput.val(minuteOnly);
    }
  } else {
    $timeHelp.text("예: 09:30");
    $timeInput.attr("placeholder", "HH:MM");
    $timeInput.attr("inputmode", "numeric");
    $timeInput.attr("maxlength", "5");
    $minuteInput.hide();
    $timeInput.show();
    if ($.fn.timepicker && !$timeInput.hasClass("ui-timepicker-input")) {
      $timeInput.timepicker({ timeFormat: "H:mm", step: 30 });
    }
    const normalized = normalizeTimeInput($timeInput.val());
    if (normalized) {
      $timeInput.val(normalized);
    } else if (!$timeInput.val()) {
      $timeInput.val("00:00");
    }
  }
}

function updateDeleteFields() {
  const repeat = $("#ccvm-vm-backup-select-delete-repeat").val();
  if (repeat === "monthly") {
    $("#ccvm-vm-backup-delete-day-group").show();
  } else {
    $("#ccvm-vm-backup-delete-day-group").hide();
  }
}

function applySchedule() {
  const enabled = $("#ccvm-vm-backup-switch-schedule").is(":checked");
  if (!enabled) {
    const cmd = ["/usr/bin/python3", "-B", ccvmBackupScript, "unschedule"];
    console.log(cmd);
    return cockpit
      .spawn(cmd)
      .then(function (data) {
        const retVal = JSON.parse(data);
        if (retVal.code !== 200) {
          setScheduleMessage(retVal.val || "정기 백업 비활성화 실패", true);
          return;
        }
        setScheduleMessage("정기 백업이 비활성화되었습니다.", false);
      })
      .catch(function () {
        setScheduleMessage("정기 백업 비활성화 실패", true);
      });
  }

  const repeat = $("#ccvm-vm-backup-select-repeat").val();
  const timeRaw = repeat === "hourly"
    ? $("#ccvm-vm-backup-input-schedule-minute").val()
    : $("#ccvm-vm-backup-input-schedule-time").val();
  let time = null;
  if (repeat === "hourly") {
    const minuteOnly = normalizeMinuteInput(timeRaw);
    if (minuteOnly === null) {
      setScheduleMessage("시간 반복은 분(0~59)만 입력해 주세요. (예: 30)", true);
      return;
    }
    time = `00:${minuteOnly}`;
    $("#ccvm-vm-backup-input-schedule-minute").val(minuteOnly);
  } else {
    time = normalizeTimeInput(timeRaw);
    if (!time) {
      setScheduleMessage("실행 시간 형식이 올바르지 않습니다. (예: 09:30)", true);
      return;
    }
  }
  const day = $("#ccvm-vm-backup-select-schedule-day").val();
  const month = $("#ccvm-vm-backup-select-schedule-month").val();
  const targetDir = String($("#ccvm-vm-backup-target-dir").val() || "").trim();
  if (targetDir && !targetDir.startsWith("/")) {
    setScheduleMessage("백업 경로는 절대 경로여야 합니다.", true);
    return;
  }

  const cmd = ["/usr/bin/python3", "-B", ccvmBackupScript, "schedule", "--repeat", repeat, "--time", time];
  if (repeat === "monthly" || repeat === "yearly") {
    cmd.push("--day", day);
  }
  if (repeat === "yearly") {
    cmd.push("--month", month);
  }
  if (targetDir) {
    cmd.push("--target-dir", targetDir);
  }

  console.log(cmd);
  setScheduleMessage("정기 백업 설정 중입니다.", false);
  return cockpit
    .spawn(cmd)
    .then(function (data) {
      const retVal = JSON.parse(data);
      if (retVal.code !== 200) {
        setScheduleMessage(retVal.val || "정기 백업 설정 실패", true);
        return;
      }
      setScheduleMessage("정기 백업 설정되었습니다.", false);
    })
    .catch(function () {
      setScheduleMessage("정기 백업 설정 실패", true);
    });
}

function applyDeleteSchedule() {
  const enabled = $("#ccvm-vm-backup-switch-delete").is(":checked");
  if (!enabled) {
    const cmd = ["/usr/bin/python3", "-B", ccvmBackupScript, "unschedule-delete"];
    console.log(cmd);
    return cockpit
      .spawn(cmd)
      .then(function (data) {
        const retVal = JSON.parse(data);
        if (retVal.code !== 200) {
          setDeleteMessage(retVal.val || "삭제 관리 비활성화 실패", true);
          return;
        }
        setDeleteMessage("삭제 관리가 비활성화되었습니다.", false);
      })
      .catch(function () {
        setDeleteMessage("삭제 관리 비활성화 실패", true);
      });
  }

  const repeat = $("#ccvm-vm-backup-select-delete-repeat").val();
  const timeRaw = $("#ccvm-vm-backup-input-delete-time").val();
  const time = normalizeTimeInput(timeRaw);
  if (!time) {
    setDeleteMessage("실행 시간 형식이 올바르지 않습니다. (예: 09:30)", true);
    return;
  }
  const day = $("#ccvm-vm-backup-select-delete-day").val();
  const retentionMonths = $("#ccvm-vm-backup-input-retention-months").val();
  const targetDir = String($("#ccvm-vm-backup-target-dir").val() || "").trim();
  if (targetDir && !targetDir.startsWith("/")) {
    setDeleteMessage("백업 경로는 절대 경로여야 합니다.", true);
    return;
  }

  const cmd = [
    "/usr/bin/python3",
    "-B",
    ccvmBackupScript,
    "schedule-delete",
    "--repeat",
    repeat,
    "--time",
    time,
    "--retain-months",
    retentionMonths,
  ];
  if (repeat === "monthly") {
    cmd.push("--day", day);
  }
  if (targetDir) {
    cmd.push("--target-dir", targetDir);
  }

  console.log(cmd);
  setDeleteMessage("삭제 관리 설정 중입니다.", false);
  return cockpit
    .spawn(cmd)
    .then(function (data) {
      const retVal = JSON.parse(data);
      if (retVal.code !== 200) {
        setDeleteMessage(retVal.val || "삭제 관리 설정 실패", true);
        return;
      }
      setDeleteMessage("삭제 관리가 설정되었습니다.", false);
    })
    .catch(function () {
      setDeleteMessage("삭제 관리 설정 실패", true);
    });
}

$(function () {
  const storedDir = sessionStorage.getItem("ccvm_backup_target_dir");
  $("#ccvm-vm-backup-target-dir").val(storedDir || ccvmBackupDir);
  if ($.fn.timepicker) {
    $("#ccvm-vm-backup-input-schedule-time").timepicker({
      timeFormat: "H:mm",
      step: 30,
    });
    $("#ccvm-vm-backup-input-delete-time").timepicker({
      timeFormat: "H:mm",
      step: 30,
    });
  }
  setScheduleEnabled(false);
  setDeleteEnabled(false);
  updateScheduleFields();
  updateDeleteFields();
});

$("#ccvm-vm-backup-button-execution-modal-cloud-vm-dump").on("click", function () {
  if (ccvmBackupInProgress) {
    return;
  }

  const targetDir = String($("#ccvm-vm-backup-target-dir").val() || "").trim();
  if (!targetDir) {
    showStatusAlert("클라우드센터 백업 실패", "백업 경로를 입력해 주세요.");
    return;
  }
  if (!targetDir.startsWith("/")) {
    showStatusAlert("클라우드센터 백업 실패", "백업 경로는 절대 경로여야 합니다.");
    return;
  }

  sessionStorage.setItem("ccvm_backup_target_dir", targetDir);
  ccvmBackupInProgress = true;
  setBackupButtonState(true);
  $("#div-modal-ccvm-backup").hide();
  showSpinner("클라우드센터 백업을 시작합니다.", "백업 요청 중입니다...");

  const cmd = ["/usr/bin/python3", "-B", ccvmBackupScript, "backup", "--target-dir", targetDir];
  console.log(cmd);

  cockpit
    .spawn(cmd)
    .then(function (data) {
      let retVal;
      try {
        retVal = JSON.parse(data);
      } catch (e) {
        finishBackupFailure("백업 응답을 해석하지 못했습니다.");
        return;
      }
      if (retVal.code !== 200) {
        finishBackupFailure(retVal.val || "백업을 실패했습니다.");
        return;
      }

      ccvmBackupTargetFile = retVal.val && retVal.val.target_file ? retVal.val.target_file : "";
      showSpinner("클라우드센터 백업 진행 중입니다.", "백업 상태를 확인하는 중입니다...");
      startBackupStatusPolling(targetDir, ccvmBackupTargetFile);
    })
    .catch(function (error) {
      finishBackupFailure(error || "백업을 실패했습니다.");
    });
});

$("#ccvm-vm-backup-select-repeat").on("change", function () {
  updateScheduleFields();
});

$("#ccvm-vm-backup-select-delete-repeat").on("change", function () {
  updateDeleteFields();
});

$("#ccvm-vm-backup-switch-schedule").on("change", function () {
  const enabled = $(this).is(":checked");
  setScheduleEnabled(enabled);
  updateScheduleFields();
  if (!enabled) {
    setScheduleMessage("", false);
  }
});

$("#ccvm-vm-backup-switch-delete").on("change", function () {
  const enabled = $(this).is(":checked");
  setDeleteEnabled(enabled);
  updateDeleteFields();
  if (!enabled) {
    setDeleteMessage("", false);
  }
});

$("#ccvm-vm-backup-button-apply-schedule").on("click", function () {
  applySchedule();
});

$("#ccvm-vm-backup-button-apply-delete").on("click", function () {
  applyDeleteSchedule();
});

$("#ccvm-vm-backup-button-cancel-modal-cloud-vm-dump, #ccvm-vm-backup-button-close-modal-cloud-vm-dump").on(
  "click",
  function () {
    if (!ccvmBackupInProgress) {
      setBackupButtonState(false);
    }
  }
);
