/* ULTRA GOD MODE: offline-first PWA macro tracker (local-only) */
const $ = (id)=>document.getElementById(id);
/* ===== ULTRA GOD MODE SETTINGS ===== */

const START_DATE = "2026-01-14";   // Day 1
const SKIP_DAYS = [16];            // Days to ignore
const AUTO_DAY_NUMBER = true;      // Auto calculate day number
const DEFAULT_GOALS = { calories:2700, protein:205, carbs:300, fat:75, satFat:16, fiber:30, solFiber:13 };
const STORAGE = { goals:"macroGoalsV1", entries:"macroEntriesV1" };
/* ===== ELITE AUTO MODE ===== */
function calculateTotals(entries) {

  return entries.reduce((total, item) => {

    total.calories += Number(item.calories || 0);
    total.protein += Number(item.protein || 0);
    total.carbs += Number(item.carbs || 0);
    total.fat += Number(item.fat || 0);
    total.fiber += Number(item.fiber || 0);
    total.solubleFiber += Number(item.solubleFiber || 0);
    total.satFat += Number(item.satFat || 0);

    return total;

  }, {
    calories:0,
    protein:0,
    carbs:0,
    fat:0,
    fiber:0,
    solubleFiber:0,
    satFat:0
  });

}
function getDayNumber() {
function autoEntryNumber(entriesToday) {

  const meals = entriesToday.filter(e => e.type === "Meal").length;
  const snacks = entriesToday.filter(e => e.type === "Snack").length;

  return {
    meal: meals + 1,
    snack: snacks + 1
  };
}
  if (!AUTO_DAY_NUMBER) return null;

  const start = new Date(START_DATE);
  const today = new Date();

  let diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;

  // subtract skipped days
  SKIP_DAYS.forEach(d => {
    if (d <= diff) diff--;
  });

  return diff;
}
function loadGoals(){ try{ return {...DEFAULT_GOALS, ...(JSON.parse(localStorage.getItem(STORAGE.goals))||{})}; }catch(e){ return {...DEFAULT_GOALS}; } }
function saveGoals(goals){ localStorage.setItem(STORAGE.goals, JSON.stringify(goals)); }

function loadEntries(){ try{ return JSON.parse(localStorage.getItem(STORAGE.entries)) || []; }catch(e){ return []; } }
function saveEntries(entries){ localStorage.setItem(STORAGE.entries, JSON.stringify(entries)); }

function todayISO(){ const d=new Date(); const tzOff=d.getTimezoneOffset(); const local=new Date(d.getTime()-tzOff*60*1000); return local.toISOString().slice(0,10); }
function num(v){ const n=parseFloat(String(v||"").replace(/[^0-9.\-]/g,"")); return isFinite(n)?n:0; }
function fmt(n){ return (Math.round(n*10)/10).toString(); }

function setStatus(){ const online=navigator.onLine; $("statusPill").textContent = online ? "Online" : "Offline"; $("statusPill").className = "pill " + (online ? "goodText" : "warnText"); }
window.addEventListener("online", setStatus); window.addEventListener("offline", setStatus);

function setHeaderPills(date, day){ $("dayPill").textContent="Day: "+(day||"—"); $("datePill").textContent="Date: "+(date||"—"); }

function entriesForDate(date){ return loadEntries().filter(e=>e.date===date); }

function sumTotals(list){ return list.reduce((a,e)=>{ a.calories+=num(e.calories); a.protein+=num(e.protein); a.carbs+=num(e.carbs); a.fat+=num(e.fat); a.fiber+=num(e.fiber); a.solFiber+=num(e.solFiber); a.satFat+=num(e.satFat); return a; }, {calories:0,protein:0,carbs:0,fat:0,fiber:0,solFiber:0,satFat:0}); }

function computeRemaining(t,g){ return { calories:g.calories-t.calories, protein:g.protein-t.protein, carbs:g.carbs-t.carbs, fat:g.fat-t.fat, fiber:g.fiber-t.fiber, solFiber:g.solFiber-t.solFiber, satFat:g.satFat-t.satFat }; }

function meterColor(k, totals, goals){
  if(k==="satFat") return totals.satFat<=goals.satFat ? "#10b981" : "#ef4444";
  const g=goals[k], t=totals[k]; if(g<=0) return "#10b981";
  const pct=t/g; if(pct>=1) return "#10b981"; if(pct>=.75) return "#f59e0b"; return "#3b82f6";
}

function renderBars(totals, goals){
  const bars=$("bars"); bars.innerHTML="";
  const items=[["calories","Calories"],["protein","Protein (g)"],["carbs","Carbs (g)"],["fat","Fat (g)"],["fiber","Fiber (g)"],["solFiber","Soluble Fiber (g)"],["satFat","Sat Fat (g max)"]];
  items.forEach(([k,label])=>{
    const g=goals[k], t=totals[k], rem=g-t;
    const pct=g>0?Math.min(1,Math.max(0,t/g)):0;
    const color=meterColor(k, totals, goals);
    const div=document.createElement("div");
    div.className="bar";
    div.innerHTML=`<div class="top"><b>${label}</b><small>${fmt(t)} / ${fmt(g)} • Remaining: ${fmt(rem)}</small></div><div class="meter"><div class="fill" style="width:${pct*100}%;background:${color}"></div></div>`;
    bars.appendChild(div);
  });
}

function renderAlerts(totals, goals){
  const rem=computeRemaining(totals, goals);
  const lines=[];
  if(totals.satFat>goals.satFat) lines.push(`Sat fat over by ${fmt(-rem.satFat)}g (LDL risk).`);
  if(totals.fiber<goals.fiber) lines.push(`Fiber remaining: ${fmt(rem.fiber)}g.`);
  if(totals.solFiber<goals.solFiber) lines.push(`Soluble fiber remaining: ${fmt(rem.solFiber)}g.`);
  $("alerts").textContent = lines.length ? "Alerts: "+lines.join(" ") : "Alerts: Looking good.";
  $("alerts").className = "note " + (lines.length ? "warnText" : "goodText");
}

function renderTable(list){
  const tbody=$("entryTable").querySelector("tbody"); tbody.innerHTML="";
  list.slice().sort((a,b)=> (a.mealType||"").localeCompare(b.mealType||"") || num(a.entryNum)-num(b.entryNum) || (a.createdAt||"").localeCompare(b.createdAt||""))
  .forEach(e=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${new Date(e.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td><td>${e.mealType} ${e.entryNum||""}</td><td>${e.foodName}${e.qty?` (${e.qty} ${e.unit||""})`:``}</td><td>${fmt(num(e.calories))}</td><td>${fmt(num(e.protein))}</td><td>${fmt(num(e.carbs))}</td><td>${fmt(num(e.fat))}</td><td>${fmt(num(e.fiber))}</td><td>${fmt(num(e.solFiber))}</td><td>${fmt(num(e.satFat))}</td>`;
    tr.addEventListener("click", ()=> editEntry(e.id));
    tbody.appendChild(tr);
  });
}

function refresh(){
  const date=$("logDate").value || todayISO();
  const day=$("dayNum").value || "";
  setHeaderPills(date, day);
  const goals=loadGoals();
  const list=entriesForDate(date);
  const totals=sumTotals(list);
  $("totalsSub").textContent = `Totals: ${fmt(totals.calories)} kcal • P ${fmt(totals.protein)} • C ${fmt(totals.carbs)} • F ${fmt(totals.fat)}`;
  renderBars(totals, goals);
  renderAlerts(totals, goals);
  renderTable(list);
}

function clearForm(){ ["foodName","unit","cal","pro","carb","fat","fiber","solFiber","satFat","link","notes"].forEach(id=>$(id).value=""); $("qty").value="1"; }

function addEntry(){
  const date=$("logDate").value || todayISO();
  const entry={
    id: crypto.randomUUID(),
    date,
    dayNum: $("dayNum").value.trim(),
    mealType: $("mealType").value,
    entryNum: $("entryNum").value.trim(),
    foodName: $("foodName").value.trim(),
    qty: $("qty").value.trim(),
    unit: $("unit").value.trim(),
    calories: num($("cal").value),
    protein: num($("pro").value),
    carbs: num($("carb").value),
    fat: num($("fat").value),
    fiber: num($("fiber").value),
    solFiber: num($("solFiber").value),
    satFat: num($("satFat").value),
    link: $("link").value.trim(),
    notes: $("notes").value.trim(),
    createdAt: new Date().toISOString()
  };
  if(!entry.foodName){ alert("Add a food name."); return; }
  const entries=loadEntries(); entries.push(entry); saveEntries(entries);
  clearForm(); refresh();
}

function editEntry(id){
  const entries=loadEntries(); const idx=entries.findIndex(e=>e.id===id); if(idx<0) return;
  const e=entries[idx];
  const action=prompt("Type: EDIT to load into form, DELETE to remove.","EDIT");
  if(!action) return;
  if(action.toUpperCase()==="DELETE"){
    if(confirm("Delete this entry?")){ entries.splice(idx,1); saveEntries(entries); refresh(); }
    return;
  }
  if(action.toUpperCase()==="EDIT"){
    $("logDate").value=e.date; $("dayNum").value=e.dayNum||""; $("mealType").value=e.mealType||"Meal"; $("entryNum").value=e.entryNum||"";
    $("foodName").value=e.foodName||""; $("qty").value=e.qty||"1"; $("unit").value=e.unit||"";
    $("cal").value=e.calories||0; $("pro").value=e.protein||0; $("carb").value=e.carbs||0; $("fat").value=e.fat||0;
    $("fiber").value=e.fiber||0; $("solFiber").value=e.solFiber||0; $("satFat").value=e.satFat||0;
    $("link").value=e.link||""; $("notes").value=e.notes||"";
    if(confirm("Update this entry with the values now in the form?")){
      const updated={...e,
        date:$("logDate").value||e.date, dayNum:$("dayNum").value.trim(), mealType:$("mealType").value, entryNum:$("entryNum").value.trim(),
        foodName:$("foodName").value.trim(), qty:$("qty").value.trim(), unit:$("unit").value.trim(),
        calories:num($("cal").value), protein:num($("pro").value), carbs:num($("carb").value), fat:num($("fat").value),
        fiber:num($("fiber").value), solFiber:num($("solFiber").value), satFat:num($("satFat").value),
        link:$("link").value.trim(), notes:$("notes").value.trim()
      };
      entries[idx]=updated; saveEntries(entries); clearForm(); refresh();
    }
  }
}

function resetDay(){
  const date=$("logDate").value || todayISO();
  if(!confirm(`Delete ALL entries for ${date}?`)) return;
  saveEntries(loadEntries().filter(e=>e.date!==date));
  refresh();
}

function exportCSV(){
  const entries=loadEntries();
  if(!entries.length){ alert("No entries to export."); return; }
  const cols=["date","dayNum","mealType","entryNum","foodName","qty","unit","calories","protein","carbs","fat","fiber","solFiber","satFat","link","notes","createdAt"];
  const lines=[cols.join(",")];
  entries.forEach(e=>{
    const row=cols.map(k=>`"${(e[k]??"").toString().replaceAll('"','""')}"`).join(",");
    lines.push(row);
  });
  const blob=new Blob([lines.join("\n")],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="macro_entries.csv"; a.click(); URL.revokeObjectURL(url);
}

function goalsModal(open){ $("goalsModal").classList.toggle("hide", !open); }
function loadGoalsToUI(){
  const g=loadGoals();
  $("gCal").value=g.calories; $("gPro").value=g.protein; $("gCarb").value=g.carbs; $("gFat").value=g.fat;
  $("gFiber").value=g.fiber; $("gSolFiber").value=g.solFiber; $("gSatFat").value=g.satFat;
}
function saveGoalsFromUI(){
  const g={ calories:num($("gCal").value), protein:num($("gPro").value), carbs:num($("gCarb").value), fat:num($("gFat").value),
            fiber:num($("gFiber").value), solFiber:num($("gSolFiber").value), satFat:num($("gSatFat").value) };
  saveGoals(g); goalsModal(false); refresh();
}

// Barcode scan (optional) via BarcodeDetector
let stream=null;
async function scanBarcode(){
  if(!("BarcodeDetector" in window)){
    alert("Barcode scan not supported here. You can still type the barcode into Food name.");
    return;
  }
  try{
    const detector=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128"]});
    const video=document.createElement("video");
    video.style.position="fixed"; video.style.inset="0"; video.style.width="100%"; video.style.height="100%"; video.style.objectFit="cover";
    video.style.zIndex="9999"; video.style.background="#000";
    document.body.appendChild(video);

    const closeBtn=document.createElement("button");
    closeBtn.textContent="Close"; closeBtn.className="btn";
    closeBtn.style.position="fixed"; closeBtn.style.top="14px"; closeBtn.style.right="14px"; closeBtn.style.zIndex="10000";
    document.body.appendChild(closeBtn);

    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    video.srcObject=stream; await video.play();

    const tick=async ()=>{
      if(!stream) return;
      try{
        const codes=await detector.detect(video);
        if(codes.length){
          const code=codes[0].rawValue;
          $("foodName").value = ($("foodName").value ? $("foodName").value + " " : "") + `[BARCODE ${code}]`;
          stopScan(video, closeBtn);
          alert("Captured barcode. Add macros now, or look it up later when online.");
          return;
        }
      }catch(e){}
      requestAnimationFrame(tick);
    };
    closeBtn.onclick=()=>stopScan(video, closeBtn);
    tick();
  }catch(err){ alert("Camera permission needed to scan barcode."); }
}
function stopScan(video, closeBtn){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  video?.remove(); closeBtn?.remove();
}

function shiftDate(days){
  const d=new Date($("logDate").value || todayISO());
  d.setDate(d.getDate()+days);
  const tzOff=d.getTimezoneOffset();
  const local=new Date(d.getTime()-tzOff*60*1000);
  $("logDate").value=local.toISOString().slice(0,10);
  refresh();
}

function init(){
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
  setStatus();
  $("logDate").value=todayISO();
  loadGoalsToUI();

  $("addBtn").onclick=addEntry;
  $("resetBtn").onclick=resetDay;
  $("exportBtn").onclick=exportCSV;
  $("scanBtn").onclick=scanBarcode;

  $("todayBtn").onclick=()=>{$("logDate").value=todayISO(); refresh();};
  $("prevDayBtn").onclick=()=>shiftDate(-1);
  $("nextDayBtn").onclick=()=>shiftDate(1);

  $("goalsBtn").onclick=()=>{loadGoalsToUI(); goalsModal(true);};
  $("closeGoalsBtn").onclick=()=>goalsModal(false);
  $("saveGoalsBtn").onclick=saveGoalsFromUI;

  ["logDate","dayNum"].forEach(id=>$(id).addEventListener("change", refresh));
  refresh();
}
init();
