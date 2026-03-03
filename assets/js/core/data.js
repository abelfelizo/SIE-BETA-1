// assets/js/core/data.js
// Loader estable: garantiza ctx.normalized[year][nivel]

const LEVELS = ["pres", "sen", "dip", "alc", "dm"];

function ensureNormalized(ctx) {
  if (!ctx || typeof ctx !== "object") ctx = {};
  if (!ctx.normalized || typeof ctx.normalized !== "object") ctx.normalized = {};

  [2020, 2024, 2028].forEach((y) => {
    if (!ctx.normalized[y] || typeof ctx.normalized[y] !== "object") ctx.normalized[y] = {};
    LEVELS.forEach((lv) => {
      if (!ctx.normalized[y][lv] || typeof ctx.normalized[y][lv] !== "object") {
        ctx.normalized[y][lv] = {}; // vacío pero existente
      }
    });
  });

  if (!ctx.data || typeof ctx.data !== "object") ctx.data = {};
  if (!ctx.meta || typeof ctx.meta !== "object") ctx.meta = {};

  return ctx;
}

export async function loadCTX() {
  // aquí luego cargaremos data real; por ahora estructura estable
  const ctx = {
    normalized: {},
    data: {},
    meta: {}
  };

  return ensureNormalized(ctx);
}
