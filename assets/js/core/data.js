 // assets/js/core/data.js
// Loader estable con estructura completa para evitar undefined

const LEVELS = ["pres", "sen", "dip", "alc", "dm"];

/* Garantiza estructura mínima por nivel */
function ensureLevelShape(obj) {
  if (!obj || typeof obj !== "object") obj = {};

  if (!obj.nacional)
    obj.nacional = { meta: {}, rows: [] };

  if (!obj.provincias)
    obj.provincias = { meta: {}, rows: [] };

  if (!obj.municipios)
    obj.municipios = { meta: {}, rows: [] };

  if (!obj.circunscripciones)
    obj.circunscripciones = { meta: {}, rows: [] };

  return obj;
}

/* Garantiza estructura normalized completa */
function ensureNormalized(ctx) {

  if (!ctx || typeof ctx !== "object") ctx = {};
  if (!ctx.normalized || typeof ctx.normalized !== "object")
    ctx.normalized = {};

  [2020, 2024, 2028].forEach((year) => {

    if (!ctx.normalized[year] ||
        typeof ctx.normalized[year] !== "object") {
      ctx.normalized[year] = {};
    }

    LEVELS.forEach((nivel) => {
      ctx.normalized[year][nivel] =
        ensureLevelShape(ctx.normalized[year][nivel]);
    });

  });

  if (!ctx.data || typeof ctx.data !== "object")
    ctx.data = {};

  if (!ctx.meta || typeof ctx.meta !== "object")
    ctx.meta = {};

  return ctx;
}

/* Loader principal */
export async function loadCTX() {

  // Aquí luego se cargará data real.
  // Por ahora solo estructura estable.

  const ctx = {
    normalized: {},
    data: {},
    meta: {}
  };

  return ensureNormalized(ctx);
}
