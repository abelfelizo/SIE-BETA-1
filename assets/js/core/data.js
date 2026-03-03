// assets/js/core/data.js  (BETA 2 LOADER)

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
    // también llave string por si alguna vista usa "2024"
    if (!ctx.normalized[String(Y)] || typeof ctx.normalized[String(Y)] !== "object") {
      ctx.normalized[String(Y)] = ctx.normalized[Y];
    }

    LEVELS.forEach((lv) => {
      ctx.normalized[Y][lv] = ensureLevelShape(ctx.normalized[Y][lv]);
      ctx.normalized[String(Y)][lv] = ctx.normalized[Y][lv];
    });

    // aliases por si alguna parte usa ctx.normalized[y].pres
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

function mapIntoNormalized(ctx, year, key, payload) {
  if (!payload) return;
  // Normaliza distintos nombres posibles
  const src = payload[key];
  if (!src) return;
  ctx.normalized[year][key] = ensureLevelShape(src);
  ctx.normalized[String(year)][key] = ctx.normalized[year][key];
  ctx.normalized[year][key] = ctx.normalized[year][key]; // keep
}

export async function loadCTX() {
  let ctx = hardEnsureNormalized({ normalized: {}, data: {}, meta: {} });

  // 1) Cargar data 2024
  const r2024 = await fetchJSON("./data/results_2024.json");

  // Guardar crudo por si lo necesitas luego
  ctx.data.results_2024 = r2024;

  // 2) Mapear a llaves del sistema
  //   - alcaldes puede venir como "mun" o "alc"
  //   - dm igual
  if (r2024.mun && !r2024.alc) r2024.alc = r2024.mun;

  mapIntoNormalized(ctx, 2024, "pres", r2024);
  mapIntoNormalized(ctx, 2024, "sen",  r2024);
  mapIntoNormalized(ctx, 2024, "dip",  r2024);
  mapIntoNormalized(ctx, 2024, "alc",  r2024);
  mapIntoNormalized(ctx, 2024, "dm",   r2024);

  // 3) Extras opcionales (si existen)
  // No rompen si no están, pero si están ayudan a mapa/curules
  try { ctx.geography = await fetchJSON("./data/geography.json"); } catch (e) {}
  try { ctx.curules2024 = await fetchJSON("./data/curules_2024.json"); } catch (e) {}

  // 4) Re-asegurar estructura total (2020/2028 vacíos pero existentes)
  ctx = hardEnsureNormalized(ctx);

  return ctx;
}
