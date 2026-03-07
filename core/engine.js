// ============================================================
// SIE 2028 - MOTORES CORE v8.3
// Dataset: 2024 | Schema: nuevo
// ============================================================

// ─── MOTOR 1: CARGA DE DATASETS (embebido) ──────────────────
const MotorCarga = {
  status: 'READY',
  async init(embeddedData) {
    this.data = embeddedData;
    console.log('✅ Motor Carga: dataset 2024 cargado', {
      inscritos: embeddedData.meta.total_inscritos,
      participacion: embeddedData.meta.participacion + '%'
    });
    return this.data;
  }
};

// ─── MOTOR 2: PADRON / PARTICIPACION ────────────────────────
const MotorPadron = {
  init(padronRaw) {
    this._list = padronRaw.padron;
  },
  getPadronNacional() {
    return this._list.reduce((s, x) => x.tipo === 'provincia' ? s + x.inscritos : s, 0);
  },
  getPadronProvincia(provinciaId) {
    return this._list.find(x => x.tipo === 'provincia' && x.territorio_id === provinciaId);
  },
  getPadronMunicipio(municipioId) {
    return this._list.find(x => x.tipo === 'municipio' && x.territorio_id === municipioId);
  },
  getAllProvincias() {
    return this._list.filter(x => x.tipo === 'provincia');
  },
  getParticipacion(votosEmitidos) {
    return (votosEmitidos / this.getPadronNacional() * 100).toFixed(2);
  }
};

// ─── MOTOR 3: RESULTADOS ELECTORALES ────────────────────────
const MotorResultados = {
  init(resultados, alianzas, partidos) {
    this._r = resultados;
    this._a = alianzas;
    this._p = partidos;
    this._partyNames = Object.fromEntries(partidos.partidos.map(p => [p.id, p.nombre]));
    this._buildBlocMap();
  },
  _buildBlocMap() {
    this._blocMap = {};
    const pres = this._a.niveles.presidencial[0].bloques;
    pres.forEach(bloc => {
      bloc.partidos.forEach(p => { this._blocMap[p] = bloc.candidato_base; });
    });
  },
  getPartidoNombre(id) {
    return this._partyNames[id] || id;
  },
  getBlocFor(partidoId) {
    return this._blocMap[partidoId] || partidoId;
  },
  getPresidencialByBloc() {
    const raw = this._r.niveles.presidencial.resultados;
    const totales = this._r.niveles.presidencial.totales;
    const blocs = {};
    Object.entries(raw).forEach(([p, v]) => {
      const bloc = this.getBlocFor(p);
      blocs[bloc] = (blocs[bloc] || 0) + v;
    });
    return Object.entries(blocs)
      .map(([id, votos]) => ({
        id, votos,
        nombre: this.getPartidoNombre(id),
        pct: +(votos / totales.votos_validos * 100).toFixed(2)
      }))
      .sort((a, b) => b.votos - a.votos);
  },
  getSenadores() {
    return this._r.niveles.senadores.map(prov => {
      const res = prov.resultados;
      const blocs = {};
      Object.entries(res).forEach(([p, v]) => {
        const bloc = this.getBlocFor(p);
        blocs[bloc] = (blocs[bloc] || 0) + v;
      });
      const sorted = Object.entries(blocs).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [,v]) => s + v, 0);
      return {
        provincia_id: prov.provincia_id,
        provincia: prov.provincia,
        ganador: sorted[0][0],
        pct_ganador: +(sorted[0][1] / total * 100).toFixed(1),
        top3: sorted.slice(0, 3).map(([id, v]) => ({
          id, nombre: this.getPartidoNombre(id),
          pct: +(v/total*100).toFixed(1)
        }))
      };
    });
  },
  getTotalesPresidencial() {
    return this._r.niveles.presidencial.totales;
  }
};

// ─── MOTOR 4: CURULES / D'HONDT ─────────────────────────────
const MotorCurules = {
  init(curulesCat, curulesResultado) {
    this._cat = curulesCat;
    this._res = curulesResultado;
    this._computeTotals();
  },
  _computeTotals() {
    this._totals = { senadores: {}, diputados: {}, nacionales: {}, exterior: {}, total: {} };
    const add = (obj, partido, n) => { obj[partido] = (obj[partido] || 0) + n; };

    this._res.niveles.senadores.forEach(p =>
      p.resultado.forEach(r => add(this._totals.senadores, r.partido, r.curules)));

    this._res.niveles.diputados.forEach(c =>
      c.resultado.forEach(r => add(this._totals.diputados, r.partido, r.curules)));

    const nat = this._res.niveles.diputados_nacionales;
    (nat.resultado || []).forEach(r => add(this._totals.nacionales, r.partido, r.curules));

    this._res.niveles.diputados_exterior.forEach(c =>
      c.resultado.forEach(r => add(this._totals.exterior, r.partido, r.curules)));

    [this._totals.senadores, this._totals.diputados,
     this._totals.nacionales, this._totals.exterior].forEach(obj => {
      Object.entries(obj).forEach(([p, n]) => add(this._totals.total, p, n));
    });
  },
  getTotalByNivel(nivel) { return this._totals[nivel] || {}; },
  getTotalLegislativo() {
    return Object.entries(this._totals.total)
      .map(([id, curules]) => ({ id, curules }))
      .sort((a, b) => b.curules - a.curules);
  },
  getSumaCurules() {
    return Object.values(this._totals.total).reduce((s, n) => s + n, 0);
  },
  getDiputadosDetail() {
    return this._res.niveles.diputados;
  },
  getExteriorDetail() {
    return this._res.niveles.diputados_exterior;
  },
  getNacionalesDetail() {
    return this._res.niveles.diputados_nacionales;
  }
};

// ─── MOTOR 5: TERRITORIAL ───────────────────────────────────
const MotorTerritorial = {
  init(territoriosCat) {
    this._t = territoriosCat;
  },
  getProvincias() { return this._t.provincias; },
  getMunicipios() { return this._t.municipios || []; },
  getCircDiputados() { return this._t.circ_diputados || []; },
  getCircExterior() { return this._t.circ_exterior || []; },
  getProvincia(id) { return this._t.provincias.find(p => p.id === id); }
};

// ─── MOTOR 6: KPIs / RESUMEN EJECUTIVO ──────────────────────
const MotorKPIs = {
  compute(meta, curules, resultados) {
    const total = curules.getSumaCurules();
    const legTotal = curules.getTotalLegislativo();
    const prmLeg = legTotal.find(x => x.id === 'PRM')?.curules || 0;
    const pres = resultados.getPresidencialByBloc();
    const winner = pres[0];
    return {
      padrón: meta.total_inscritos.toLocaleString('es-DO'),
      votos_emitidos: meta.total_validos.toLocaleString('es-DO'),
      participacion: meta.participacion + '%',
      ganador_presidencial: winner.id,
      pct_presidencial: winner.pct + '%',
      curules_totales: total,
      mayoría_legislativa: prmLeg + '/' + total,
      pct_legislativo: (prmLeg/total*100).toFixed(1) + '%',
      senadores_ganados: Object.values(curules.getTotalByNivel('senadores'))
        .reduce((s,n)=>s+n,0) + ' / 32',
      partidos_representados: legTotal.length
    };
  }
};

// ─── MOTOR 7: REPLAY ELECTORAL 2024 ─────────────────────────
const MotorReplay = {
  MODE: 'REPLAY',
  DATASET: 2024,
  validate(curules, expected) {
    const report = { ok: [], errors: [] };
    const total = curules.getSumaCurules();
    if (total === 222) report.ok.push('✅ Curules totales: 222');
    else report.errors.push('❌ Curules totales: ' + total + ' (esperado 222)');

    const sen = Object.values(curules.getTotalByNivel('senadores')).reduce((s,n)=>s+n,0);
    if (sen === 32) report.ok.push('✅ Senadores: 32');
    else report.errors.push('❌ Senadores: ' + sen);

    const dip = Object.values(curules.getTotalByNivel('diputados')).reduce((s,n)=>s+n,0);
    if (dip === 178) report.ok.push('✅ Diputados territoriales: 178');
    else report.errors.push('❌ Diputados: ' + dip);

    return report;
  }
};

// ─── MOTOR 8: ESCENARIOS ELECTORALES 2028 ───────────────────
const MotorEscenarios = {
  PARTIDOS_ACTIVOS: ['PRM', 'FP', 'PLD', 'PRD', 'PCR'],
  defaults: { PRM: 50, FP: 28, PLD: 11, PRD: 6, PCR: 5 },
  dhondt(votos, escaños) {
    const quotients = [];
    Object.entries(votos).forEach(([partido, v]) => {
      for (let d = 1; d <= escaños; d++) {
        quotients.push({ partido, q: v / d });
      }
    });
    quotients.sort((a, b) => b.q - a.q);
    const result = {};
    quotients.slice(0, escaños).forEach(({ partido }) => {
      result[partido] = (result[partido] || 0) + 1;
    });
    return result;
  },
  simularLegislativo(pcts) {
    const votos = Object.fromEntries(
      Object.entries(pcts).map(([p, pct]) => [p, pct * 1000])
    );
    const sen = this.dhondt(votos, 32);
    const dip = this.dhondt(votos, 178);
    const nat = this.dhondt(votos, 5);
    const ext = this.dhondt(votos, 7);
    const total = {};
    [sen, dip, nat, ext].forEach(obj =>
      Object.entries(obj).forEach(([p, n]) => { total[p] = (total[p] || 0) + n; })
    );
    return { senadores: sen, diputados: dip, nacionales: nat, exterior: ext, total };
  }
};

// ─── MOTOR 9: PROYECCIÓN 2028 ────────────────────────────────
const MotorProyeccion = {
  TENDENCIAS: {
    PRM: { base: 57.44, descripcion: 'Partido gobernante, ventaja estructural' },
    FP:  { base: 28.85, descripcion: 'Principal oposición, base fidelizada' },
    PLD: { base: 10.39, descripcion: 'Tercer lugar, en reconstrucción' },
  },
  proyectar(ajustes = {}) {
    const base = { ...this.TENDENCIAS };
    const result = {};
    Object.entries(base).forEach(([p, d]) => {
      result[p] = { ...d, proyectado: d.base + (ajustes[p] || 0) };
    });
    return result;
  }
};

// ─── MOTOR 10: ALIANZAS ──────────────────────────────────────
const MotorAlianzas = {
  init(alianzasData) {
    this._a = alianzasData;
  },
  getBloques(nivel = 'presidencial') {
    return this._a.niveles[nivel]?.[0]?.bloques || [];
  },
  getCoalicionPRM() {
    return this.getBloques().find(b => b.candidato_base === 'PRM');
  },
  getCoalicionFP() {
    return this.getBloques().find(b => b.candidato_base === 'FP');
  }
};

// ─── MOTORES DESACTIVADOS (stub) ─────────────────────────────
const MotorMunicipal = { status: 'DISABLED', init() { console.log('⏳ Motor Municipal: desactivado'); } };
const MotorDirectoresDM = { status: 'DISABLED', init() { console.log('⏳ Motor Directores DM: desactivado'); } };
const MotorHistorico2020 = { status: 'DISABLED', init() { console.log('⏳ Motor Histórico 2020: desactivado'); } };

// ─── EXPORT ──────────────────────────────────────────────────
window.SIE_MOTORES = {
  Carga: MotorCarga,
  Padron: MotorPadron,
  Resultados: MotorResultados,
  Curules: MotorCurules,
  Territorial: MotorTerritorial,
  KPIs: MotorKPIs,
  Replay: MotorReplay,
  Escenarios: MotorEscenarios,
  Proyeccion: MotorProyeccion,
  Alianzas: MotorAlianzas,
  // Desactivados
  Municipal: MotorMunicipal,
  DirectoresDM: MotorDirectoresDM,
  Historico2020: MotorHistorico2020
};
