function fmt(n){ return (Number(n)||0).toLocaleString("en-US"); }
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function pct(x){ return ((Number(x)||0)*100).toFixed(2)+"%"; }

const DEFAULT_WEIGHTS = { tendencia:25, margen:20, abst:15, padron:15, elasticidad:15, estabilidad:10 };

function getFocusParty(votes, preferred="FP"){
  if(preferred && votes && preferred in votes) return preferred;
  const top = Object.entries(votes || {}).sort((a,b) => (Number(b[1])||0) - (Number(a[1])||0))[0]?.[0] ?? null;
  return top || preferred || "FP";
}

function share(votes, party){
  const tot = Object.values(votes||{}).reduce((s,v)=>s+Number(v||0),0) || 1;
  return Number((votes && votes[party])||0)/tot;
}

function margin(votes){
  const arr = Object.entries(votes||{}).sort((a,b)=>b[1]-a[1]);
  const tot = arr.reduce((s,kv)=>s+Number(kv[1]||0),0) || 1;
  const a = Number((arr[0] ? arr[0][1] : null)||0)/tot;
  const b = Number((arr[1] ? arr[1][1] : null)||0)/tot;
  return a-b;
}

function normalizeMinMax(valuesById){
  const vals = Object.values(valuesById);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const out = {};
  for(const id of Object.keys(valuesById)){
    const v = valuesById[id];
    out[id] = (mx===mn) ? 0.5 : (v-mn)/(mx-mn);
  }
  return out;
}

function categorize(score){
  if(score>=75) return "Fortaleza";
  if(score>=60) return "Oportunidad";
  if(score>=50) return "Disputa";
  if(score>=40) return "Crecimiento";
  if(score>=25) return "Adverso";
  return "Baja prioridad";
}

export function renderPotencial(root, ctx, state, setState){
  const nivel = state.nivel;
  const yA = 2024, yB = 2020;
  const L24 = ctx.normalized[yA][nivel] || {};
  const L20 = ctx.normalized[yB][nivel] || {};
  const prov24 = L24.territoriosProv || L24.territorios || {};
  const prov20 = L20.territoriosProv || L20.territorios || {};

  const focus = getFocusParty((L24.nacional ? L24.nacional.votes : null)||{}, "FP");

  // Components (raw)
  const tendenciaRaw = {};
  const margenRaw = {};
  const abstRaw = {};
  const padRaw = {};
  for(const id of Object.keys(prov24)){
    const v24 = (prov24[id] ? prov24[id].votes : null)||{};
    const v20 = (prov20[id] ? prov20[id].votes : null)||{};
    tendenciaRaw[id] = (share(v24, focus) - share(v20, focus)) * 100; // pp
    margenRaw[id] = margin(v24) * 100; // pp
    const meta = (prov24[id] ? prov24[id].meta : null)||{};
    const ins = Number(meta.inscritos||0), em = Number(meta.emitidos||0);
    abstRaw[id] = ins ? (1 - em/ins) * 100 : 0;
    padRaw[id] = ins;
  }

  // Elasticidad/estabilidad placeholders (needs >2 cycles). For H3 we set neutral 0.5 after normalization
  const elasticRaw = {};
  const estabRaw = {};
  for(const id of Object.keys(prov24)){ elasticRaw[id]=0; estabRaw[id]=0; }

  // Normalize 0..1
  const tendenciaN = normalizeMinMax(tendenciaRaw);
  const margenN = normalizeMinMax(margenRaw);      // higher margin = "safer" (we'll invert for opportunity? spec says margin component, we'll treat higher = better)
  const abstN = normalizeMinMax(abstRaw);          // higher abstention = more opportunity (higher better)
  const padN = normalizeMinMax(padRaw);
  const elasN = normalizeMinMax(elasticRaw);
  const estN = normalizeMinMax(estabRaw);

  const W = DEFAULT_WEIGHTS;
  const totalW = Object.values(W).reduce((a,b)=>a+b,0) || 1;

  const rows = Object.keys(prov24).map(id=>{
    const score01 =
      (tendenciaN[id]*W.tendencia +
       margenN[id]*W.margen +
       abstN[id]*W.abst +
       padN[id]*W.padron +
       elasN[id]*W.elasticidad +
       estN[id]*W.estabilidad) / totalW;
    const score = Math.round(clamp01(score01)*100);
    return {
      id,
      nombre: (prov24[id] ? prov24[id].nombre : null) || id,
      score,
      cat: categorize(score),
      tendencia: tendenciaRaw[id],
      margen: margenRaw[id],
      abst: abstRaw[id],
      padron: padRaw[id]
    };
  }).sort((a,b)=>b.score-a.score);

  root.innerHTML = `
    <div class="card">
      <h2>Potencial</h2>
      <div class="muted">Nivel: <b>${nivel}</b> · Partido foco: <b>${focus}</b> · (Elasticidad/Estabilidad: H4 con más ciclos)</div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>#</th><th>Territorio</th><th>Categoría</th><th>Score</th>
            <th>Tendencia pp</th><th>Margen pp</th><th>Abst %</th><th>Padrón</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i)=>`
            <tr>
              <td>${i+1}</td>
              <td>${r.nombre} <span class="muted">(${r.id})</span></td>
              <td>${r.cat}</td>
              <td><b>${r.score}</b></td>
              <td>${r.tendencia.toFixed(2)}</td>
              <td>${r.margen.toFixed(2)}</td>
              <td>${r.abst.toFixed(2)}</td>
              <td>${fmt(r.padron)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}
