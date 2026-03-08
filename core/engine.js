
// ================================================================
// SIE 2028 — MOTORES CORE v8.4
// Dataset: 2024 | Metodología: modelos electorales validados
// ================================================================
// Fuentes metodológicas:
//   D'Hondt: Ley Electoral RD 275-97, Art. 68
//   ENPP:    Laakso & Taagepera (1979) "Effective Number of Parties"
//   Riesgo:  Jacobson (2004) competitiveness framework
//   Swing:   Gelman & King (1994) elastic electorate
//   Proyección: Fundamentals model (Abramowitz 2008) adaptado
//   Movilización: Turnout gap theory (Leighley & Nagler 2013)
// ================================================================

// ─────────────────────────────────────────────────────────────────
// MOTOR 1: CARGA DE DATASETS
// Rol: punto de entrada único, valida schema antes de distribuir
// ─────────────────────────────────────────────────────────────────
const MotorCarga = {
  status: 'READY',
  datasets: {},
  init(datasets) {
    this.datasets = datasets;
    const required = ['resultados','curules','partidos','padron','territorios','alianzas','curulesCat'];
    const missing = required.filter(k => !datasets[k]);
    if (missing.length) {
      console.error('❌ Motor Carga: faltan datasets:', missing);
      this.status = 'ERROR';
      return null;
    }
    console.log('✅ Motor Carga: 7 datasets validados · Dataset 2024 ACTIVO');
    this.status = 'READY';
    return this.datasets;
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 2: VALIDACIÓN / CONSISTENCIA
// Modelo: auditoría de consistencia interna (MIT Election Data Lab)
// Reglas: suma lógica de votos, partidos en catálogo, curules cuadran
// ─────────────────────────────────────────────────────────────────
const MotorValidacion = {
  errores: [],
  advertencias: [],
  ok: false,

  run(resultados, partidos, curulesCat, curulesCRes) {
    this.errores = [];
    this.advertencias = [];

    const catPartidos = new Set(partidos.partidos.map(p => p.id));
    const pres = resultados.niveles.presidencial;
    const totales = pres.totales;

    // R1: votos válidos + nulos = emitidos
    const suma = totales.votos_validos + totales.votos_nulos;
    if (Math.abs(suma - totales.votos_emitidos) > 10) {
      this.errores.push(`R1: válidos(${totales.votos_validos})+nulos(${totales.votos_nulos})≠emitidos(${totales.votos_emitidos})`);
    }

    // R2: suma de votos por partido = votos_validos (presidencial)
    const sumaPartidos = Object.values(pres.resultados).reduce((s,n)=>s+n,0);
    if (Math.abs(sumaPartidos - totales.votos_validos) > 100) {
      this.errores.push(`R2: suma votos partidos (${sumaPartidos}) ≠ votos válidos (${totales.votos_validos})`);
    }

    // R3: todos los partidos en resultados existen en catálogo
    Object.keys(pres.resultados).forEach(p => {
      if (!catPartidos.has(p)) this.advertencias.push(`R3: partido '${p}' no está en catálogo`);
    });

    // R4: curules senadores = 32
    const senCurules = curulesCRes.niveles.senadores.reduce((s,x)=>
      s + x.resultado.reduce((a,r)=>a+r.curules,0),0);
    if (senCurules !== 32) this.errores.push(`R4: senadores=${senCurules} (esperado 32)`);

    // R5: curules diputados territoriales = 178
    const dipCurules = curulesCRes.niveles.diputados.reduce((s,x)=>
      s + x.resultado.reduce((a,r)=>a+r.curules,0),0);
    if (dipCurules !== 178) this.errores.push(`R5: diputados=${dipCurules} (esperado 178)`);

    // R6: curules total = 222
    const natCurules = (curulesCRes.niveles.diputados_nacionales.resultado||[]).reduce((s,r)=>s+r.curules,0);
    const extCurules = curulesCRes.niveles.diputados_exterior.reduce((s,x)=>
      s+x.resultado.reduce((a,r)=>a+r.curules,0),0);
    const totalCurules = senCurules + dipCurules + natCurules + extCurules;
    if (totalCurules !== 222) this.errores.push(`R6: total curules=${totalCurules} (esperado 222)`);

    // R7: participación razonable (entre 40% y 90%)
    const partic = totales.porcentaje_participacion;
    if (partic < 40 || partic > 90) this.advertencias.push(`R7: participación=${partic}% fuera de rango normal`);

    this.ok = this.errores.length === 0;
    return { ok: this.ok, errores: this.errores, advertencias: this.advertencias, totalCurules };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 3: PADRÓN / PARTICIPACIÓN
// Modelo: turnout analysis (Leighley & Nagler 2013)
// Schema nuevo: padron.padron[] con tipo 'provincia'|'municipio'
// ─────────────────────────────────────────────────────────────────
const MotorPadron = {
  _list: [],
  PADRON_OFICIAL: 8145548, // validado JCE, incluye exterior

  init(padronRaw) {
    this._list = padronRaw.padron;
  },

  // Padrón doméstico (solo provincias, sin exterior)
  getPadronNacional() {
    return this._list.reduce((s,x)=> x.tipo==='provincia' ? s+x.inscritos : s, 0);
  },

  // Padrón oficial completo (doméstico + exterior) según JCE
  getPadronOficial() {
    return this.PADRON_OFICIAL;
  },

  getPadronProvincia(provinciaId) {
    return this._list.find(x=> x.tipo==='provincia' && x.territorio_id===provinciaId);
  },

  getPadronMunicipio(municipioId) {
    return this._list.find(x=> x.tipo==='municipio' && x.territorio_id===municipioId);
  },

  getAllProvincias() {
    return this._list.filter(x=> x.tipo==='provincia');
  },

  // Participación nacional (usa padrón oficial JCE)
  getParticipacionNacional(votosEmitidos) {
    return +(votosEmitidos / this.PADRON_OFICIAL * 100).toFixed(2);
  },

  // Participación provincial (usa padrón doméstico provincial)
  getParticipacionProvincia(provinciaId, votosEmitidos) {
    const p = this.getPadronProvincia(provinciaId);
    if (!p || p.inscritos === 0) return 0;
    return +(votosEmitidos / p.inscritos * 100).toFixed(2);
  },

  // Abstención = 100 - participación
  getAbstencion(participacion) {
    return +(100 - participacion).toFixed(2);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 4: RESULTADOS ELECTORALES
// Modelo: agregación directa + desagregación por bloques electorales
// ─────────────────────────────────────────────────────────────────
const MotorResultados = {
  _r: null, _a: null, _p: null,
  _partyNames: {},
  _blocMap: {},

  init(resultados, alianzas, partidos) {
    this._r = resultados;
    this._a = alianzas;
    this._p = partidos;
    this._partyNames = Object.fromEntries(partidos.partidos.map(p=>[p.id, p.nombre]));
    this._buildBlocMap();
  },

  _buildBlocMap() {
    this._blocMap = {};
    (this._a.niveles.presidencial[0]?.bloques || []).forEach(bloc => {
      bloc.partidos.forEach(p => { this._blocMap[p] = bloc.candidato_base; });
    });
  },

  getPartidoNombre(id) { return this._partyNames[id] || id; },
  getBlocFor(id)        { return this._blocMap[id] || id; },

  // Resultados presidenciales agregados por bloque
  getPresidencialByBloc() {
    const raw    = this._r.niveles.presidencial.resultados;
    const totales = this._r.niveles.presidencial.totales;
    const blocs  = {};
    Object.entries(raw).forEach(([p,v]) => {
      const b = this.getBlocFor(p);
      blocs[b] = (blocs[b]||0) + v;
    });
    return Object.entries(blocs)
      .map(([id,votos]) => ({
        id, votos,
        nombre: this.getPartidoNombre(id),
        pct: +(votos/totales.votos_validos*100).toFixed(2)
      }))
      .sort((a,b) => b.votos - a.votos);
  },

  // Resultados presidenciales por partido individual (sin agrupar)
  getPresidencialByPartido() {
    const raw = this._r.niveles.presidencial.resultados;
    const total = this._r.niveles.presidencial.totales.votos_validos;
    return Object.entries(raw)
      .map(([id,votos]) => ({ id, nombre: this.getPartidoNombre(id), votos, pct: +(votos/total*100).toFixed(2) }))
      .sort((a,b) => b.votos - a.votos);
  },

  getTotalesPresidencial() { return this._r.niveles.presidencial.totales; },

  // Senadores: resultados por provincia, agregados por bloque
  getSenadores() {
    // Alianzas de senadores son por provincia — distintas al presidencial
    const senAlianzas = this._a.niveles.senadores || [];

    return this._r.niveles.senadores.map(prov => {
      // Mapa de bloque para esta provincia específica
      const provBlocMap = {};
      const provAli = senAlianzas.find(a => a.provincia_id === prov.provincia_id);
      if (provAli) {
        provAli.bloques.forEach(b => {
          b.partidos.forEach(p => { provBlocMap[p] = b.candidato_base; });
        });
      }
      const getBlocProv = p => provBlocMap[p] || p;

      const blocs = {};
      Object.entries(prov.resultados).forEach(([p,v]) => {
        const b = getBlocProv(p);
        blocs[b] = (blocs[b]||0)+v;
      });
      const sorted = Object.entries(blocs).sort((a,b)=>b[1]-a[1]);
      const total  = sorted.reduce((s,[,v])=>s+v,0);
      const ganador = sorted[0][0];

      // Bloque coalición presidencial del ganador
      const prmPresBloc = (this._a.niveles.presidencial[0]?.bloques || []).find(b => b.candidato_base === 'PRM');
      const fpPresBloc  = (this._a.niveles.presidencial[0]?.bloques || []).find(b => b.candidato_base === 'FP');
      let bloque_coalicion = 'otro';
      if (ganador === 'PRM' || (prmPresBloc && prmPresBloc.partidos.includes(ganador))) bloque_coalicion = 'PRM-coalicion';
      else if (ganador === 'FP' || (fpPresBloc && fpPresBloc.partidos.includes(ganador))) bloque_coalicion = 'FP-coalicion';

      return {
        provincia_id:     prov.provincia_id,
        provincia:        prov.provincia,
        ganador,                          // partido que ganó realmente
        bloque_coalicion,                 // PRM-coalicion | FP-coalicion | otro
        pct_ganador:      +(sorted[0][1]/total*100).toFixed(1),
        top3: sorted.slice(0,3).map(([id,v])=>({
          id, nombre: this.getPartidoNombre(id),
          pct: +(v/total*100).toFixed(1)
        }))
      };
    });
  },

  getDiputados() { return this._r.niveles.diputados; }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 5: ALIANZAS
// Modelo: bloc aggregation (Golder 2006 electoral alliances framework)
// ─────────────────────────────────────────────────────────────────
const MotorAlianzas = {
  _a: null,
  init(alianzasData) { this._a = alianzasData; },

  getBloques(nivel='presidencial') {
    return this._a.niveles[nivel]?.[0]?.bloques || [];
  },

  getCoalicion(basePartido, nivel='presidencial') {
    return this.getBloques(nivel).find(b => b.candidato_base === basePartido) || null;
  },

  // Escenario sin alianzas: cada partido compite solo
  simularSinAlianza(resultadosRaw, totalValidos) {
    return Object.entries(resultadosRaw)
      .map(([id,votos]) => ({ id, votos, pct: +(votos/totalValidos*100).toFixed(2) }))
      .sort((a,b) => b.votos - a.votos);
  },

  // Fuerza de coalición: contribución de cada aliado al bloque
  getFuerzaCoalicion(basePartido, resultadosRaw, totalValidos) {
    const bloc = this.getCoalicion(basePartido);
    if (!bloc) return [];
    return bloc.partidos
      .map(p => ({ partido: p, votos: resultadosRaw[p]||0, pct: +((resultadosRaw[p]||0)/totalValidos*100).toFixed(2) }))
      .sort((a,b) => b.votos - a.votos);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 6: CURULES / D'HONDT
// Modelo: método D'Hondt (Ley Electoral RD 275-97, Art. 68)
// Umbral: 2% votos válidos para participar en distribución
// ─────────────────────────────────────────────────────────────────
const MotorCurules = {
  _cat: null, _res: null,
  UMBRAL_PCT: 2, // 2% umbral legal RD

  init(curulesCat, curulesRes) {
    this._cat = curulesCat;
    this._res = curulesRes;
    this._computeTotals();
  },

  _computeTotals() {
    this._totals = { senadores:{}, diputados:{}, nacionales:{}, exterior:{}, total:{} };
    const add = (obj,p,n) => { obj[p]=(obj[p]||0)+n; };

    this._res.niveles.senadores.forEach(p =>
      p.resultado.forEach(r => add(this._totals.senadores, r.partido, r.curules)));

    this._res.niveles.diputados.forEach(c =>
      c.resultado.forEach(r => add(this._totals.diputados, r.partido, r.curules)));

    (this._res.niveles.diputados_nacionales.resultado||[]).forEach(r =>
      add(this._totals.nacionales, r.partido, r.curules));

    this._res.niveles.diputados_exterior.forEach(c =>
      c.resultado.forEach(r => add(this._totals.exterior, r.partido, r.curules)));

    Object.values(this._totals).slice(0,4).forEach(obj =>
      Object.entries(obj).forEach(([p,n]) => add(this._totals.total, p, n)));
  },

  // D'Hondt puro con umbral legal del 2%
  dhondt(votosObj, escanos, totalValidos) {
    const umbral = (totalValidos || Object.values(votosObj).reduce((s,n)=>s+n,0)) * this.UMBRAL_PCT / 100;
    // Filtrar partidos bajo el umbral
    const elegibles = Object.entries(votosObj).filter(([,v]) => v >= umbral);
    if (elegibles.length === 0) return {};

    const quotients = [];
    elegibles.forEach(([partido, votos]) => {
      for (let d = 1; d <= escanos; d++) {
        quotients.push({ partido, q: votos / d });
      }
    });
    quotients.sort((a,b) => b.q - a.q);

    const result = {};
    quotients.slice(0, escanos).forEach(({ partido }) => {
      result[partido] = (result[partido]||0) + 1;
    });
    return result;
  },

  getTotalByNivel(nivel) { return this._totals[nivel] || {}; },

  getTotalLegislativo() {
    return Object.entries(this._totals.total)
      .map(([id,curules]) => ({ id, curules }))
      .sort((a,b) => b.curules - a.curules);
  },

  getSumaCurules() {
    return Object.values(this._totals.total).reduce((s,n)=>s+n,0);
  },

  // Senadores: detalle con ganador real + bloque coalición
  getSenadores() {
    return this._res.niveles.senadores.map(p => ({
      provincia_id:     p.provincia_id,
      provincia:        p.provincia,
      ganador:          p.ganador,           // partido que ganó realmente (PLR, APD, etc.)
      bloque_coalicion: p.bloque_coalicion,  // PRM-coalicion | FP-coalicion | otro
      pct_ganador:      p.pct_ganador
    }));
  },

  // Senadores agrupados por coalición presidencial
  getSenadorePorCoalicion() {
    const resumen = {};
    this._res.niveles.senadores.forEach(p => {
      const coal = p.bloque_coalicion || p.ganador;
      resumen[coal] = (resumen[coal]||0) + 1;
    });
    return Object.entries(resumen)
      .map(([id, curules]) => ({ id, curules }))
      .sort((a,b) => b.curules - a.curules);
  },

  getDiputadosDetail()  { return this._res.niveles.diputados; },
  getExteriorDetail()   { return this._res.niveles.diputados_exterior; },
  getNacionalesDetail() { return this._res.niveles.diputados_nacionales; }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 7: TERRITORIAL
// ─────────────────────────────────────────────────────────────────
const MotorTerritorial = {
  _t: null,
  init(territoriosCat) { this._t = territoriosCat; },
  getProvincias()      { return this._t.provincias || []; },
  getMunicipios()      { return this._t.municipios || []; },
  getCircDiputados()   { return this._t.circ_diputados || []; },
  getCircExterior()    { return this._t.circ_exterior || []; },
  getProvincia(id)     { return (this._t.provincias||[]).find(p=>p.id===id); }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 8: KPIs / RESUMEN EJECUTIVO
// Incluye: ENPP (Laakso-Taagepera), índice de concentración
// ─────────────────────────────────────────────────────────────────
const MotorKPIs = {
  // ENPP: Effective Number of Parliamentary Parties
  // Laakso & Taagepera (1979) — estándar mundial en ciencia política
  calcENPP(curulesList, totalCurules) {
    const pcts = curulesList.map(x => x.curules / totalCurules);
    return +(1 / pcts.reduce((s,p) => s + p*p, 0)).toFixed(3);
  },

  // Índice de concentración bipartidista (top-2 / total)
  calcConcentracion(curulesList, totalCurules) {
    const top2 = curulesList.slice(0,2).reduce((s,x)=>s+x.curules,0);
    return +(top2/totalCurules*100).toFixed(1);
  },

  // Índice de ventaja presidencial (margen 1ro vs 2do)
  calcMargenPresidencial(blocsArray) {
    if (blocsArray.length < 2) return 100;
    return +(blocsArray[0].pct - blocsArray[1].pct).toFixed(2);
  },

  compute(resultados, curules, padron) {
    const totPres    = resultados.getTotalesPresidencial();
    const blocsPresid = resultados.getPresidencialByBloc();
    const legTotal   = curules.getTotalLegislativo();
    const totalCurules = curules.getSumaCurules();
    const inscritos  = padron.getPadronOficial();
    const participacion = padron.getParticipacionNacional(totPres.votos_emitidos);

    const enpp = this.calcENPP(legTotal, totalCurules);
    const concentracion = this.calcConcentracion(legTotal, totalCurules);
    const margen = this.calcMargenPresidencial(blocsPresid);
    const riesgoSegundaVuelta = blocsPresid[0]?.pct < 50;

    return {
      padron_oficial:        inscritos,
      votos_emitidos:        totPres.votos_emitidos,
      votos_validos:         totPres.votos_validos,
      participacion,
      abstencion:            padron.getAbstencion(participacion),
      ganador_presidencial:  blocsPresid[0]?.id,
      pct_ganador:           blocsPresid[0]?.pct,
      margen_presidencial:   margen,
      riesgo_segunda_vuelta: riesgoSegundaVuelta,
      curules_totales:       totalCurules,
      enpp_legislativo:      enpp,
      concentracion_top2:    concentracion,
      mayorias:              legTotal.slice(0,3).map(x=>({...x, pct:+(x.curules/totalCurules*100).toFixed(1)}))
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 9: REPLAY ELECTORAL 2024
// Modelo: verificación cruzada con datos JCE oficiales
// ─────────────────────────────────────────────────────────────────
const MotorReplay = {
  MODE: 'REPLAY',
  DATASET: 2024,

  run(resultados, curules, padron) {
    const checks = [];
    const add = (icon, name, test, expected, actual) => {
      const ok = test;
      checks.push({ icon, name, ok,
        expected: String(expected),
        actual: String(actual),
        status: ok ? '✅ OK' : `❌ esperado ${expected}, obtenido ${actual}` });
    };

    const totPres   = resultados.getTotalesPresidencial();
    const blocsP    = resultados.getPresidencialByBloc();
    const totalC    = curules.getSumaCurules();
    const senC      = Object.values(curules.getTotalByNivel('senadores')).reduce((s,n)=>s+n,0);
    const dipC      = Object.values(curules.getTotalByNivel('diputados')).reduce((s,n)=>s+n,0);
    const natC      = Object.values(curules.getTotalByNivel('nacionales')).reduce((s,n)=>s+n,0);
    const extC      = Object.values(curules.getTotalByNivel('exterior')).reduce((s,n)=>s+n,0);
    const partic    = padron.getParticipacionNacional(totPres.votos_emitidos);
    const prmPres   = blocsP[0];

    add('🗳️', 'Ganador presidencial = PRM', prmPres?.id==='PRM', 'PRM', prmPres?.id);
    add('📊', 'PRM > 50% votos válidos', prmPres?.pct > 50, '>50%', prmPres?.pct+'%');
    add('📋', 'Participación oficial 54.37%', Math.abs(partic-54.37)<1, '~54.37%', partic+'%');
    add('🏛️', 'Senadores = 32', senC===32, 32, senC);
    const senCoal = curules.getSenadorePorCoalicion();
    const prmCoalCount = (senCoal.find(x=>x.id==='PRM-coalicion')||{curules:0}).curules;
    add('🏛️', 'Bloque PRM: 29 senadores (24 PRM + 5 aliados)', prmCoalCount===29, 29, prmCoalCount);
    add('📋', 'Diputados territoriales = 178', dipC===178, 178, dipC);
    add('🌐', 'Diputados exterior = 7', extC===7, 7, extC);
    add('📝', 'Diputados nacionales = 5', natC===5, 5, natC);
    add('✔️', 'Total curules = 222', totalC===222, 222, totalC);
    add('✅', 'Validación interna OK', MotorValidacion.ok !== false, 'sin errores', MotorValidacion.errores.length+' errores');

    const passed = checks.filter(c=>c.ok).length;
    return { checks, passed, total: checks.length, pct: +(passed/checks.length*100).toFixed(0) };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 10: ESCENARIOS ELECTORALES
// Modelo: D'Hondt con umbral 2% (Ley 275-97)
// ─────────────────────────────────────────────────────────────────
const MotorEscenarios = {
  PARTIDOS: ['PRM','FP','PLD','PRD','PCR'],
  DEFAULTS: { PRM:50, FP:27, PLD:11, PRD:6, PCR:6 },

  // Simula legislativo completo con intenciones de voto
  // Usa D'Hondt del MotorCurules para mantener consistencia
  simularLegislativo(pcts) {
    const totalPct = Object.values(pcts).reduce((s,n)=>s+n,0);
    if (totalPct === 0) return null;
    // Normalizar a votos relativos (base 1,000,000 para precisión)
    const votos = Object.fromEntries(
      Object.entries(pcts).map(([p,pct]) => [p, pct/totalPct * 1000000])
    );
    const totalVotos = Object.values(votos).reduce((s,n)=>s+n,0);
    const dh = (n) => MotorCurules.dhondt(votos, n, totalVotos);

    const sen = dh(32);
    const dip = dh(178);
    const nat = dh(5);
    const ext = dh(7);
    const total = {};
    [sen,dip,nat,ext].forEach(obj =>
      Object.entries(obj).forEach(([p,n]) => { total[p]=(total[p]||0)+n; }));

    // Mayoría simple = 112 curules (50%+1 de 222)
    const mayoriaSimple = 112;
    const mayoriaCalificada = 148; // 2/3 de 222

    return {
      senadores: sen, diputados: dip, nacionales: nat, exterior: ext, total,
      analisis: {
        mayor_partido: Object.entries(total).sort((a,b)=>b[1]-a[1])[0],
        tiene_mayoria_simple: Object.entries(total).some(([,n])=>n>=mayoriaSimple),
        tiene_mayoria_calificada: Object.entries(total).some(([,n])=>n>=mayoriaCalificada),
        partidos_bajo_umbral: Object.entries(pcts).filter(([,p])=>p<2).map(([id])=>id)
      }
    };
  },

  // Escenario sin alianzas (cada partido compite solo)
  simularSinAlianza(resultadosRaw, totalValidos) {
    const votos = {};
    Object.entries(resultadosRaw).forEach(([p,v]) => { votos[p]=(votos[p]||0)+v; });
    return MotorCurules.dhondt(votos, 32, totalValidos);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 11: PROYECCIÓN ELECTORAL 2028
// Modelo: Fundamentals + incumbency model (Abramowitz 2008)
//         adaptado a contexto presidencial latinoamericano
//
// Variables:
//   - Base electoral 2024 (resultado real)
//   - Bonus de incumbencia (Erikson & Wlezien 2012): partido en gobierno
//     tiene ventaja estructural de +2 a +5pp en primer mandato
//   - Desgaste de gobierno: -2pp por cada año adicional en el poder
//     (Stimson "Public Support for American Presidents" adaptado)
//   - Ajuste por encuestas: Bayesian update cuando hay polls disponibles
// ─────────────────────────────────────────────────────────────────
const MotorProyeccion = {
  // Parámetros del modelo (calibrados en literatura comparada)
  PARAMS: {
    incumbencia_bonus: 3.5,      // Erikson & Wlezien: ~3.5pp en promedio
    desgaste_por_ciclo: 2.0,     // Cada ciclo electoral adicional -2pp
    regresion_media: 0.15,       // Mean reversion (Silver 538): 15% hacia 50%
    peso_encuesta: 0.60,         // Cuando hay encuestas, pesan 60% (Bayesian)
    peso_fundamentals: 0.40,     // Fundamentals pesan 40%
  },

  BASE_2024: {
    PRM: { votos_pct: 57.44, es_incumbente: true,  ciclos_en_poder: 1 },
    FP:  { votos_pct: 28.85, es_incumbente: false, ciclos_en_poder: 0 },
    PLD: { votos_pct: 10.39, es_incumbente: false, ciclos_en_poder: 0 },
  },

  proyectar(ajustes={}, encuestas=null) {
    const p = this.PARAMS;
    const result = {};

    Object.entries(this.BASE_2024).forEach(([partido, base]) => {
      let proyectado = base.votos_pct;

      // 1. Ajuste de incumbencia
      if (base.es_incumbente) {
        proyectado += p.incumbencia_bonus;
        // Desgaste si lleva más de 1 ciclo
        if (base.ciclos_en_poder > 1) {
          proyectado -= p.desgaste_por_ciclo * (base.ciclos_en_poder - 1);
        }
      }

      // 2. Regresión a la media (Silver/538): partidos muy fuertes tienden a bajar
      const dist_media = proyectado - 50;
      proyectado -= dist_media * p.regresion_media;

      // 3. Bayesian update con encuestas si disponibles
      if (encuestas && encuestas[partido] !== undefined) {
        proyectado = proyectado * p.peso_fundamentals + encuestas[partido] * p.peso_encuesta;
      }

      // 4. Ajuste manual (offset del usuario)
      proyectado += (ajustes[partido] || 0);

      result[partido] = {
        base_2024: base.votos_pct,
        proyectado: +Math.max(0, Math.min(100, proyectado)).toFixed(2),
        metodologia: encuestas ? 'Fundamentals+Encuestas' : 'Fundamentals',
        es_incumbente: base.es_incumbente
      };
    });

    // Normalizar para que sumen 100%
    const total = Object.values(result).reduce((s,x)=>s+x.proyectado,0);
    Object.values(result).forEach(x => { x.proyectado_norm = +(x.proyectado/total*100).toFixed(2); });

    return result;
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 12: CRECIMIENTO DEL PADRÓN
// Modelo: compound growth rate (CAGR) + proyección lineal
//         Metodología estándar en demografía electoral
// ─────────────────────────────────────────────────────────────────
const MotorCrecimientoPadron = {
  // Datos históricos validados (JCE oficial)
  HISTORICO: [
    { año: 2016, padron: 6872135 },
    { año: 2020, padron: 7497313 },
    { año: 2024, padron: 8145548 },
  ],

  // CAGR: Compound Annual Growth Rate
  // Formula estándar: CAGR = (Vf/Vi)^(1/n) - 1
  calcCAGR(inicio, fin, años) {
    return +((Math.pow(fin/inicio, 1/años) - 1) * 100).toFixed(3);
  },

  proyectar() {
    const hist = this.HISTORICO;
    const n = hist.length;

    // CAGR 2016-2024 (8 años)
    const cagr_8yr = this.calcCAGR(hist[0].padron, hist[n-1].padron, 8);

    // CAGR 2020-2024 (ciclo más reciente, más relevante)
    const cagr_4yr = this.calcCAGR(hist[1].padron, hist[n-1].padron, 4);

    // Proyección 2028 con ambas tasas
    const padron_2028_conservador = Math.round(hist[n-1].padron * Math.pow(1+cagr_4yr/100, 4));
    const padron_2028_tendencia   = Math.round(hist[n-1].padron * Math.pow(1+cagr_8yr/100, 4));
    const padron_2028_medio       = Math.round((padron_2028_conservador + padron_2028_tendencia) / 2);

    // Nuevos electores potenciales (crecimiento neto)
    const nuevos_electores = padron_2028_medio - hist[n-1].padron;

    return {
      historico:         hist,
      cagr_8yr:          cagr_8yr,
      cagr_4yr:          cagr_4yr,
      padron_2024:       hist[n-1].padron,
      padron_2028_bajo:  padron_2028_conservador,
      padron_2028_alto:  padron_2028_tendencia,
      padron_2028_medio,
      nuevos_electores,
      metodologia: 'CAGR (Compound Annual Growth Rate)'
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 13: ENCUESTAS
// Modelo: poll aggregation con ponderación por calidad y tiempo
//         Metodología: Silver (FiveThirtyEight) poll weighting
//         Weight = quality_score * recency_weight * sample_weight
// ─────────────────────────────────────────────────────────────────
const MotorEncuestas = {
  _polls: [],

  // Cargar encuestas (formato: [{fecha, firma, PRM, FP, PLD, n, calidad}])
  cargar(pollsArray) {
    this._polls = pollsArray || [];
    return this;
  },

  // Weight decay: encuesta más antigua pesa menos
  // Decaimiento exponencial: w = e^(-lambda * dias)
  // lambda = 0.02 (FiveThirtyEight usa ~0.02-0.05 según ciclo)
  _recencyWeight(fechaEncuesta, LAMBDA=0.02) {
    const hoy = new Date();
    const enc = new Date(fechaEncuesta);
    const dias = (hoy - enc) / (1000*60*60*24);
    return Math.exp(-LAMBDA * dias);
  },

  // Quality weight: 1.0 (A+), 0.8 (A), 0.6 (B), 0.4 (C), 0.2 (D)
  _qualityWeight(calidad) {
    const map = {'A+':1.0, 'A':0.8, 'B':0.6, 'C':0.4, 'D':0.2};
    return map[calidad] || 0.5;
  },

  // Sample size weight: sqrt(n) / sqrt(1000) — normalizado
  _sampleWeight(n) { return Math.sqrt(n) / Math.sqrt(1000); },

  // Promedio ponderado de todos los polls
  agregar(partidos=['PRM','FP','PLD']) {
    if (!this._polls.length) return null;

    const sums = {}, weights = {};
    partidos.forEach(p => { sums[p]=0; weights[p]=0; });

    this._polls.forEach(poll => {
      const w = this._recencyWeight(poll.fecha)
              * this._qualityWeight(poll.calidad || 'B')
              * this._sampleWeight(poll.n || 600);

      partidos.forEach(p => {
        if (poll[p] !== undefined) {
          sums[p]    += poll[p] * w;
          weights[p] += w;
        }
      });
    });

    const promedio = {};
    partidos.forEach(p => {
      promedio[p] = weights[p] > 0 ? +(sums[p]/weights[p]).toFixed(2) : null;
    });

    return {
      promedio,
      n_encuestas: this._polls.length,
      ultima: this._polls.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))[0]?.fecha,
      metodologia: 'Exponential decay weighting (Silver/FiveThirtyEight)'
    };
  },

  // Tendencia: regresión lineal sobre tiempo (OLS simple)
  tendencia(partido) {
    const polls = this._polls.filter(p => p[partido] !== undefined)
      .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    if (polls.length < 2) return null;

    const n = polls.length;
    const xs = polls.map((_,i)=>i);
    const ys = polls.map(p=>p[partido]);
    const xm = xs.reduce((s,x)=>s+x,0)/n;
    const ym = ys.reduce((s,y)=>s+y,0)/n;
    const slope = xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0) /
                  xs.reduce((s,x)=>s+(x-xm)**2,0);

    return {
      partido, slope: +slope.toFixed(3),
      tendencia: slope > 0.3 ? 'sube' : slope < -0.3 ? 'baja' : 'estable',
      ultimo: ys[n-1], proyectado_proximo: +(ys[n-1]+slope).toFixed(1)
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 14: POTENCIAL ELECTORAL
// Modelo: clasificación territorial por oportunidad
//         Basado en: Jacobson (2004) + Swing Ratio (Taagepera & Shugart)
//
// Dimensiones:
//   1. Desempeño base (% votos 2024)
//   2. Participación (alto abstencionismo = potencial de movilización)
//   3. Margen (plaza cerrada = prioridad defensiva/ofensiva)
//   4. ENPP (más partidos = mayor fragmentación, más oportunidad)
// ─────────────────────────────────────────────────────────────────
const MotorPotencial = {

  // Score de potencial ofensivo para un partido (perspectiva del challenger)
  // Territorios donde el challenger puede GANAR
  scoreOfensivo(prov_metrics, partidoTarget='FP') {
    return prov_metrics.map(pm => {
      const esGanado = pm.ganador === partidoTarget;
      const pct_target = pm.blocs?.[partidoTarget] || pm.pct_segundo || 0;

      // Potencial = f(margen, abstencion, ENPP)
      // Margen pequeño = más fácil de voltear
      const margen_factor = Math.max(0, 1 - pm.margen_pp/40);
      // Alto abstencionismo = votos potenciales sin movilizar
      const abstencion_factor = pm.abstencion/100;
      // Alta fragmentación = lider es vulnerable
      const enpp_factor = Math.min((pm.enpp-1)/3, 1);

      const score = esGanado
        ? 0  // ya se ganó, no es prioridad ofensiva
        : +(( margen_factor*0.5 + abstencion_factor*0.3 + enpp_factor*0.2 ) * 100).toFixed(1);

      let categoria;
      if (esGanado)      categoria = 'consolidada';
      else if (score>=60) categoria = 'objetivo_prioritario';
      else if (score>=40) categoria = 'objetivo_secundario';
      else if (score>=20) categoria = 'difícil';
      else               categoria = 'perdida';

      return {
        ...pm,
        score_ofensivo: score,
        categoria_ofensiva: categoria,
        pct_target
      };
    }).sort((a,b) => b.score_ofensivo - a.score_ofensivo);
  },

  // Score defensivo: para el partido incumbente (PRM), dónde está en riesgo
  scoreDefensivo(prov_metrics, partidoDefensor='PRM') {
    return prov_metrics
      .filter(pm => pm.ganador === partidoDefensor)
      .map(pm => ({
        ...pm,
        score_riesgo: pm.riesgo_score,
        prioridad_defensa: pm.riesgo_score >= 65 ? 'alta' : pm.riesgo_score >= 45 ? 'media' : 'baja'
      }))
      .sort((a,b) => b.score_riesgo - a.score_riesgo);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 15: MOVILIZACIÓN
// Modelo: Turnout gap + vote targets (Leighley & Nagler 2013)
//         "Who Votes Now? Demographics, Issues, Inequality, and Turnout"
//
// Lógica:
//   votos_para_ganar = ceil((votos_ganador - votos_challenger) / 2) + 1
//   movilizacion_necesaria = votos_para_ganar / (inscritos * abstencion_rate)
//   Esto mide qué fracción de abstencionistas debe movilizarse
// ─────────────────────────────────────────────────────────────────
const MotorMovilizacion = {

  // Votos adicionales que necesita el segundo partido para ganar la provincia
  // Formula: (votos_ganador - votos_segundo) / 2 + 1
  votosParaGanar(votos_ganador, votos_segundo) {
    return Math.ceil((votos_ganador - votos_segundo) / 2) + 1;
  },

  // Qué porcentaje de los abstencionistas hay que movilizar para ganar
  // (Leighley & Nagler: "mobilization gap")
  pctAbstenionistasnecesarios(votosNecesarios, inscritos, participacion_actual) {
    const abstencionistas = inscritos * (1 - participacion_actual/100);
    if (abstencionistas <= 0) return 100;
    return +Math.min(100, votosNecesarios/abstencionistas*100).toFixed(1);
  },

  // Genera agenda de movilización por territorio para un partido
  agenda(prov_metrics, partido_objetivo, resultadosRaw) {
    return prov_metrics
      .filter(pm => pm.ganador !== partido_objetivo) // solo plazas perdidas
      .map(pm => {
        const votos_objetivo = pm.blocs?.[partido_objetivo] || 0;
        const votos_ganador_n = pm.blocs?.[pm.ganador] || 0;
        const gap = votos_ganador_n - votos_objetivo;
        const necesarios = this.votosParaGanar(votos_ganador_n, votos_objetivo);
        const pct_movilizar = this.pctAbstenionistasnecesarios(
          necesarios, pm.inscritos, pm.participacion);

        return {
          provincia: pm.provincia,
          provincia_id: pm.id,
          ganador_actual: pm.ganador,
          votos_objetivo,
          votos_gap: gap,
          votos_necesarios: necesarios,
          pct_abstencionistas_a_movilizar: pct_movilizar,
          factibilidad: pct_movilizar < 20 ? 'alta' : pct_movilizar < 40 ? 'media' : 'baja',
          participacion_actual: pm.participacion,
          inscritos: pm.inscritos
        };
      })
      .sort((a,b) => a.pct_abstencionistas_a_movilizar - b.pct_abstencionistas_a_movilizar);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 16: RIESGO ELECTORAL
// Modelo: composite risk index
//         Componentes: margen (Jacobson 2004), participación,
//         ENPP (Laakso-Taagepera), swing potential (Gelman & King 1994)
//
// Risk = 0.50 * (1-margen_norm) + 0.25 * (1-partic_norm) + 0.25 * enpp_norm
// Donde cada variable está normalizada [0,1]
// ─────────────────────────────────────────────────────────────────
const MotorRiesgo = {
  PESOS: { margen:0.50, participacion:0.25, enpp:0.25 },

  // Calcular risk score para una provincia
  calcScore(margen_pp, participacion, enpp) {
    const margen_norm = Math.min(margen_pp/40, 1);   // 40pp = máximo seguro
    const partic_norm = participacion/100;
    const enpp_norm   = Math.min((enpp-1)/3, 1);      // ENPP=4 es máximo fragmentado

    const risk = (1-margen_norm)*this.PESOS.margen
               + (1-partic_norm)*this.PESOS.participacion
               + enpp_norm*this.PESOS.enpp;

    return +( risk*100 ).toFixed(1);
  },

  nivelRiesgo(score) {
    if (score >= 65) return 'alto';
    if (score >= 45) return 'medio';
    return 'bajo';
  },

  // Clasificar todas las provincias por riesgo (para el partido incumbente)
  clasificar(prov_metrics) {
    return prov_metrics
      .filter(pm => pm.ganador === 'PRM')
      .map(pm => ({
        ...pm,
        riesgo_score: this.calcScore(pm.margen_pp, pm.participacion, pm.enpp),
        riesgo_nivel: this.nivelRiesgo(this.calcScore(pm.margen_pp, pm.participacion, pm.enpp))
      }))
      .sort((a,b) => b.riesgo_score - a.riesgo_score);
  },

  // Alertas: provincias de alto riesgo
  getAlertas(prov_metrics) {
    return this.clasificar(prov_metrics)
      .filter(pm => pm.riesgo_nivel === 'alto')
      .map(pm => ({
        provincia: pm.provincia,
        riesgo: pm.riesgo_score,
        margen: pm.margen_pp,
        participacion: pm.participacion,
        enpp: pm.enpp,
        mensaje: `Margen de ${pm.margen_pp}pp con ENPP=${pm.enpp} — monitoreo prioritario`
      }));
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTORES DESACTIVADOS (stubs — integración futura)
// ─────────────────────────────────────────────────────────────────
const MotorMunicipal    = { status:'DISABLED', init(){ console.log('⏳ Motor Municipal: pendiente dataset municipal'); }};
const MotorHistorico2020= { status:'DISABLED', init(){ console.log('⏳ Motor Histórico 2020: pendiente dataset 2020'); }};

// ─────────────────────────────────────────────────────────────────
// EXPORT GLOBAL
// ─────────────────────────────────────────────────────────────────
window.SIE_MOTORES = {
  // Infraestructura
  Carga:             MotorCarga,
  Validacion:        MotorValidacion,
  Padron:            MotorPadron,
  Resultados:        MotorResultados,
  Territorial:       MotorTerritorial,
  Alianzas:          MotorAlianzas,
  Curules:           MotorCurules,
  // Análisis
  KPIs:              MotorKPIs,
  Replay:            MotorReplay,
  Escenarios:        MotorEscenarios,
  Proyeccion:        MotorProyeccion,
  CrecimientoPadron: MotorCrecimientoPadron,
  Encuestas:         MotorEncuestas,
  // Estrategia
  Potencial:         MotorPotencial,
  Movilizacion:      MotorMovilizacion,
  Riesgo:            MotorRiesgo,
  // Desactivados
  Municipal:         MotorMunicipal,
  Historico2020:     MotorHistorico2020
};

