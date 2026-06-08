// =============================================
// 統合版 案件管理ツール - app.js
// =============================================

const TASKS = [
  "01 商談中","02 概算見積もり（参考価格書）提出","03 導入環境確認（仮想／NW環境含む）",
  "04 仕入れ見積もり取得","05 最終見積提出","06 カスタマーサクセス打合せ",
  "07 受注","08 社内キックオフ","09 システム構築準備期間","10 稼働（立会等）","11 稼働後フォロー",
];

const BRANCHES = {
  nagoya:   { label:"名古屋支店", collection:"nagoya_projects",   color:"#1a5cb8" },
  sapporo:  { label:"札幌支店",   collection:"sapporo_projects",  color:"#0077b6" },
  sendai:   { label:"仙台支店",   collection:"sendai_projects",   color:"#2d6a4f" },
  tokyo:    { label:"東京支店",   collection:"tokyo_projects",    color:"#c0392b" },
  yokohama: { label:"横浜支店",   collection:"yokohama_projects", color:"#8e44ad" },
  saitama:  { label:"さいたま支店", collection:"saitama_projects", color:"#d35400" },
  osaka:    { label:"大阪支店",   collection:"osaka_projects",    color:"#16a085" },
  hiroshima:{ label:"広島支店",   collection:"hiroshima_projects",color:"#c0392b" },
  fukuoka:  { label:"福岡支店",   collection:"fukuoka_projects",  color:"#27ae60" },
};

const DELETE_PASSWORD = "0000";
let currentBranch = "nagoya";
let allProjects = [];
let searchQuery = "";
let filterPerson = "";
let unsubscribe = null;
let importData = [];

// =============================================
// 支店切り替え
// =============================================
function switchBranch(branchKey) {
  currentBranch = branchKey;
  const branch = BRANCHES[branchKey];
  // ヘッダーは白固定（ブランドカラー維持）
  document.getElementById("listViewBtn").href = `list.html?branch=${branchKey}`;
  updateStaffFilter();
  initFirestore();
  localStorage.setItem("selectedBranch", branchKey);
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace("#",""), 16);
  const r = Math.min(255,Math.max(0,(num>>16)+amount));
  const g = Math.min(255,Math.max(0,((num>>8)&0xff)+amount));
  const b = Math.min(255,Math.max(0,(num&0xff)+amount));
  return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
}

// =============================================
// 遅延判定
// =============================================
function checkDelay(project) {
  const today = new Date(); today.setHours(0,0,0,0);
  const live = new Date(project.goLiveDate);
  const d = Math.ceil((live-today)/(1000*60*60*24));
  const t = project.currentTask;
  if (t >= TASKS.length) return "completed";
  if (t <= 9 && d < -1)   return "warning";
  if (t < 8  && d <= 170) return "delay";
  if (t < 7  && d <= 180) return "delay";
  if (t < 5  && d <= 190) return "delay";
  if (t < 3  && d <= 210) return "delay";
  if (t === 0 && d <= 240) return "warning";
  return "";
}

function normalizeHospitalName(name) {
  return String(name || "").replace(/\s+/g, "").toLowerCase();
}

function isDuplicateHospital(project, projects = allProjects) {
  const name = normalizeHospitalName(project.hospitalName);
  if (!name) return false;
  return projects.filter(p => normalizeHospitalName(p.hospitalName) === name).length > 1;
}

// =============================================
// カード生成
// =============================================
function createCard(project) {
  const statusClass = checkDelay(project);
  const progress = Math.min(Math.round((project.currentTask/TASKS.length)*100),100);
  const isCompleted = project.currentTask >= TASKS.length;
  const currentTaskLabel = isCompleted ? "✅ 全工程完了" : TASKS[project.currentTask];
  const live = new Date(project.goLiveDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const daysUntilLive = Math.ceil((live-today)/(1000*60*60*24));
  const liveFormatted = project.goLiveDate
    ? live.toLocaleDateString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit"}) : "未設定";
  let daysLabel = "";
  if (project.goLiveDate) {
    if (daysUntilLive>0) daysLabel=`稼働まで ${daysUntilLive} 日`;
    else if (daysUntilLive===0) daysLabel="稼働日（本日）";
    else daysLabel=`稼働 ${Math.abs(daysUntilLive)} 日経過`;
  }
  let statusBadge = "";
  if (statusClass==="delay") statusBadge=`<span class="badge badge-delay">遅延</span>`;
  else if (statusClass==="warning") statusBadge=`<span class="badge badge-warning">注意</span>`;
  else if (statusClass==="completed") statusBadge=`<span class="badge badge-completed">完了</span>`;
  const duplicateBadge = isDuplicateHospital(project) ? `<span class="duplicate-badge">重複</span>` : "";
  const dots = TASKS.map((_,i)=>{
    let cls="dot";
    if (i<project.currentTask) cls+=" dot-done";
    else if (i===project.currentTask&&!isCompleted) cls+=" dot-current";
    return `<span class="${cls}" title="${TASKS[i]}"></span>`;
  }).join("");
  return `
    <div class="project-card ${statusClass}" data-id="${project.id}">
      <div class="card-header">
        <div class="card-title-row">
          <h3 class="hospital-name">${escapeHtml(project.hospitalName)}${duplicateBadge}</h3>
          <div class="card-badges">${statusBadge}</div>
        </div>
        <div class="card-meta">
          <span class="meta-item">📅 稼働予定：${liveFormatted}</span>
          ${daysLabel?`<span class="meta-days ${daysUntilLive<0?'days-past':''}">${daysLabel}</span>`:""}
        </div>
        <div class="card-staff">
          <span class="staff-tag main">M：${escapeHtml(project.mainPerson||"未設定")}</span>
          <span class="staff-tag sub">S：${escapeHtml(project.subPerson||"未設定")}</span>
        </div>
      </div>
      <div class="card-progress">
        <div class="progress-header">
          <span class="current-task-label">${currentTaskLabel}</span>
          <span class="progress-pct">${progress}%</span>
        </div>
        <div class="progress-bar-wrap"><div class="progress-bar" style="width:${progress}%"></div></div>
        <div class="progress-dots">${dots}</div>
      </div>
      ${project.memo?`<div class="card-memo">📝 ${escapeHtml(project.memo)}</div>`:""}
      <div class="card-actions">
        ${!isCompleted
          ?`<button class="btn btn-next" onclick="advanceTask('${project.id}',${project.currentTask})">完了 → 次へ</button>`
          :`<button class="btn btn-done" disabled>全工程完了</button>`}
        ${project.currentTask>0&&!isCompleted
          ?`<button class="btn btn-revert" onclick="revertTask('${project.id}',${project.currentTask})">← 戻る</button>`:""}
        <button class="btn btn-detail" onclick="openDetailModal('${project.id}')">詳細</button>
        <button class="btn btn-edit" onclick="openEditModal('${project.id}')">編集</button>
        <button class="btn btn-delete" onclick="openDeleteModal('${project.id}')">削除</button>
      </div>
    </div>`;
}

// =============================================
// レンダリング
// =============================================
function renderProjects() {
  const container = document.getElementById("projectList");
  const emptyState = document.getElementById("emptyState");
  let filtered = allProjects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchName = p.hospitalName?.toLowerCase().includes(q)??false;
    const matchPerson = !filterPerson||p.mainPerson===filterPerson||p.subPerson===filterPerson;
    return matchName&&matchPerson;
  });
  const priority = {delay:0,warning:1,"":2,completed:3};
  filtered.sort((a,b)=>{
    const pa=priority[checkDelay(a)],pb=priority[checkDelay(b)];
    if (pa!==pb) return pa-pb;
    return new Date(a.goLiveDate)-new Date(b.goLiveDate);
  });
  document.getElementById("projectCount").textContent=`${filtered.length} 件`;
  if (filtered.length===0) { container.innerHTML=""; emptyState.style.display="flex"; }
  else { emptyState.style.display="none"; container.innerHTML=filtered.map(createCard).join(""); }
}

// =============================================
// Firestore
// =============================================
function initFirestore() {
  if (unsubscribe) unsubscribe();
  unsubscribe = db.collection(BRANCHES[currentBranch].collection)
    .orderBy("goLiveDate","asc")
    .onSnapshot(snapshot=>{
      allProjects = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
      updateStaffFilter(); renderProjects(); updateStats();
    }, err=>{ console.error(err); showToast("データ取得に失敗しました","error"); });
}

function updateStats() {
  document.getElementById("statTotal").textContent     = allProjects.length;
  document.getElementById("statDelay").textContent     = allProjects.filter(p=>checkDelay(p)==="delay").length;
  document.getElementById("statWarning").textContent   = allProjects.filter(p=>checkDelay(p)==="warning").length;
  document.getElementById("statCompleted").textContent = allProjects.filter(p=>checkDelay(p)==="completed").length;
}

// =============================================
// 進捗
// =============================================
async function advanceTask(id, currentTask) {
  const nextTask = currentTask+1;
  if (nextTask>TASKS.length) return;
  const label = nextTask>=TASKS.length?"全工程完了":TASKS[nextTask];
  if (!confirm(`現在のタスクを完了にして次へ進みます。\n次：${label}\n\nよろしいですか？`)) return;
  try { await db.collection(BRANCHES[currentBranch].collection).doc(id).update({currentTask:nextTask}); showToast("進捗を更新しました"); }
  catch(e) { showToast("更新に失敗しました","error"); }
}
async function revertTask(id, currentTask) {
  if (currentTask<=0) return;
  const prevTask = currentTask-1;
  if (!confirm(`ひとつ前のタスクに戻します。\n戻り先：${TASKS[prevTask]}\n\nよろしいですか？`)) return;
  try { await db.collection(BRANCHES[currentBranch].collection).doc(id).update({currentTask:prevTask}); showToast("タスクを戻しました"); }
  catch(e) { showToast("更新に失敗しました","error"); }
}

// =============================================
// 詳細モーダル
// =============================================
function openDetailModal(id) {
  const p = allProjects.find(x=>x.id===id); if (!p) return;
  document.getElementById("detailTitle").textContent = p.hospitalName||"施設詳細";
  const rows = [
    ["稼働日（予定含む）",p.goLiveDate],["施設名",p.hospitalName],
    ["新規/既存",p.newOrExisting],["スマベ",p.smabe],
    ["メイン担当",p.mainPerson],["サブ担当",p.subPerson],
    ["経営主体",p.keieiShukai],["許可病床数",p.kyokaBedNum],
    ["病棟構成",p.byokoKosei],["導入病棟",p.donyuByoko],["導入病床数",p.donyuBedNum],
    ["ベッドサイド端末（既存/新規台数）",p.bedsideTerminal],
    ["ステーション端末（既存/新規台数）",p.stationTerminal],
    ["眠りSCAN（既存/新規台数）",p.nemiriScan],
    ["離床CATCH（既存/新規台数）",p.rishoCatch],
    ["Wi-Fiベッドナビ（既存/新規台数）",p.wifiNav],
    ["タブレット設置位置",p.tabletPos],
    ["電子カルテ（ベンダー/機種）",p.electronicKarte],
    ["ナースコール（メーカー/機種）",p.nurseCall],
    ["周辺連携機能",p.shuhenRenkei],
    ["案件概要",p.ankenGaiyou],
    ["スケジュール状況",p.scheduleStatus],["備考",p.memo],
  ];
  document.getElementById("detailBody").innerHTML=`
    <table class="detail-table"><tbody>
      ${rows.map(([l,v])=>`<tr><th>${escapeHtml(l)}</th><td>${v?escapeHtml(v):'<span style="color:#9aa5b4">未入力</span>'}</td></tr>`).join("")}
    </tbody></table>`;
  document.getElementById("detailModal").classList.add("open");
}
function closeDetailModal() { document.getElementById("detailModal").classList.remove("open"); }

// =============================================
// 案件フォーム
// =============================================
function openAddModal() {
  document.getElementById("modalTitle").textContent=`新規案件登録（${BRANCHES[currentBranch].label}）`;
  document.getElementById("projectForm").reset();
  document.getElementById("editProjectId").value="";
  populateStaffInputs("","");
  document.getElementById("projectModal").classList.add("open");
}

function openEditModal(id) {
  const p = allProjects.find(x=>x.id===id); if (!p) return;
  document.getElementById("modalTitle").textContent="案件編集";
  document.getElementById("editProjectId").value=id;
  document.getElementById("formHospitalName").value =p.hospitalName||"";
  document.getElementById("formGoLiveDate").value   =p.goLiveDate||"";
  document.getElementById("formNewOrExisting").value=p.newOrExisting||"";
  document.getElementById("formSmabe").value        =p.smabe||"";
  document.getElementById("formCurrentTask").value  =p.currentTask??0;
  document.getElementById("formKeieiShukai").value  =p.keieiShukai||"";
  document.getElementById("formKyokaBedNum").value  =p.kyokaBedNum||"";
  document.getElementById("formByokoKosei").value   =p.byokoKosei||"";
  document.getElementById("formDonyuByoko").value   =p.donyuByoko||"";
  document.getElementById("formDonyuBedNum").value  =p.donyuBedNum||"";
  document.getElementById("formBedsideTerminal").value=p.bedsideTerminal||"";
  document.getElementById("formStationTerminal").value=p.stationTerminal||"";
  document.getElementById("formNemiriScan").value   =p.nemiriScan||"";
  document.getElementById("formRishoCatch").value   =p.rishoCatch||"";
  document.getElementById("formWifiNav").value      =p.wifiNav||"";
  document.getElementById("formTabletPos").value    =p.tabletPos||"";
  document.getElementById("formElectronicKarte").value=p.electronicKarte||"";
  document.getElementById("formNurseCall").value    =p.nurseCall||"";
  document.getElementById("formShuhenRenkei").value =p.shuhenRenkei||"";
  document.getElementById("formAnkenGaiyou").value  =p.ankenGaiyou||"";
  document.getElementById("formScheduleStatus").value=p.scheduleStatus||"";
  document.getElementById("formMemo").value         =p.memo||"";
  populateStaffInputs(p.mainPerson||"", p.subPerson||"");
  document.getElementById("projectModal").classList.add("open");
}

function closeModal() { document.getElementById("projectModal").classList.remove("open"); }

// 担当者入力欄：テキスト入力（datalistで候補表示）
function populateStaffInputs(mainVal, subVal) {
  const staff = getProjectStaffCandidates();
  ["formMainPerson","formSubPerson"].forEach(id=>{
    const input = document.getElementById(id);
    const listId = id+"List";
    let datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = listId;
      input.parentNode.appendChild(datalist);
    }
    datalist.innerHTML = staff.map(s=>`<option value="${s}"></option>`).join("");
    input.setAttribute("list", listId);
  });
  document.getElementById("formMainPerson").value = mainVal;
  document.getElementById("formSubPerson").value  = subVal;
}

async function saveProject(e) {
  e.preventDefault();
  const id = document.getElementById("editProjectId").value;
  const data = {
    hospitalName:    document.getElementById("formHospitalName").value.trim(),
    goLiveDate:      document.getElementById("formGoLiveDate").value,
    newOrExisting:   document.getElementById("formNewOrExisting").value.trim(),
    smabe:           document.getElementById("formSmabe").value.trim(),
    mainPerson:      document.getElementById("formMainPerson").value.trim(),
    subPerson:       document.getElementById("formSubPerson").value.trim(),
    currentTask:     parseInt(document.getElementById("formCurrentTask").value)||0,
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
    ankenGaiyou:     document.getElementById("formAnkenGaiyou").value.trim(),
    scheduleStatus:  document.getElementById("formScheduleStatus").value.trim(),
    memo:            document.getElementById("formMemo").value.trim(),
  };
  if (!data.hospitalName) { showToast("病院名を入力してください","error"); return; }
  try {
    const col = BRANCHES[currentBranch].collection;
    if (id) { await db.collection(col).doc(id).update(data); showToast("案件を更新しました"); }
    else { data.createdAt=new Date().toISOString(); await db.collection(col).add(data); showToast("案件を登録しました"); }
    closeModal();
  } catch(err) { console.error(err); showToast("保存に失敗しました","error"); }
}

// =============================================
// 削除モーダル
// =============================================
let pendingDeleteId = null;
function openDeleteModal(id) {
  pendingDeleteId=id;
  document.getElementById("deletePassword").value="";
  document.getElementById("deleteError").textContent="";
  document.getElementById("deleteModal").classList.add("open");
  setTimeout(()=>document.getElementById("deletePassword").focus(),100);
}
function closeDeleteModal() { document.getElementById("deleteModal").classList.remove("open"); pendingDeleteId=null; }
async function confirmDelete() {
  if (document.getElementById("deletePassword").value!==DELETE_PASSWORD) {
    document.getElementById("deleteError").textContent="パスワードが違います"; return;
  }
  if (!pendingDeleteId) return;
  try { await db.collection(BRANCHES[currentBranch].collection).doc(pendingDeleteId).delete(); showToast("案件を削除しました"); closeDeleteModal(); }
  catch(err) { showToast("削除に失敗しました","error"); }
}

// =============================================
// JSON 取込
// =============================================
function openImportModal() {
  importData=[];
  document.getElementById("importFileInput").value="";
  document.getElementById("importPreview").style.display="none";
  document.getElementById("importNoData").style.display="none";
  document.getElementById("importError").textContent="";
  document.getElementById("importExecuteBtn").disabled=true;
  document.getElementById("importModal").classList.add("open");
}
function closeImportModal() { document.getElementById("importModal").classList.remove("open"); importData=[]; }

function previewImport(input) {
  const file = input.files[0]; if (!file) return;
  document.getElementById("importError").textContent="";
  document.getElementById("importPreview").style.display="none";
  document.getElementById("importNoData").style.display="none";
  document.getElementById("importExecuteBtn").disabled=true;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let json;
      try { json = JSON.parse(e.target.result); }
      catch(err) { document.getElementById("importError").textContent="JSONの形式が正しくありません: "+err.message; return; }

      if (!Array.isArray(json)) json=[json];

      // フィールドマッピング
      importData = json.map(item=>({
        hospitalName:    String(item.hospitalName||"").trim(),
        goLiveDate:      String(item.goLiveDate||"").trim(),
        newOrExisting:   String(item.newOrExisting||"").trim(),
        smabe:           String(item.smabe||"").trim(),
        mainPerson:      String(item.mainPerson||"").trim(),
        subPerson:       String(item.subPerson||"").trim(),
        currentTask:     parseInt(item.currentTask)||0,
        keieiShukai:     String(item.keieiShukai||"").trim(),
        kyokaBedNum:     String(item.kyokaBedNum||"").trim(),
        byokoKosei:      String(item.byokoKosei||"").trim(),
        donyuByoko:      String(item.donyuByoko||"").trim(),
        donyuBedNum:     String(item.donyuBedNum||"").trim(),
        bedsideTerminal: String(item.bedsideTerminal||"").trim(),
        stationTerminal: String(item.stTerminal||item.stationTerminal||"").trim(),
        nemiriScan:      String(item.nemiriScan||"").trim(),
        rishoCatch:      String(item.rishoCatch||"").trim(),
        wifiNav:         String(item.wifiNav||"").trim(),
        tabletPos:       String(item.tabletPos||"").trim(),
        electronicKarte: String(item.electronicKarte||"").trim(),
        nurseCall:       String(item.nurseCall||"").trim(),
        shuhenRenkei:    String(item.shuhenRenkei||"").trim(),
        ankenGaiyou:     String(item.ankenGaiyou||"").trim(),
        scheduleStatus:  String(item.scheduleStatus||"").trim(),
        memo:            String(item.memo||"").trim(),
        createdAt:       new Date().toISOString(),
      })).filter(d=>d.hospitalName);

      if (importData.length===0) { document.getElementById("importNoData").style.display="block"; return; }

      document.getElementById("importCount").textContent=importData.length;
      document.getElementById("importPreviewBody").innerHTML=importData.map(d=>`
        <tr style="border-bottom:1px solid #f0f2f5;">
          <td style="padding:7px 10px;font-weight:600;">${escapeHtml(d.hospitalName)}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.mainPerson||"―")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.subPerson||"―")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.goLiveDate||"未設定")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.kyokaBedNum||"―")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.newOrExisting||"―")}</td>
          <td style="padding:7px 10px;">${escapeHtml(d.smabe||"―")}</td>
        </tr>`).join("");
      document.getElementById("importPreview").style.display="block";
      document.getElementById("importExecuteBtn").disabled=false;
    } catch(err) { console.error(err); document.getElementById("importError").textContent="読み込みに失敗しました: "+err.message; }
  };
  reader.readAsText(file,"utf-8");
}

async function executeImport() {
  if (!importData.length) return;
  const btn = document.getElementById("importExecuteBtn");
  btn.disabled=true; btn.textContent="取込中...";
  const col = BRANCHES[currentBranch].collection;
  let ok=0, ng=0;
  for (const item of importData) {
    try { await db.collection(col).add(item); ok++; }
    catch(err) { console.error(err); ng++; }
  }
  btn.textContent="取込実行";
  closeImportModal();
  showToast(ng===0?`✅ ${ok}件取込みました`:`⚠️ ${ok}件成功、${ng}件失敗`, ng===0?"success":"error");
}

// =============================================
// 検索・フィルタ
// =============================================
function updateStaffFilter() {
  const sorted = getProjectStaffCandidates();
  const sel = document.getElementById("staffFilter");
  const current = sel.value; // 現在の選択を保持
  sel.innerHTML = `<option value="">全員表示</option>` +
    sorted.map(s=>`<option value="${s}">${s}</option>`).join("");
  // 以前の選択値が引き続き存在すれば復元
  if (current && sorted.includes(current)) sel.value = current;
  else filterPerson = "";
}

function getProjectStaffCandidates() {
  const staffSet = new Set();
  allProjects.forEach(p => {
    if (p.mainPerson && p.mainPerson.trim()) staffSet.add(p.mainPerson.trim());
    if (p.subPerson  && p.subPerson.trim())  staffSet.add(p.subPerson.trim());
  });
  const sorted = Array.from(staffSet).filter(s=>s&&s!=="その他").sort();
  if (staffSet.has("その他")) sorted.push("その他");
  return sorted;
}

// =============================================
// ユーティリティ
// =============================================
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function showToast(msg, type="success") {
  const toast = document.getElementById("toast");
  toast.textContent=msg; toast.className=`toast toast-${type} show`;
  setTimeout(()=>toast.classList.remove("show"),3000);
}

// =============================================
// 初期化
// =============================================
document.addEventListener("DOMContentLoaded",()=>{
  const taskSel = document.getElementById("formCurrentTask");
  taskSel.innerHTML=TASKS.map((t,i)=>`<option value="${i}">${t}</option>`).join("")+
    `<option value="${TASKS.length}">完了（全工程終了）</option>`;

  const saved = new URLSearchParams(window.location.search).get("branch") || localStorage.getItem("selectedBranch");
  if (saved&&BRANCHES[saved]) { currentBranch=saved; document.getElementById("branchSelect").value=saved; }

  document.getElementById("searchInput").addEventListener("input",e=>{ searchQuery=e.target.value; renderProjects(); });
  document.getElementById("staffFilter").addEventListener("change",e=>{ filterPerson=e.target.value; renderProjects(); });
  document.getElementById("branchSelect").addEventListener("change",e=>{
    document.getElementById("searchInput").value=""; searchQuery="";
    switchBranch(e.target.value);
  });
  document.getElementById("projectForm").addEventListener("submit",saveProject);
  ["projectModal","deleteModal","detailModal","importModal"].forEach(id=>{
    document.getElementById(id).addEventListener("click",e=>{
      if (e.target.id===id) {
        if (id==="projectModal") closeModal();
        else if (id==="deleteModal") closeDeleteModal();
        else if (id==="detailModal") closeDetailModal();
        else if (id==="importModal") closeImportModal();
      }
    });
  });
  document.getElementById("deletePassword").addEventListener("keydown",e=>{ if(e.key==="Enter") confirmDelete(); });

  switchBranch(currentBranch);
});
