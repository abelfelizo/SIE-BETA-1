 // assets/js/core/data.js  (BETA 2 LOADER CONSOLIDADO)

const YEARS  = [2020, 2024, 2028];
const LEVELS = ["pres", "sen", "dip", "alc", "dm"];

function ensureLevelShape(obj) {
  if (!obj || typeof obj !== "object") obj = {};
  if (!obj.nacional) obj.nacional = { meta: {}, rows: [] };
  if (!obj.provincias) obj.provincias = { meta: {}, rows: [] };
  if (!obj.municipios) obj.municipios = { meta: {}, rows: [] };
  if (!obj.circunscripciones) obj.circunscripciones = { meta: {}, rows: [] };
  return obj;
}

function hardEnsureNormalized(ctx) {
  if (!ctx || typeof ctx !== "object") ctx = {};
  if (!ctx.normalized || typeof ctx.normalized !== "object") ctx.normalized = {};
  if (!ctx.data || typeof ctx.data !== "object") ctx.data = {};
  if (!ctx.meta || typeof ctx.meta !== "object") ctx.meta = {};

  YEARS.forEach((Y) => {
    if (!ctx.normalized[Y] || typeof ctx.normalized[Y] !== "object") ctx.normalized[Y] = {};
    if (!ctx.normalized[String(Y)] || typeof ctx.normalized[String(Y)] !== "object") ctx.normalized[String(Y)] = ctx.normalized[Y];

    LEVELS.forEach((lv) => {
      ctx.normalized[Y][lv] = ensureLevelShape(ctx.normalized[Y][lv]);
      ctx.normalized[String(Y)][lv] = ctx.normalized[Y][lv];
    });

    // aliases
    ctx.normalized[Y].pres = ctx.normalized[Y]["pres"];
    ctx.normalized[Y].sen  = ctx.normalized[Y]["sen"];
    ctx.normalized[Y].dip  = ctx.normalized[Y]["dip"];
    ctx.normalized[Y].alc  = ctx.normalized[Y]["alc"];
    ctx.normalized[Y].dm   = ctx.normalized[Y]["dm"];
    ctx.normalized[String(Y)].pres = ctx.normalized[Y]["pres"];
  });

  return ctx;
}

async function fetchJSON(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`No se pudo cargar ${path} (${r.status})`);
  return r.json();
}

function objectToRows(votesObj) {
  if (!votesObj || typeof votesObj !== "object") return [];
  return Object.keys(votesObj)
    .map(k => ({ partido: k, votos: Number(votesObj[k]) || 0 }))
    .sort((a,b)=>b.votos-a.votos);
}

// Formato A: flat {EMITIDOS, VALIDOS, NULOS, PRM, FP, ...}
function flatToMetaRows(flat) {
  const metaKeys = new Set([
    "PADRON","INSCRITOS","EMITIDOS","VALIDOS","NULOS","BLANCOS","OBSERVADOS",
    "inscritos","emitidos","validos","nulos"
  ]);

  const meta = {};
  const votes = {};

  if (!flat || typeof flat !== "object") return { meta:{}, rows:[] };

  Object.keys(flat).forEach((k) => {
    const v = Number(flat[k]) || 0;
    if (metaKeys.has(k)) meta[k] = v;
    else votes[k] = v;
  });

  // SANEO mínimo
  const emit = Number(meta.EMITIDOS ?? meta.emitidos ?? 0) || 0;
  const val  = Number(meta.VALIDOS  ?? meta.validos  ?? 0) || 0;
  let nul    = Number(meta.NULOS    ?? meta.nulos    ?? 0) || 0;
  if (nul < 0) nul = 0;

  let emitFix = emit;
  if (emitFix <= 0 && val > 0) emitFix = val + nul;

  meta.EMITIDOS = emitFix;
  meta.VALIDOS  = val;
  meta.NULOS    = nul;

  return { meta, rows: objectToRows(votes) };
}

// Formato B: { meta:{...}, votes:{PRM:..., FP:...} }
function metaVotesToMetaRows(obj) {
  const metaIn = (obj && obj.meta && typeof obj.meta === "object") ? obj.meta : {};
  const votes  = (obj && obj.votes && typeof obj.votes === "object") ? obj.votes : {};

  // Clonar meta y crear alias en MAYÚSCULAS (y asegurar numéricos)
  const meta = { ...metaIn };

  // min -> MAY
  if (meta.inscritos != null) meta.INSCRITOS = Number(meta.inscritos) || 0;
  if (meta.emitidos  != null) meta.EMITIDOS  = Number(meta.emitidos)  || 0;
  if (meta.validos   != null) meta.VALIDOS   = Number(meta.validos)   || 0;
  if (meta.nulos     != null) meta.NULOS     = Math.max(0, Number(meta.nulos) || 0);

  // MAY -> min (por si viniera al revés)
  if (meta.INSCRITOS != null && meta.inscritos == null) meta.inscritos = Number(meta.INSCRITOS) || 0;
  if (meta.EMITIDOS  != null && meta.emitidos  == null) meta.emitidos  = Number(meta.EMITIDOS)  || 0;
  if (meta.VALIDOS   != null && meta.validos   == null) meta.validos   = Number(meta.VALIDOS)   || 0;
  if (meta.NULOS     != null && meta.nulos     == null) meta.nulos     = Math.max(0, Number(meta.NULOS) || 0);

  // saneo mínimo: si EMITIDOS viene 0 pero hay VALIDOS
  if ((Number(meta.EMITIDOS) || 0) <= 0 && (Number(meta.VALIDOS) || 0) > 0) {
    meta.EMITIDOS = (Number(meta.VALIDOS) || 0) + (Number(meta.NULOS) || 0);
    meta.emitidos = meta.EMITIDOS;
  }

  return { meta, rows: objectToRows(votes) };
}

function normalizeNacional(block) {
  if (!block || typeof block !== "object") return { meta:{}, rows:[] };
  if (block.votes && typeof block.votes === "object") return metaVotesToMetaRows(block);
  return flatToMetaRows(block);
}

// Normaliza mapa de subunidades por id (provincias/municipios/DM):
// - {id:{nombre, data:{flat}}}  (PRES/DM)
// - {id:{nombre, meta, votes}}  (SEN/MUN)
// - {id:{...flat directo...}}   (fallback)
function normalizeIdMap(idMap) {
  const rows = [];
  if (!idMap || typeof idMap !== "object") return rows;

  Object.keys(idMap).forEach((id) => {
    const item = idMap[id] || {};
    let nm;

    if (item.data && typeof item.data === "object") nm = flatToMetaRows(item.data);
    else if (item.votes && typeof item.votes === "object") nm = metaVotesToMetaRows(item);
    else nm = normalizeNacional(item);

    rows.push({
      id,
      nombre: item.nombre || "",
      meta: nm.meta,
      rows: nm.rows
    });
  });

  return rows;
}

export async function loadCTX() {
  let ctx = hardEnsureNormalized({ normalized: {}, data: {}, meta: {} });

  const r2024 = await fetchJSON("./data/results_2024.json");
  ctx.data.results_2024 = r2024;
  ctx.meta.source = r2024.meta || {};

  // ===== PRES =====
  if (r2024.pres) {
    const out = ensureLevelShape({});
    out.nacional = normalizeNacional(r2024.pres.nacional);
    if (r2024.pres.provincias) out.provincias.rows = normalizeIdMap(r2024.pres.provincias);
    ctx.normalized[2024].pres = out;
  }

  // ===== SEN =====
  if (r2024.sen) {
    const out = ensureLevelShape({});
    out.nacional = normalizeNacional(r2024.sen.nacional);
    if (r2024.sen.provincias) out.provincias.rows = normalizeIdMap(r2024.sen.provincias);
    ctx.normalized[2024].sen = out;
  }

  // ===== DIP =====
  if (r2024.dip) {
    const out = ensureLevelShape({});
    out.nacional = normalizeNacional(r2024.dip.nacional);
    if (r2024.dip.provincias) out.provincias.rows = normalizeIdMap(r2024.dip.provincias);
    if (r2024.dip.circunscripciones) out.circunscripciones.rows = normalizeIdMap(r2024.dip.circunscripciones);
    ctx.normalized[2024].dip = out;
  }

  // ===== MUN (ALCALDES) =====
  // Formato: mun.municipios[id] = {nombre, meta, votes}
  if (r2024.mun && r2024.mun.municipios) {
    const out = ensureLevelShape({});
    out.municipios.rows = normalizeIdMap(r2024.mun.municipios);
    ctx.normalized[2024].alc = out; // el nivel en la app es "alc"
  }
  // compat si viniera como "alc"
  if (r2024.alc && r2024.alc.municipios) {
    const out = ensureLevelShape({});
    out.municipios.rows = normalizeIdMap(r2024.alc.municipios);
    ctx.normalized[2024].alc = out;
  }

  // ===== DM =====
  // Formato: dm[id].data = {flat}
  if (r2024.dm) {
    const out = ensureLevelShape({});
    out.municipios.rows = normalizeIdMap(r2024.dm)
      .filter(x => (x.meta && (x.meta.VALIDOS || 0) > 0)); // elimina id basura tipo 0.0
    ctx.normalized[2024].dm = out;
  }

  // Extras opcionales
  try { ctx.geography   = await fetchJSON("./data/geography.json"); } catch(e) {}
  try { ctx.curules2024 = await fetchJSON("./data/curules_2024.json"); } catch(e) {}

  ctx.normalized["2024"] = ctx.normalized[2024];
  return hardEnsureNormalized(ctx);
}
