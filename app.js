// ================================================================
// SIE 2028 — ENTRY POINT v8.5
// Carga datasets via fetch, expone globals para engine + UI
// ================================================================

(async function boot() {
  const root = document.getElementById('view');

  function setMsg(msg, sub) {
    if (!root) return;
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:60vh;gap:1rem;color:var(--muted);">
        <div style="font-size:2rem">⚡</div>
        <div style="font-size:.9rem">${msg}</div>
        <div style="font-size:.75rem;color:var(--muted);text-align:center">${sub || ''}</div>
      </div>`;
  }

  function setError(msg) {
    if (!root) return;
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:60vh;gap:1rem;">
        <div style="font-size:2rem">⚠️</div>
        <div style="font-size:.9rem;color:var(--red)">${msg}</div>
        <div style="font-size:.75rem;color:var(--muted);text-align:center;line-height:1.6">
          Verifica que estás sirviendo el proyecto desde un servidor local.<br>
          Usa: <code style="background:var(--bg3);padding:.1rem .4rem;border-radius:.3rem">python3 -m http.server 8080</code>
        </div>
      </div>`;
  }

  setMsg('Cargando datasets 2024...', '');

  const DATASETS = [
    { key: '_DS_RESULTADOS',     file: 'resultados_2024.json' },
    { key: '_DS_ALIANZAS',       file: 'alianzas_2024.json' },
    { key: '_DS_CURULES',        file: 'curules_resultado_2024.json' },
    { key: '_DS_CURULES_CAT',    file: 'curules_catalogo.json' },
    { key: '_DS_PARTIDOS',       file: 'partidos.json' },
    { key: '_DS_TERRITORIOS',    file: 'territorios_catalogo.json' },
    { key: '_DS_PADRON',         file: 'padron_2024.json' },
    { key: '_DS_PADRON_PROV',    file: 'padron_provincial_2024.json' },
    { key: '_DS_PADRON_CIRC',    file: 'padron_circ_2024.json' },
    { key: '_DS_PADRON_EXT',     file: 'padron_exterior_2024.json' },
    { key: '_PROV_METRICS_PRES', file: 'prov_metrics_presidencial_2024.json' },
    { key: '_PROV_METRICS_SEN',  file: 'prov_metrics_senadores_2024.json' },
    { key: '_PROV_METRICS_DIP',  file: 'prov_metrics_diputados_2024.json' },
    { key: '_PROV_METRICS',      file: 'prov_metrics_presidencial_2024.json' }
  ];

  const TOTAL_DS = DATASETS.length;
  let loaded = 0;

  for (const ds of DATASETS) {
  setMsg('Cargando ' + ds.file + '...', loaded + '/' + TOTAL_DS + ' archivos');
  try {
    const resp = await fetch('./data/' + ds.file);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    window[ds.key] = await resp.json();
    loaded++;
  } catch (err) {
    setError('Error cargando ' + ds.file + ': ' + err.message);
    return;
  }
}

/* COMPATIBILIDAD CON UI */
window._PROV_PRES = window._PROV_METRICS_PRES;
window._PROV_SEN  = window._PROV_METRICS_SEN;
window._PROV_DIP  = window._PROV_METRICS_DIP;

setMsg('Inicializando motores...', loaded + '/' + TOTAL_DS + ' datasets listos');
  try {
    await loadScript('./core/engine.js');
    await loadScript('./core/ui.js');
  } catch (err) {
    setError('Error cargando motor: ' + err.message);
    console.error(err);
    return;
  }

  console.log('SIE 2028 v8.5 - Dataset 2024 ACTIVO - Boot OK');
})();

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = function() {
      reject(new Error('No se pudo cargar ' + src));
    };
    document.body.appendChild(s);
  });
}
