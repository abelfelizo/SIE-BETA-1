// assets/js/core/state.js
const state = {
  nivel: "pres",
  year: 2024,
  useProj: false,

  simulator: {
    overrideEnabled: false,
    overrideNivel: null,

    // ajustes directos por partido (simulador)
    partyAdjust: {},

    alianzas: {},
    movilizacion: {},
    arrastre: {},
    objetivo: {},
    params: {}
  },

  encuestas: { items: [] },

  recomputeAndRender: null
};

export default state;
export { state };

if (typeof window !== "undefined") window.state = state;
