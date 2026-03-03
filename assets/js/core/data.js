// assets/js/core/data.js

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

  YEARS.forEach((Y) => {
    // claves como número y string por si alguna vista usa "2024"
    if (!ctx.normalized[Y] || typeof ctx.normalized[Y] !== "object") ctx.normalized[Y] = {};
    if (!ctx.normalized[String(Y)] || typeof ctx.normalized[String(Y)] !== "object") ctx.normalized[String(Y)] = ctx.normalized[Y];

    LEVELS.forEach((lv) => {
      ctx.normalized[Y][lv] = ensureLevelShape(ctx.normalized[Y][lv]);
      ctx.normalized[String(Y)][lv] = ctx.normalized[Y][lv];
    });

    // alias extra por si alguna parte usa ctx.normalized[y].pres directo
    ctx.normalized[Y].pres = ctx.normalized[Y]["pres"];
    ctx.normalized[Y].sen  = ctx.normalized[Y]["sen"];
    ctx.normalized[Y].dip  = ctx.normalized[Y]["dip"];
    ctx.normalized[Y].alc  = ctx.normalized[Y]["alc"];
    ctx.normalized[Y].dm   = ctx.normalized[Y]["dm"];
    ctx.normalized[String(Y)].pres = ctx.normalized[Y]["pres"];
  });

  if (!ctx.data || typeof ctx.data !== "object") ctx.data = {};
  if (!ctx.meta || typeof ctx.meta !== "object") ctx.meta = {};

  return ctx;
}

async function fetchJSON(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo cargar " + path + " (" + r.status + ")");
  return r.json();
}

export async function loadCTX() {
  // 1) ctx base con estructura garantizada
  let ctx = hardEnsureNormalized({ normalized: {}, data: {}, meta: {} });

  // 2) Cargar data si existe (sin romper si faltan archivos)
  // Ajusta estos nombres si tus JSON se llaman distinto.
  try {
    const r2024 = await fetchJSON("./data/results_2024.json");
    // mapear mun -> alc si viene así
    if (r2024 && r2024.mun && !r2024.alc) r2024.alc = r2024.mun;

    // Copiar a normalized si coincide estructura
    if (r2024.pres) ctx.normalized[2024].pres = ensureLevelShape(r2024.pres);
    if (r2024.sen)  ctx.normalized[2024].sen  = ensureLevelShape(r2024.sen);
    if (r2024.dip)  ctx.normalized[2024].dip  = ensureLevelShape(r2024.dip);
    if (r2024.alc)  ctx.normalized[2024].alc  = ensureLevelShape(r2024.alc);
    if (r2024.dm)   ctx.normalized[2024].dm   = ensureLevelShape(r2024.dm);

    // reflejar en claves string también
    ctx.normalized["2024"] = ctx.normalized[2024];
  } catch (e) {
    // si no hay data aún, no pasa nada: estructura queda
  }

  // 3) Re-asegurar por si algo quedó sin llaves
  ctx = hardEnsureNormalized(ctx);

  return ctx;
}
