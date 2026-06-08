// =============================================
// CUSTOMER SUCCESS - cs.js
// =============================================
'use strict';

const CIRCLE_NUMS = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩",
                     "⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];

const CS_STATE_OPTIONS = [
  "正常",
  "問題あり(システム)",
  "問題あり(運用)",
  "問題あり(システム/運用)",
  "課題あり(システム)",
  "課題あり(運用)",
  "課題あり(システム/運用)",
];

const CS_PHASES = [
  {
    key: "支援計画",
    label: "支援計画",
    goal: "早期稼働",
    items: [
      { item:"キックオフ実施", content:"導入目的・体制・スケジュール共有", effect:"関係者の認識統一、導入遅延防止" },
      { item:"導入目的共有", content:"解決したい課題や期待効果の整理", effect:"ゴールの明確化" },
      { item:"成功指標設定（KPI）", content:"効果測定指標の設定", effect:"導入成果を定量評価可能" },
      { item:"環境構築", content:"サーバ・ネットワーク・端末設定", effect:"安定稼働開始" },
      { item:"設定支援", content:"システム初期設定支援", effect:"運用開始までの負荷軽減" },
      { item:"マニュアル提供", content:"操作資料・運用資料整備", effect:"問い合わせ削減" },
      { item:"初期教育", content:"操作研修・管理者教育", effect:"早期運用開始" },
      { item:"運用設計", content:"通知ルールや業務フロー設計", effect:"現場定着の促進" },
    ],
  },
  {
    key: "定着",
    label: "定着",
    goal: "利用率向上",
    items: [
      { item:"利用状況モニタリング", content:"利用頻度・アクセス状況確認", effect:"利用低下の早期発見" },
      { item:"ログ分析", content:"利用傾向や課題分析", effect:"改善ポイントの可視化" },
      { item:"未利用機能活用提案", content:"利用されていない機能の提案", effect:"活用率向上" },
      { item:"定例会実施", content:"定期的な情報共有と課題確認", effect:"継続利用促進" },
      { item:"問題点ヒアリング", content:"現場課題の収集", effect:"解約リスク低減" },
      { item:"利用者教育", content:"追加研修・新規職員教育", effect:"操作定着" },
      { item:"管理者教育", content:"分析機能や運用管理教育", effect:"自走化促進" },
    ],
  },
  {
    key: "活用促進",
    label: "活用促進",
    goal: "業務改善",
    items: [
      { item:"データ分析支援", content:"利用データの分析支援", effect:"データ活用文化醸成" },
      { item:"ベストプラクティス紹介", content:"活用成功事例の共有", effect:"活用レベル向上" },
      { item:"他施設事例紹介", content:"他施設の運用紹介", effect:"新たな活用アイデア創出" },
      { item:"業務改善提案", content:"データに基づく改善提案", effect:"業務効率化" },
      { item:"KPI達成支援", content:"指標改善活動支援", effect:"導入目標達成" },
      { item:"新機能案内", content:"バージョンアップや新機能紹介", effect:"製品価値向上" },
    ],
  },
  {
    key: "成果創出",
    label: "成果創出",
    goal: "ROI証明",
    items: [
      { item:"導入効果測定", content:"導入前後比較分析", effect:"効果の可視化" },
      { item:"KPI評価", content:"設定した指標の達成確認", effect:"成果確認" },
      { item:"ROI算出", content:"業務削減効果算出、費用対効果評価", effect:"投資価値の証明" },
      { item:"成果報告会", content:"経営層・管理者への報告", effect:"継続利用・横展開促進" },
      { item:"院内展開支援", content:"他病棟・他部署への展開支援", effect:"利用拡大" },
      { item:"活用レポート提供", content:"定期的な成果報告資料作成", effect:"意思決定支援" },
    ],
  },
  {
    key: "拡大",
    label: "拡大",
    goal: "更新・追加受注",
    items: [
      { item:"契約更新管理", content:"更新時期管理・事前フォロー", effect:"解約防止" },
      { item:"更新提案", content:"導入効果を踏まえた継続提案", effect:"更新率向上" },
      { item:"機能追加提案", content:"オプションや追加機能提案", effect:"単価向上" },
      { item:"ライセンス追加提案", content:"利用範囲拡大提案", effect:"売上拡大" },
      { item:"他部署展開提案", content:"他病棟・他施設展開提案", effect:"契約拡大" },
      { item:"上位プラン提案", content:"上位サービス提案", effect:"LTV向上" },
    ],
  },
  {
    key: "事例創出",
    label: "事例創出",
    goal: "共創・事例創出",
    items: [
      { item:"ユーザー会参加", content:"ユーザー同士の交流機会提供", effect:"ロイヤルティ向上" },
      { item:"事例取材", content:"成功事例の作成・公開", effect:"ブランド価値向上" },
      { item:"講演協力", content:"学会・セミナー登壇支援", effect:"認知拡大" },
      { item:"紹介依頼", content:"他施設への紹介依頼", effect:"新規案件創出" },
      { item:"共同プロジェクト", content:"研究・実証実験実施", effect:"関係強化" },
      { item:"リファレンス顧客化", content:"見学受入・営業協力", effect:"営業効率向上" },
    ],
  },
];

let allCsProjects = [];
let csSearchQuery = "";
let csFilterPerson = "";
let pendingCsDeleteId = null;

// =============================================
// ユーティリティ
// =============================================
function circleNum(n) {
  return CIRCLE_NUMS[n - 1] || `(${n})`;
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function normalizeHospitalName(name) {
  return String(name || "").replace(/\s+/g, "").toLowerCase();
}

function isDuplicateCsHospital(project, projects = allCsProjects) {
  const name = normalizeHospitalName(project.hospitalName);
  if (!name) return false;
  return projects.filter(p => normalizeHospitalName(p.hospitalName) === name).length > 1;
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// =============================================
// 訪問ラベル生成
// オンボーディング→①オンボーディング
// サポート→④サポート（通番で）
// =============================================
function visitLabel(index, status) {
  const num = circleNum(index + 1);
  return `${num} ${getVisitStatusLabel(status)}`;
}

// =============================================
// 最終訪問日からのカラー判定
// =============================================
function getVisitColorClass(p) {
  const visits = p.visits || [];
  if (!visits.length) return "";
  const last = visits[visits.length - 1];
  const dateStr = last.endDate || last.startDate;
  if (!dateStr) return "";
  const lastDate = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const months = (today.getFullYear() - lastDate.getFullYear()) * 12
               + (today.getMonth() - lastDate.getMonth());
  if (months <= 4)  return "cs-status-green";
  if (months <= 8)  return "cs-status-yellow";
  return "cs-status-orange";
}

function getLastVisitInfo(p) {
  const visits = p.visits || [];
  if (!visits.length) return { text: "訪問記録なし", cls: "last-visit-none" };
  const last = visits[visits.length - 1];
  const dateStr = last.endDate || last.startDate;
  if (!dateStr) return { text: "日付未設定", cls: "last-visit-none" };
  const lastDate = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const months = (today.getFullYear() - lastDate.getFullYear()) * 12
               + (today.getMonth() - lastDate.getMonth());
  const fmt = lastDate.toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" });
  if (months <= 4)  return { text: `最終対応：${fmt}（${months}か月前）`, cls: "last-visit-green" };
  if (months <= 8)  return { text: `最終対応：${fmt}（${months}か月前）`, cls: "last-visit-yellow" };
  return { text: `最終対応：${fmt}（${months}か月前）⚠️`, cls: "last-visit-orange" };
}

// =============================================
// EOS判定（サポートエンド2年前から）
// =============================================
function shouldShowEos(p) {
  if (!p.supportEndDate) return false;
  const end = new Date(p.supportEndDate);
  const twoYears = new Date(end);
  twoYears.setFullYear(twoYears.getFullYear() - 2);
  return new Date() >= twoYears;
}

function getProductLabels(p, longLabel = false) {
  const products = [];
  if (p.hasBedside) products.push("BS端末");
  if (p.hasBedNavi) products.push("ベッドナビ");
  if (p.hasNemiri)  products.push("眠りSCAN");
  if (p.hasRisha)   products.push("離床CATCH");
  if (p.hasVital)   products.push("バイタル連携");
  if (p.hasEhr)     products.push("EHR連携");
  if (p.hasNurse)   products.push("NC情報連携");
  if (p.hasNcNotify) products.push("NC通知連携");
  return products;
}

function getSystemLabels(p) {
  return [p.systemType1, p.systemType2].filter(Boolean);
}

function getLatestVisit(p) {
  const visits = p.visits || [];
  return visits.length ? visits[visits.length - 1] : null;
}

function getVisitStatusLabel(status) {
  if (status === "onboarding" || status === "OBD") return "支援計画";
  if (status === "support" || status === "SUP" || status === "活用") return "活用促進";
  return status || "—";
}

function normalizeVisitStatus(status) {
  if (status === "onboarding" || status === "OBD") return "支援計画";
  if (status === "support" || status === "SUP" || status === "活用") return "活用促進";
  return status || "支援計画";
}

function isSupportSideStatus(status) {
  return ["support", "SUP", "活用", "活用促進", "成果創出", "拡大", "事例創出"].includes(status);
}

function getLatestVisitDateText(p) {
  const latest = getLatestVisit(p);
  if (!latest) return "—";
  return latest.endDate || latest.startDate || "—";
}

function getLatestVisitMemo(p) {
  const latest = getLatestVisit(p);
  return latest?.freeText || "";
}

function getCsState(p) {
  return p.state || p.taskStatus || "正常";
}

function getCsPhase(key) {
  return CS_PHASES.find(phase => phase.key === key) || CS_PHASES[0];
}

function getCurrentCsPhase(p) {
  return getCsPhase(normalizeVisitStatus(getLatestVisit(p)?.status));
}

function getCsTaskSelection(p) {
  const phase = getCurrentCsPhase(p);
  const selectedItem = phase.key === p.csTaskPhase
    ? (phase.items.find(row => row.item === p.csTaskItem) || phase.items[0])
    : phase.items[0];
  return { phase, selectedItem };
}

function createCsTaskSection(p) {
  const { phase, selectedItem } = getCsTaskSelection(p);
  return `
    <div class="cs-task-section">
      <div class="cs-task-current">現在のフェーズ：<strong>${escapeHtml(phase.label)}</strong><em>${escapeHtml(phase.goal)}</em></div>
      <div class="cs-task-controls">
        <select class="cs-task-item-select" onchange="updateCsTaskItem('${p.id}', this.value)">
          ${phase.items.map(row => `<option value="${escapeHtml(row.item)}"${row.item === selectedItem.item ? " selected" : ""}>${escapeHtml(row.item)}</option>`).join("")}
        </select>
      </div>
      <div class="cs-task-detail">
        <div><span>内容</span>${escapeHtml(selectedItem.content)}</div>
        <div><span>効果</span>${escapeHtml(selectedItem.effect)}</div>
      </div>
    </div>`;
}

function createCsStateSelect(p) {
  const current = getCsState(p);
  return `<select class="cs-card-state-select" onchange="updateCsState('${p.id}', this.value)">
    ${CS_STATE_OPTIONS.map(s => `<option value="${escapeHtml(s)}"${s === current ? " selected" : ""}>${escapeHtml(s)}</option>`).join("")}
  </select>`;
}

// =============================================
// CSカード生成
// =============================================
function createCsCard(p) {
  const colorClass = getVisitColorClass(p);
  const lastVisit  = getLastVisitInfo(p);
  const showEos    = shouldShowEos(p);
  const visits     = p.visits || [];
  const duplicateBadge = isDuplicateCsHospital(p) ? `<span class="cs-duplicate-badge">重複</span>` : "";

  const products = getProductLabels(p);

  // 直近3件の訪問
  const recentVisits = visits.slice(-3);
  const visitHtml = recentVisits.map((v, i) => {
    const realIdx = visits.length - recentVisits.length + i;
    const dateStr = v.startDate
      ? (v.endDate && v.endDate !== v.startDate ? `${v.startDate} 〜 ${v.endDate}` : v.startDate)
      : "日付未定";
    return `
      <div class="cs-visit-item">
        <div class="cs-visit-header">
          <span class="cs-visit-num">${circleNum(realIdx + 1)}</span>
          <span class="cs-visit-status-badge ${v.status}">
            ${escapeHtml(getVisitStatusLabel(v.status))}
          </span>
          <button class="btn-cs-visit-edit" onclick="openVisitModal('${p.id}', ${realIdx})">編集</button>
          <button class="btn-cs-visit-delete" onclick="deleteVisit('${p.id}', ${realIdx})">削除</button>
          <span class="cs-visit-date">${dateStr}</span>
        </div>
        ${v.freeText ? `<div class="cs-visit-text">${escapeHtml(v.freeText)}</div>` : ""}
      </div>`;
  }).join("");

  const startFmt = p.startDate
    ? new Date(p.startDate).toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" })
    : "未設定";

  return `
    <div class="cs-card ${colorClass}" data-id="${p.id}">
      ${showEos ? `<span class="eos-badge">EOS</span>` : ""}
      <div>
        <div class="cs-card-title">${escapeHtml(p.hospitalName)}${duplicateBadge}</div>
        <div class="cs-card-sub">
          <span class="cs-meta-tag">📅 ${startFmt}</span>
          ${p.csPerson ? `<span class="cs-meta-tag">👤 ${escapeHtml(p.csPerson)}</span>` : ""}
          ${p.ward ? `<span class="cs-meta-tag">🏥 ${escapeHtml(p.ward)}</span>` : ""}
        </div>
      </div>
      <div class="cs-card-state-row"><span class="cs-visits-label">状態</span>${createCsStateSelect(p)}</div>
      ${products.length ? `<div class="cs-products">${products.map(pr => `<span class="cs-product-badge">${pr}</span>`).join("")}</div>` : ""}
      ${p.memo ? `<div class="cs-card-memo">${escapeHtml(p.memo)}</div>` : ""}
      <div class="${lastVisit.cls} last-visit-indicator">${lastVisit.text}</div>
      ${visits.length
        ? `<div class="cs-visits-section">
             <span class="cs-visits-label">訪問履歴（${visits.length}件）${visits.length > 3 ? " ※直近3件" : ""}</span>
             ${visitHtml}
           </div>`
        : `<div class="last-visit-none last-visit-indicator">訪問記録がありません</div>`}
      ${createCsTaskSection(p)}
      <div class="cs-card-actions">
        <button class="btn-cs-next" onclick="openVisitModal('${p.id}')">＋ 次の訪問を追加</button>
        <button class="btn-cs-detail" onclick="openCsDetailModal('${p.id}')">詳細</button>
        <button class="btn-cs-edit" onclick="openCsEditModal('${p.id}')">編集</button>
        <button class="btn-cs-delete" onclick="openCsDeleteModal('${p.id}')">削除</button>
      </div>
    </div>`;
}

// =============================================
// レンダリング
// =============================================
function renderCsProjects() {
  const container  = document.getElementById("csProjectList");
  const emptyState = document.getElementById("csEmptyState");
  if (!container || !emptyState) return;

  let filtered = allCsProjects.filter(p => {
    const matchName   = (p.hospitalName || "").toLowerCase().includes(csSearchQuery.toLowerCase());
    const matchPerson = !csFilterPerson || p.csPerson === csFilterPerson;
    return matchName && matchPerson;
  });

  // 要対応→注意→良好→記録なし
  const pri = { "cs-status-orange":0, "cs-status-yellow":1, "cs-status-green":2, "":3 };
  filtered.sort((a, b) => (pri[getVisitColorClass(a)] ?? 3) - (pri[getVisitColorClass(b)] ?? 3));

  document.getElementById("csProjectCount").textContent = `${filtered.length} 件`;

  if (!filtered.length) {
    container.innerHTML = "";
    emptyState.style.display = "flex";
  } else {
    emptyState.style.display = "none";
    container.innerHTML = filtered.map(createCsCard).join("");
  }
  updateCsStats();
}

function createCsListRow(p) {
  const latest = getLatestVisit(p);
  const latestDate = getLatestVisitDateText(p);
  return `<tr>
    <td class="cs-list-hospital" onclick="openCsDetailModal('${p.id}')">${escapeHtml(p.hospitalName || "")}</td>
    <td>${escapeHtml(p.csPerson || "—")}</td>
    <td><span class="cs-list-status">${escapeHtml(getVisitStatusLabel(latest?.status))}</span></td>
    <td><span class="cs-list-state">${escapeHtml(getCsState(p))}</span></td>
    <td><span class="cs-list-visit">${escapeHtml(latestDate)}</span></td>
    <td class="cs-list-memo">${escapeHtml(getLatestVisitMemo(p))}</td>
  </tr>`;
}

function renderCsList() {
  const tbody = document.getElementById("csTableBody");
  if (!tbody) return;

  let filtered = allCsProjects.filter(p => {
    const q = csSearchQuery.toLowerCase();
    const name = (p.hospitalName || "").toLowerCase();
    const matchName = name.includes(q);
    const matchPerson = !csFilterPerson || p.csPerson === csFilterPerson;
    return matchName && matchPerson;
  });

  const pri = { "cs-status-orange":0, "cs-status-yellow":1, "cs-status-green":2, "":3 };
  filtered.sort((a, b) => {
    const pa = pri[getVisitColorClass(a)] ?? 3;
    const pb = pri[getVisitColorClass(b)] ?? 3;
    if (pa !== pb) return pa - pb;
    return (a.startDate || "").localeCompare(b.startDate || "");
  });

  document.getElementById("csProjectCount").textContent = `${filtered.length} 件`;
  tbody.innerHTML = filtered.length
    ? filtered.map(createCsListRow).join("")
    : `<tr><td colspan="6" class="cs-list-loading">該当するCS案件がありません</td></tr>`;
  updateCsStats();
}

function renderCsView() {
  if (document.getElementById("csTableBody")) renderCsList();
  else renderCsProjects();
}

function updateCsStats() {
  const total = document.getElementById("csTotalStat");
  const green = document.getElementById("csGreenStat");
  const yellow = document.getElementById("csYellowStat");
  const orange = document.getElementById("csOrangeStat");
  if (total)  total.textContent  = allCsProjects.length;
  if (green)  green.textContent  = allCsProjects.filter(p => getVisitColorClass(p) === "cs-status-green").length;
  if (yellow) yellow.textContent = allCsProjects.filter(p => getVisitColorClass(p) === "cs-status-yellow").length;
  if (orange) orange.textContent = allCsProjects.filter(p => getVisitColorClass(p) === "cs-status-orange").length;
}

// =============================================
// Firestore リアルタイム同期
// =============================================
function initCs() {
  // 検索
  const searchInput = document.getElementById("csSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      csSearchQuery = e.target.value;
      renderCsView();
    });
  }

  // 担当者フィルタ
  const staffSel = document.getElementById("csStaffFilter");
  if (staffSel) {
    updateCsStaffFilter();
    staffSel.addEventListener("change", e => {
      csFilterPerson = e.target.value;
      renderCsView();
    });
  }

  // 登録フォームの担当者プルダウン
  if (document.getElementById("csSalesPerson")) populateCsStaffSelect();

  // フォームイベント
  const projectForm = document.getElementById("csProjectForm");
  const visitForm = document.getElementById("visitForm");
  if (projectForm) projectForm.addEventListener("submit", saveCsProject);
  if (visitForm) visitForm.addEventListener("submit", saveVisit);

  // モーダル外クリックで閉じる
  ["csModal","visitModal","csDetailModal","csDeleteModal"].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.addEventListener("click", e => {
      if (e.target.id === id) {
        if      (id === "csModal")       closeCsModal();
        else if (id === "visitModal")    closeVisitModal();
        else if (id === "csDetailModal") closeCsDetailModal();
        else                             closeCsDeleteModal();
      }
    });
  });

  // Enterで削除確定
  const deletePassword = document.getElementById("csDeletePassword");
  if (deletePassword) {
    deletePassword.addEventListener("keydown", e => {
      if (e.key === "Enter") confirmCsDelete();
    });
  }

  // Firestore
  db.collection("projects")
    .where("type", "==", "cs")
    .onSnapshot(snapshot => {
      allCsProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCsStaffFilter();
      populateCsStaffSelect();
      renderCsView();
    }, err => {
      console.error("CS Firestore error:", err);
      showToast("CSデータ取得に失敗しました", "error");
    });
}

function populateCsStaffSelect() {
  ["csSalesPerson", "csPerson"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    const listId = `${id}List`;
    let datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = listId;
      input.parentNode.appendChild(datalist);
    }
    datalist.innerHTML = getCsStaffCandidates(id).map(s => `<option value="${escapeHtml(s)}"></option>`).join("");
    input.setAttribute("list", listId);
  });
}

function updateCsStaffFilter() {
  const sel = document.getElementById("csStaffFilter");
  if (!sel) return;
  const current = sel.value;
  const staff = getCsStaffCandidates();
  sel.innerHTML = `<option value="">全員表示</option>` +
    staff.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  if (current && staff.includes(current)) sel.value = current;
  else csFilterPerson = "";
}

function getCsStaffCandidates(targetId = "csPerson") {
  const staffSet = new Set();
  allCsProjects.forEach(p => {
    if (targetId === "csSalesPerson" && p.salesPerson && p.salesPerson.trim()) staffSet.add(p.salesPerson.trim());
    if (targetId !== "csSalesPerson" && p.csPerson && p.csPerson.trim()) staffSet.add(p.csPerson.trim());
  });
  const sorted = Array.from(staffSet).filter(s => s && s !== "その他").sort();
  if (staffSet.has("その他")) sorted.push("その他");
  return sorted;
}

// =============================================
// CS案件 登録・編集モーダル
// =============================================
function openCsAddModal() {
  document.getElementById("csModalTitle").textContent = "CS案件 新規登録";
  document.getElementById("csProjectForm").reset();
  document.getElementById("csEditId").value = "";
  populateCsStaffSelect();
  document.getElementById("csModal").classList.add("open");
}

function openCsEditModal(id) {
  const p = allCsProjects.find(x => x.id === id);
  if (!p) return;
  document.getElementById("csModalTitle").textContent = "CS案件 編集";
  document.getElementById("csEditId").value       = id;
  document.getElementById("csHospitalName").value = p.hospitalName || "";
  document.getElementById("csWard").value         = p.ward || "";
  document.getElementById("csStartDate").value    = p.startDate || "";
  document.getElementById("csSupportEndDate").value = p.supportEndDate || "";
  document.getElementById("csSolPm").value        = p.solPm || "";
  document.getElementById("csSystemType1").value  = p.systemType1 || "";
  document.getElementById("csSystemType2").value  = p.systemType2 || "";
  document.getElementById("csMoveOp").value       = p.moveOp || "";
  document.getElementById("csBedNumStaff").value  = p.bedNumStaff || "";
  document.getElementById("csBedMoveStaff").value = p.bedMoveStaff || "";
  document.getElementById("csMemo").value         = p.memo || "";
  document.getElementById("csHasBedside").checked = !!p.hasBedside;
  document.getElementById("csHasBedNavi").checked = !!p.hasBedNavi;
  document.getElementById("csHasNemiri").checked  = !!p.hasNemiri;
  document.getElementById("csHasRisha").checked   = !!p.hasRisha;
  document.getElementById("csHasVital").checked   = !!p.hasVital;
  document.getElementById("csHasEhr").checked     = !!p.hasEhr;
  document.getElementById("csHasNurse").checked   = !!p.hasNurse;
  document.getElementById("csHasNcNotify").checked = !!p.hasNcNotify;
  populateCsStaffSelect();
  document.getElementById("csSalesPerson").value  = p.salesPerson || "";
  document.getElementById("csPerson").value       = p.csPerson || "";
  document.getElementById("csModal").classList.add("open");
}

function closeCsModal() {
  document.getElementById("csModal").classList.remove("open");
}

async function saveCsProject(e) {
  e.preventDefault();
  const id = document.getElementById("csEditId").value;
  const data = {
    type:          "cs",
    hospitalName:  document.getElementById("csHospitalName").value.trim(),
    ward:          document.getElementById("csWard").value.trim(),
    startDate:     document.getElementById("csStartDate").value,
    supportEndDate:document.getElementById("csSupportEndDate").value,
    salesPerson:   document.getElementById("csSalesPerson").value.trim(),
    csPerson:      document.getElementById("csPerson").value.trim(),
    solPm:         document.getElementById("csSolPm").value.trim(),
    systemType1:   document.getElementById("csSystemType1").value,
    systemType2:   document.getElementById("csSystemType2").value,
    moveOp:        document.getElementById("csMoveOp").value,
    bedNumStaff:   document.getElementById("csBedNumStaff").value.trim(),
    bedMoveStaff:  document.getElementById("csBedMoveStaff").value.trim(),
    memo:          document.getElementById("csMemo").value.trim(),
    hasBedside:    document.getElementById("csHasBedside").checked,
    hasBedNavi:    document.getElementById("csHasBedNavi").checked,
    hasNemiri:     document.getElementById("csHasNemiri").checked,
    hasRisha:      document.getElementById("csHasRisha").checked,
    hasVital:      document.getElementById("csHasVital").checked,
    hasEhr:        document.getElementById("csHasEhr").checked,
    hasNurse:      document.getElementById("csHasNurse").checked,
    hasNcNotify:   document.getElementById("csHasNcNotify").checked,
  };
  if (!data.hospitalName) { showToast("病院名を入力してください", "error"); return; }
  try {
    if (id) {
      await db.collection("projects").doc(id).update(data);
      showToast("CS案件を更新しました");
    } else {
      data.visits    = [];
      data.createdAt = new Date().toISOString();
      await db.collection("projects").add(data);
      showToast("CS案件を登録しました");
    }
    closeCsModal();
  } catch (err) {
    console.error(err);
    showToast("保存に失敗しました", "error");
  }
}

// =============================================
// 訪問追加モーダル
// =============================================
function openVisitModal(projectId, editIndex = -1) {
  const p = allCsProjects.find(x => x.id === projectId);
  if (!p) return;
  const visits = p.visits || [];
  const targetVisit = editIndex >= 0 ? visits[editIndex] : null;
  const nextNum = targetVisit ? editIndex + 1 : visits.length + 1;
  document.getElementById("visitNumLabel").textContent    = targetVisit ? `第 ${nextNum} 回 編集` : `第 ${nextNum} 回`;
  document.getElementById("visitHospitalLabel").textContent = p.hospitalName;
  document.getElementById("visitProjectId").value         = projectId;
  document.getElementById("visitEditIndex").value         = editIndex;
  document.getElementById("visitForm").reset();
  if (targetVisit) {
    document.getElementById("visitStatus").value = normalizeVisitStatus(targetVisit.status);
    document.getElementById("visitStartDate").value = targetVisit.startDate || "";
    document.getElementById("visitEndDate").value = targetVisit.endDate || "";
    document.getElementById("visitFreeText").value = targetVisit.freeText || "";
  }
  document.getElementById("visitModal").classList.add("open");
}

function closeVisitModal() {
  document.getElementById("visitModal").classList.remove("open");
}

async function saveVisit(e) {
  e.preventDefault();
  const projectId = document.getElementById("visitProjectId").value;
  const editIndex = parseInt(document.getElementById("visitEditIndex").value, 10);
  const p = allCsProjects.find(x => x.id === projectId);
  if (!p) return;

  const visit = {
    status:    document.getElementById("visitStatus").value,
    startDate: document.getElementById("visitStartDate").value,
    endDate:   document.getElementById("visitEndDate").value,
    freeText:  document.getElementById("visitFreeText").value.trim(),
  };

  const updatedVisits = [...(p.visits || [])];
  if (editIndex >= 0) {
    visit.createdAt = updatedVisits[editIndex]?.createdAt || new Date().toISOString();
    visit.updatedAt = new Date().toISOString();
    updatedVisits[editIndex] = visit;
  } else {
    visit.createdAt = new Date().toISOString();
    updatedVisits.push(visit);
  }
  try {
    await db.collection("projects").doc(projectId).update({ visits: updatedVisits });
    showToast(editIndex >= 0 ? "訪問記録を更新しました" : "訪問記録を追加しました");
    closeVisitModal();
  } catch (err) {
    console.error(err);
    showToast("保存に失敗しました", "error");
  }
}

async function deleteVisit(projectId, index) {
  const p = allCsProjects.find(x => x.id === projectId);
  if (!p) return;
  const updatedVisits = [...(p.visits || [])];
  if (index < 0 || index >= updatedVisits.length) return;
  updatedVisits.splice(index, 1);
  try {
    await db.collection("projects").doc(projectId).update({ visits: updatedVisits });
    showToast("訪問記録を削除しました");
  } catch (err) {
    console.error(err);
    showToast("削除に失敗しました", "error");
  }
}

async function updateCsState(projectId, state) {
  try {
    await db.collection("projects").doc(projectId).update({ state, taskStatus: state });
    showToast("状態を更新しました");
  } catch (err) {
    console.error(err);
    showToast("状態の更新に失敗しました", "error");
  }
}

async function updateCsTaskPhase(projectId, phaseKey) {
  const phase = getCsPhase(phaseKey);
  const firstItem = phase.items[0]?.item || "";
  try {
    await db.collection("projects").doc(projectId).update({
      csTaskPhase: phase.key,
      csTaskItem: firstItem,
    });
    showToast("CSフェーズを更新しました");
  } catch (err) {
    console.error(err);
    showToast("CSフェーズの更新に失敗しました", "error");
  }
}

async function updateCsTaskItem(projectId, item) {
  const p = allCsProjects.find(x => x.id === projectId);
  const phase = p ? getCurrentCsPhase(p) : CS_PHASES[0];
  try {
    await db.collection("projects").doc(projectId).update({ csTaskPhase: phase.key, csTaskItem: item });
    showToast("CS項目を更新しました");
  } catch (err) {
    console.error(err);
    showToast("CS項目の更新に失敗しました", "error");
  }
}

// =============================================
// CS詳細ポップアップ
// =============================================
function openCsDetailModal(id) {
  const p = allCsProjects.find(x => x.id === id);
  if (!p) return;
  document.getElementById("csDetailTitle").textContent = p.hospitalName || "CS詳細";

  const products = getProductLabels(p, true);
  const systems = getSystemLabels(p);

  const visits = p.visits || [];
  const visitRows = visits.map((v, i) => {
    const label   = visitLabel(i, v.status);
    const dateStr = v.startDate
      ? (v.endDate && v.endDate !== v.startDate ? `${v.startDate} 〜 ${v.endDate}` : v.startDate)
      : "—";
    return `<tr>
      <th>${label}</th>
      <td>
        <div style="font-size:11px;color:#5a6475;">${dateStr}</div>
        <div style="margin-top:3px;white-space:pre-wrap;">${escapeHtml(v.freeText || "—")}</div>
      </td>
    </tr>`;
  }).join("");

  document.getElementById("csDetailBody").innerHTML = `
    <table class="detail-table">
      <tbody>
        <tr><th>病院名</th><td>${escapeHtml(p.hospitalName||"")}</td></tr>
        <tr><th>導入病棟名</th><td>${escapeHtml(p.ward||"")}</td></tr>
        <tr><th>稼働開始日</th><td>${p.startDate||"—"}</td></tr>
        <tr><th>サポートエンド</th><td>${p.supportEndDate||"—"}</td></tr>
        <tr><th>担当営業</th><td>${escapeHtml(p.salesPerson||"")}</td></tr>
        <tr><th>担当CS</th><td>${escapeHtml(p.csPerson||"")}</td></tr>
        <tr><th>SOL PM</th><td>${escapeHtml(p.solPm||"")}</td></tr>
        <tr><th>システム種類</th><td>${systems.length ? systems.map(escapeHtml).join("、") : "—"}</td></tr>
        <tr><th>導入製品</th><td>${products.length ? products.join("、") : "—"}</td></tr>
        <tr><th>病床移動運用</th><td>${escapeHtml(p.moveOp||"")}</td></tr>
        <tr><th>病床番号変更担当</th><td>${escapeHtml(p.bedNumStaff||"")}</td></tr>
        <tr><th>床頭台移動担当</th><td>${escapeHtml(p.bedMoveStaff||"")}</td></tr>
        <tr><th>状態</th><td>${escapeHtml(getCsState(p))}</td></tr>
        <tr><th>メモ</th><td style="white-space:pre-wrap;">${escapeHtml(p.memo||"")}</td></tr>
        ${visitRows}
      </tbody>
    </table>`;
  document.getElementById("csDetailModal").classList.add("open");
}

function closeCsDetailModal() {
  document.getElementById("csDetailModal").classList.remove("open");
}

// =============================================
// CS削除
// =============================================
function openCsDeleteModal(id) {
  pendingCsDeleteId = id;
  document.getElementById("csDeletePassword").value = "";
  document.getElementById("csDeleteError").textContent = "";
  document.getElementById("csDeleteModal").classList.add("open");
  setTimeout(() => document.getElementById("csDeletePassword").focus(), 100);
}

function closeCsDeleteModal() {
  document.getElementById("csDeleteModal").classList.remove("open");
  pendingCsDeleteId = null;
}

async function confirmCsDelete() {
  const pw = document.getElementById("csDeletePassword").value;
  if (pw !== "0000") {
    document.getElementById("csDeleteError").textContent = "パスワードが違います";
    return;
  }
  if (!pendingCsDeleteId) return;
  try {
    await db.collection("projects").doc(pendingCsDeleteId).delete();
    showToast("CS案件を削除しました");
    closeCsDeleteModal();
  } catch (err) {
    console.error(err);
    showToast("削除に失敗しました", "error");
  }
}

// =============================================
// 初期化
// =============================================
document.addEventListener("DOMContentLoaded", initCs);
