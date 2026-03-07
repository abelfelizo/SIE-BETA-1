// SIE 2028 - Sistema Inteligencia Electoral
// Versión 8.3 - Dataset 2024 ACTIVO

console.log('🚀 SIE 2028 v8.3 - Dataset 2024 ACTIVO');

// Cargar datasets
async function initSIE() {
  try {
    // Cargar datos
    const response = await fetch('./data/resultados_2024.json');
    const resultados = await response.json();
    
    console.log('✅ Dataset 2024 cargado correctamente');
    console.log('Niveles:', Object.keys(resultados.niveles));
    
    // Cargar padrón
    const padronResp = await fetch('./data/padron_2024.json');
    const padron = await padronResp.json();
    
    console.log('✅ Padrón: ' + padron.niveles.nacional.inscritos.toLocaleString() + ' inscritos');
    
    // Global data
    window.DATA = {
      resultados,
      padron,
      dataset: '2024',
      status: 'READY'
    };
    
    // Renderizar vista
    renderDashboard();
    
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
  }
}

function renderDashboard() {
  const view = document.getElementById('view');
  view.innerHTML = `
    <div style="padding: 2rem;">
      <h1>SIE 2028 - Sistema Inteligencia Electoral</h1>
      <p>✅ Dataset 2024 cargado y listo</p>
      <p>Padrón: 8,145,548 inscritos</p>
      <p>Niveles: Presidencial, Senadores, Diputados, Exterior</p>
      <pre id="debug" style="background: #1e1e1e; padding: 1rem; overflow: auto;"></pre>
    </div>
  `;
  
  // Debug
  const debug = document.getElementById('debug');
  debug.textContent = JSON.stringify({
    sistema: 'SIE 2028',
    version: '8.3',
    dataset: window.DATA.dataset,
    padron_nacional: window.DATA.padron.niveles.nacional.inscritos,
    provincias: window.DATA.padron.niveles.provincia.length,
    niveles: Object.keys(window.DATA.resultados.niveles)
  }, null, 2);
}

// Iniciar
initSIE();
