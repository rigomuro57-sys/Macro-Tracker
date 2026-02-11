// ELITE ON-DEVICE AUTO MODE (no external APIs).
// Auto-macros works from YOUR Food Library stored on the phone.
// First time: save a food once (or scan barcode + save). After that: just type it.

const $ = (id)=>document.getElementById(id);

const SETTINGS = {
  START_DATE: "2026-01-14", // Day 1
  SKIP_DAYS: [16],         // Days to ignore in numbering
  AUTO_DAY_NUMBER: true
};

const DEFAULT_GOALS = { calories:2700, protein:205, carbs:300, fat:75, satFat:16, fiber:30, solFiber:13 };

const STORAGE = {
  goals: "macroGoalsV2",
  entries: "macroEntriesV2",
  foods: "macroFoodsV1"
};

function num(v){ const n=parseFloat(String(v??"").replace(/[^0-9.\-]/g,"")); return isFinite(n)?n:0; }
function fmt(n){ return (Math.round(n*10)/10).toString(); }

function todayISO(){
  const d=new Date(); const off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60*1000).toISOString().slice(0,10);
}

function loadGoals(){
  try{ return {...DEFAULT_GOALS, ...(JSON.parse(localStorage.getItem(STORAGE.goals))||{})}; }
  catch(e){ return {...DEFAULT_GOALS}; }
}
function saveGoals(goals){ localStorage.setItem(STORAGE.goals, JSON.stringify(goals)); }

function loadEntries(){
  try{ return JSON.parse(localStorage.getItem(STORAGE.entries)) || []; }
  catch(e){ return []; }
}
function saveEntries(entries){ localStorage.setItem(STORAGE.entries, JSON.stringify(entries)); }

function loadFoods(){
  try{ return JSON.parse(localStorage.getItem(STORAGE.foods)) || []; }
  catch(e){ return []; }
}
function saveFoods(foods){ localStorage.setItem(STORAGE.foods, JSON.stringify(foods)); }

function setStatus(){
  const online=navigator.onLine;
  $("statusPill").textContent = online ? "Online" : "Offline";
  $("statusPill").className = "pill " + (online ? "" : "warnText");
}
window.addEventListener("online", setStatus);
window.addEventListener("offline", setStatus);

function dayNumberFor(dateISO){
  if(!SETTINGS.AUTO_DAY_NUMBER) return "";
  const start=new Date(SETTINGS.START_DATE+"T00:00:00");
  const d=new Date(dateISO+"T00:00:00");
  let diff=Math.floor((d-start)/(1000*60*60*24))+1;
  SETTINGS.SKIP_DAYS.forEach(sk=>{ if(sk<=diff) diff--; });
  return diff>0 ? String(diff) : "";
}

function entriesForDate(dateISO){ return loadEntries().filter(e=>e.date===dateISO); }

function nextEntryNumber(dateISO, mealType){
  const list=entriesForDate(dateISO).filter(e=>e.mealType===mealType);
  return String(list.length+1);
}

function sumTotals(list){
  return list.reduce((a,e)=>{
    a.calories += num(e.calories);
    a.protein  += num(e.protein);
    a.carbs    += num(e.carbs);
    a.fat      += num(e.fat);
    a.fiber    += num(e.fiber);
    a.solFiber += num(e.solFiber);
    a.satFat   += num(e.satFat);
    return a;
  }, {calories:0,protein:0,carbs:0,fat:0,fiber:0,solFiber:0,satFat:0});
}

function meterColor(k, totals, goals){
  if(k==="satFat") return totals.satFat<=goals.satFat ? "#10b981" : "#ef4444";
  const g=goals[k], t=totals[k];
  if(g<=0) return "#10b981";
  const pct=t/g;
  if(pct>=1) return "#10b981";
  if(pct>=.75) return "#f59e0b";
  return "#3b82f6";
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
    div.innerHTML = `<div class="top"><b>${label}</b><small>${fmt(t)} / ${fmt(g)} • Remaining: ${fmt(rem)}</small></div><div class="meter"><div class="fill" style="width:${pct*100}%;background:${color}"></div></div>`;
    bars.appendChild(div);
  });
}

function renderAlerts(totals, goals){
  const lines=[];
  if(totals.satFat>goals.satFat) lines.push(`Sat fat over by ${fmt(totals.satFat-goals.satFat)}g (LDL risk).`);
  if(totals.fiber<goals.fiber) lines.push(`Fiber remaining: ${fmt(goals.fiber-totals.fiber)}g.`);
  if(totals.solFiber<goals.solFiber) lines.push(`Soluble fiber remaining: ${fmt(goals.solFiber-totals.solFiber)}g.`);
  $("alerts").textContent = lines.length ? "Alerts: "+lines.join(" ") : "Alerts: Looking good.";
  $("alerts").className = "note " + (lines.length ? "warnText" : "");
}

function setHeaderPills(dateISO){
  $("datePill").textContent = "Date: "+dateISO;
  $("dayPill").textContent = "Day: "+(dayNumberFor(dateISO)||"—");
  $("libPill").textContent = "Food Library: "+loadFoods().length;
}

function renderEntriesTable(list){
  const tbody=$("entryTable").querySelector("tbody");
  tbody.innerHTML="";
  list.slice().sort((a,b)=> (a.mealType||"").localeCompare(b.mealType||"") || num(a.entryNum)-num(b.entryNum) || (a.createdAt||"").localeCompare(b.createdAt||""))
  .forEach(e=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${new Date(e.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td><td>${e.mealType} ${e.entryNum}</td><td>${e.foodName} × ${fmt(num(e.servings))}</td><td>${fmt(num(e.calories))}</td><td>${fmt(num(e.protein))}</td><td>${fmt(num(e.carbs))}</td><td>${fmt(num(e.fat))}</td><td>${fmt(num(e.fiber))}</td><td>${fmt(num(e.solFiber))}</td><td>${fmt(num(e.satFat))}</td>`;
    tr.addEventListener("click", ()=> editEntry(e.id));
    tbody.appendChild(tr);
  });
}

function refreshFoodPicker(){
  const foods=loadFoods().sort((a,b)=>a.name.localeCompare(b.name));
  const sel=$("foodPick");
  sel.innerHTML = `<option value="">—</option>` + foods.map(f=>`<option value="${f.id}">${f.name}</option>`).join("");
}

function refreshDashboard(){
  const dateISO=$("logDate").value || todayISO();
  setHeaderPills(dateISO);

  const goals=loadGoals();
  const list=entriesForDate(dateISO);
  const totals=sumTotals(list);
  $("totalsSub").textContent = `Totals: ${fmt(totals.calories)} kcal • P ${fmt(totals.protein)} • C ${fmt(totals.carbs)} • F ${fmt(totals.fat)}`;
  renderBars(totals, goals);
  renderAlerts(totals, goals);
  renderEntriesTable(list);

  $("dayNum").value = dayNumberFor(dateISO) || "";
  $("entryNum").value = nextEntryNumber(dateISO, $("mealType").value);
  refreshFoodPicker();
}

function applyFoodToFields(food, servings=1){
  $("cal").value = fmt(num(food.calories)*servings);
  $("pro").value = fmt(num(food.protein)*servings);
  $("carb").value= fmt(num(food.carbs)*servings);
  $("fat").value = fmt(num(food.fat)*servings);
  $("fiber").value = fmt(num(food.fiber)*servings);
  $("solFiber").value = fmt(num(food.solFiber)*servings);
  $("satFat").value = fmt(num(food.satFat)*servings);
}

function bestMatchFood(query){
  const q=(query||"").toLowerCase().trim();
  if(!q) return null;
  const foods=loadFoods();

  const bcMatch = q.match(/\[barcode\s+([0-9]+)\]/i);
  if(bcMatch){
    const code=bcMatch[1];
    return foods.find(f=>f.barcode===code) || null;
  }
  let best=null; let bestScore=0;
  foods.forEach(f=>{
    const name=f.name.toLowerCase();
    let score=0;
    if(name===q) score=100;
    else if(name.includes(q)) score=70;
    else {
      const toks=q.split(/\s+/).filter(Boolean);
      const hits=toks.filter(t=>name.includes(t)).length;
      score = hits*10;
    }
    if(score>bestScore){ bestScore=score; best=f; }
  });
  return bestScore>=20 ? best : null;
}

function handleQuickMatch(){
  const q=$("quickText").value;
  const servings=num($("servings").value)||1;
  const match=bestMatchFood(q);
  if(match) applyFoodToFields(match, servings);
}

function handlePick(){
  const pickId=$("foodPick").value;
  const servings=num($("servings").value)||1;
  if(!pickId) return;
  const food=loadFoods().find(f=>f.id===pickId);
  if(food){
    $("quickText").value = food.name;
    applyFoodToFields(food, servings);
  }
}

function clearLogFields(){
  ["quickText","cal","pro","carb","fat","fiber","solFiber","satFat","notes"].forEach(id=>$(id).value="");
  $("servings").value="1";
  $("foodPick").value="";
}

function addEntry(){
  const dateISO=$("logDate").value || todayISO();
  const mealType=$("mealType").value;
  const entryNum=nextEntryNumber(dateISO, mealType);
  const servings=num($("servings").value) || 1;

  let foodName = $("quickText").value.trim();
  if(!foodName){ alert("Type what you're eating or pick a food."); return; }

  const entry = {
    id: crypto.randomUUID(),
    date: dateISO,
    dayNum: dayNumberFor(dateISO),
    mealType,
    entryNum,
    foodName,
    servings,
    calories: num($("cal").value),
    protein:  num($("pro").value),
    carbs:    num($("carb").value),
    fat:      num($("fat").value),
    fiber:    num($("fiber").value),
    solFiber: num($("solFiber").value),
    satFat:   num($("satFat").value),
    notes: $("notes").value.trim(),
    createdAt: new Date().toISOString()
  };
  const entries=loadEntries();
  entries.push(entry);
  saveEntries(entries);
  clearLogFields();
  refreshDashboard();
}

function editEntry(id){
  const entries=loadEntries();
  const idx=entries.findIndex(e=>e.id===id);
  if(idx<0) return;
  const e=entries[idx];
  const action=prompt("Type: EDIT to load, DELETE to remove.","EDIT");
  if(!action) return;
  if(action.toUpperCase()==="DELETE"){
    if(confirm("Delete this entry?")){
      entries.splice(idx,1);
      saveEntries(entries);
      refreshDashboard();
    }
    return;
  }
  if(action.toUpperCase()==="EDIT"){
    $("logDate").value = e.date;
    $("mealType").value = e.mealType;
    $("quickText").value = e.foodName;
    $("servings").value = fmt(num(e.servings)||1);
    $("cal").value = fmt(num(e.calories));
    $("pro").value = fmt(num(e.protein));
    $("carb").value = fmt(num(e.carbs));
    $("fat").value = fmt(num(e.fat));
    $("fiber").value = fmt(num(e.fiber));
    $("solFiber").value = fmt(num(e.solFiber));
    $("satFat").value = fmt(num(e.satFat));
    $("notes").value = e.notes||"";
    if(confirm("Update this entry with the form values?")){
      const updated = {...e,
        date: $("logDate").value || e.date,
        mealType: $("mealType").value,
        foodName: $("quickText").value.trim() || e.foodName,
        servings: num($("servings").value)||1,
        calories: num($("cal").value),
        protein: num($("pro").value),
        carbs: num($("carb").value),
        fat: num($("fat").value),
        fiber: num($("fiber").value),
        solFiber: num($("solFiber").value),
        satFat: num($("satFat").value),
        notes: $("notes").value.trim()
      };
      entries[idx]=updated;
      saveEntries(entries);
      clearLogFields();
      refreshDashboard();
    }
  }
}

function resetDay(){
  const dateISO=$("logDate").value || todayISO();
  if(!confirm("Delete ALL entries for "+dateISO+"?")) return;
  saveEntries(loadEntries().filter(e=>e.date!==dateISO));
  refreshDashboard();
}

function exportCSV(){
  const entries=loadEntries();
  if(!entries.length){ alert("No entries."); return; }
  const cols=["date","dayNum","mealType","entryNum","foodName","servings","calories","protein","carbs","fat","fiber","solFiber","satFat","notes","createdAt"];
  const lines=[cols.join(",")];
  entries.forEach(e=>{
    const row=cols.map(k=>`"${(e[k]??"").toString().replaceAll('"','""')}"`).join(",");
    lines.push(row);
  });
  const blob=new Blob([lines.join("\n")],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="macro_entries.csv"; a.click(); URL.revokeObjectURL(url);
}

function upsertFood(food){
  const foods=loadFoods();
  const existing = foods.find(f=>f.name.toLowerCase()===food.name.toLowerCase()) || null;
  const id = existing ? existing.id : crypto.randomUUID();
  const idx = foods.findIndex(f=>f.id===id);
  const obj={
    id,
    name: food.name.trim(),
    barcode: (food.barcode||"").trim(),
    calories:num(food.calories), protein:num(food.protein), carbs:num(food.carbs), fat:num(food.fat),
    fiber:num(food.fiber), solFiber:num(food.solFiber), satFat:num(food.satFat)
  };
  if(idx>=0) foods[idx]=obj; else foods.push(obj);
  saveFoods(foods);
}

function addOrUpdateFoodFromLibraryForm(){
  const name=$("fName").value.trim();
  if(!name){ alert("Food name required."); return; }
  upsertFood({
    name,
    barcode: $("fBarcode").value.trim(),
    calories: num($("fCal").value),
    protein: num($("fPro").value),
    carbs: num($("fCarb").value),
    fat: num($("fFat").value),
    fiber: num($("fFiber").value),
    solFiber: num($("fSolFiber").value),
    satFat: num($("fSatFat").value)
  });
  $("fName").value=""; $("fBarcode").value="";
  ["fCal","fPro","fCarb","fFat","fFiber","fSolFiber","fSatFat"].forEach(id=>$(id).value="");
  renderFoodTable();
  refreshDashboard();
}

function renderFoodTable(){
  const tbody=$("foodTable").querySelector("tbody"); tbody.innerHTML="";
  loadFoods().sort((a,b)=>a.name.localeCompare(b.name)).forEach(f=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${f.name}</td><td>${f.barcode||""}</td><td>${fmt(f.calories)}</td><td>${fmt(f.protein)}</td><td>${fmt(f.carbs)}</td><td>${fmt(f.fat)}</td><td>${fmt(f.fiber)}</td><td>${fmt(f.solFiber)}</td><td>${fmt(f.satFat)}</td>`;
    tr.addEventListener("click", ()=>{
      const action=prompt("Type DELETE to remove, or EDIT to load into form.","EDIT");
      if(!action) return;
      if(action.toUpperCase()==="DELETE"){
        if(confirm("Delete food "+f.name+"?")){
          saveFoods(loadFoods().filter(x=>x.id!==f.id));
          renderFoodTable(); refreshDashboard();
        }
      } else if(action.toUpperCase()==="EDIT"){
        $("fName").value=f.name; $("fBarcode").value=f.barcode||"";
        $("fCal").value=fmt(f.calories); $("fPro").value=fmt(f.protein); $("fCarb").value=fmt(f.carbs); $("fFat").value=fmt(f.fat);
        $("fFiber").value=fmt(f.fiber); $("fSolFiber").value=fmt(f.solFiber); $("fSatFat").value=fmt(f.satFat);
      }
    });
    tbody.appendChild(tr);
  });
}

function saveAsFoodFromLog(){
  const raw=$("quickText").value.trim();
  if(!raw){ alert("Type a food name first."); return; }
  const bcMatch = raw.match(/\[barcode\s+([0-9]+)\]/i);
  const barcode = bcMatch ? bcMatch[1] : "";
  const name = raw.replace(/\[barcode[^\]]+\]/ig,"").trim() || raw;
  const servings = num($("servings").value)||1;
  upsertFood({
    name,
    barcode,
    calories: num($("cal").value)/servings,
    protein: num($("pro").value)/servings,
    carbs: num($("carb").value)/servings,
    fat: num($("fat").value)/servings,
    fiber: num($("fiber").value)/servings,
    solFiber: num($("solFiber").value)/servings,
    satFat: num($("satFat").value)/servings
  });
  alert("Saved to Food Library. Next time, just type it.");
  renderFoodTable();
  refreshDashboard();
}

// Barcode scan (optional)
let stream=null;
async function scanBarcode(){
  if(!("BarcodeDetector" in window)){
    alert("Barcode scan not supported here.");
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
          $("quickText").value = `[BARCODE ${code}]`;
          stopScan(video, closeBtn);
          handleQuickMatch();
          if(!bestMatchFood($("quickText").value)){
            alert("Barcode captured. Not in your library yet. Enter macros once and tap 'Save as Food'.");
          }
          return;
        }
      }catch(e){}
      requestAnimationFrame(tick);
    };
    closeBtn.onclick=()=>stopScan(video, closeBtn);
    tick();
  }catch(err){ alert("Camera permission needed."); }
}
function stopScan(video, closeBtn){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  video?.remove(); closeBtn?.remove();
}

function exportFoods(){
  const foods=loadFoods();
  const cols=["name","barcode","calories","protein","carbs","fat","fiber","solFiber","satFat"];
  const lines=[cols.join(",")];
  foods.forEach(f=>{
    const row=cols.map(k=>`"${(f[k]??"").toString().replaceAll('"','""')}"`).join(",");
    lines.push(row);
  });
  const blob=new Blob([lines.join("\n")],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="foods.csv"; a.click(); URL.revokeObjectURL(url);
}

function importFoods(){
  const inp=document.createElement("input");
  inp.type="file"; inp.accept=".csv,text/csv";
  inp.onchange=()=>{
    const file=inp.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const txt=reader.result.toString();
      const lines=txt.split(/\r?\n/).filter(Boolean);
      const header=lines.shift().split(",").map(s=>s.replaceAll('"',"").trim());
      lines.forEach(line=>{
        const parts=parseCSVLine(line);
        const obj={};
        header.forEach((h,i)=>obj[h]=parts[i]??"");
        if(!obj.name) return;
        upsertFood({
          name: obj.name,
          barcode: obj.barcode||"",
          calories: num(obj.calories),
          protein: num(obj.protein),
          carbs: num(obj.carbs),
          fat: num(obj.fat),
          fiber: num(obj.fiber),
          solFiber: num(obj.solFiber),
          satFat: num(obj.satFat)
        });
      });
      renderFoodTable(); refreshDashboard();
      alert("Foods imported.");
    };
    reader.readAsText(file);
  };
  inp.click();
}
function parseCSVLine(line){
  const out=[]; let cur=""; let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(inQ && line[i+1]==='"'){ cur+='"'; i++; }
      else inQ=!inQ;
    } else if(ch===',' && !inQ){ out.push(cur); cur=""; }
    else cur+=ch;
  }
  out.push(cur);
  return out;
}

function shiftDate(days){
  const d=new Date(($("logDate").value||todayISO())+"T00:00:00");
  d.setDate(d.getDate()+days);
  const off=d.getTimezoneOffset();
  $("logDate").value = new Date(d.getTime()-off*60*1000).toISOString().slice(0,10);
  refreshDashboard();
}

function showMode(mode){
  $("logMode").classList.toggle("hide", mode!=="log");
  $("libraryMode").classList.toggle("hide", mode!=="library");
  $("goalsMode").classList.toggle("hide", mode!=="goals");
  if(mode==="library") renderFoodTable();
  if(mode==="goals") initGoalsUI();
}

function initGoalsUI(){
  const g=loadGoals();
  $("gCal").value=g.calories; $("gPro").value=g.protein; $("gCarb").value=g.carbs; $("gFat").value=g.fat;
  $("gFiber").value=g.fiber; $("gSolFiber").value=g.solFiber; $("gSatFat").value=g.satFat;
}
function saveGoalsFromUI(){
  saveGoals({
    calories:num($("gCal").value), protein:num($("gPro").value), carbs:num($("gCarb").value), fat:num($("gFat").value),
    fiber:num($("gFiber").value), solFiber:num($("gSolFiber").value), satFat:num($("gSatFat").value)
  });
  alert("Goals saved.");
  refreshDashboard();
}

function init(){
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
  setStatus();
  $("logDate").value=todayISO();

  $("modeLogBtn").onclick=()=>showMode("log");
  $("modeLibraryBtn").onclick=()=>showMode("library");
  $("modeGoalsBtn").onclick=()=>showMode("goals");

  $("addBtn").onclick=addEntry;
  $("scanBtn").onclick=scanBarcode;
  $("saveAsFoodBtn").onclick=saveAsFoodFromLog;
  $("exportBtn").onclick=exportCSV;
  $("resetBtn").onclick=resetDay;

  $("addFoodBtn").onclick=addOrUpdateFoodFromLibraryForm;
  $("exportFoodsBtn").onclick=exportFoods;
  $("importFoodsBtn").onclick=importFoods;
  $("saveGoalsBtn").onclick=saveGoalsFromUI;

  $("todayBtn").onclick=()=>{$("logDate").value=todayISO(); refreshDashboard();};
  $("prevDayBtn").onclick=()=>shiftDate(-1);
  $("nextDayBtn").onclick=()=>shiftDate(1);

  $("mealType").addEventListener("change", refreshDashboard);
  $("logDate").addEventListener("change", refreshDashboard);
  $("quickText").addEventListener("input", handleQuickMatch);
  $("foodPick").addEventListener("change", handlePick);
  $("servings").addEventListener("input", ()=>{ handleQuickMatch(); handlePick(); });

  // Seed common foods if empty
  if(loadFoods().length===0){
    saveFoods([
      {id:crypto.randomUUID(), name:"Muscle Milk Protein Shake (414mL)", barcode:"", calories:220, protein:40, carbs:7, fat:2.5, fiber:5, solFiber:1, satFat:0.5},
      {id:crypto.randomUUID(), name:"PopCorners Kettle Corn (3 oz bag)", barcode:"", calories:390, protein:5, carbs:65, fat:13, fiber:1, solFiber:0, satFat:1},
      {id:crypto.randomUUID(), name:"Barebells Protein Bar (typical)", barcode:"", calories:200, protein:20, carbs:20, fat:7, fiber:2, solFiber:0, satFat:4}
    ]);
  }

  refreshDashboard();
}
init();
