function sumMeta(level){
  const nat = (level && level.nacional ? level.nacional.meta : null) || {};
  return {ins: Number(nat.inscritos||0), em: Number(nat.emitidos||0), val: Number(nat.validos||0), nul: Number(nat.nulos||0)};
}
function check(name, ok, info=""){
  return `<tr><td>${ok?"✅":"❌"}</td><td>${name}</td><td class="muted">${info||""}</td></tr>`;
}
export function renderAuditoria(root, ctx, state, setState){
  const y=2024;
  const pres = ctx.normalized[y].pres;
  const sen  = ctx.normalized[y].sen;
  const dip  = ctx.normalized[y].dip;
  const mun  = ctx.normalized[y].mun;
  const dm   = ctx.normalized[y].dm;

  const checks = [];
  for(const [name, lvl] of [["Presidencial",pres],["Senadores",sen],["Diputados",dip],["Alcaldes",mun],["DM",dm]]){
    const m = sumMeta(lvl);
    checks.push(check(`${name}: inscritos ≥ emitidos`, m.ins>=m.em, `ins=${m.ins} em=${m.em}`));
    checks.push(check(`${name}: emitidos = válidos + nulos (si existe)`, (m.val+m.nul===0)|| (m.em===m.val+m.nul), `em=${m.em} val=${m.val} nul=${m.nul}`));
  }

  // pres vs dip difference (winner share pp)
  function winnerShare(votes){
    const arr = Object.entries(votes||{}).sort((a,b)=>b[1]-a[1]);
    const tot = arr.reduce((s,kv)=>s+Number(kv[1]||0),0) || 1;
    return Number((arr[0] ? arr[0][1] : null)||0)/tot;
  }
  const presTop = winnerShare((pres && pres.nacional ? pres.nacional.votes : null));
  const dipTop  = winnerShare((dip && dip.nacional ? dip.nacional.votes : null));
  const diffPP = Math.abs(presTop - dipTop) * 100;
  checks.push(check("Alerta pres vs congresual (>8pp)", diffPP<=8, `diff=${diffPP.toFixed(2)}pp`));

  root.innerHTML = `
    <div class="card">
      <h2>Auditoría</h2>
      <div class="muted">Chequeos base automáticos (H3). Lista detallada de territorios en H4.</div>
    </div>
    <div class="card">
      <table class="table">
        <thead><tr><th></th><th>Check</th><th>Info</th></tr></thead>
        <tbody>${checks.join("")}</tbody>
      </table>
    </div>
  `;
}
