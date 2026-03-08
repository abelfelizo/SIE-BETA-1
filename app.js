// ================================================================
// SIE 2028 — ENTRY POINT v8.4
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
        <div style="font-size:.75rem;color:var(--muted);text-align:center">${sub||''}</div>
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

  setMsg('Cargando datasets 2024…', '');

  // Datasets a cargar — map a variables globales que engine + ui esperan
  const DATASETS = [
    { key: '_DS_RESULTADOS',   file: 'resultados_2024.json'       },
    { key: '_DS_PADRON',       file: 'padron_2024.json'           },
    { key: '_DS_ALIANZAS',     file: 'alianzas_2024.json'         },
    { key: '_DS_CURULES',      file: 'curules_resultado_2024.json' },
    { key: '_DS_CURULES_CAT',  file: 'curules_catalogo.json'      },
    { key: '_DS_PARTIDOS',     file: 'partidos.json'              },
    { key: '_DS_TERRITORIOS',  file: 'territorios_catalogo.json'  },
    { key: '_PROV_METRICS',    file: 'prov_metrics_2024.json'     },
  ];

  let loaded = 0;
  for (const ds of DATASETS) {
    setMsg('Cargando ' + ds.file + '…', loaded + '/' + DATASETS.length + ' archivos');
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

  setMsg('Inicializando motores…', loaded + '/' + DATASETS.length + ' datasets listos');

  // Cargar engine y UI como scripts clásicos (no modules)
  // engine.js expone window.SIE_MOTORES
  // ui.js consume window._DS_* y window._PROV_METRICS
  try {
    await loadScript('./core/engine.js');
    await loadScript('./core/ui.js');
  } catch (err) {
    setError('Error cargando motor: ' + err.message);
    return;
  }

  console.log('✅ SIE 2028 v8.4 · Dataset 2024 ACTIVO · Boot OK');
})();

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error('No se pudo cargar ' + src)); };
    document.body.appendChild(s);
  });
}
