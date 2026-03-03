import { computeWinnersByTerritory } from "../../core/engine.js";

function hashColor(str){
  let h = 0;
  for(let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 55% 45%)`;
}
function fmt(n){ return (Number(n)||0).toLocaleString("en-US"); }
function pct(x){ return ((Number(x)||0)*100).toFixed(2)+"%"; }

function normName(s){
  return String(s||"")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");
}

function getSvgName(el){
  // Prefer title attr (your SVG uses it). Fallback to <title> element.
  return el.getAttribute("title") || (el.querySelector ? (el.querySelector("title") ? el.querySelector("title").textContent : "") : "") || "";
}

function getProvCodeFromSvg(el, nameToCode){
  // 1) Prefer explicit DO-xx if matches a province code in data
  const id = el.id || "";
  const m = id.match(/^DO-(\d{2})$/);
  if(m && nameToCode.__codes.has(m[1])) return m[1];

  // 2) Use SVG title/name to map to correct province code
  const nm = normName(getSvgName(el));
  const code = nameToCode[nm] || null;
  if(code) return code;

  // 3) Last resort: try DO-xx anyway
  return m ? m[1] : null;
}

function computeMargin(votes){
  const arr = Object.entries(votes||{}).sort((a,b)=>(b[1]||0)-(a[1]||0));
  const tot = arr.reduce((s,kv)=>s+Number(kv[1]||0),0) || 1;
  const a = Number((arr[0] ? arr[0][1] : null)||0)/tot;
  const b = Number((arr[1] ? arr[1][1] : null)||0)/tot;
  return {margin: a-b, top1: (arr[0] ? arr[0][0] : null)||null, top2: (arr[1] ? arr[1][0] : null)||null};
}

function buildCodeToName(geo){
  const out = Object.create(null);
  const provs = (((geo||{}).territorio||{}).interior||{}).provincias || {};
  for(const code of Object.keys(provs)) out[code] = (provs[code] ? provs[code].nombre : null) || code;
  return out;
}

function buildNameToCode(geo){
  const out = Object.create(null);
  out.__codes = new Set();
  const provs = (((geo||{}).territorio||{}).interior||{}).provincias || {};
  for(const code of Object.keys(provs)){
    const name = (provs[code] ? provs[code].nombre : null) || code;
    out[normName(name)] = code;
    out.__codes.add(code);
  }
  return out;
}

export async function renderMapa(root, ctx, state, setState){
  const year = 2024;
  const nivel = state.nivel;

  const level = ctx.normalized[year][nivel] || {};
  const provs = level.territoriosProv || level.territorios || {};
  const winners = computeWinnersByTerritory(provs);

  const nameToCode = buildNameToCode(ctx.geography || {});
  const codeToName = buildCodeToName(ctx.geography || {});

  root.innerHTML = `
    <div class="card">
      <h2>Mapa</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:8px;">
        <label class="muted">Modo</label>
        <select id="mapMode" class="select select-sm">
          <option value="resultado">Resultado</option>
          <option value="margen">Margen</option>
          <option value="abst">Abstención</option>
          <option value="potencial">Potencial</option>
        </select>
        <div class="muted" style="margin-left:auto;">Link: <b>SVG nombre ↔ código data</b></div>
        <button class="btn" id="zoomIn">+</button>
        <button class="btn" id="zoomOut">-</button>
        <button class="btn" id="zoomReset">Reset Zoom</button>
        <button class="btn" id="btnReset">Reset</button>
      </div>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 320px; gap:12px; align-items:start;">
      <div class="card" style="overflow:hidden;">
        <div id="svgWrap" style="width:100%; overflow:auto;"></div>
      </div>
      <div class="card" id="sidePanel">
        <h3>Territorio</h3>
        <div class="muted">Haz click en una provincia.</div>
      </div>
    </div>
  `;

  const modeSel = root.querySelector("#mapMode");
  const svgWrap = root.querySelector("#svgWrap");
  const side = root.querySelector("#sidePanel");

  const svgText = await fetch("./assets/maps/provincias.svg").then(r=>r.text());
  svgWrap.innerHTML = svgText;

  const svg = svgWrap.querySelector("svg");
  svg.style.width = "100%";
  let selectedEl = null;

  svg.style.height = "auto";

  // Zoom/pan via viewBox
  const vb0 = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  let vb = (vb0.length===4 && vb0.every(n=>Number.isFinite(n))) ? vb0.slice() : [0,0,1000,800];
  if(!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', vb.join(' '));
  let isPanning=false, panStart=null;
  function setVB(){ svg.setAttribute('viewBox', vb.join(' ')); }
  function zoom(f){
    const cx=vb[0]+vb[2]/2, cy=vb[1]+vb[3]/2;
    vb[2]/=f; vb[3]/=f;
    vb[0]=cx-vb[2]/2; vb[1]=cy-vb[3]/2;
    setVB();
  }
  svg.addEventListener('pointerdown',(e)=>{
    isPanning=true; panStart={x:e.clientX,y:e.clientY,vb:vb.slice()};
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove',(e)=>{
    if(!isPanning||!panStart) return;
    const dx=(e.clientX-panStart.x);
    const dy=(e.clientY-panStart.y);
    const scaleX=panStart.vb[2]/(svg.clientWidth||1);
    const scaleY=panStart.vb[3]/(svg.clientHeight||1);
    vb[0]=panStart.vb[0]-dx*scaleX;
    vb[1]=panStart.vb[1]-dy*scaleY;
    setVB();
  });
  svg.addEventListener('pointerup',()=>{ isPanning=false; panStart=null; });
  svg.addEventListener('pointercancel',()=>{ isPanning=false; panStart=null; });


  function paint(){
    const mode = modeSel.value;
    const paths = svg.querySelectorAll("[id^='DO-']");
    paths.forEach(el=>{
      const pid = getProvCodeFromSvg(el, nameToCode);
      const t = pid ? provs[pid] : null;
      if(!t){
        el.style.fill = "#333";
        el.style.stroke = "#111";
        el.style.strokeWidth = "1";
        return;
      }
      const meta = t.meta || {};
      const votos = t.votes || {};
      const win = (winners[pid] ? winners[pid].party : null) || "NA";

      if(mode==="resultado"){
        el.style.fill = hashColor(win);
      }else if(mode==="margen"){
        const m = computeMargin(votos).margin;
        const light = 25 + Math.min(50, Math.max(0, m*150));
        el.style.fill = `hsl(210 20% ${light}%)`;
      }else if(mode==="abst"){
        const ins = Number(meta.inscritos||0);
        const em = Number(meta.emitidos||0);
        const abst = ins? (1 - em/ins) : 0;
        const light = 20 + Math.min(60, Math.max(0, abst*100));
        el.style.fill = `hsl(40 35% ${light}%)`;
      }else{
        el.style.fill = "#444"; // real potential fill in next increment
      }
      el.style.stroke = "#111";
      el.style.strokeWidth = "1";
    });
  }

  function renderPanel(pid, svgName){
    const t = provs[pid];
    if(!t){
      side.innerHTML = `<h3>Territorio</h3><div class="muted">Sin data: <b>${svgName||pid}</b> → código <b>${pid||"?"}</b></div>`;
      return;
    }
    const meta = t.meta||{};
    const votos = t.votes||{};
    const tot = Object.values(votos).reduce((s,v)=>s+Number(v||0),0) || 1;
    const top = Object.entries(votos).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const m = computeMargin(votos);
    const ins = Number(meta.inscritos||0), em = Number(meta.emitidos||0);

    side.innerHTML = `
      <h3>${(codeToName[pid] || svgName || t.nombre || pid)}</h3>
      <div class="muted">Código data: <b>${pid}</b> · SVG: <b>${svgName || "—"}</b></div>
      <hr style="border:0;border-top:1px solid #222;margin:10px 0;">
      <div><span class="muted">Padrón:</span> <b>${fmt(ins)}</b></div>
      <div><span class="muted">Emitidos:</span> <b>${fmt(em)}</b></div>
      <div><span class="muted">Participación:</span> <b>${ins?pct(em/ins):"—"}</b></div>
      <div><span class="muted">Abstención:</span> <b>${ins?pct(1-em/ins):"—"}</b></div>
      <div style="margin-top:8px;"><span class="muted">Margen:</span> <b>${pct(m.margin)}</b> (${m.top1||"—"} vs ${m.top2||"—"})</div>
      <h4 style="margin:12px 0 6px 0;">Top partidos</h4>
      <table class="table">
        <thead><tr><th>Partido</th><th>%</th><th>Votos</th></tr></thead>
        <tbody>
          ${top.map(([p,v])=>`<tr><td>${p}</td><td>${pct(Number(v)/tot)}</td><td>${fmt(v)}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  svg.querySelectorAll("[id^='DO-']").forEach(el=>{
    el.style.cursor = "pointer";
    el.addEventListener("mouseenter", ()=>{ el.style.opacity = "0.85"; });
    el.addEventListener("mouseleave", ()=>{ el.style.opacity = "1"; });
    el.addEventListener("click", ()=>{
      if(selectedEl && selectedEl!==el){
        selectedEl.style.strokeWidth = "1";
        selectedEl.style.stroke = "#111";
        selectedEl.style.opacity = "1";
      }
      selectedEl = el;
      el.style.stroke = "#000";
      el.style.strokeWidth = "2";

      const svgName = getSvgName(el);
      const pid = getProvCodeFromSvg(el, nameToCode);
      renderPanel(pid, svgName);
    });
  });

  modeSel.addEventListener("change", paint);
  root.querySelector("#btnReset").addEventListener("click", ()=>{
    side.innerHTML = `<h3>Territorio</h3><div class="muted">Haz click en una provincia.</div>`;
    modeSel.value = "resultado";
    paint();
  });

  paint();
}
