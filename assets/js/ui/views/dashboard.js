import { computePresRisk } from "../../core/engine.js";
import { dhondt } from "../../core/dhondt.js";

function fmt(n){ return (Number(n)||0).toLocaleString("en-US"); }
function pct(x){ return ((Number(x)||0)*100).toFixed(2)+"%"; }

function buildDipSeatsMap(ctx){
  const map = {};
  const geo = ctx.geography && ctx.geography.territorio && ctx.geography.territorio.interior && ctx.geography.territorio.interior.provincias ? ctx.geography.territorio.interior.provincias : {};
  const nameToCode = {};
  for(const code in geo){
    const nm = String(geo[code].nombre||"").toUpperCase().trim();
    if(nm) nameToCode[nm]=code;
  }
  const list = (ctx.curules2024 && ctx.curules2024.territorial) ? ctx.curules2024.territorial : [];
  for(const it of list){
    const nm = String(it.provincia||"").toUpperCase().trim();
    const code = nameToCode[nm];
    if(!code) continue;
    const key = code + "-" + String(it.circ||1);
    map[key] = Number(it.seats||0);
  }
  // exterior if exists: use keys already in data as 'EX-1' etc (leave as-is)
  return map;
}
function dhondtMarginal(votes, seats){
  // compute last and next quotient
  const parties = Object.keys(votes||{}).filter(p=>Number(votes[p]||0)>0);
  const qs=[];
  for(const p of parties){
    for(let d=1; d<=seats+1; d++){
      qs.push({party:p,q:Number(votes[p]||0)/d,d});
    }
  }
  qs.sort((a,b)=>b.q-a.q);
  const top = qs.slice(0,seats);
  const last = top[top.length-1];
  const next = qs[seats];
  return {last,next,margin: next ? (last.q-next.q) : null, top};
}

function topN(votes,n=3){
  return Object.entries(votes||{}).filter(([k,v])=>Number(v||0)>0).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

export function renderDashboard(root, ctx, state, setState){
  const year = 2024;
  const nivel = state.nivel;
  const level = ctx.normalized[year][nivel] || {nacional:{meta:{},votes:{}}, territorios:{}};
  const meta = level.nacional.meta || {};
  const votes = level.nacional.votes || {};

  const inscritos = Number(meta.inscritos||0);
  const emitidos = Number(meta.emitidos||0);
  const part = inscritos ? emitidos/inscritos : 0;
  const abst = 1-part;

  const top3 = topN(votes,3);
  const ganador = top3[0]?.[0] || "—";

  let riesgoTxt = "—";
  let dipExtraHtml = "";
  if(nivel==="dip"){
    const seatsMap = buildDipSeatsMap(ctx);
    const circs = level.circunscripciones || {};
    let best = null;
    for(const cid in circs){
      const t = circs[cid];
      const seats = Number(seatsMap[cid]||0);
      if(!seats) continue;
      const m = dhondtMarginal(t.votes||{}, seats);
      if(m.margin==null) continue;
      if(!best || m.margin < best.margin){
        best = {cid, margin:m.margin, last:m.last, next:m.next, votes:t.votes||{}, seats};
      }
    }
    if(best){
      // votos necesarios para que next gane el ultimo
      const nextParty = best.next ? best.next.party : "—";
      const seatsByParty = dhondt(best.votes, best.seats).seatsByParty || {};
      const sCh = Number(seatsByParty[nextParty]||0);
      const currentVotes = (best.next ? best.next.q : 0) * (sCh + 1);
      const neededVotes = (best.last ? best.last.q : 0) * (sCh + 1) + 1;
      const extra = Math.max(0, Math.ceil(neededVotes - currentVotes));
      dipExtraHtml = `
        <div class="kpi">
          <div class="kpi-label">Curul marginal</div>
          <div class="kpi-value">${best.cid}</div>
          <div class="muted" style="margin-top:6px;">${best.last.party} vs ${nextParty}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Votos próximo escaño</div>
          <div class="kpi-value">+${extra.toLocaleString("en-US")}</div>
          <div class="muted" style="margin-top:6px;">${nextParty} en ${best.cid}</div>
        </div>
      `;
    }
  }
  if(nivel==="pres"){
    const r = computePresRisk(votes);
    riesgoTxt = `2da vuelta: ${r.riesgo2v} · margen: ${r.riesgoMargen}`;
  }

  root.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <div class="muted">Nivel: <b>${nivel}</b> · Corte: <b>${state.corte}</b></div>
    </div>

    <div class="grid-kpi">
      <div class="kpi"><div class="t">Padrón</div><div class="v">${fmt(inscritos)}</div></div>
      <div class="kpi"><div class="t">Emitidos</div><div class="v">${fmt(emitidos)}</div></div>
      <div class="kpi"><div class="t">Participación</div><div class="v">${pct(part)}</div></div>
      <div class="kpi"><div class="t">Abstención</div><div class="v">${pct(abst)}</div></div>
      <div class="kpi"><div class="t">Ganador (Top1)</div><div class="v">${ganador}</div></div>
      <div class="kpi"><div class="t">Top 3</div><div class="v">${top3.map(([p,v])=>`${p}`).join(", ") || "—"}</div></div>
    ${dipExtraHtml}
    </div>

    <div class="card">
      <h3>Resumen ejecutivo</h3>
      <ul>
        <li>Riesgo presidencial: <b>${riesgoTxt}</b></li>
        <li>Territorios críticos: <b>(H3 Potencial)</b></li>
        <li>Curules decisivos: <b>(H3 Dip)</b></li>
      </ul>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn" href="#simulador">Ir a Simulador</a>
        <a class="btn" href="#objetivo">Ir a Objetivo</a>
      </div>
    </div>
  `;
}
