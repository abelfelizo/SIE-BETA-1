// assets/js/core/data.js  (BETA 2 LOADER adaptado a JSON flat por nivel)

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
    if (!ctx.normalized[String(Y)] || typeof ctx.normalized[String(Y)] !== "object") {
      ctx.normalized[String(Y)] = ctx.normalized[Y];
    }

    LEVELS.forEach((lv) => {
      ctx.normalized[Y][lv] = ensureLevelShape(ctx.normalized[Y][lv]);
      ctx.normalized[String(Y)][lv] = ctx.normalized[Y][lv];
    });

    // aliases por si alguna vista usa ctx.normalized[y].pres
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

// Convierte objeto flat {EMITIDOS, VALIDOS, NULOS, PRM, FP...} -> {meta, rows[]}
function flatToMetaRows(flat) {
  const metaKeys = new Set(["PADRON","INSCRITOS","EMITIDOS","VALIDOS","NULOS","BLANCOS","OBSERVADOS"]);
  const meta = {};
  const rows = [];

  if (!flat || typeof flat !== "object") return { meta:{}, rows:[] };

  Object.keys(flat).forEach((k) => {
    const v = flat[k];
    if (metaKeys.has(k)) meta[k] = Number(v) || 0;
    else rows.push({ partido: k, votos: Number(v) || 0 });
  });

  // Ordena por votos desc
  rows.sort((a,b)=>b.votos-a.votos);

  return { meta, rows };
}

// Normaliza un bloque "nivel" con posibles secciones (nacional/provincias/municipios/circunscripciones)
// Cada sección puede venir como "flat" o como {rows/meta} ya armados.
function normalizeNivelBlock(block) {
  const out = ensureLevelShape({});
  if (!block || typeof block !== "object") return out;

  // 1) nacional
  if (block.nacional) {
    const nm = flatToMetaRows(block.nacional);
    out.nacional = { meta: nm.meta, rows: nm.rows };
  }

  // 2) provincias (si viene como mapa: { "Azua": {..flat..}, ... })
  if (block.provincias && typeof block.provincias === "object") {
    // guardamos como rows de objetos {id/nombre, ...} si lo necesitas luego,
    // pero por ahora mantenemos un placeholder estable:
    out.provincias.meta = out.provincias.meta || {};
    out.provincias.rows = out.provincias.rows || [];
    // Si quieres listar provincias más adelante, se itera aquí.
  }

  // 3) municipios
  if (block.municipios && typeof block.municipios === "object") {
    out.municipios.meta = out.municipios.meta || {};
    out.municipios.rows = out.municipios.rows || [];
  }

  // 4) circunscripciones
  if (block.circunscripciones && typeof block.circunscripciones === "object") {
    out.circunscripciones.meta = out.circunscripciones.meta || {};
    out.circunscripciones.rows = out.circunscripciones.rows || [];
  }

  return out;
}

export async function loadCTX() {
  let ctx = hardEnsureNormalized({ normalized: {}, data: {}, meta: {} });

  // Cargar results 2024
  const r2024 = await fetchJSON("./data/results_2024.json");
  ctx.data.results_2024 = r2024;
  ctx.meta.source_2024 = r2024.meta || {};

  // Mapear mun->alc si existiera (por compatibilidad)
  if (r2024.mun && !r2024.alc) r2024.alc = r2024.mun;

  // Normalizar cada nivel según exista
  if (r2024.pres) ctx.normalized[2024].pres = normalizeNivelBlock(r2024.pres);
  if (r2024.sen)  ctx.normalized[2024].sen  = normalizeNivelBlock(r2024.sen);
  if (r2024.dip)  ctx.normalized[2024].dip  = normalizeNivelBlock(r2024.dip);
  if (r2024.alc)  ctx.normalized[2024].alc  = normalizeNivelBlock(r2024.alc);
  if (r2024.dm)   ctx.normalized[2024].dm   = normalizeNivelBlock(r2024.dm);

  // Extras opcionales
  try { ctx.geography = await fetchJSON("./data/geography.json"); } catch (e) {}
  try { ctx.curules2024 = await fetchJSON("./data/curules_2024.json"); } catch (e) {}

  // Reflejar llave string "2024"
  ctx.normalized["2024"] = ctx.normalized[2024];

  // Re-asegurar estructura total
  ctx = hardEnsureNormalized(ctx);

  return ctx;
}
