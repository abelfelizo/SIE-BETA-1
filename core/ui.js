(function() {

// ================================================================
// SIE 2028 — UI PATCH SAFE v8.5
// Evita crash por IDs faltantes + aliases de compatibilidad
// ================================================================

// ---- Compatibilidad de datasets / aliases ----
window._PROV_PRES = window._PROV_PRES || window._PROV_METRICS_PRES || window._PROV_METRICS || [];
window._PROV_SEN  = window._PROV_SEN  || window._PROV_METRICS_SEN  || window._PROV_METRICS || [];
window._PROV_DIP  = window._PROV_DIP  || window._PROV_METRICS_DIP  || window._PROV_METRICS || [];

// ---- Safe DOM helpers ----
function makeDummyEl(id){
  return {
    __dummy:true,
    id:id,
    innerHTML:'',
    textContent:'',
    value:'',
    dataset:{},
    style:{},
    classList:{ add:function(){}, remove:function(){}, contains:function(){ return false; } },
    addEventListener:function(){},
    removeEventListener:function(){},
    appendChild:function(){},
    querySelector:function(){ return null; },
    querySelectorAll:function(){ return []; },
    closest:function(){ return null; },
    setAttribute:function(){},
    getAttribute:function(){ return null; },
    getContext:function(){
      return {
        clearRect:function(){},
        beginPath:function(){},
        arc:function(){},
        stroke:function(){},
        fill:function(){},
        moveTo:function(){},
        lineTo:function(){},
        closePath:function(){},
        fillText:function(){},
        strokeStyle:'',
        lineWidth:1,
        fillStyle:''
      };
    }
  };
}

var __origGetById = document.getElementById.bind(document);
document.getElementById = function(id){
  return __origGetById(id) || makeDummyEl(id);
};

function byId(id){ return document.getElementById(id); }
function setHTML(id, html){ byId(id).innerHTML = html; }
function setText(id, text){ byId(id).textContent = text; }

var PC = {PRM:'#2563EB',FP:'#7C3AED',PLD:'#DC2626',PRD:'#D97706',PCR:'#059669',OTHER:'#4B5563'};
function pc(id){ return PC[id]||PC.OTHER; }

// Init motores
var M = SIE_MOTORES;
M.Carga.init({resultados:_DS_RESULTADOS,curules:_DS_CURULES,partidos:_DS_PARTIDOS,
              padron:_DS_PADRON,territorios:_DS_TERRITORIOS,alianzas:_DS_ALIANZAS,
              curulesCat:_DS_CURULES_CAT});
var valResult = M.Validacion.run(_DS_RESULTADOS,_DS_PARTIDOS,_DS_CURULES_CAT,_DS_CURULES);
M.Padron.init(_DS_PADRON);
M.Resultados.init(_DS_RESULTADOS,_DS_ALIANZAS,_DS_PARTIDOS);
M.Alianzas.init(_DS_ALIANZAS);
M.Curules.init(_DS_CURULES_CAT,_DS_CURULES);
M.Territorial.init(_DS_TERRITORIOS);
M.CrecimientoPadron.proyectar();

// Inicializar motores multi-nivel con datasets por nivel (v8.5)
if (M.Movilizacion && M.Movilizacion.init) {
  M.Movilizacion.init(_PROV_PRES, _PROV_SEN, _PROV_DIP);
}
if (M.NormalizacionHistorica && M.NormalizacionHistorica.init) {
  M.NormalizacionHistorica.init(_PROV_PRES);
}

setText('sys-status',
  valResult.ok ? '✅ Sistema listo · Dataset 2024' : '⚠️ ' + valResult.errores.length + ' errores'
);

// Nav
byId('main-nav').addEventListener('click', function(e){
  var btn = e.target.closest('.nav-btn');
  if(!btn) return;
  var id = btn.dataset.view;
  if(!id) return;
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  var el = byId('view-'+id);
  if(el && !el.__dummy) el.classList.add('active');
  btn.classList.add('active');
  if(id==='replay') renderReplay();
  if(id==='simulador' && !window._simInit) initSimulador();
  if(id==='proyeccion' && !window._proyInit) initProyeccion();
});

// Helpers
function fmt(n){ return Number(n||0).toLocaleString('es-DO'); }
function bar(label,pctVal,color,sub){
  return '<div class="bar-item">'
    +'<div class="bar-hdr"><span class="bar-label">'+label+'</span><span class="bar-pct">'+pctVal+'%</span></div>'
    +(sub?'<div style="font-size:.7rem;color:var(--muted);margin-bottom:.2rem">'+sub+'</div>':'')
    +'<div class="bar-track"><div class="bar-fill" style="width:'+pctVal+'%;background:'+color+'"></div></div>'
    +'</div>';
}
function kpi(cls,label,val,sub){
  return '<div class="kpi '+cls+'"><div class="kpi-label">'+label+'</div>'
    +'<div class="kpi-val">'+val+'</div><div class="kpi-sub">'+sub+'</div></div>';
}
function rowStat(label,val,color){
  return '<div class="flex jb" style="padding:.32rem 0;border-bottom:1px solid var(--border)">'
    +'<span class="text-sm">'+label+'</span>'
    +'<strong style="font-size:.83rem;'+(color?'color:'+color:'')+'">'+val+'</strong></div>';
}

// ====== DASHBOARD ======
function renderDashboard(){
  var kpis = M.KPIs.compute(M.Resultados, M.Curules, M.Padron);
  var blocsP = M.Resultados.getPresidencialByBloc();
  var legT = M.Curules.getTotalLegislativo();
  var total = M.Curules.getSumaCurules();

  setHTML('kpi-section', '<div class="kpi-grid">'
    +kpi('blue','Ganador Presidencial',kpis.ganador_presidencial,kpis.pct_ganador+'% — bloque')
    +kpi('green','Padrón Oficial',fmt(kpis.padron_oficial),'Inscritos JCE 2024')
    +kpi('gold','Participación',kpis.participacion+'%',fmt(kpis.votos_emitidos)+' emitidos')
    +kpi('blue','PRM Senadores','32/32','Todas las provincias')
    +kpi('purple','Curules',kpis.curules_totales,'Legislativo total')
    +kpi('blue','ENPP Legislativo',kpis.enpp_legislativo,'Laakso-Taagepera 1979')
    +kpi('orange','Margen Presidencial',kpis.margen_presidencial+'pp','1ro vs 2do bloque')
    +kpi(kpis.riesgo_segunda_vuelta?'red':'green','Riesgo 2da Vuelta',kpis.riesgo_segunda_vuelta?'SI':'NO',kpis.riesgo_segunda_vuelta?'<50% en 1ra vuelta':'Mayoría en 1ra vuelta')
    +'</div>');

  setHTML('pres-bar-list',
    blocsP.slice(0,6).map(function(b){return bar(b.id+' · '+b.nombre.substring(0,26),b.pct,pc(b.id),fmt(b.votos)+' votos');}).join('')
  );

  setHTML('leg-bar-list',
    legT.map(function(x){return bar(x.id+' · '+M.Resultados.getPartidoNombre(x.id).substring(0,24),+(x.curules/total*100).toFixed(1),pc(x.id),x.curules+' curules');}).join('')
  );

  drawParliament('parl-canvas', legT, total);
  setHTML('parl-legend',
    legT.map(function(x){return '<div style="display:flex;align-items:center;gap:.35rem;font-size:.75rem">'
      +'<div style="width:9px;height:9px;border-radius:50%;background:'+pc(x.id)+'"></div>'
      +'<span>'+x.id+': <strong>'+x.curules+'</strong></span></div>';}).join('')
  );

  var totP = M.Resultados.getTotalesPresidencial();
  setHTML('dash-padron', [
    rowStat('Inscritos (oficial)',fmt(M.Padron.getPadronOficial()),'var(--text)'),
    rowStat('Votos emitidos',fmt(totP.votos_emitidos)),
    rowStat('Votos válidos',fmt(totP.votos_validos)),
    rowStat('Votos nulos',fmt(totP.votos_nulos)),
    rowStat('Participación',kpis.participacion+'%','var(--green)'),
    rowStat('Abstención',kpis.abstencion+'%','var(--gold)')
  ].join(''));

  setHTML('dash-indicadores', [
    rowStat('ENPP legislativo',kpis.enpp_legislativo),
    rowStat('Concentración top-2',kpis.concentracion_top2+'%'),
    rowStat('Margen presidencial',kpis.margen_presidencial+'pp'),
    rowStat('PRM mayoría calificada (2/3)',179>=148?'SI':'NO','var(--green)'),
    rowStat('Validación interna',valResult.ok?'✅ OK':'❌ '+valResult.errores.length+' errores')
  ].join(''));

  var bloc = M.Alianzas.getCoalicion('PRM');
  var partidos = bloc && bloc.partidos ? bloc.partidos : [];
  setHTML('dash-coalicion',
    '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.5rem">'+partidos.length+' partidos en coalición</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:.3rem">'
    +partidos.map(function(p){return '<span style="background:var(--bg3);border:1px solid var(--border);border-radius:.25rem;padding:.1rem .35rem;font-size:.7rem;font-weight:700">'+p+'</span>';}).join('')
    +'</div>'
  );
}

// Parliament arc
function drawParliament(canvasId, data, total){
  var cv = byId(canvasId);
  if(!cv || cv.__dummy) return;
  var ctx = cv.getContext('2d');
  if(!ctx) return;
  var W=cv.width,H=cv.height,cx=W/2,cy=H-15,R1=75,R2=145;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#1E2A40'; ctx.lineWidth=1;
  [R1,R2].forEach(function(r){ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.stroke();});
  var cursor=Math.PI;
  data.forEach(function(item){
    var id=item.id, curules=item.curules;
    var span=(curules/total)*Math.PI;
    ctx.fillStyle=pc(id);
    for(var i=0;i<curules;i++){
      var a=cursor+(i+0.5)*(span/curules);
      var row=i%3;
      var rr=R1+(row+0.5)*((R2-R1)/3);
      var x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
      ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();
    }
    cursor+=span;
  });
}

// ====== PRESIDENCIAL ======
function renderPresidencial(){
  var blocsP = M.Resultados.getPresidencialByBloc();
  var byPart = M.Resultados.getPresidencialByPartido();
  var totP = M.Resultados.getTotalesPresidencial();
  var partic = M.Padron.getParticipacionNacional(totP.votos_emitidos);

  setHTML('pres-blocs-bars',
    blocsP.map(function(b){return bar(b.id+' · '+b.nombre,b.pct,pc(b.id),fmt(b.votos)+' votos');}).join('')
  );

  setHTML('pres-stats', [
    rowStat('Padrón oficial',fmt(M.Padron.getPadronOficial())),
    rowStat('Votos emitidos',fmt(totP.votos_emitidos)),
    rowStat('Votos válidos',fmt(totP.votos_validos)),
    rowStat('Votos nulos',fmt(totP.votos_nulos)),
    rowStat('Participación JCE',totP.porcentaje_participacion+'%','var(--green)'),
    rowStat('Participación calculada',partic+'%','var(--green)'),
    rowStat('Ganador',blocsP[0]?blocsP[0].id+' · Luis Abinader':'','var(--prm)'),
    rowStat('% ganador (bloque)',blocsP[0]?blocsP[0].pct+'%':'','var(--prm)'),
    rowStat('Margen vs 2do',blocsP[1]?+(blocsP[0].pct-blocsP[1].pct).toFixed(2)+'pp':''),
    rowStat('Ballotage',blocsP[0]&&blocsP[0].pct>=50?'No — 1ra vuelta':'SI — ballotage')
  ].join(''));

  setHTML('pres-all-parties',
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.4rem">'
    +byPart.map(function(p){return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;display:flex;justify-content:space-between;align-items:center">'
      +'<span style="font-weight:700;font-size:.8rem;color:'+pc(p.id)+'">'+p.id+'</span>'
      +'<span style="font-size:.74rem;color:var(--muted)">'+fmt(p.votos)+' <strong style="color:var(--text)">'+p.pct+'%</strong></span>'
      +'</div>';}).join('')
    +'</div>'
  );
}

// ====== SENADORES ======
function renderSenadores(){
  var senData = M.Resultados.getSenadores();
  var senC = M.Curules.getTotalByNivel('senadores');
  var senCoal = M.Curules.getSenadorePorCoalicion();

  var prmReal = senC['PRM']||0;
  var fpReal  = senC['FP']||0;
  var prmCoal = (senCoal.find(function(x){return x.id==='PRM-coalicion';})||{curules:0}).curules;
  var fpCoal  = (senCoal.find(function(x){return x.id==='FP-coalicion';})||{curules:0}).curules;
  var otros   = 32 - prmCoal - fpCoal;

  setHTML('sen-kpis',
    kpi('blue','PRM directo',prmReal,'bloque PRM: '+prmCoal+' (+'+(prmCoal-prmReal)+' aliados)')
    +kpi('purple','FP directo',fpReal,'bloque FP: '+fpCoal+' (+'+(fpCoal-fpReal)+' aliados)')
    +kpi('red','Otros partidos',otros,'fuera de bloques principales')
    +kpi('gold','Total','32','1 por provincia')
  );

  setHTML('sen-prov-grid', senData.map(function(prov){
    var pm = _PROV_METRICS_SEN.find(function(p){return p.id===prov.provincia_id;})||{};
    var rn = pm.riesgo_nivel||'';
    var rs = pm.riesgo_score||'';
    var esAliadoPRM = prov.ganador !== 'PRM' && prov.bloque_coalicion === 'PRM-coalicion';
    var esAliadoFP  = prov.ganador !== 'FP'  && prov.bloque_coalicion === 'FP-coalicion';
    var coalbadge = esAliadoPRM
      ? '<span style="font-size:.65rem;background:var(--bg3);color:var(--muted);padding:.1rem .35rem;border-radius:.25rem;margin-left:.3rem">aliado PRM</span>'
      : (esAliadoFP ? '<span style="font-size:.65rem;background:var(--bg3);color:var(--muted);padding:.1rem .35rem;border-radius:.25rem;margin-left:.3rem">aliado FP</span>' : '');
    return '<div class="prov-card">'
      +'<div class="prov-name">'+prov.provincia+'</div>'
      +'<div class="prov-winner" style="color:'+pc(prov.ganador)+'">'+prov.ganador+coalbadge+'</div>'
      +'<div class="prov-pct">'+prov.pct_ganador+'% · ENPP '+(pm.enpp||'?')+'</div>'
      +(rn?'<span class="risk-badge risk-'+rn+'">Riesgo '+rs+'</span>':'')
      +'<div class="prov-bar">'
      +prov.top3.map(function(t){return '<div style="flex:'+t.pct+';background:'+pc(t.id)+';height:100%"></div>';}).join('')
      +'</div></div>';
  }).join(''));
}

// ====== DIPUTADOS ======
function renderDiputados(){
  var dipC=M.Curules.getTotalByNivel('diputados');
  var natC=M.Curules.getTotalByNivel('nacionales');
  var extC=M.Curules.getTotalByNivel('exterior');
  var combined={};
  [dipC,natC,extC].forEach(function(obj){
    Object.entries(obj).forEach(function(e){combined[e[0]]=(combined[e[0]]||0)+e[1];});
  });
  var sortedC=Object.entries(combined).sort(function(a,b){return b[1]-a[1];});
  var totalC=sortedC.reduce(function(s,e){return s+e[1];},0);

  setHTML('dip-kpis',
    kpi('blue','PRM Territoriales',dipC.PRM||0,'de 178')
    +kpi('purple','FP Territoriales',dipC.FP||0,'')
    +kpi('red','PLD Territoriales',dipC.PLD||0,'')
    +kpi('gold','Total Cámara Baja',190,'178+5+7')
  );

  setHTML('dip-bar-list',
    sortedC.map(function(e){
      return bar(e[0]+' · '+M.Resultados.getPartidoNombre(e[0]).substring(0,24),+(e[1]/totalC*100).toFixed(1),pc(e[0]),e[1]+' curules');
    }).join('')
  );

  var ext=M.Curules.getExteriorDetail();
  setHTML('ext-detail', ext.map(function(c){
    return '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
      +'<span>'+c.region.replace('América del ','')+'</span>'
      +'<strong style="color:'+pc(c.resultado[0]&&c.resultado[0].partido)+'">'+c.resultado.map(function(r){return r.partido+':'+r.curules;}).join(', ')+'</strong></div>';
  }).join(''));

  var nat=M.Curules.getNacionalesDetail();
  setHTML('nat-detail',
    '<div class="text-muted" style="font-size:.7rem;margin-bottom:.4rem">'+(nat.criterio||'Lista cerrada bloqueada')+'</div>'
    +(nat.resultado||[]).map(function(r){
      return '<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
        +'<span>'+r.partido+'</span>'
        +'<strong style="color:'+pc(r.partido)+'">'+r.curules+' curul'+(r.curules>1?'es':'')+'</strong></div>';
    }).join('')
  );

  setHTML('dip-circ-grid',
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.4rem">'
    +M.Curules.getDiputadosDetail().map(function(c){
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.55rem .75rem">'
        +'<div style="font-size:.75rem;font-weight:700;margin-bottom:.2rem">'+c.provincia+' C'+c.circ+'</div>'
        +'<div style="font-size:.68rem;color:var(--muted)">'+c.curules_totales+' curules</div>'
        +'<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.25rem">'
        +(c.resultado||[]).map(function(r){
          return '<span style="background:'+pc(r.partido)+'22;border:1px solid '+pc(r.partido)+'44;border-radius:.2rem;padding:.08rem .28rem;font-size:.66rem;font-weight:700;color:'+pc(r.partido)+'">'+r.partido+':'+r.curules+'</span>';
        }).join('')
        +'</div></div>';
    }).join('')
    +'</div>'
  );
}

// ====== POTENCIAL ======
var _POT_NIVEL = 'presidencial';
function _getProvDS(n){ return n==='senadores' ? _PROV_SEN : n==='diputados' ? _PROV_DIP : _PROV_PRES; }

function renderPotencial(){
  var ds = _getProvDS(_POT_NIVEL);
  var ofensivo = M.Potencial.scoreOfensivo(ds,'FP');
  var defensivo = M.Potencial.scoreDefensivo(ds,'PRM');

  setHTML('potencial-ofensivo',
    ofensivo.filter(function(p){return p.categoria_ofensiva!=='perdida'&&p.categoria_ofensiva!=='consolidada';}).slice(0,10).map(function(pm){
      var catColor = pm.categoria_ofensiva==='objetivo_prioritario'?'var(--fp)':pm.categoria_ofensiva==='objetivo_secundario'?'var(--gold)':'var(--muted)';
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:.82rem;font-weight:700">'+pm.provincia+'</div>'
        +'<div style="font-size:.7rem;color:var(--muted)">Margen: '+pm.margen_pp+'pp · Abst: '+pm.abstencion+'% · FP: '+pm.pct_target+'%</div></div>'
        +'<div style="text-align:right">'
        +'<div style="font-size:.9rem;font-weight:800;color:'+catColor+'">'+pm.score_ofensivo+'</div>'
        +'<div style="font-size:.67rem;color:var(--muted)">'+pm.categoria_ofensiva.replace(/_/g,' ')+'</div></div></div>';
    }).join('')
  );

  setHTML('potencial-defensivo',
    defensivo.slice(0,10).map(function(pm){
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:.82rem;font-weight:700">'+pm.provincia+'</div>'
        +'<div style="font-size:.7rem;color:var(--muted)">Margen: '+pm.margen_pp+'pp · ENPP: '+pm.enpp+'</div></div>'
        +'<div style="text-align:right">'
        +'<span class="risk-badge risk-'+pm.riesgo_nivel+'">'+pm.riesgo_score+'</span>'
        +'<div style="font-size:.67rem;color:var(--muted)">'+pm.prioridad_defensa+'</div></div></div>';
    }).join('')
  );

  setHTML('competitividad-grid',
    ds.map(function(pm){
      return '<div class="prov-card">'
        +'<div class="prov-name">'+pm.provincia+'</div>'
        +'<div class="prov-winner" style="color:'+pc(pm.ganador)+'">'+pm.ganador+'</div>'
        +'<div class="prov-pct">ENPP '+pm.enpp+' · '+pm.competitividad+'</div>'
        +'<span class="risk-badge risk-'+pm.riesgo_nivel+'">Riesgo '+pm.riesgo_score+'</span>'
        +'</div>';
    }).join('')
  );
}

window.setPotNivel = function(n){ _POT_NIVEL=n; renderPotencial(); };

// ====== MOVILIZACION ======
var _MOV_NIVEL = 'presidencial';
var _MOV_PARTIDO = 'FP';

function renderMovilizacion(){
  var agenda = M.Movilizacion.agenda(_MOV_NIVEL, _MOV_PARTIDO);
  var resumen = M.Movilizacion.resumenMultinivel(_MOV_PARTIDO);

  setHTML('mov-kpis',
    kpi('green','Factibilidad Alta',agenda.filter(function(a){return a.factibilidad==='alta';}).length,'plazas recuperables')
    +kpi('gold','Factibilidad Media',agenda.filter(function(a){return a.factibilidad==='media';}).length,'requieren esfuerzo')
    +kpi('red','Factibilidad Baja',agenda.filter(function(a){return a.factibilidad==='baja';}).length,'objetivo difícil')
    +kpi('purple','Gap total '+_MOV_NIVEL,fmt(agenda.reduce(function(s,a){return s+a.votos_gap;},0)),'votos a recuperar')
  );

  setHTML('movilizacion-list',
    agenda.slice(0,20).map(function(a){
      var factColor = a.factibilidad==='alta'?'var(--green)':a.factibilidad==='media'?'var(--gold)':'var(--red)';
      return '<div class="mov-card">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        +'<div><div style="font-size:.85rem;font-weight:700">'+a.provincia+'</div>'
        +'<div style="font-size:.7rem;color:var(--muted)">Ganador actual: <strong style="color:'+pc(a.ganador_actual)+'">'+a.ganador_actual+'</strong>'
        +(a.bloque_coalicion?' ['+a.bloque_coalicion+']':'')+' · Partic. '+a.participacion_actual+'% · ENPP '+a.enpp+'</div></div>'
        +'<span style="font-size:.78rem;font-weight:700;color:'+factColor+'">'+a.factibilidad.toUpperCase()+'</span></div>'
        +'<div style="margin-top:.5rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:.35rem">'
        +'<div style="background:var(--bg);border-radius:var(--r);padding:.38rem;text-align:center">'
        +'<div style="font-size:.63rem;color:var(--muted)">Gap votos</div>'
        +'<div style="font-size:.83rem;font-weight:800">'+fmt(a.votos_gap)+'</div></div>'
        +'<div style="background:var(--bg);border-radius:var(--r);padding:.38rem;text-align:center">'
        +'<div style="font-size:.63rem;color:var(--muted)">Votos necesarios</div>'
        +'<div style="font-size:.83rem;font-weight:800;color:var(--fp)">'+fmt(a.votos_necesarios)+'</div></div>'
        +'<div style="background:var(--bg);border-radius:var(--r);padding:.38rem;text-align:center">'
        +'<div style="font-size:.63rem;color:var(--muted)">% abstencionistas</div>'
        +'<div style="font-size:.83rem;font-weight:800;color:'+factColor+'">'+a.pct_abstencionistas_a_movilizar+'%</div></div>'
        +'</div></div>';
    }).join('')
  );

  setHTML('mov-resumen',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">'
    +resumen.map(function(r){
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.65rem">'
        +'<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">'+r.nivel+'</div>'
        +'<div style="font-size:.78rem"><span style="color:var(--green)">'+r.plazas_alta+'A</span> '
        +'<span style="color:var(--gold)">'+r.plazas_media+'M</span> '
        +'<span style="color:var(--red)">'+r.plazas_baja+'B</span>'
        +' / <span style="color:var(--muted)">'+r.plazas_perdidas+' perdidas</span></div></div>';
    }).join('')+'</div>'
  );
}

window.setMovNivel = function(n){ _MOV_NIVEL=n; renderMovilizacion(); };

// ====== RIESGO ======
var _RIE_NIVEL = 'presidencial';

function renderRiesgo(){
  var ds = _getProvDS(_RIE_NIVEL);
  var clasificados = M.Riesgo.clasificar(ds);
  var alertas = M.Riesgo.getAlertas(ds);
  var n_alto = clasificados.filter(function(p){return p.riesgo_nivel==='alto';}).length;
  var n_medio = clasificados.filter(function(p){return p.riesgo_nivel==='medio';}).length;
  var n_bajo = clasificados.filter(function(p){return p.riesgo_nivel==='bajo';}).length;

  setHTML('riesgo-kpis',
    kpi('red','Riesgo Alto',n_alto,'provincias — monitoreo inmediato')
    +kpi('gold','Riesgo Medio',n_medio,'provincias — seguimiento')
    +kpi('green','Riesgo Bajo',n_bajo,'provincias — consolidadas')
    +kpi('blue','Total PRM',clasificados.length,'provincias ganadas')
  );

  setHTML('riesgo-list',
    clasificados.map(function(pm){
      var col = pm.riesgo_nivel==='alto'?'var(--red)':pm.riesgo_nivel==='medio'?'var(--gold)':'var(--green)';
      return '<div style="display:flex;align-items:center;gap:.55rem;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div style="flex:1"><div style="font-size:.8rem;font-weight:700">'+pm.provincia+'</div>'
        +'<div style="font-size:.68rem;color:var(--muted)">Margen '+pm.margen_pp+'pp · Partic '+pm.participacion+'% · ENPP '+pm.enpp+'</div></div>'
        +'<div class="score-wrap" style="width:95px">'
        +'<div class="score-track"><div class="score-fill" style="width:'+pm.riesgo_score+'%;background:'+col+'"></div></div>'
        +'<span style="font-size:.73rem;font-weight:700;min-width:26px;text-align:right">'+pm.riesgo_score+'</span></div>'
        +'<span class="risk-badge risk-'+pm.riesgo_nivel+'">'+pm.riesgo_nivel+'</span></div>';
    }).join('')
  );

  setHTML('riesgo-alertas',
    alertas.length
      ? alertas.map(function(a){
          return '<div style="background:#1F0D0D;border:1px solid #EF444422;border-radius:var(--r);padding:.7rem;margin-bottom:.4rem">'
            +'<div style="font-size:.83rem;font-weight:700;color:var(--red)">⚠️ '+a.provincia+'</div>'
            +'<div style="font-size:.73rem;color:var(--muted);margin-top:.2rem">'+a.mensaje+'</div>'
            +'<div style="font-size:.7rem;color:var(--muted);margin-top:.12rem">Score: '+a.riesgo+' · Margen: '+a.margen+'pp · ENPP: '+a.enpp+'</div></div>';
        }).join('')
      : '<p class="text-muted text-sm">Sin alertas de alto riesgo.</p>'
  );
}

window.setRieNivel = function(n){ _RIE_NIVEL=n; renderRiesgo(); };

// ====== SIMULADOR ======
var SIM_P = ['PRM','FP','PLD','PRD','PCR'];
var SIM_D = {PRM:50,FP:27,PLD:11,PRD:6,PCR:6};
window._simInit = false;

function initSimulador(){
  window._simInit = true;
  setHTML('sim-sliders',
    SIM_P.map(function(p){
      return '<div class="slider-row">'
        +'<span class="slider-party" style="color:'+pc(p)+'">'+p+'</span>'
        +'<input type="range" id="sim-'+p+'" min="0" max="80" value="'+SIM_D[p]+'" style="accent-color:'+pc(p)+'"'
        +' oninput="document.getElementById(\'sv-'+p+'\').textContent=this.value+\'%\'">'
        +'<span class="slider-val" id="sv-'+p+'">'+SIM_D[p]+'%</span>'
        +'</div>';
    }).join('')
  );
  byId('btn-simular').addEventListener('click', runSimulation);
}

function runSimulation(){
  var pcts = {};
  SIM_P.forEach(function(p){ pcts[p] = parseInt(byId('sim-'+p).value)||0; });
  var result = M.Escenarios.simularLegislativo(pcts);
  if(!result){ setHTML('sim-results','<p class="text-muted text-sm">Ajusta los valores.</p>'); return; }

  var total = Object.values(result.total).reduce(function(s,n){return s+n;},0);
  var sorted = Object.entries(result.total).sort(function(a,b){return b[1]-a[1];});

  setHTML('sim-results',
    '<div style="margin-bottom:.75rem;font-size:.72rem;color:var(--muted)">Total curules: '+total+' · May. simple: 112 · May. calif.: 148<br>'
    +(result.analisis.partidos_bajo_umbral.length?'Bajo umbral 2%: '+result.analisis.partidos_bajo_umbral.join(', '):'Todos sobre umbral 2%')+'</div>'
    +sorted.map(function(e){
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.32rem 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-size:.8rem;font-weight:700;color:'+pc(e[0])+';min-width:38px">'+e[0]+'</span>'
        +'<div class="bar-track" style="flex:1"><div class="bar-fill" style="width:'+(e[1]/total*100).toFixed(0)+'%;background:'+pc(e[0])+'"></div></div>'
        +'<span style="font-size:.95rem;font-weight:800;color:'+pc(e[0])+';min-width:26px;text-align:right">'+e[1]+'</span></div>';
    }).join('')
    +'<div class="divider"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem;font-size:.7rem">'
    +'<div><span class="text-muted">Senadores:</span> '+Object.entries(result.senadores).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div>'
    +'<div><span class="text-muted">Dip territ.:</span> '+Object.entries(result.diputados).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div>'
    +'<div><span class="text-muted">Nacionales:</span> '+Object.entries(result.nacionales).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div>'
    +'<div><span class="text-muted">Exterior:</span> '+Object.entries(result.exterior).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div></div>'
    +'<p class="note">D\'Hondt con umbral 2% — Ley Electoral RD 275-97, Art. 68</p>'
  );
}

// ====== PROYECCION ======
window._proyInit = false;

function initProyeccion(){
  window._proyInit = true;
  renderProyFundamentals(null);

  var crec = M.CrecimientoPadron.proyectar();
  setHTML('proy-padron',
    [
      rowStat('Padrón 2016',fmt(crec.historico[0].padron)),
      rowStat('Padrón 2020',fmt(crec.historico[1].padron)),
      rowStat('Padrón 2024',fmt(crec.historico[2].padron),'var(--text)'),
      rowStat('CAGR 2020-2024',crec.cagr_4yr+'%'),
      rowStat('CAGR 2016-2024',crec.cagr_8yr+'%'),
      rowStat('Proyección 2028 (bajo)',fmt(crec.padron_2028_bajo)),
      rowStat('Proyección 2028 (alto)',fmt(crec.padron_2028_alto)),
      rowStat('Proyección 2028 (medio)',fmt(crec.padron_2028_medio),'var(--green)'),
      rowStat('Nuevos electores netos',fmt(crec.nuevos_electores),'var(--gold)')
    ].join('')
    +'<p class="note">'+crec.metodologia+' — Fuente: JCE 2016, 2020, 2024</p>'
  );

  setHTML('encuestas-panel',
    '<div style="margin-bottom:.75rem;font-size:.8rem;color:var(--muted)">Ingresa encuestas para activar el modelo Bayesiano (Fundamentals + Encuestas).</div>'
    +'<div id="polls-list" style="margin-bottom:.75rem"></div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr) auto;gap:.4rem;align-items:end">'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">Fecha</div>'
    +'<input id="poll-fecha" type="date" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">PRM%</div>'
    +'<input id="poll-prm" type="number" min="0" max="100" placeholder="48" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">FP%</div>'
    +'<input id="poll-fp" type="number" min="0" max="100" placeholder="27" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">N muestral</div>'
    +'<input id="poll-n" type="number" min="100" max="5000" placeholder="600" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">Calidad</div>'
    +'<select id="poll-cal" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%">'
    +'<option>A+</option><option>A</option><option selected>B</option><option>C</option><option>D</option></select></div>'
    +'<button id="btn-add-poll" style="background:var(--accent);color:#fff;border:none;padding:.32rem .7rem;border-radius:var(--r);font-weight:700;cursor:pointer;font-size:.78rem;white-space:nowrap">+ Añadir</button></div>'
  );

  window._polls = [];
  byId('btn-add-poll').addEventListener('click', function(){
    var fecha = byId('poll-fecha').value;
    var prm   = parseFloat(byId('poll-prm').value);
    var fp    = parseFloat(byId('poll-fp').value);
    var n     = parseInt(byId('poll-n').value)||600;
    var cal   = byId('poll-cal').value;
    if(!fecha||isNaN(prm)||isNaN(fp)) return;
    window._polls.push({fecha:fecha,PRM:prm,FP:fp,n:n,calidad:cal});
    M.Encuestas.cargar(window._polls);
    var agg = M.Encuestas.agregar(['PRM','FP','PLD']);
    renderProyFundamentals(agg);
    setHTML('polls-list',
      '<div style="font-size:.73rem;color:var(--green);margin-bottom:.35rem">✅ '+window._polls.length+' encuesta(s) — Promedio: PRM '+agg.promedio.PRM+'% / FP '+agg.promedio.FP+'%</div>'
      +window._polls.map(function(p){return '<div style="font-size:.7rem;color:var(--muted)">'+p.fecha+' · PRM:'+p.PRM+'% FP:'+p.FP+'% · n='+p.n+' · cal:'+p.calidad+'</div>';}).join('')
    );
  });
}

function renderProyFundamentals(polls_agg){
  var proy = M.Proyeccion.proyectar({}, polls_agg ? polls_agg.promedio : null);
  var partidos = Object.keys(proy);
  var statusNorm = M.NormalizacionHistorica.getStatus();
  var normBanner = '<div style="background:var(--bg3);border:1px solid '+(statusNorm.modo==='PROXY'?'var(--gold)':'var(--green)')+';border-radius:var(--r);padding:.5rem .75rem;margin-bottom:.75rem;font-size:.72rem">'
    +'<span style="font-weight:700;color:'+(statusNorm.modo==='PROXY'?'var(--gold)':'var(--green)')+'">MotorNormalizacionHistorica: '+statusNorm.modo+'</span>'
    +(statusNorm.advertencia?' <span style="color:var(--muted)">— '+statusNorm.advertencia+'</span>':'')
    +'</div>';

  setHTML('proy-fundamentals',
    normBanner + partidos.map(function(p){
      var d = proy[p];
      var diff = +(d.proyectado - d.base_2024).toFixed(2);
      var diffStr = diff>=0?'+'+diff:''+diff;
      var normTag = d.ajuste_normalizacion
        ? '<span style="font-size:.62rem;background:var(--bg3);color:var(--gold);border:1px solid var(--gold)33;border-radius:.2rem;padding:.08rem .3rem;margin-left:.35rem">norm x'+d.ajuste_normalizacion.multiplicador+'</span>'
        : '';
      return '<div style="padding:.55rem 0;border-bottom:1px solid var(--border)">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.28rem">'
        +'<span style="font-weight:700;color:'+pc(p)+'">'+p+(d.es_incumbente?' 🏆':'')+normTag+'</span>'
        +'<div style="text-align:right">'
        +'<span style="font-size:1.05rem;font-weight:800;color:'+pc(p)+'">'+d.proyectado_norm+'%</span>'
        +'<span style="font-size:.7rem;color:'+(diff>=0?'var(--green)':'var(--red)')+';margin-left:.4rem">'+diffStr+'pp</span></div></div>'
        +'<div class="bar-track"><div class="bar-fill" style="width:'+d.proyectado_norm+'%;background:'+pc(p)+'"></div></div>'
        +'<div style="font-size:.68rem;color:var(--muted);margin-top:.2rem">Base 2024: '+d.base_2024+'% · '+d.metodologia
        +(d.ajuste_normalizacion?' · '+d.ajuste_normalizacion.razon:'')+'</div></div>';
    }).join('')
  );
}

// ====== REPLAY ======
function renderReplay(){
  var result = M.Replay.run(M.Resultados, M.Curules, M.Padron);
  setHTML('replay-checks',
    result.checks.map(function(c){
      return '<div class="replay-step '+(c.ok?'ok':'fail')+'">'
        +'<span class="replay-icon">'+c.icon+'</span>'
        +'<span class="replay-name">'+c.name+'</span>'
        +'<span class="replay-status">'+c.status+'</span></div>';
    }).join('')
  );

  setHTML('replay-summary',
    '<div style="text-align:center;padding:1.5rem 0">'
    +'<div style="font-size:2.8rem">'+(result.pct>=100?'🎉':'⚠️')+'</div>'
    +'<div style="font-size:1.25rem;font-weight:800;margin:.5rem 0;color:'+(result.pct>=100?'var(--green)':'var(--gold)')+'">'+result.passed+'/'+result.total+' verificaciones</div>'
    +'<div class="text-muted text-sm">Modo REPLAY · Dataset 2024</div>'
    +(valResult.errores.length?'<div style="margin-top:.75rem;color:var(--red);font-size:.76rem">Errores: '+valResult.errores.join(', ')+'</div>'
      :'<div style="margin-top:.75rem;color:var(--green);font-size:.76rem">✅ Validación interna OK — sin errores</div>')
    +'</div>'
  );
}

// ====== MOTORES ======
function renderMotores(){
  var MOTORES_ON = [
    {n:'Motor Carga',          d:'Datasets 2024 embebidos, validados al inicio'},
    {n:'Motor Validación', d:'Consistencia interna: votos, partidos, curules (MIT Election Data Lab)'},
    {n:'Motor Padrón',     d:'padron.padron[] — getPadronNacional/Prov/Mun (Leighley & Nagler 2013)'},
    {n:'Motor Resultados',     d:'Agregación por bloques electorales (Golder 2006)'},
    {n:'Motor Territorial',    d:'Catálogo provincias/municipios/circunscripciones'},
    {n:'Motor Alianzas',       d:'Fuerza de coalición, escenario sin alianza (Golder 2006)'},
    {n:'Motor Curules/D\'Hondt',d:'D\'Hondt con umbral 2% (Ley Electoral RD 275-97, Art. 68)'},
    {n:'Motor KPIs',           d:'ENPP Laakso-Taagepera (1979), concentración, margen, riesgo 2da vuelta'},
    {n:'Motor Replay 2024',    d:'10 checkpoints cruzados contra datos JCE'},
    {n:'Motor Escenarios',     d:'Simulación D\'Hondt multivariable con umbral legal'},
    {n:'Motor Proyección 2028',d:'Fundamentals+incumbencia (Abramowitz 2008, Erikson & Wlezien 2012)'},
    {n:'Motor Crecimiento Padrón',d:'CAGR (Vf/Vi)^(1/n)-1 — Fuente JCE 2016-2024'},
    {n:'Motor Encuestas',      d:'Ponderación exponencial tiempo/calidad/n (Silver/FiveThirtyEight)'},
    {n:'Motor Potencial',      d:'Score ofensivo/defensivo territorial (Jacobson 2004, Taagepera-Shugart)'},
    {n:'Motor Movilización',d:'Multi-nivel (presidencial/senadores/diputados) · Turnout gap (Leighley & Nagler 2013)'},
    {n:'Motor Riesgo',         d:'Multi-nivel · Composite risk index: margen(50%) + participación(25%) + ENPP(25%)'},
    {n:'Motor Normalización Histórica',d:'Madurez organizativa + crecimiento estructural · Modo PROXY hasta data 2020 (Panebianco 1988)'}
  ];
  var MOTORES_OFF = [
    {n:'Motor Municipal',      d:'Alcaldes y Directores DM — pendiente dataset municipal'},
    {n:'Motor Histórico 2020',d:'Comparativo 2020-2024 — pendiente dataset 2020'}
  ];

  setHTML('motores-on',
    MOTORES_ON.map(function(m){
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:.8rem;font-weight:700">'+m.n+'</div>'
        +'<div class="text-muted" style="font-size:.68rem">'+m.d+'</div></div>'
        +'<span class="tag tag-on" style="margin-left:.5rem;white-space:nowrap">ACTIVO</span></div>';
    }).join('')
  );

  setHTML('motores-off',
    MOTORES_OFF.map(function(m){
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:.8rem;font-weight:700">'+m.n+'</div>'
        +'<div class="text-muted" style="font-size:.68rem">'+m.d+'</div></div>'
        +'<span class="tag tag-off" style="margin-left:.5rem;white-space:nowrap">INACTIVO</span></div>';
    }).join('')
  );

  var DS = [
    {f:'resultados_2024.json',s:'44 KB (sin municipal)'},
    {f:'padron_provincial_2024.json',s:'Presidencial + senadores · 32 provincias'},
    {f:'padron_circ_2024.json',s:'Diputados · 45 circs (estimado proporcional)'},
    {f:'padron_exterior_2024.json',s:'Exterior · 3 regiones (estimado)'},
    {f:'prov_metrics_presidencial_2024.json',s:'32 prov · bloques presidenciales'},
    {f:'prov_metrics_senadores_2024.json',s:'32 prov · alianzas senatoriales'},
    {f:'prov_metrics_diputados_2024.json',s:'32 prov · agregado por provincia'},
    {f:'curules_resultado_2024.json',s:'22 KB'},
    {f:'partidos.json',s:'2 KB · 39 partidos'},
    {f:'padron_2024.json',s:'24 KB · 190 entradas'},
    {f:'territorios_catalogo.json',s:'57 KB'},
    {f:'prov_pres_2024.json',s:'32 provincias — nivel presidencial'},
    {f:'prov_sen_2024.json', s:'32 provincias — nivel senadores'},
    {f:'prov_dip_2024.json', s:'32 provincias — nivel diputados'},
    {f:'alianzas_2024.json',s:'111 KB'},
    {f:'curules_catalogo.json',s:'8 KB'}
  ];
  setHTML('datasets-status',
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:.4rem">'
    +DS.map(function(d){
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.48rem .7rem;display:flex;justify-content:space-between">'
        +'<div><div style="font-size:.76rem;font-weight:700">'+d.f+'</div>'
        +'<div class="text-muted" style="font-size:.68rem">'+d.s+'</div></div>'
        +'<span style="color:var(--green)">✅</span></div>';
    }).join('')+'</div>'
  );

  var REFS = [
    ['D\'Hondt','Ley Electoral RD 275-97, Art. 68 — umbral 2%'],
    ['ENPP','Laakso & Taagepera (1979) Comparative Political Studies 12(1)'],
    ['Competitividad','Jacobson (2004) The Politics of Congressional Elections, 6th ed.'],
    ['Swing/Elasticidad','Gelman & King (1994) AJPS 38(2)'],
    ['Incumbencia','Erikson & Wlezien (2012) The Timeline of Presidential Elections'],
    ['Proyección','Abramowitz (2008) PS: Political Science & Politics 41(4)'],
    ['Mean reversion','Silver (2020) FiveThirtyEight presidential model documentation'],
    ['Encuestas','Silver (2014) FiveThirtyEight pollster ratings methodology'],
    ['Movilización','Leighley & Nagler (2013) Who Votes Now? Princeton UP'],
    ['CAGR','Fórmula estándar: (Vf/Vi)^(1/n) - 1']
  ];
  setHTML('metodologia-refs',
    '<div style="display:flex;flex-direction:column;gap:.32rem;font-size:.76rem">'
    +REFS.map(function(r){
      return '<div style="padding:.28rem 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-weight:700;color:var(--accent)">'+r[0]+':</span> '+r[1]+'</div>';
    }).join('')+'</div>'
  );
}

// ====== BOOT ======
try { renderDashboard(); } catch(e){ console.error('renderDashboard', e); }
try { renderPresidencial(); } catch(e){ console.error('renderPresidencial', e); }
try { renderSenadores(); } catch(e){ console.error('renderSenadores', e); }
try { renderDiputados(); } catch(e){ console.error('renderDiputados', e); }
try { renderPotencial(); } catch(e){ console.error('renderPotencial', e); }
try { renderMovilizacion(); } catch(e){ console.error('renderMovilizacion', e); }
try { renderRiesgo(); } catch(e){ console.error('renderRiesgo', e); }
try { renderMotores(); } catch(e){ console.error('renderMotores', e); }

setTimeout(function(){
  try { drawParliament('parl-canvas',M.Curules.getTotalLegislativo(),M.Curules.getSumaCurules()); } catch(e){ console.error('drawParliament', e); }
},50);

// ── Listeners para selectores de nivel del HTML (level-btn) ──
function bindLevelBtns(containerId, onChange) {
  var cont = byId(containerId);
  if (!cont || cont.__dummy) return;
  cont.addEventListener('click', function(e) {
    var btn = e.target.closest('.level-btn');
    if (!btn) return;
    var nivel = btn.dataset.level || btn.dataset.nivel;
    var partido = btn.dataset.partido;
    if (nivel) {
      cont.querySelectorAll('[data-level],[data-nivel]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      onChange(nivel, null);
    }
    if (partido) {
      cont.querySelectorAll('[data-partido]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      onChange(null, partido);
    }
  });
}

bindLevelBtns('pot-level-bar', function(nivel){ if(nivel){_POT_NIVEL=nivel; renderPotencial();} });
bindLevelBtns('mov-controls', function(nivel, partido){
  if(nivel){ _MOV_NIVEL=nivel; }
  if(partido){ _MOV_PARTIDO=partido; }
  renderMovilizacion();
});
bindLevelBtns('riesgo-controls', function(nivel){ if(nivel){_RIE_NIVEL=nivel; renderRiesgo();} });

})();  btn.classList.add('active');
  if(id==='replay') renderReplay();
  if(id==='simulador' && !window._simInit) initSimulador();
  if(id==='proyeccion' && !window._proyInit) initProyeccion();
});

// Helpers
function fmt(n){ return Number(n).toLocaleString('es-DO'); }
function bar(label,pctVal,color,sub){
  return '<div class="bar-item">'
    +'<div class="bar-hdr"><span class="bar-label">'+label+'</span><span class="bar-pct">'+pctVal+'%</span></div>'
    +(sub?'<div style="font-size:.7rem;color:var(--muted);margin-bottom:.2rem">'+sub+'</div>':'')
    +'<div class="bar-track"><div class="bar-fill" style="width:'+pctVal+'%;background:'+color+'"></div></div>'
    +'</div>';
}
function kpi(cls,label,val,sub){
  return '<div class="kpi '+cls+'"><div class="kpi-label">'+label+'</div>'
    +'<div class="kpi-val">'+val+'</div><div class="kpi-sub">'+sub+'</div></div>';
}
function rowStat(label,val,color){
  return '<div class="flex jb" style="padding:.32rem 0;border-bottom:1px solid var(--border)">'
    +'<span class="text-sm">'+label+'</span>'
    +'<strong style="font-size:.83rem;'+(color?'color:'+color:'')+'">'+val+'</strong></div>';
}

// ====== DASHBOARD ======
function renderDashboard(){
  var kpis = M.KPIs.compute(M.Resultados, M.Curules, M.Padron);
  var blocsP = M.Resultados.getPresidencialByBloc();
  var legT = M.Curules.getTotalLegislativo();
  var total = M.Curules.getSumaCurules();

  document.getElementById('kpi-section').innerHTML = '<div class="kpi-grid">'
    +kpi('blue','Ganador Presidencial',kpis.ganador_presidencial,kpis.pct_ganador+'% \u2014 bloque')
    +kpi('green','Padr\u00f3n Oficial',fmt(kpis.padron_oficial),'Inscritos JCE 2024')
    +kpi('gold','Participaci\u00f3n',kpis.participacion+'%',fmt(kpis.votos_emitidos)+' emitidos')
    +kpi('blue','PRM Senadores','32/32','Todas las provincias')
    +kpi('purple','Curules',kpis.curules_totales,'Legislativo total')
    +kpi('blue','ENPP Legislativo',kpis.enpp_legislativo,'Laakso-Taagepera 1979')
    +kpi('orange','Margen Presidencial',kpis.margen_presidencial+'pp','1ro vs 2do bloque')
    +kpi(kpis.riesgo_segunda_vuelta?'red':'green','Riesgo 2da Vuelta',kpis.riesgo_segunda_vuelta?'SI':'NO',kpis.riesgo_segunda_vuelta?'<50% en 1ra vuelta':'Mayor\u00eda en 1ra vuelta')
    +'</div>';

  document.getElementById('pres-bar-list').innerHTML =
    blocsP.slice(0,6).map(function(b){return bar(b.id+' \u00b7 '+b.nombre.substring(0,26),b.pct,pc(b.id),fmt(b.votos)+' votos');}).join('');

  document.getElementById('leg-bar-list').innerHTML =
    legT.map(function(x){return bar(x.id+' \u00b7 '+M.Resultados.getPartidoNombre(x.id).substring(0,24),+(x.curules/total*100).toFixed(1),pc(x.id),x.curules+' curules');}).join('');

  drawParliament('parl-canvas', legT, total);
  document.getElementById('parl-legend').innerHTML =
    legT.map(function(x){return '<div style="display:flex;align-items:center;gap:.35rem;font-size:.75rem">'
      +'<div style="width:9px;height:9px;border-radius:50%;background:'+pc(x.id)+'"></div>'
      +'<span>'+x.id+': <strong>'+x.curules+'</strong></span></div>';}).join('');

  var totP = M.Resultados.getTotalesPresidencial();
  document.getElementById('dash-padron').innerHTML = [
    rowStat('Inscritos (oficial)',fmt(M.Padron.getPadronOficial()),'var(--text)'),
    rowStat('Votos emitidos',fmt(totP.votos_emitidos)),
    rowStat('Votos v\u00e1lidos',fmt(totP.votos_validos)),
    rowStat('Votos nulos',fmt(totP.votos_nulos)),
    rowStat('Participaci\u00f3n',kpis.participacion+'%','var(--green)'),
    rowStat('Abstenci\u00f3n',kpis.abstencion+'%','var(--gold)'),
  ].join('');

  document.getElementById('dash-indicadores').innerHTML = [
    rowStat('ENPP legislativo',kpis.enpp_legislativo),
    rowStat('Concentraci\u00f3n top-2',kpis.concentracion_top2+'%'),
    rowStat('Margen presidencial',kpis.margen_presidencial+'pp'),
    rowStat('PRM mayor\u00eda calificada (2/3)',179>=148?'SI':'NO','var(--green)'),
    rowStat('Validaci\u00f3n interna',valResult.ok?'\u2705 OK':'\u274c '+valResult.errores.length+' errores'),
  ].join('');

  var bloc = M.Alianzas.getCoalicion('PRM');
  var partidos = bloc && bloc.partidos ? bloc.partidos : [];
  document.getElementById('dash-coalicion').innerHTML =
    '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.5rem">'+partidos.length+' partidos en coalici\u00f3n</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:.3rem">'
    +partidos.map(function(p){return '<span style="background:var(--bg3);border:1px solid var(--border);border-radius:.25rem;padding:.1rem .35rem;font-size:.7rem;font-weight:700">'+p+'</span>';}).join('')
    +'</div>';
}

// Parliament arc
function drawParliament(canvasId, data, total){
  var cv = document.getElementById(canvasId); if(!cv) return;
  var ctx = cv.getContext('2d');
  var W=cv.width,H=cv.height,cx=W/2,cy=H-15,R1=75,R2=145;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#1E2A40'; ctx.lineWidth=1;
  [R1,R2].forEach(function(r){ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.stroke();});
  var cursor=Math.PI;
  data.forEach(function(item){
    var id=item.id, curules=item.curules;
    var span=(curules/total)*Math.PI;
    ctx.fillStyle=pc(id);
    for(var i=0;i<curules;i++){
      var a=cursor+(i+0.5)*(span/curules);
      var row=i%3;
      var rr=R1+(row+0.5)*((R2-R1)/3);
      var x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
      ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();
    }
    cursor+=span;
  });
}

// ====== PRESIDENCIAL ======
function renderPresidencial(){
  var blocsP = M.Resultados.getPresidencialByBloc();
  var byPart = M.Resultados.getPresidencialByPartido();
  var totP = M.Resultados.getTotalesPresidencial();
  var partic = M.Padron.getParticipacionNacional(totP.votos_emitidos);

  document.getElementById('pres-blocs-bars').innerHTML =
    blocsP.map(function(b){return bar(b.id+' \u00b7 '+b.nombre,b.pct,pc(b.id),fmt(b.votos)+' votos');}).join('');

  document.getElementById('pres-stats').innerHTML = [
    rowStat('Padr\u00f3n oficial',fmt(M.Padron.getPadronOficial())),
    rowStat('Votos emitidos',fmt(totP.votos_emitidos)),
    rowStat('Votos v\u00e1lidos',fmt(totP.votos_validos)),
    rowStat('Votos nulos',fmt(totP.votos_nulos)),
    rowStat('Participaci\u00f3n JCE',totP.porcentaje_participacion+'%','var(--green)'),
    rowStat('Participaci\u00f3n calculada',partic+'%','var(--green)'),
    rowStat('Ganador',blocsP[0]?blocsP[0].id+' \u00b7 Luis Abinader':'','var(--prm)'),
    rowStat('% ganador (bloque)',blocsP[0]?blocsP[0].pct+'%':'','var(--prm)'),
    rowStat('Margen vs 2do',blocsP[1]?+(blocsP[0].pct-blocsP[1].pct).toFixed(2)+'pp':''),
    rowStat('Ballotage',blocsP[0]&&blocsP[0].pct>=50?'No \u2014 1ra vuelta':'SI \u2014 ballotage'),
  ].join('');

  document.getElementById('pres-all-parties').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.4rem">'
    +byPart.map(function(p){return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.5rem .7rem;display:flex;justify-content:space-between;align-items:center">'
      +'<span style="font-weight:700;font-size:.8rem;color:'+pc(p.id)+'">'+p.id+'</span>'
      +'<span style="font-size:.74rem;color:var(--muted)">'+fmt(p.votos)+' <strong style="color:var(--text)">'+p.pct+'%</strong></span>'
      +'</div>';}).join('')
    +'</div>';
}

// ====== SENADORES ======
function renderSenadores(){
  var senData = M.Resultados.getSenadores();
  var senC = M.Curules.getTotalByNivel('senadores');
  var senCoal = M.Curules.getSenadorePorCoalicion();

  // Totales por coalici\u00f3n
  var prmReal = senC['PRM']||0;
  var fpReal  = senC['FP']||0;
  var prmCoal = (senCoal.find(function(x){return x.id==='PRM-coalicion';})||{curules:0}).curules;
  var fpCoal  = (senCoal.find(function(x){return x.id==='FP-coalicion';})||{curules:0}).curules;
  var otros   = 32 - prmCoal - fpCoal;

  document.getElementById('sen-kpis').innerHTML =
    kpi('blue','PRM directo',prmReal,'bloque PRM: '+prmCoal+' (+'+(prmCoal-prmReal)+' aliados)')
    +kpi('purple','FP directo',fpReal,'bloque FP: '+fpCoal+' (+'+(fpCoal-fpReal)+' aliados)')
    +kpi('red','Otros partidos',otros,'fuera de bloques principales')
    +kpi('gold','Total','32','1 por provincia');

  document.getElementById('sen-prov-grid').innerHTML = senData.map(function(prov){
    var pm = _PROV_METRICS_SEN.find(function(p){return p.id===prov.provincia_id;})||{};
    var rn = pm.riesgo_nivel||'';
    var rs = pm.riesgo_score||'';
    var esAliadoPRM = prov.ganador !== 'PRM' && prov.bloque_coalicion === 'PRM-coalicion';
    var esAliadoFP  = prov.ganador !== 'FP'  && prov.bloque_coalicion === 'FP-coalicion';
    var coalbadge = esAliadoPRM
      ? '<span style="font-size:.65rem;background:var(--bg3);color:var(--muted);padding:.1rem .35rem;border-radius:.25rem;margin-left:.3rem">aliado PRM</span>'
      : (esAliadoFP ? '<span style="font-size:.65rem;background:var(--bg3);color:var(--muted);padding:.1rem .35rem;border-radius:.25rem;margin-left:.3rem">aliado FP</span>' : '');
    return '<div class="prov-card">'
      +'<div class="prov-name">'+prov.provincia+'</div>'
      +'<div class="prov-winner" style="color:'+pc(prov.ganador)+'">'+prov.ganador+coalbadge+'</div>'
      +'<div class="prov-pct">'+prov.pct_ganador+'% \u00b7 ENPP '+(pm.enpp||'?')+'</div>'
      +(rn?'<span class="risk-badge risk-'+rn+'">Riesgo '+rs+'</span>':'')
      +'<div class="prov-bar">'
      +prov.top3.map(function(t){return '<div style="flex:'+t.pct+';background:'+pc(t.id)+';height:100%"></div>';}).join('')
      +'</div></div>';
  }).join('');
}

// ====== DIPUTADOS ======
function renderDiputados(){
  var dipC=M.Curules.getTotalByNivel('diputados');
  var natC=M.Curules.getTotalByNivel('nacionales');
  var extC=M.Curules.getTotalByNivel('exterior');
  var combined={};
  [dipC,natC,extC].forEach(function(obj){
    Object.entries(obj).forEach(function(e){combined[e[0]]=(combined[e[0]]||0)+e[1];});
  });
  var sortedC=Object.entries(combined).sort(function(a,b){return b[1]-a[1];});
  var totalC=sortedC.reduce(function(s,e){return s+e[1];},0);

  document.getElementById('dip-kpis').innerHTML =
    kpi('blue','PRM Territoriales',dipC.PRM||0,'de 178')
    +kpi('purple','FP Territoriales',dipC.FP||0,'')
    +kpi('red','PLD Territoriales',dipC.PLD||0,'')
    +kpi('gold','Total C\u00e1mara Baja',190,'178+5+7');

  document.getElementById('dip-bar-list').innerHTML =
    sortedC.map(function(e){
      return bar(e[0]+' \u00b7 '+M.Resultados.getPartidoNombre(e[0]).substring(0,24),+(e[1]/totalC*100).toFixed(1),pc(e[0]),e[1]+' curules');
    }).join('');

  var ext=M.Curules.getExteriorDetail();
  document.getElementById('ext-detail').innerHTML = ext.map(function(c){
    return '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
      +'<span>'+c.region.replace('Am\u00e9rica del ','')+'</span>'
      +'<strong style="color:'+pc(c.resultado[0]&&c.resultado[0].partido)+'">'+c.resultado.map(function(r){return r.partido+':'+r.curules;}).join(', ')+'</strong></div>';
  }).join('');

  var nat=M.Curules.getNacionalesDetail();
  document.getElementById('nat-detail').innerHTML =
    '<div class="text-muted" style="font-size:.7rem;margin-bottom:.4rem">'+(nat.criterio||'Lista cerrada bloqueada')+'</div>'
    +(nat.resultado||[]).map(function(r){
      return '<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
        +'<span>'+r.partido+'</span>'
        +'<strong style="color:'+pc(r.partido)+'">'+r.curules+' curul'+(r.curules>1?'es':'')+'</strong></div>';
    }).join('');

  document.getElementById('dip-circ-grid').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.4rem">'
    +M.Curules.getDiputadosDetail().map(function(c){
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.55rem .75rem">'
        +'<div style="font-size:.75rem;font-weight:700;margin-bottom:.2rem">'+c.provincia+' C'+c.circ+'</div>'
        +'<div style="font-size:.68rem;color:var(--muted)">'+c.curules_totales+' curules</div>'
        +'<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.25rem">'
        +(c.resultado||[]).map(function(r){
          return '<span style="background:'+pc(r.partido)+'22;border:1px solid '+pc(r.partido)+'44;border-radius:.2rem;padding:.08rem .28rem;font-size:.66rem;font-weight:700;color:'+pc(r.partido)+'">'+r.partido+':'+r.curules+'</span>';
        }).join('')
        +'</div></div>';
    }).join('')
    +'</div>';
}

// ====== POTENCIAL ======
var _POT_NIVEL = 'presidencial';
function _getProvDS(n){ return n==='senadores' ? _PROV_SEN : n==='diputados' ? _PROV_DIP : _PROV_PRES; }

function nivelTabs(idPrefix, activo, onChange) {
  return ['presidencial','senadores','diputados'].map(function(n){
    var isAct = n===activo;
    return '<button onclick="'+onChange+'(\''+n+'\')" style="background:'+(isAct?'var(--accent)':'var(--bg3)')+';color:'+(isAct?'#fff':'var(--muted)')+';border:none;padding:.28rem .75rem;border-radius:.3rem;font-size:.72rem;font-weight:700;cursor:pointer;text-transform:capitalize">'+n+'</button>';
  }).join('');
}

function renderPotencial(){
  var ds = _getProvDS(_POT_NIVEL);
  var ofensivo = M.Potencial.scoreOfensivo(ds,'FP');
  var defensivo = M.Potencial.scoreDefensivo(ds,'PRM');

  document.getElementById('potencial-ofensivo').innerHTML =
    ofensivo.filter(function(p){return p.categoria_ofensiva!=='perdida'&&p.categoria_ofensiva!=='consolidada';}).slice(0,10).map(function(pm){
      var catColor = pm.categoria_ofensiva==='objetivo_prioritario'?'var(--fp)':pm.categoria_ofensiva==='objetivo_secundario'?'var(--gold)':'var(--muted)';
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:.82rem;font-weight:700">'+pm.provincia+'</div>'
        +'<div style="font-size:.7rem;color:var(--muted)">Margen: '+pm.margen_pp+'pp \u00b7 Abst: '+pm.abstencion+'% \u00b7 FP: '+pm.pct_target+'%</div></div>'
        +'<div style="text-align:right">'
        +'<div style="font-size:.9rem;font-weight:800;color:'+catColor+'">'+pm.score_ofensivo+'</div>'
        +'<div style="font-size:.67rem;color:var(--muted)">'+pm.categoria_ofensiva.replace(/_/g,' ')+'</div></div></div>';
    }).join('');

  document.getElementById('potencial-defensivo').innerHTML =
    defensivo.slice(0,10).map(function(pm){
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.42rem 0;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:.82rem;font-weight:700">'+pm.provincia+'</div>'
        +'<div style="font-size:.7rem;color:var(--muted)">Margen: '+pm.margen_pp+'pp \u00b7 ENPP: '+pm.enpp+'</div></div>'
        +'<div style="text-align:right">'
        +'<span class="risk-badge risk-'+pm.riesgo_nivel+'">'+pm.riesgo_score+'</span>'
        +'<div style="font-size:.67rem;color:var(--muted)">'+pm.prioridad_defensa+'</div></div></div>';
    }).join('');

  document.getElementById('competitividad-grid').innerHTML = ds.map(function(pm){
    return '<div class="prov-card">'
      +'<div class="prov-name">'+pm.provincia+'</div>'
      +'<div class="prov-winner" style="color:'+pc(pm.ganador)+'">'+pm.ganador+'</div>'
      +'<div class="prov-pct">ENPP '+pm.enpp+' \u00b7 '+pm.competitividad+'</div>'
      +'<span class="risk-badge risk-'+pm.riesgo_nivel+'">Riesgo '+pm.riesgo_score+'</span>'
      +'</div>';
  }).join('');
}

window.setPotNivel = function(n){ _POT_NIVEL=n; renderPotencial(); };

// ====== MOVILIZACION ======
var _MOV_NIVEL = 'presidencial';
var _MOV_PARTIDO = 'FP';

function renderMovilizacion(){
  var agenda = M.Movilizacion.agenda(_MOV_NIVEL, _MOV_PARTIDO);
  var resumen = M.Movilizacion.resumenMultinivel(_MOV_PARTIDO);

  // KPIs del nivel activo
  var kpisEl = document.getElementById('mov-kpis');
  if(kpisEl){
    var n_alta = agenda.filter(function(a){return a.factibilidad==='alta';}).length;
    var n_media = agenda.filter(function(a){return a.factibilidad==='media';}).length;
    var n_baja = agenda.filter(function(a){return a.factibilidad==='baja';}).length;
    var gap_total = agenda.reduce(function(s,a){return s+a.votos_gap;},0);
    kpisEl.innerHTML =
      kpi('green','Factibilidad Alta',n_alta,'plazas recuperables')
      +kpi('gold','Factibilidad Media',n_media,'requieren esfuerzo')
      +kpi('red','Factibilidad Baja',n_baja,'objetivo difícil')
      +kpi('purple','Gap total '+_MOV_NIVEL,fmt(gap_total),'votos a recuperar');
  }

  document.getElementById('movilizacion-list').innerHTML = agenda.slice(0,20).map(function(a){
    var factColor = a.factibilidad==='alta'?'var(--green)':a.factibilidad==='media'?'var(--gold)':'var(--red)';
    return '<div class="mov-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div><div style="font-size:.85rem;font-weight:700">'+a.provincia+'</div>'
      +'<div style="font-size:.7rem;color:var(--muted)">Ganador actual: <strong style="color:'+pc(a.ganador_actual)+'">'+a.ganador_actual+'</strong>'
      +(a.bloque_coalicion?' ['+a.bloque_coalicion+']':'')+' \u00b7 Partic. '+a.participacion_actual+'% \u00b7 ENPP '+a.enpp+'</div></div>'
      +'<span style="font-size:.78rem;font-weight:700;color:'+factColor+'">'+a.factibilidad.toUpperCase()+'</span></div>'
      +'<div style="margin-top:.5rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:.35rem">'
      +'<div style="background:var(--bg);border-radius:var(--r);padding:.38rem;text-align:center">'
      +'<div style="font-size:.63rem;color:var(--muted)">Gap votos</div>'
      +'<div style="font-size:.83rem;font-weight:800">'+fmt(a.votos_gap)+'</div></div>'
      +'<div style="background:var(--bg);border-radius:var(--r);padding:.38rem;text-align:center">'
      +'<div style="font-size:.63rem;color:var(--muted)">Votos necesarios</div>'
      +'<div style="font-size:.83rem;font-weight:800;color:var(--fp)">'+fmt(a.votos_necesarios)+'</div></div>'
      +'<div style="background:var(--bg);border-radius:var(--r);padding:.38rem;text-align:center">'
      +'<div style="font-size:.63rem;color:var(--muted)">% abstencionistas</div>'
      +'<div style="font-size:.83rem;font-weight:800;color:'+factColor+'">'+a.pct_abstencionistas_a_movilizar+'%</div></div>'
      +'</div></div>';
  }).join('');

  // Resumen multi-nivel compacto
  var rsEl = document.getElementById('mov-resumen');
  if(rsEl){
    rsEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">'
      +resumen.map(function(r){
        return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.65rem">'
          +'<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">'+r.nivel+'</div>'
          +'<div style="font-size:.78rem"><span style="color:var(--green)">'+r.plazas_alta+'A</span> '
          +'<span style="color:var(--gold)">'+r.plazas_media+'M</span> '
          +'<span style="color:var(--red)">'+r.plazas_baja+'B</span>'
          +' / <span style="color:var(--muted)">'+r.plazas_perdidas+' perdidas</span></div></div>';
      }).join('')+'</div>';
  }
}

window.setMovNivel = function(n){ _MOV_NIVEL=n; renderMovilizacion(); };

// ====== RIESGO ======
var _RIE_NIVEL = 'presidencial';

function renderRiesgo(){
  var ds = _getProvDS(_RIE_NIVEL);
  var clasificados = M.Riesgo.clasificar(ds);
  var alertas = M.Riesgo.getAlertas(ds);
  var n_alto = clasificados.filter(function(p){return p.riesgo_nivel==='alto';}).length;
  var n_medio = clasificados.filter(function(p){return p.riesgo_nivel==='medio';}).length;
  var n_bajo = clasificados.filter(function(p){return p.riesgo_nivel==='bajo';}).length;

  document.getElementById('riesgo-kpis').innerHTML =
    kpi('red','Riesgo Alto',n_alto,'provincias \u2014 monitoreo inmediato')
    +kpi('gold','Riesgo Medio',n_medio,'provincias \u2014 seguimiento')
    +kpi('green','Riesgo Bajo',n_bajo,'provincias \u2014 consolidadas')
    +kpi('blue','Total PRM',clasificados.length,'provincias ganadas');

  document.getElementById('riesgo-list').innerHTML = clasificados.map(function(pm){
    var col = pm.riesgo_nivel==='alto'?'var(--red)':pm.riesgo_nivel==='medio'?'var(--gold)':'var(--green)';
    return '<div style="display:flex;align-items:center;gap:.55rem;padding:.42rem 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex:1"><div style="font-size:.8rem;font-weight:700">'+pm.provincia+'</div>'
      +'<div style="font-size:.68rem;color:var(--muted)">Margen '+pm.margen_pp+'pp \u00b7 Partic '+pm.participacion+'% \u00b7 ENPP '+pm.enpp+'</div></div>'
      +'<div class="score-wrap" style="width:95px">'
      +'<div class="score-track"><div class="score-fill" style="width:'+pm.riesgo_score+'%;background:'+col+'"></div></div>'
      +'<span style="font-size:.73rem;font-weight:700;min-width:26px;text-align:right">'+pm.riesgo_score+'</span></div>'
      +'<span class="risk-badge risk-'+pm.riesgo_nivel+'">'+pm.riesgo_nivel+'</span></div>';
  }).join('');

  document.getElementById('riesgo-alertas').innerHTML = alertas.length
    ? alertas.map(function(a){
        return '<div style="background:#1F0D0D;border:1px solid #EF444422;border-radius:var(--r);padding:.7rem;margin-bottom:.4rem">'
          +'<div style="font-size:.83rem;font-weight:700;color:var(--red)">\u26a0\ufe0f '+a.provincia+'</div>'
          +'<div style="font-size:.73rem;color:var(--muted);margin-top:.2rem">'+a.mensaje+'</div>'
          +'<div style="font-size:.7rem;color:var(--muted);margin-top:.12rem">Score: '+a.riesgo+' \u00b7 Margen: '+a.margen+'pp \u00b7 ENPP: '+a.enpp+'</div></div>';
      }).join('')
    : '<p class="text-muted text-sm">Sin alertas de alto riesgo.</p>';
}

window.setRieNivel = function(n){ _RIE_NIVEL=n; renderRiesgo(); };

// ====== SIMULADOR ======
var SIM_P = ['PRM','FP','PLD','PRD','PCR'];
var SIM_D = {PRM:50,FP:27,PLD:11,PRD:6,PCR:6};
window._simInit = false;

function initSimulador(){
  window._simInit = true;
  document.getElementById('sim-sliders').innerHTML = SIM_P.map(function(p){
    return '<div class="slider-row">'
      +'<span class="slider-party" style="color:'+pc(p)+'">'+p+'</span>'
      +'<input type="range" id="sim-'+p+'" min="0" max="80" value="'+SIM_D[p]+'" style="accent-color:'+pc(p)+'"'
      +' oninput="document.getElementById(\'sv-'+p+'\').textContent=this.value+\'%\'">'
      +'<span class="slider-val" id="sv-'+p+'">'+SIM_D[p]+'%</span>'
      +'</div>';
  }).join('');
  document.getElementById('btn-simular').addEventListener('click', runSimulation);
}

function runSimulation(){
  var pcts = {};
  SIM_P.forEach(function(p){ pcts[p] = parseInt(document.getElementById('sim-'+p).value)||0; });
  var result = M.Escenarios.simularLegislativo(pcts);
  if(!result){ document.getElementById('sim-results').innerHTML='<p class="text-muted text-sm">Ajusta los valores.</p>'; return; }

  var total = Object.values(result.total).reduce(function(s,n){return s+n;},0);
  var sorted = Object.entries(result.total).sort(function(a,b){return b[1]-a[1];});

  document.getElementById('sim-results').innerHTML =
    '<div style="margin-bottom:.75rem;font-size:.72rem;color:var(--muted)">Total curules: '+total+' \u00b7 May. simple: 112 \u00b7 May. calif.: 148<br>'
    +(result.analisis.partidos_bajo_umbral.length?'Bajo umbral 2%: '+result.analisis.partidos_bajo_umbral.join(', '):'Todos sobre umbral 2%')+'</div>'
    +sorted.map(function(e){
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.32rem 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-size:.8rem;font-weight:700;color:'+pc(e[0])+';min-width:38px">'+e[0]+'</span>'
        +'<div class="bar-track" style="flex:1"><div class="bar-fill" style="width:'+(e[1]/total*100).toFixed(0)+'%;background:'+pc(e[0])+'"></div></div>'
        +'<span style="font-size:.95rem;font-weight:800;color:'+pc(e[0])+';min-width:26px;text-align:right">'+e[1]+'</span></div>';
    }).join('')
    +'<div class="divider"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem;font-size:.7rem">'
    +'<div><span class="text-muted">Senadores:</span> '+Object.entries(result.senadores).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div>'
    +'<div><span class="text-muted">Dip territ.:</span> '+Object.entries(result.diputados).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div>'
    +'<div><span class="text-muted">Nacionales:</span> '+Object.entries(result.nacionales).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div>'
    +'<div><span class="text-muted">Exterior:</span> '+Object.entries(result.exterior).map(function(e){return e[0]+':'+e[1];}).join(', ')+'</div></div>'
    +'<p class="note">D\'Hondt con umbral 2% \u2014 Ley Electoral RD 275-97, Art. 68</p>';
}

// ====== PROYECCION ======
window._proyInit = false;

function initProyeccion(){
  window._proyInit = true;
  renderProyFundamentals(null);

  var crec = M.CrecimientoPadron.proyectar();
  document.getElementById('proy-padron').innerHTML = [
    rowStat('Padr\u00f3n 2016',fmt(crec.historico[0].padron)),
    rowStat('Padr\u00f3n 2020',fmt(crec.historico[1].padron)),
    rowStat('Padr\u00f3n 2024',fmt(crec.historico[2].padron),'var(--text)'),
    rowStat('CAGR 2020-2024',crec.cagr_4yr+'%'),
    rowStat('CAGR 2016-2024',crec.cagr_8yr+'%'),
    rowStat('Proyecci\u00f3n 2028 (bajo)',fmt(crec.padron_2028_bajo)),
    rowStat('Proyecci\u00f3n 2028 (alto)',fmt(crec.padron_2028_alto)),
    rowStat('Proyecci\u00f3n 2028 (medio)',fmt(crec.padron_2028_medio),'var(--green)'),
    rowStat('Nuevos electores netos',fmt(crec.nuevos_electores),'var(--gold)'),
  ].join('')+'<p class="note">'+crec.metodologia+' \u2014 Fuente: JCE 2016, 2020, 2024</p>';

  document.getElementById('encuestas-panel').innerHTML =
    '<div style="margin-bottom:.75rem;font-size:.8rem;color:var(--muted)">Ingresa encuestas para activar el modelo Bayesiano (Fundamentals + Encuestas).</div>'
    +'<div id="polls-list" style="margin-bottom:.75rem"></div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr) auto;gap:.4rem;align-items:end">'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">Fecha</div>'
    +'<input id="poll-fecha" type="date" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">PRM%</div>'
    +'<input id="poll-prm" type="number" min="0" max="100" placeholder="48" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">FP%</div>'
    +'<input id="poll-fp" type="number" min="0" max="100" placeholder="27" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">N muestral</div>'
    +'<input id="poll-n" type="number" min="100" max="5000" placeholder="600" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%"></div>'
    +'<div><div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">Calidad</div>'
    +'<select id="poll-cal" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.32rem .45rem;border-radius:var(--r);font-size:.76rem;width:100%">'
    +'<option>A+</option><option>A</option><option selected>B</option><option>C</option><option>D</option></select></div>'
    +'<button id="btn-add-poll" style="background:var(--accent);color:#fff;border:none;padding:.32rem .7rem;border-radius:var(--r);font-weight:700;cursor:pointer;font-size:.78rem;white-space:nowrap">+ A\u00f1adir</button></div>';

  window._polls = [];
  document.getElementById('btn-add-poll').addEventListener('click', function(){
    var fecha = document.getElementById('poll-fecha').value;
    var prm   = parseFloat(document.getElementById('poll-prm').value);
    var fp    = parseFloat(document.getElementById('poll-fp').value);
    var n     = parseInt(document.getElementById('poll-n').value)||600;
    var cal   = document.getElementById('poll-cal').value;
    if(!fecha||isNaN(prm)||isNaN(fp)) return;
    window._polls.push({fecha:fecha,PRM:prm,FP:fp,n:n,calidad:cal});
    M.Encuestas.cargar(window._polls);
    var agg = M.Encuestas.agregar(['PRM','FP','PLD']);
    renderProyFundamentals(agg);
    document.getElementById('polls-list').innerHTML =
      '<div style="font-size:.73rem;color:var(--green);margin-bottom:.35rem">\u2705 '+window._polls.length+' encuesta(s) \u2014 Promedio: PRM '+agg.promedio.PRM+'% / FP '+agg.promedio.FP+'%</div>'
      +window._polls.map(function(p){return '<div style="font-size:.7rem;color:var(--muted)">'+p.fecha+' \u00b7 PRM:'+p.PRM+'% FP:'+p.FP+'% \u00b7 n='+p.n+' \u00b7 cal:'+p.calidad+'</div>';}).join('');
  });
}

function renderProyFundamentals(polls_agg){
  var proy = M.Proyeccion.proyectar({}, polls_agg ? polls_agg.promedio : null);
  var partidos = Object.keys(proy);
  var statusNorm = M.NormalizacionHistorica.getStatus();
  var normBanner = '<div style="background:var(--bg3);border:1px solid '+(statusNorm.modo==='PROXY'?'var(--gold)':'var(--green)')+';border-radius:var(--r);padding:.5rem .75rem;margin-bottom:.75rem;font-size:.72rem">'
    +'<span style="font-weight:700;color:'+(statusNorm.modo==='PROXY'?'var(--gold)':'var(--green)')+'">MotorNormalizacionHistorica: '+statusNorm.modo+'</span>'
    +(statusNorm.advertencia?' <span style="color:var(--muted)">\u2014 '+statusNorm.advertencia+'</span>':'')
    +'</div>';

  document.getElementById('proy-fundamentals').innerHTML = normBanner + partidos.map(function(p){
    var d = proy[p];
    var diff = +(d.proyectado - d.base_2024).toFixed(2);
    var diffStr = diff>=0?'+'+diff:''+diff;
    var normTag = d.ajuste_normalizacion
      ? '<span style="font-size:.62rem;background:var(--bg3);color:var(--gold);border:1px solid var(--gold)33;border-radius:.2rem;padding:.08rem .3rem;margin-left:.35rem">norm x'+d.ajuste_normalizacion.multiplicador+'</span>'
      : '';
    return '<div style="padding:.55rem 0;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.28rem">'
      +'<span style="font-weight:700;color:'+pc(p)+'">'+p+(d.es_incumbente?' \ud83c\udfc6':'')+normTag+'</span>'
      +'<div style="text-align:right">'
      +'<span style="font-size:1.05rem;font-weight:800;color:'+pc(p)+'">'+d.proyectado_norm+'%</span>'
      +'<span style="font-size:.7rem;color:'+(diff>=0?'var(--green)':'var(--red)')+';margin-left:.4rem">'+diffStr+'pp</span></div></div>'
      +'<div class="bar-track"><div class="bar-fill" style="width:'+d.proyectado_norm+'%;background:'+pc(p)+'"></div></div>'
      +'<div style="font-size:.68rem;color:var(--muted);margin-top:.2rem">Base 2024: '+d.base_2024+'% \u00b7 '+d.metodologia
      +(d.ajuste_normalizacion?' \u00b7 '+d.ajuste_normalizacion.razon:'')+'</div></div>';
  }).join('');
}

// ====== REPLAY ======
function renderReplay(){
  var result = M.Replay.run(M.Resultados, M.Curules, M.Padron);
  document.getElementById('replay-checks').innerHTML = result.checks.map(function(c){
    return '<div class="replay-step '+(c.ok?'ok':'fail')+'">'
      +'<span class="replay-icon">'+c.icon+'</span>'
      +'<span class="replay-name">'+c.name+'</span>'
      +'<span class="replay-status">'+c.status+'</span></div>';
  }).join('');

  document.getElementById('replay-summary').innerHTML =
    '<div style="text-align:center;padding:1.5rem 0">'
    +'<div style="font-size:2.8rem">'+(result.pct>=100?'\ud83c\udf89':'\u26a0\ufe0f')+'</div>'
    +'<div style="font-size:1.25rem;font-weight:800;margin:.5rem 0;color:'+(result.pct>=100?'var(--green)':'var(--gold)')+'">'+result.passed+'/'+result.total+' verificaciones</div>'
    +'<div class="text-muted text-sm">Modo REPLAY \u00b7 Dataset 2024</div>'
    +(valResult.errores.length?'<div style="margin-top:.75rem;color:var(--red);font-size:.76rem">Errores: '+valResult.errores.join(', ')+'</div>'
      :'<div style="margin-top:.75rem;color:var(--green);font-size:.76rem">\u2705 Validaci\u00f3n interna OK \u2014 sin errores</div>')
    +'</div>';
}

// ====== MOTORES ======
function renderMotores(){
  var MOTORES_ON = [
    {n:'Motor Carga',          d:'Datasets 2024 embebidos, validados al inicio'},
    {n:'Motor Validaci\u00f3n', d:'Consistencia interna: votos, partidos, curules (MIT Election Data Lab)'},
    {n:'Motor Padr\u00f3n',     d:'padron.padron[] \u2014 getPadronNacional/Prov/Mun (Leighley & Nagler 2013)'},
    {n:'Motor Resultados',     d:'Agregaci\u00f3n por bloques electorales (Golder 2006)'},
    {n:'Motor Territorial',    d:'Cat\u00e1logo provincias/municipios/circunscripciones'},
    {n:'Motor Alianzas',       d:'Fuerza de coalici\u00f3n, escenario sin alianza (Golder 2006)'},
    {n:'Motor Curules/D\'Hondt',d:'D\'Hondt con umbral 2% (Ley Electoral RD 275-97, Art. 68)'},
    {n:'Motor KPIs',           d:'ENPP Laakso-Taagepera (1979), concentraci\u00f3n, margen, riesgo 2da vuelta'},
    {n:'Motor Replay 2024',    d:'10 checkpoints cruzados contra datos JCE'},
    {n:'Motor Escenarios',     d:'Simulaci\u00f3n D\'Hondt multivariable con umbral legal'},
    {n:'Motor Proyecci\u00f3n 2028',d:'Fundamentals+incumbencia (Abramowitz 2008, Erikson & Wlezien 2012)'},
    {n:'Motor Crecimiento Padr\u00f3n',d:'CAGR (Vf/Vi)^(1/n)-1 \u2014 Fuente JCE 2016-2024'},
    {n:'Motor Encuestas',      d:'Ponderaci\u00f3n exponencial tiempo/calidad/n (Silver/FiveThirtyEight)'},
    {n:'Motor Potencial',      d:'Score ofensivo/defensivo territorial (Jacobson 2004, Taagepera-Shugart)'},
    {n:'Motor Movilizaci\u00f3n',d:'Multi-nivel (presidencial/senadores/diputados) \u00b7 Turnout gap (Leighley & Nagler 2013)'},
    {n:'Motor Riesgo',         d:'Multi-nivel \u00b7 Composite risk index: margen(50%) + participaci\u00f3n(25%) + ENPP(25%)'},
    {n:'Motor Normalizaci\u00f3n Hist\u00f3rica',d:'Madurez organizativa + crecimiento estructural \u00b7 Modo PROXY hasta data 2020 (Panebianco 1988)'},
  ];
  var MOTORES_OFF = [
    {n:'Motor Municipal',      d:'Alcaldes y Directores DM \u2014 pendiente dataset municipal'},
    {n:'Motor Hist\u00f3rico 2020',d:'Comparativo 2020-2024 \u2014 pendiente dataset 2020'},
  ];

  document.getElementById('motores-on').innerHTML = MOTORES_ON.map(function(m){
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.42rem 0;border-bottom:1px solid var(--border)">'
      +'<div><div style="font-size:.8rem;font-weight:700">'+m.n+'</div>'
      +'<div class="text-muted" style="font-size:.68rem">'+m.d+'</div></div>'
      +'<span class="tag tag-on" style="margin-left:.5rem;white-space:nowrap">ACTIVO</span></div>';
  }).join('');

  document.getElementById('motores-off').innerHTML = MOTORES_OFF.map(function(m){
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.42rem 0;border-bottom:1px solid var(--border)">'
      +'<div><div style="font-size:.8rem;font-weight:700">'+m.n+'</div>'
      +'<div class="text-muted" style="font-size:.68rem">'+m.d+'</div></div>'
      +'<span class="tag tag-off" style="margin-left:.5rem;white-space:nowrap">INACTIVO</span></div>';
  }).join('');

  var DS = [
    {f:'resultados_2024.json',s:'44 KB (sin municipal)'},
    {f:'padron_provincial_2024.json',s:'Presidencial + senadores \u00b7 32 provincias'},
    {f:'padron_circ_2024.json',s:'Diputados \u00b7 45 circs (estimado proporcional)'},
    {f:'padron_exterior_2024.json',s:'Exterior \u00b7 3 regiones (estimado)'},
    {f:'prov_metrics_presidencial_2024.json',s:'32 prov \u00b7 bloques presidenciales'},
    {f:'prov_metrics_senadores_2024.json',s:'32 prov \u00b7 alianzas senatoriales'},
    {f:'prov_metrics_diputados_2024.json',s:'32 prov \u00b7 agregado por provincia'},
    {f:'curules_resultado_2024.json',s:'22 KB'},
    {f:'partidos.json',s:'2 KB \u00b7 39 partidos'},
    {f:'padron_2024.json',s:'24 KB \u00b7 190 entradas'},
    {f:'territorios_catalogo.json',s:'57 KB'},
    {f:'prov_pres_2024.json',s:'32 provincias — nivel presidencial'},
    {f:'prov_sen_2024.json', s:'32 provincias — nivel senadores'},
    {f:'prov_dip_2024.json', s:'32 provincias — nivel diputados'},
    {f:'alianzas_2024.json',s:'111 KB'},
    {f:'curules_catalogo.json',s:'8 KB'},
  ];
  document.getElementById('datasets-status').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:.4rem">'
    +DS.map(function(d){
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.48rem .7rem;display:flex;justify-content:space-between">'
        +'<div><div style="font-size:.76rem;font-weight:700">'+d.f+'</div>'
        +'<div class="text-muted" style="font-size:.68rem">'+d.s+'</div></div>'
        +'<span style="color:var(--green)">\u2705</span></div>';
    }).join('')+'</div>';

  var REFS = [
    ['D\'Hondt','Ley Electoral RD 275-97, Art. 68 \u2014 umbral 2%'],
    ['ENPP','Laakso & Taagepera (1979) Comparative Political Studies 12(1)'],
    ['Competitividad','Jacobson (2004) The Politics of Congressional Elections, 6th ed.'],
    ['Swing/Elasticidad','Gelman & King (1994) AJPS 38(2)'],
    ['Incumbencia','Erikson & Wlezien (2012) The Timeline of Presidential Elections'],
    ['Proyecci\u00f3n','Abramowitz (2008) PS: Political Science & Politics 41(4)'],
    ['Mean reversion','Silver (2020) FiveThirtyEight presidential model documentation'],
    ['Encuestas','Silver (2014) FiveThirtyEight pollster ratings methodology'],
    ['Movilizaci\u00f3n','Leighley & Nagler (2013) Who Votes Now? Princeton UP'],
    ['CAGR','F\u00f3rmula est\u00e1ndar: (Vf/Vi)^(1/n) - 1'],
  ];
  document.getElementById('metodologia-refs').innerHTML =
    '<div style="display:flex;flex-direction:column;gap:.32rem;font-size:.76rem">'
    +REFS.map(function(r){
      return '<div style="padding:.28rem 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-weight:700;color:var(--accent)">'+r[0]+':</span> '+r[1]+'</div>';
    }).join('')+'</div>';
}

// ====== BOOT ======
renderDashboard();
renderPresidencial();
renderSenadores();
renderDiputados();
renderPotencial();
renderMovilizacion();
renderRiesgo();
renderMotores();
setTimeout(function(){drawParliament('parl-canvas',M.Curules.getTotalLegislativo(),M.Curules.getSumaCurules());},50);

// ── Listeners para selectores de nivel del HTML (level-btn) ──
function bindLevelBtns(containerId, onChange) {
  var cont = document.getElementById(containerId);
  if (!cont) return;
  cont.addEventListener('click', function(e) {
    var btn = e.target.closest('.level-btn');
    if (!btn) return;
    var nivel = btn.dataset.level || btn.dataset.nivel;
    var partido = btn.dataset.partido;
    if (nivel) {
      cont.querySelectorAll('[data-level],[data-nivel]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      onChange(nivel, null);
    }
    if (partido) {
      cont.querySelectorAll('[data-partido]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      onChange(null, partido);
    }
  });
}

bindLevelBtns('pot-level-bar', function(nivel){ if(nivel){_POT_NIVEL=nivel; renderPotencial();} });
bindLevelBtns('mov-controls', function(nivel, partido){
  if(nivel){ _MOV_NIVEL=nivel; }
  if(partido){ _MOV_PARTIDO=partido; }
  renderMovilizacion();
});
bindLevelBtns('riesgo-controls', function(nivel){ if(nivel){_RIE_NIVEL=nivel; renderRiesgo();} });

})();

