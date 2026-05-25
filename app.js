// =============================================
// 統合版 案件管理ツール - app.js
// 対応支店：名古屋・札幌・仙台
// =============================================

const TASKS = [
  "01 商談中",
  "02 概算見積もり（参考価格書）提出",
  "03 導入環境確認（仮想／NW環境含む）",
  "04 仕入れ見積もり取得",
  "05 最終見積提出",
  "06 カスタマーサクセス打合せ",
  "07 受注",
  "08 社内キックオフ",
  "09 システム構築準備期間",
  "10 稼働（立会等）",
  "11 稼働後フォロー",
];

// 支店マスターデータ
const BRANCHES = {
  nagoya: {
    label: "名古屋支店",
    collection: "nagoya_projects",
    color: "#1a5cb8",
    staff: ["滝澤 充", "田中 美春", "齋藤 茂樹", "西尾 駿志", "萬代 さくら", "小澤 聖也", "本間 陸", "その他"],
  },
  sapporo: {
    label: "札幌支店",
    collection: "sapporo_projects",
    color: "#0077b6",
    staff: ["山田 翼", "常国 広平", "河島 俊", "篠川 陽一", "吉川 練", "その他"],
  },
  sendai: {
    label: "仙台支店",
    collection: "sendai_projects",
    color: "#2d6a4f",
    staff: ["村田 祐基", "弓掛 年晃", "福島 義規", "宮川 知己", "小坂 冬喜", "関堂 崇", "その他"],
  },
};

const DELETE_PASSWORD = "0000";

let currentBranch = "nagoya";
let allProjects = [];
let searchQuery = "";
let filterPerson = "";
let unsubscribe = null;

// =============================================
// 支店切り替え
// =============================================
function switchBranch(branchKey) {
  currentBranch = branchKey;
  const branch = BRANCHES[branchKey];

  // ヘッダーカラー変更
  document.querySelector(".app-header").style.background =
    `linear-gradient(135deg, ${branch.color} 0%, ${adjustColor(branch.color, -20)} 100%)`;

  // 一覧ページリンクにbranch引数付与
  document.getElementById("listViewBtn").href = `list.html?branch=${branchKey}`;

  // スタッフフィルター更新
  updateStaffFilter();

  // Firestoreリスナー再設定
  initFirestore();

  // localStorage に保存
  localStorage.setItem("selectedBranch", branchKey);
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// =============================================
// 遅延判定
// =============================================
function checkDelay(project) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const live = new Date(project.goLiveDate);
  const daysUntilLive = Math.ceil((live - today) / (1000 * 60 * 60 * 24));
  const t = project.currentTask;

  if (t >= TASKS.length) return "completed";
  if (t <= 9 && daysUntilLive < -1) return "warning";
  if (t < 8 && daysUntilLive <= 170) return "delay";
  if (t < 7 && daysUntilLive <= 180) return "delay";
  if (t < 5 && daysUntilLive <= 190) return "delay";
  if (t < 3 && daysUntilLive <= 210) return "delay";
  if (t === 0 && daysUntilLive <= 240) return "warning";
  return "";
}

// =============================================
// カード生成
// =============================================
function createCard(project) {
  const statusClass = checkDelay(project);
  const progress = Math.min(Math.round((project.currentTask / TASKS.length) * 100), 100);
  const isCompleted = project.currentTask >= TASKS.length;
  const currentTaskLabel = isCompleted ? "✅ 全工程完了" : TASKS[project.currentTask];

  const live = new Date(project.goLiveDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilLive = Math.ceil((live - today) / (1000 * 60 * 60 * 24));
  const liveFormatted = project.goLiveDate
    ? live.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "未設定";

  let daysLabel = "";
  if (project.goLiveDate) {
    if (daysUntilLive > 0) daysLabel = `稼働まで ${daysUntilLive} 日`;
    else if (daysUntilLive === 0) daysLabel = "稼働日（本日）";
    else daysLabel = `稼働 ${Math.abs(daysUntilLive)} 日経過`;
  }

  let statusBadge = "";
  if (statusClass === "delay")     statusBadge = `<span class="badge badge-delay">遅延</span>`;
  else if (statusClass === "warning")   statusBadge = `<span class="badge badge-warning">注意</span>`;
  else if (statusClass === "completed") statusBadge = `<span class="badge badge-completed">完了</span>`;

  const dots = TASKS.map((_, i) => {
    let cls = "dot";
    if (i < project.currentTask) cls += " dot-done";
    else if (i === project.currentTask && !isCompleted) cls += " dot-current";
    return `<span class="${cls}" title="${TASKS[i]}"></span>`;
  }).join("");

  return `
    <div class="project-card ${statusClass}" data-id="${project.id}">
      <div class="card-header">
        <div class="card-title-row">
          <h3 class="hospital-name">${escapeHtml(project.hospitalName)}</h3>
          <div class="card-badges">${statusBadge}</div>
        </div>
        <div class="card-meta">
          <span class="meta-item">📅 稼働予定：${liveFormatted}</span>
          ${daysLabel ? `<span class="meta-days ${daysUntilLive < 0 ? 'days-past' : ''}">${daysLabel}</span>` : ""}
        </div>
        <div class="card-staff">
          <span class="staff-tag main">M：${escapeHtml(project.mainPerson || "未設定")}</span>
          <span class="staff-tag sub">S：${escapeHtml(project.subPerson || "未設定")}</span>
        </div>
      </div>
      <div class="card-progress">
        <div class="progress-header">
          <span class="current-task-label">${currentTaskLabel}</span>
          <span class="progress-pct">${progress}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="progress-dots">${dots}</div>
      </div>
      ${project.memo ? `<div class="card-memo">📝 ${escapeHtml(project.memo)}</div>` : ""}
      <div class="card-actions">
        ${!isCompleted
          ? `<button class="btn btn-next" onclick="advanceTask('${project.id}', ${project.currentTask})">完了 → 次へ</button>`
          : `<button class="btn btn-done" disabled>全工程完了</button>`}
        ${project.currentTask > 0 && !isCompleted
          ? `<button class="btn btn-revert" onclick="revertTask('${project.id}', ${project.currentTask})">← 戻る</button>`
          : ""}
        <button class="btn btn-detail" onclick="openDetailModal('${project.id}')">詳細</button>
        <button class="btn btn-edit" onclick="openEditModal('${project.id}')">編集</button>
        <button class="btn btn-delete" onclick="openDeleteModal('${project.id}')">削除</button>
      </div>
    </div>
  `;
}

// =============================================
// レンダリング
// =============================================
function renderProjects() {
  const container = document.getElementById("projectList");
  const emptyState = document.getElementById("emptyState");

  let filtered = allProjects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchName = p.hospitalName?.toLowerCase().includes(q) ?? false;
    const matchPerson = !filterPerson || p.mainPerson === filterPerson || p.subPerson === filterPerson;
    return matchName && matchPerson;
  });

  const priority = { delay: 0, warning: 1, "": 2, completed: 3 };
  filtered.sort((a, b) => {
    const pa = priority[checkDelay(a)];
    const pb = priority[checkDelay(b)];
    if (pa !== pb) return pa - pb;
    return new Date(a.goLiveDate) - new Date(b.goLiveDate);
  });

  document.getElementById("projectCount").textContent = `${filtered.length} 件`;

  if (filtered.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "flex";
  } else {
    emptyState.style.display = "none";
    container.innerHTML = filtered.map(createCard).join("");
  }
}

// =============================================
// Firestore リアルタイム同期
// =============================================
function initFirestore() {
  if (unsubscribe) unsubscribe();

  const collection = BRANCHES[currentBranch].collection;

  unsubscribe = db.collection(collection)
    .orderBy("goLiveDate", "asc")
    .onSnapshot(
      (snapshot) => {
        allProjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderProjects();
        updateStats();
      },
      (error) => {
        console.error("Firestore error:", error);
        showToast("データ取得に失敗しました", "error");
      }
    );
}

// =============================================
// 統計
// =============================================
function updateStats() {
  document.getElementById("statTotal").textContent     = allProjects.length;
  document.getElementById("statDelay").textContent     = allProjects.filter(p => checkDelay(p) === "delay").length;
  document.getElementById("statWarning").textContent   = allProjects.filter(p => checkDelay(p) === "warning").length;
  document.getElementById("statCompleted").textContent = allProjects.filter(p => checkDelay(p) === "completed").length;
}

// =============================================
// 進捗アドバンス
// =============================================
async function advanceTask(id, currentTask) {
  const nextTask = currentTask + 1;
  if (nextTask > TASKS.length) return;
  const label = nextTask >= TASKS.length ? "全工程完了" : TASKS[nextTask];
  if (!confirm(`現在のタスクを完了にして次へ進みます。\n次：${label}\n\nよろしいですか？`)) return;
  try {
    await db.collection(BRANCHES[currentBranch].collection).doc(id).update({ currentTask: nextTask });
    showToast("進捗を更新しました");
  } catch (e) {
    showToast("更新に失敗しました", "error");
  }
}

async function revertTask(id, currentTask) {
  if (currentTask <= 0) return;
  const prevTask = currentTask - 1;
  if (!confirm(`ひとつ前のタスクに戻します。\n戻り先：${TASKS[prevTask]}\n\nよろしいですか？`)) return;
  try {
    await db.collection(BRANCHES[currentBranch].collection).doc(id).update({ currentTask: prevTask });
    showToast("タスクを戻しました");
  } catch (e) {
    showToast("更新に失敗しました", "error");
  }
}

// =============================================
// 詳細モーダル
// =============================================
function openDetailModal(id) {
  const p = allProjects.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("detailTitle").textContent = p.hospitalName || "施設詳細";
  const rows = [
    ["稼働日（予定含む）", p.goLiveDate],
    ["施設名", p.hospitalName],
    ["メイン担当", p.mainPerson],
    ["経営主体", p.keieiShukai],
    ["許可病床数", p.kyokaBedNum],
    ["病棟構成", p.byokoKosei],
    ["導入病棟", p.donyuByoko],
    ["導入病床数", p.donyuBedNum],
    ["ベッドサイド端末（既存/新規台数）", p.bedsideTerminal],
    ["ステーション端末（既存/新規台数）", p.stationTerminal],
    ["眠りSCAN（既存/新規台数）", p.nemiriScan],
    ["離床CATCH（既存/新規台数）", p.rishoCatch],
    ["Wi-Fiベッドナビ（既存/新規台数）", p.wifiNav],
    ["タブレット設置位置", p.tabletPos],
    ["電子カルテ（ベンダー/機種）", p.electronicKarte],
    ["ナースコール（メーカー/機種）", p.nurseCall],
    ["周辺連携機能", p.shuhenRenkei],
    ["スケジュール状況", p.scheduleStatus],
    ["備考", p.memo],
  ];
  document.getElementById("detailBody").innerHTML = `
    <table class="detail-table"><tbody>
      ${rows.map(([l, v]) => `
        <tr>
          <th>${escapeHtml(l)}</th>
          <td>${v ? escapeHtml(v) : '<span style="color:#9aa5b4">未入力</span>'}</td>
        </tr>`).join("")}
    </tbody></table>`;
  document.getElementById("detailModal").classList.add("open");
}

function closeDetailModal() {
  document.getElementById("detailModal").classList.remove("open");
}

// =============================================
// 案件追加・編集モーダル
// =============================================
function openAddModal() {
  document.getElementById("modalTitle").textContent = `新規案件登録（${BRANCHES[currentBranch].label}）`;
  document.getElementById("projectForm").reset();
  document.getElementById("editProjectId").value = "";
  populateStaffSelects();
  document.getElementById("projectModal").classList.add("open");
}

function openEditModal(id) {
  const p = allProjects.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("modalTitle").textContent = "案件編集";
  document.getElementById("editProjectId").value     = id;
  document.getElementById("formHospitalName").value  = p.hospitalName || "";
  document.getElementById("formGoLiveDate").value    = p.goLiveDate || "";
  document.getElementById("formCurrentTask").value   = p.currentTask ?? 0;
  document.getElementById("formMemo").value          = p.memo || "";
  document.getElementById("formKeieiShukai").value   = p.keieiShukai || "";
  document.getElementById("formKyokaBedNum").value   = p.kyokaBedNum || "";
  document.getElementById("formByokoKosei").value    = p.byokoKosei || "";
  document.getElementById("formDonyuByoko").value    = p.donyuByoko || "";
  document.getElementById("formDonyuBedNum").value   = p.donyuBedNum || "";
  document.getElementById("formBedsideTerminal").value = p.bedsideTerminal || "";
  document.getElementById("formStationTerminal").value  = p.stationTerminal || "";
  document.getElementById("formNemiriScan").value    = p.nemiriScan || "";
  document.getElementById("formRishoCatch").value    = p.rishoCatch || "";
  document.getElementById("formWifiNav").value       = p.wifiNav || "";
  document.getElementById("formTabletPos").value     = p.tabletPos || "";
  document.getElementById("formElectronicKarte").value = p.electronicKarte || "";
  document.getElementById("formNurseCall").value     = p.nurseCall || "";
  document.getElementById("formShuhenRenkei").value  = p.shuhenRenkei || "";
  document.getElementById("formScheduleStatus").value = p.scheduleStatus || "";
  populateStaffSelects();
  document.getElementById("formMainPerson").value = p.mainPerson || "";
  document.getElementById("formSubPerson").value  = p.subPerson || "";
  document.getElementById("projectModal").classList.add("open");
}

function closeModal() {
  document.getElementById("projectModal").classList.remove("open");
}

function populateStaffSelects() {
  const staff = BRANCHES[currentBranch].staff;
  ["formMainPerson", "formSubPerson"].forEach((id) => {
    document.getElementById(id).innerHTML =
      `<option value="">-- 選択してください --</option>` +
      staff.map((s) => `<option value="${s}">${s}</option>`).join("");
  });
}

async function saveProject(e) {
  e.preventDefault();
  const id = document.getElementById("editProjectId").value;
  const data = {
    hospitalName:    document.getElementById("formHospitalName").value.trim(),
    goLiveDate:      document.getElementById("formGoLiveDate").value,
    mainPerson:      document.getElementById("formMainPerson").value,
    subPerson:       document.getElementById("formSubPerson").value,
    memo:            document.getElementById("formMemo").value.trim(),
    currentTask:     parseInt(document.getElementById("formCurrentTask").value) || 0,
    keieiShukai:     document.getElementById("formKeieiShukai").value.trim(),
    kyokaBedNum:     document.getElementById("formKyokaBedNum").value.trim(),
    byokoKosei:      document.getElementById("formByokoKosei").value.trim(),
    donyuByoko:      document.getElementById("formDonyuByoko").value.trim(),
    donyuBedNum:     document.getElementById("formDonyuBedNum").value.trim(),
    bedsideTerminal: document.getElementById("formBedsideTerminal").value.trim(),
    stationTerminal: document.getElementById("formStationTerminal").value.trim(),
    nemiriScan:      document.getElementById("formNemiriScan").value.trim(),
    rishoCatch:      document.getElementById("formRishoCatch").value.trim(),
    wifiNav:         document.getElementById("formWifiNav").value.trim(),
    tabletPos:       document.getElementById("formTabletPos").value.trim(),
    electronicKarte: document.getElementById("formElectronicKarte").value.trim(),
    nurseCall:       document.getElementById("formNurseCall").value.trim(),
    shuhenRenkei:    document.getElementById("formShuhenRenkei").value.trim(),
    scheduleStatus:  document.getElementById("formScheduleStatus").value.trim(),
  };
  if (!data.hospitalName) { showToast("病院名を入力してください", "error"); return; }
  try {
    const col = BRANCHES[currentBranch].collection;
    if (id) {
      await db.collection(col).doc(id).update(data);
      showToast("案件を更新しました");
    } else {
      data.createdAt = new Date().toISOString();
      await db.collection(col).add(data);
      showToast("案件を登録しました");
    }
    closeModal();
  } catch (err) {
    console.error(err);
    showToast("保存に失敗しました", "error");
  }
}

// =============================================
// 削除モーダル
// =============================================
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById("deletePassword").value = "";
  document.getElementById("deleteError").textContent = "";
  document.getElementById("deleteModal").classList.add("open");
  setTimeout(() => document.getElementById("deletePassword").focus(), 100);
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  pendingDeleteId = null;
}

async function confirmDelete() {
  if (document.getElementById("deletePassword").value !== DELETE_PASSWORD) {
    document.getElementById("deleteError").textContent = "パスワードが違います";
    return;
  }
  if (!pendingDeleteId) return;
  try {
    await db.collection(BRANCHES[currentBranch].collection).doc(pendingDeleteId).delete();
    showToast("案件を削除しました");
    closeDeleteModal();
  } catch (err) {
    showToast("削除に失敗しました", "error");
  }
}

// =============================================
// 検索・フィルタ
// =============================================
function updateStaffFilter() {
  const sel = document.getElementById("staffFilter");
  const staff = BRANCHES[currentBranch].staff;
  sel.innerHTML = `<option value="">全員表示</option>` +
    staff.map((s) => `<option value="${s}">${s}</option>`).join("");
  filterPerson = "";
}

function initSearch() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderProjects();
  });
  document.getElementById("staffFilter").addEventListener("change", (e) => {
    filterPerson = e.target.value;
    renderProjects();
  });
  document.getElementById("branchSelect").addEventListener("change", (e) => {
    document.getElementById("searchInput").value = "";
    searchQuery = "";
    switchBranch(e.target.value);
  });
}

// =============================================
// ユーティリティ
// =============================================
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// =============================================
// 初期化
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  // タスクセレクト初期化
  const taskSel = document.getElementById("formCurrentTask");
  taskSel.innerHTML =
    TASKS.map((t, i) => `<option value="${i}">${t}</option>`).join("") +
    `<option value="${TASKS.length}">完了（全工程終了）</option>`;

  // 前回選択した支店を復元
  const saved = localStorage.getItem("selectedBranch");
  if (saved && BRANCHES[saved]) {
    currentBranch = saved;
    document.getElementById("branchSelect").value = saved;
  }

  initSearch();
  switchBranch(currentBranch);

  document.getElementById("projectForm").addEventListener("submit", saveProject);
  document.getElementById("projectModal").addEventListener("click", (e) => { if (e.target.id === "projectModal") closeModal(); });
  document.getElementById("deleteModal").addEventListener("click", (e) => { if (e.target.id === "deleteModal") closeDeleteModal(); });
  document.getElementById("detailModal").addEventListener("click", (e) => { if (e.target.id === "detailModal") closeDetailModal(); });
  document.getElementById("deletePassword").addEventListener("keydown", (e) => { if (e.key === "Enter") confirmDelete(); });
});

// =============================================
// Excel 一括取込
// =============================================

// 支店名マッピング（Excelの支店列 → branchKey）
const BRANCH_NAME_MAP = {
  "名古屋": "nagoya",
  "札幌":   "sapporo",
  "仙台":   "sendai",
};

// 対象期
const TARGET_TERMS = ["79期", "80期"];

// 対象SFA確度
const TARGET_SFA = ["商談", "顧客注文"];

let importData = [];

function openImportModal() {
  importData = [];
  document.getElementById("importFileInput").value = "";
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("importNoData").style.display = "none";
  document.getElementById("importError").textContent = "";
  document.getElementById("importExecuteBtn").disabled = true;
  document.getElementById("importModal").classList.add("open");
}

function closeImportModal() {
  document.getElementById("importModal").classList.remove("open");
  importData = [];
}

function previewImport(input) {
  const file = input.files[0];
  if (!file) return;

  document.getElementById("importError").textContent = "";
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("importNoData").style.display = "none";
  document.getElementById("importExecuteBtn").disabled = true;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // 「案件リスト」シートを探す
      const sheetName = workbook.SheetNames.find(n => n === "案件リスト");
      if (!sheetName) {
        document.getElementById("importError").textContent = "「案件リスト」シートが見つかりません";
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      // ヘッダー行を探す（「病院名」を含む行）
      let headerRowIdx = -1;
      let headers = [];
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const rowStr = rows[i].join("\t");
        if (rowStr.includes("病院名")) {
          headerRowIdx = i;
          headers = rows[i].map(h => String(h).replace(/\s+/g, ""));
          break;
        }
      }

      if (headerRowIdx === -1) {
        document.getElementById("importError").textContent = "ヘッダー行が見つかりません";
        return;
      }

      // 列インデックスを取得
      const colIdx = (names) => {
        for (const name of names) {
          const idx = headers.findIndex(h => h.includes(name));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const COL = {
        hospitalName:  colIdx(["病院名"]),
        kyokaBedNum:   colIdx(["許可病床数"]),
        mainPerson:    colIdx(["支店担当", "支店担当1"]),
        subPerson:     colIdx(["支店担当2"]),
        nurseCall:     colIdx(["NCメーカー", "ナースコールメーカー"]),
        nurseCallModel:colIdx(["ナースコールモデル"]),
        electronicKarte: colIdx(["電カルベンダー"]),
        karteModel:    colIdx(["電子カルテモデル"]),
        memo:          colIdx(["システム概要"]),
        branchName:    colIdx(["支店"]),
        sfaStatus:     colIdx(["SFA確度"]),
        salesTerm:     colIdx(["売上予定期"]),
      };

      const currentBranchLabel = BRANCHES[currentBranch].label.replace("支店", "");

      // データ行をフィルタリング
      importData = [];
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const hospitalName = String(row[COL.hospitalName] || "").trim();
        if (!hospitalName) continue;

        const branchCell  = String(row[COL.branchName]  || "").trim();
        const sfaCell     = String(row[COL.sfaStatus]   || "").trim();
        const termCell    = String(row[COL.salesTerm]   || "").trim();

        // フィルター条件チェック
        const branchKey = BRANCH_NAME_MAP[branchCell];
        if (!branchKey) continue;
        if (branchKey !== currentBranch) continue;
        if (!TARGET_SFA.some(s => sfaCell.includes(s))) continue;
        if (!TARGET_TERMS.some(t => termCell.includes(t))) continue;

        const nurseCall = [
          row[COL.nurseCall]      || "",
          row[COL.nurseCallModel] || ""
        ].filter(Boolean).join("／");

        const electronicKarte = [
          row[COL.electronicKarte] || "",
          row[COL.karteModel]      || ""
        ].filter(Boolean).join("／");

        importData.push({
          hospitalName,
          kyokaBedNum:     String(row[COL.kyokaBedNum]  || "").trim(),
          mainPerson:      String(row[COL.mainPerson]   || "").trim(),
          subPerson:       String(row[COL.subPerson]    || "").trim(),
          nurseCall,
          electronicKarte,
          memo:            String(row[COL.memo]         || "").trim(),
          goLiveDate:      "",
          currentTask:     0,
          createdAt:       new Date().toISOString(),
          // プレビュー用
          _sfaStatus:  sfaCell,
          _salesTerm:  termCell,
        });
      }

      // プレビュー表示
      if (importData.length === 0) {
        document.getElementById("importNoData").style.display = "block";
        return;
      }

      document.getElementById("importCount").textContent = importData.length;
      const tbody = document.getElementById("importPreviewBody");
      tbody.innerHTML = importData.map(d => `
        <tr style="border-bottom:1px solid #f0f2f5;">
          <td style="padding:7px 10px;font-weight:600;">${escapeHtml(d.hospitalName)}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.mainPerson || "―")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.kyokaBedNum || "―")}</td>
          <td style="padding:7px 10px;"><span style="background:#e8f0fc;color:#0f3d82;padding:2px 6px;border-radius:4px;font-size:11px;">${escapeHtml(d._sfaStatus)}</span></td>
          <td style="padding:7px 10px;"><span style="background:#e6f4ee;color:#1b8a5a;padding:2px 6px;border-radius:4px;font-size:11px;">${escapeHtml(d._salesTerm)}</span></td>
          <td style="padding:7px 10px;">${escapeHtml(d.nurseCall || "―")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.electronicKarte || "―")}</td>
        </tr>
      `).join("");

      document.getElementById("importPreview").style.display = "block";
      document.getElementById("importExecuteBtn").disabled = false;

    } catch (err) {
      console.error(err);
      document.getElementById("importError").textContent = "ファイルの読み込みに失敗しました: " + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
}

async function executeImport() {
  if (!importData.length) return;

  const btn = document.getElementById("importExecuteBtn");
  btn.disabled = true;
  btn.textContent = "取込中...";

  const col = BRANCHES[currentBranch].collection;
  let successCount = 0;
  let errorCount = 0;

  for (const item of importData) {
    // _sfaStatus, _salesTerm はFirestoreに保存しない
    const { _sfaStatus, _salesTerm, ...data } = item;
    try {
      await db.collection(col).add(data);
      successCount++;
    } catch (err) {
      console.error(err);
      errorCount++;
    }
  }

  btn.textContent = "取込実行";
  closeImportModal();

  if (errorCount === 0) {
    showToast(`✅ ${successCount}件の案件を取込みました`);
  } else {
    showToast(`⚠️ ${successCount}件成功、${errorCount}件失敗`, "error");
  }
}

// importModalのオーバーレイクリックで閉じる
document.addEventListener("DOMContentLoaded", () => {
  const importModal = document.getElementById("importModal");
  if (importModal) {
    importModal.addEventListener("click", (e) => {
      if (e.target.id === "importModal") closeImportModal();
    });
  }
});
