# SIE 2028 — HANDOFF v8.4
**Sistema de Inteligencia Electoral — República Dominicana**
Fecha: 2026-03-08 | Dataset activo: 2024 | Build: 21/21 validaciones OK

---

## 1. PRODUCTO ENTREGADO

### Archivo principal (uso inmediato)
| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `SIE-2028-v84.html` | ~383KB | App standalone completa — abrir en browser, sin servidor |

### Proyecto modular (para desarrollo)
| Archivo | Descripción |
|---------|-------------|
| `engine_v2.js` | 16 motores core v8.4 (40KB) |
| `index.html` | Entry point modular |
| `data/*.json` | Datasets JCE 2024 |

---

## 2. MOTORES ACTIVOS (16)

| Motor | Metodología |
|-------|-------------|
| MotorCarga | Validación de schema |
| MotorValidacion | MIT Election Data Lab — 7 reglas |
| MotorPadron | Leighley & Nagler (2013) |
| MotorResultados | Golder (2006) — agregación bloques |
| MotorTerritorial | Catálogo JCE provincias/municipios |
| MotorAlianzas | Golder (2006) — fuerza coalición |
| MotorCurules | D'Hondt umbral 2% (Ley 275-97, Art. 68) |
| MotorKPIs | ENPP Laakso-Taagepera (1979) |
| MotorReplay | 10 checkpoints vs. JCE oficial |
| MotorEscenarios | D'Hondt multivariable |
| MotorProyeccion | Abramowitz (2008) + Erikson & Wlezien (2012) + Silver 15% |
| MotorCrecimientoPadron | CAGR (Vf/Vi)^(1/n)-1 |
| MotorEncuestas | Exponential decay e^(−λt) × calidad × √n |
| MotorPotencial | Jacobson (2004) + Taagepera-Shugart |
| MotorMovilizacion | Leighley & Nagler (2013) |
| MotorRiesgo | Jacobson (2004) + Gelman & King (1994) |

**Stubs inactivos (pendiente datos):** `MotorMunicipal`, `MotorHistorico2020`

---

## 3. DATOS VALIDADOS

| Métrica | Valor | Fuente |
|---------|-------|--------|
| Padrón JCE (con exterior) | 8,145,548 | JCE 2024 |
| Padrón doméstico | 7,281,763 | JCE 2024 |
| Votos presidencial | 4,429,079 | JCE 2024 |
| Participación oficial | 54.37% | JCE 2024 |
| Curules totales | 222 | JCE 2024 |

### Resultados presidenciales 2024
| Partido | % | Curules legislativo |
|---------|---|---------------------|
| PRM | 57.44% | 179 |
| FP | 28.85% | 28 |
| PLD | 10.39% | 13 |

---

## 4. VISTAS DISPONIBLES

`dashboard` · `presidencial` · `senadores` · `diputados` · `potencial` · `movilizacion` · `riesgo` · `simulador` · `proyeccion` · `replay` · `motores`

---

## 5. PENDIENTES / PRÓXIMA VERSIÓN (v8.5)

### Motor anti-exponencial para partidos nuevos
El `MotorProyeccion` actual tiene regresión a la media (Silver 15%) pero **no tiene blindaje logístico para partidos nuevos (FP)**. Se recomienda implementar:

```javascript
// Variables necesarias en BASE_2024
FP: {
  votos_pct: 28.85,
  voto_base: 0,          // Primera elección
  edad_partido: 1,       // Ciclos electorales
  es_partido_nuevo: true
}

// Función de normalización a agregar
function coeficienteNormalizacion(edad_partido) {
  // Curva logística: satura el crecimiento para partidos nuevos
  return 1 / (1 + Math.exp(-0.8 * (edad_partido - 2)));
}

// Aplicar en proyectar()
const growth_adjusted = (voto_actual - voto_base) * coeficienteNormalizacion(edad_partido);
```

### Otros pendientes
- `MotorMunicipal` — activar con datos municipales 2024
- `MotorHistorico2020` — comparativa 2020 vs 2024
- Exportación PDF por provincia

---

## 6. ARQUITECTURA

```
SIE-2028-v84.html          ← Standalone (sin deps externas)
├── engine_v2.js embedded  ← 16 motores
├── data/*.json embedded   ← Datasets JCE
└── UI (vanilla JS + CSS)  ← Sin frameworks

Para desarrollo modular:
engine_v2.js               ← Motores separados
data/                      ← Datasets externos
index.html                 ← Entry point con fetch()
```

---

*SIE 2028 · Build v8.4 · 21/21 validaciones OK · JCE RD 2024*
