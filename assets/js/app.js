/**
 * SIE 2028
 * APP (router + boot) - CLEAN MODULAR
 */
import { loadCTX } from "./core/data.js";
import { state }   from "./core/state.js";
import { toast }   from "./ui/toast.js";

import { renderDashboard }    from "./ui/views/dashboard.js";
import { renderMapa }         from "./ui/views/mapa.js";
import { renderSimulador }    from "./ui/views/simulador.js";
import { renderPotencial }    from "./ui/views/potencial.js";
import { renderMovilizacion } from "./ui/views/movilizacion.js";
import { renderObjetivo }     from "./ui/views/objetivo.js";
import { renderAuditoria }    from "./ui/views/auditoria.js";

const ROUTES = [
  { id:"dashboard",    label:"Dashboard",    fn: renderDashboard    },
  { id:"mapa",         label:"Mapa",         fn: renderMapa         },
  { id:"simulador",    label:"Simulador",    fn: renderSimulador    },
  { id:"potencial",    label:"Potencial",    fn: renderPotencial    },
  { id:"movilizacion", label:"Movilizacion", fn: renderMovilizacion },
  { id:"objetivo",     label:"Objetivo",     fn: renderObjetivo     },
  { id:"auditoria",    label:"Auditoria",    fn: renderAuditoria    },
];

let ctx = null;
let currentRoute = "dashboard";
let rendering = false;

function setState(patch){
  try {
    if (patch && typeof patch === "object") Object.assign(state, patch);
  } catch(e) {}
  if (typeof state.recomputeAndRender === "function") state.recomputeAndRender();
}

async function render(routeId){
  if (rendering) return;
  rendering = true;

  const root = document.getElementById("view");
  if (!root) { rendering = false; return; }

  try {
    if (!ctx) {
      root.innerHTML = '<div class="loading">Cargando datos...</div>';
      ctx = await loadCTX();
      if (!ctx || typeof ctx !== "object") ctx = {};
      if (!ctx.normalized) ctx.normalized = {};
    }

    currentRoute = routeId;

    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.route === routeId);
    });

    history.replaceState({}, "", "#" + routeId);

    const route = ROUTES.find(r => r.id === routeId) || ROUTES[0];

    // Todas las vistas siguen firma: (root, ctx, state, setState)
    const out = route.fn(root, ctx, state, setState);
    if (out && typeof out.then === "function") await out;

    const expBtn = document.getElementById("btn-export");
    if (expBtn) expBtn.style.display = "none";

  } catch(e) {
    console.error("[SIE]", e);
    toast("Error: " + (e && e.message ? e.message : String(e)));
    root.innerHTML = '<div class="error-msg">Error: ' +
      (e && e.message ? e.message : String(e)) + '</div>';
  } finally {
    rendering = false;
  }
}

function initTheme(){
  const saved = localStorage.getItem("sie28-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = document.getElementById("btn-theme");
  if (!btn) return;
  btn.textContent = saved === "dark" ? "Claro" : "Oscuro";
  btn.addEventListener("click", () => {
    const cur  = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sie28-theme", next);
    btn.textContent = next === "dark" ? "Claro" : "Oscuro";
  });
}

function boot(){
  initTheme();

  const badge = document.getElementById("app-version-badge");
  if (badge && typeof window.SIE_VERSION === "string") badge.textContent = window.SIE_VERSION;

  const nav = document.getElementById("nav");
  if (nav) {
    nav.innerHTML = ROUTES.map(r =>
      '<button class="nav-btn" data-route="' + r.id + '">' + r.label + '</button>'
    ).join("");
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-btn");
      if (btn) render(btn.dataset.route);
    });
  }

  state.recomputeAndRender = () => render(currentRoute);

  const initial = (location.hash || "").replace("#","") || "dashboard";
  render(ROUTES.some(r=>r.id===initial) ? initial : "dashboard");

  window.addEventListener("hashchange", () => {
    const id = (location.hash || "").replace("#","");
    if (id && id !== currentRoute && ROUTES.some(r=>r.id===id)) render(id);
  });
}

window.addEventListener("DOMContentLoaded", boot);
