 // assets/js/core/data.js  (BETA 2 LOADER CONSOLIDADO)

const YEARS  = [2020, 2024, 2028];
const LEVELS = ["pres", "sen", "dip", "alc", "dm"];

function ensureLevelShape(obj) {
  // Compat: vistas esperan .nacional.meta (lowercase) y .nacional.votes
  // y territorios como mapa por id (prov/mun/circ)
  if (!obj || typeof obj !== "object") obj = {};
  if (!obj.nacional) obj.nacional = { meta: {}, votes: {}, rows: [] };
  if (!obj.provincias) obj.provincias = { meta: {}, votes: {}, rows: [] };
  if (!obj.municipios) obj.municipios = { meta: {}, votes: {}, rows: [] };
  if (!obj.circunscripciones) obj.circunscripciones = { meta: {}, votes: {}, rows: [] };
  if (!obj.territorios) obj.territorios = {};         // alias genérico
  if (!obj.territoriosProv) obj.territoriosProv = {}; // mapa provincias
  if (!obj.territoriosMun) obj.territoriosMun = {};   // mapa municipios
  if (!obj.territoriosCirc) obj.territoriosCirc = {}; // mapa circunscripciones
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

  // aliases lowercase para vistas
  if (meta.inscritos == null && meta.INSCRITOS != null) meta.inscritos = Number(meta.INSCRITOS) || 0;
  if (meta.emitidos  == null && meta.EMITIDOS  != null) meta.emitidos  = Number(meta.EMITIDOS)  || 0;
  if (meta.validos   == null && meta.VALIDOS   != null) meta.validos   = Number(meta.VALIDOS)   || 0;
  if (meta.nulos     == null && meta.NULOS     != null) meta.nulos     = Math.max(0, Number(meta.NULOS) || 0);

  return { meta, votes, rows: objectToRows(votes) };
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

  return { meta, votes, rows: objectToRows(votes) };
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
  const map = {};
  if (!idMap || typeof idMap !== "object") return { rows, map };

  Object.keys(idMap).forEach((id) => {
    const item = idMap[id] || {};
    let nm;

    if (item.data && typeof item.data === "object") nm = flatToMetaRows(item.data);
    else if (item.votes && typeof item.votes === "object") nm = metaVotesToMetaRows(item);
    else nm = normalizeNacional(item);

    const rec = {
      id,
      nombre: item.nombre || "",
      meta: nm.meta,
      votes: nm.votes || {},
      rows: nm.rows
    };
    rows.push(rec);
    map[id] = rec;
  });

  return { rows, map };
}

export async function loadCTX() {
  let ctx = hardEnsureNormalized({ normalized: {}, data: {}, meta: {} });

  const r2024 = await fetchJSON("./data/results_2024.json");
  ctx.data.results_2024 = r2024;
  ctx.meta.source = r2024.meta || {};

  // Padrón/participación base (para PRES donde el JSON no trae inscritos)
  try { ctx.padron2024 = await fetchJSON("./data/padron_2024_meta.json"); } catch(e) { ctx.padron2024 = null; }

  // ===== PRES =====
  if (r2024.pres) {
    const out = ensureLevelShape({});
    out.nacional = normalizeNacional(r2024.pres.nacional);

    // completar inscritos/emitidos si faltan
    try {
      const m = out.nacional.meta || {};
      if ((!m.inscritos || m.inscritos === 0) && ctx.padron2024 && ctx.padron2024.totales) {
        m.inscritos = Number(ctx.padron2024.totales.inscritos_total) || m.inscritos || 0;
      }
      if ((!m.emitidos || m.emitidos === 0) && ctx.padron2024 && ctx.padron2024.totales) {
        m.emitidos = Number(ctx.padron2024.totales.emitidos_pres_total) || m.emitidos || 0;
      }
      out.nacional.meta = m;
    } catch(e) {}
    if (r2024.pres.provincias) {
      const n = normalizeIdMap(r2024.pres.provincias);
      out.provincias.rows = n.rows;
      out.territoriosProv = n.map;
      out.territorios = out.territoriosProv;
    }
    ctx.normalized[2024].pres = out;
  }

  // ===== SEN =====
  if (r2024.sen) {
    const out = ensureLevelShape({});
    out.nacional = normalizeNacional(r2024.sen.nacional);
    if (r2024.sen.provincias) {
      const n = normalizeIdMap(r2024.sen.provincias);
      out.provincias.rows = n.rows;
      out.territoriosProv = n.map;
      out.territorios = out.territoriosProv;
    }
    ctx.normalized[2024].sen = out;
  }

  // ===== DIP =====
  if (r2024.dip) {
    const out = ensureLevelShape({});
    out.nacional = normalizeNacional(r2024.dip.nacional);
    if (r2024.dip.provincias) {
      const n = normalizeIdMap(r2024.dip.provincias);
      out.provincias.rows = n.rows;
      out.territoriosProv = n.map;
    }
    if (r2024.dip.circunscripciones) {
      const n = normalizeIdMap(r2024.dip.circunscripciones);
      out.circunscripciones.rows = n.rows;
      out.territoriosCirc = n.map;
      out.circunscripciones = out.territoriosCirc; // compat mapa
    }
    out.territorios = out.territoriosProv;
    ctx.normalized[2024].dip = out;
  }

  // ===== MUN (ALCALDES) =====
  // Formato: mun.municipios[id] = {nombre, meta, votes}
  if (r2024.mun && r2024.mun.municipios) {
    const out = ensureLevelShape({});
    const n = normalizeIdMap(r2024.mun.municipios);
    out.municipios.rows = n.rows;
    out.territoriosMun = n.map;
    out.territorios = out.territoriosMun;
    ctx.normalized[2024].alc = out; // el nivel en la app es "alc"
  }
  // compat si viniera como "alc"
  if (r2024.alc && r2024.alc.municipios) {
    const out = ensureLevelShape({});
    const n = normalizeIdMap(r2024.alc.municipios);
    out.municipios.rows = n.rows;
    out.territoriosMun = n.map;
    out.territorios = out.territoriosMun;
    ctx.normalized[2024].alc = out;
  }

  // ===== DM =====
  // Formato: dm[id].data = {flat}
  if (r2024.dm) {
    const out = ensureLevelShape({});
    const n = normalizeIdMap(r2024.dm);
    out.municipios.rows = n.rows;
    out.territoriosMun = n.map;
    out.territorios = out.territoriosMun;
    ctx.normalized[2024].dm = out;
  }

  // Extras opcionales
  try { ctx.geography   = await fetchJSON("./data/geography.json"); } catch(e) {}
  try { ctx.curules2024 = await fetchJSON("./data/curules_2024.json"); } catch(e) {}

  ctx.normalized["2024"] = ctx.normalized[2024];
  return hardEnsureNormalized(ctx);
}
