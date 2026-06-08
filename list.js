// =============================================
// 統合版 全ステータス一覧 - list.js
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

let currentBranch = "nagoya";
let allProjects = [];
let searchQuery = "", filterPerson = "", filterStatus = "";
let unsubscribe = null;

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

function statusLabel(status) {
  switch(status) {
    case "delay":     return {text:"遅延",cls:"badge badge-delay"};
    case "warning":   return {text:"注意",cls:"badge badge-warning"};
    case "completed": return {text:"完了",cls:"badge badge-completed"};
    default:          return {text:"正常",cls:"badge badge-normal"};
  }
}

function renderTable() {
  const tbody = document.getElementById("tableBody");
  let filtered = allProjects.filter(p=>{
    const q = searchQuery.toLowerCase();
    const matchName = p.hospitalName?.toLowerCase().includes(q)??false;
    const matchPerson = !filterPerson||p.mainPerson===filterPerson||p.subPerson===filterPerson;
    const status = checkDelay(p);
    const normStatus = status===""?"normal":status;
    const matchStatus = !filterStatus||normStatus===filterStatus;
    return matchName&&matchPerson&&matchStatus;
  });
  const priority = {delay:0,warning:1,"":2,completed:3};
  filtered.sort((a,b)=>{
    const pa=priority[checkDelay(a)],pb=priority[checkDelay(b)];
    if (pa!==pb) return pa-pb;
    return new Date(a.goLiveDate)-new Date(b.goLiveDate);
  });
  document.getElementById("projectCount").textContent=`${filtered.length} 件`;
  if (filtered.length===0) { tbody.innerHTML=`<tr><td colspan="8" class="loading-cell">該当する案件がありません</td></tr>`; return; }
  tbody.innerHTML = filtered.map(p=>{
    const status = checkDelay(p);
    const {text,cls} = statusLabel(status);
    const isCompleted = p.currentTask>=TASKS.length;
    const taskLabel = isCompleted?"✅ 全工程完了":(TASKS[p.currentTask]||"―");
    const live = new Date(p.goLiveDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const d = p.goLiveDate?Math.ceil((live-today)/(1000*60*60*24)):null;
    const liveFormatted = p.goLiveDate?live.toLocaleDateString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit"}):"―";
    let daysText="―",daysCls="";
    if (d!==null) {
      if (d>0) daysText=`${d} 日`;
      else if (d===0) {daysText="本日";daysCls="days-today";}
      else {daysText=`+${Math.abs(d)} 日経過`;daysCls="days-past";}
    }
    return `<tr class="table-row-${status||'normal'}">
      <td><span class="${cls}">${text}</span></td>
      <td class="cell-hospital cell-clickable" onclick="openDetailModal('${p.id}')">${escapeHtml(p.hospitalName)}</td>
      <td>${liveFormatted}</td>
      <td class="${daysCls}">${daysText}</td>
      <td class="cell-task">${taskLabel}</td>
      <td>${escapeHtml(p.mainPerson||"―")}</td>
      <td>${escapeHtml(p.subPerson||"―")}</td>
      <td class="cell-memo">${escapeHtml(p.memo||"")}</td>
    </tr>`;
  }).join("");
}

function initFirestore() {
  if (unsubscribe) unsubscribe();
  unsubscribe = db.collection(BRANCHES[currentBranch].collection)
    .orderBy("goLiveDate","asc")
    .onSnapshot(snapshot=>{
      allProjects = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
      updateStaffFilter(); renderTable();
    }, err=>{
      console.error(err);
      document.getElementById("tableBody").innerHTML=`<tr><td colspan="8" class="loading-cell">データ取得に失敗しました</td></tr>`;
    });
}

function switchBranch(branchKey) {
  currentBranch = branchKey;
  const branch = BRANCHES[branchKey];
  // ヘッダーは白固定
  document.getElementById("backBtn").href=`index.html?branch=${branchKey}`;
  updateStaffFilter();
  filterPerson=""; filterStatus="";
  document.getElementById("staffFilter").value="";
  document.getElementById("statusFilter").value="";
  initFirestore();
  localStorage.setItem("selectedBranch", branchKey);
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace("#",""),16);
  const r = Math.min(255,Math.max(0,(num>>16)+amount));
  const g = Math.min(255,Math.max(0,((num>>8)&0xff)+amount));
  const b = Math.min(255,Math.max(0,(num&0xff)+amount));
  return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
}

function updateStaffFilter() {
  const staffSet = new Set();
  allProjects.forEach(p => {
    if (p.mainPerson && p.mainPerson.trim()) staffSet.add(p.mainPerson.trim());
    if (p.subPerson  && p.subPerson.trim())  staffSet.add(p.subPerson.trim());
  });
  const sorted = Array.from(staffSet).filter(s=>s&&s!=="その他").sort();
  if (staffSet.has("その他")) sorted.push("その他");
  const sel = document.getElementById("staffFilter");
  const current = sel.value;
  sel.innerHTML = `<option value="">全員表示</option>` +
    sorted.map(s=>`<option value="${s}">${s}</option>`).join("");
  if (current && sorted.includes(current)) sel.value = current;
  else filterPerson = "";
}

function openDetailModal(id) {
  const p = allProjects.find(x=>x.id===id); if (!p) return;
  document.getElementById("detailTitle").textContent=p.hospitalName||"施設詳細";
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

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

document.addEventListener("DOMContentLoaded",()=>{
  const params = new URLSearchParams(window.location.search);
  const saved = params.get("branch")||localStorage.getItem("selectedBranch");
  if (saved&&BRANCHES[saved]) { currentBranch=saved; document.getElementById("branchSelect").value=saved; }

  document.getElementById("searchInput").addEventListener("input",e=>{ searchQuery=e.target.value; renderTable(); });
  document.getElementById("staffFilter").addEventListener("change",e=>{ filterPerson=e.target.value; renderTable(); });
  document.getElementById("statusFilter").addEventListener("change",e=>{ filterStatus=e.target.value; renderTable(); });
  document.getElementById("branchSelect").addEventListener("change",e=>{ document.getElementById("searchInput").value=""; searchQuery=""; switchBranch(e.target.value); });
  document.getElementById("detailModal").addEventListener("click",e=>{ if(e.target.id==="detailModal") closeDetailModal(); });

  switchBranch(currentBranch);
});
