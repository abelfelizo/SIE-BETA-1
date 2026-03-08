# SIE 2028 — CHANGELOG

## v8.4 — 2026-03-08 (ACTUAL)

### Motores añadidos
- **MotorEncuestas** — Exponential decay weighting `e^(−λt) × calidad × √n` (Silver/FiveThirtyEight)
- **MotorPotencial** — Score ofensivo/defensivo (Jacobson 2004, Taagepera-Shugart)
- **MotorMovilizacion** — Turnout gap + votos necesarios `⌈Δvotos/2⌉+1` (Leighley & Nagler 2013)
- **MotorRiesgo** — Composite: margen(50%) + participación(25%) + ENPP(25%)
- **MotorCrecimientoPadron** — CAGR `(Vf/Vi)^(1/n)-1` JCE 2016-2024
- **MotorProyeccion** — Fundamentals + incumbencia + regresión a la media Silver 15%

### Bugs resueltos
- Fix surrogate pairs Python (UTF-8 build pipeline)
- Fix `D\u2019Hondt` apostrophe en D'Hondt

### Validaciones
- 21/21 checks OK vs. JCE oficial
- Padrón oficial JCE: 8,145,548
- Votos presidencial: 4,429,079
- Participación: 54.37%

---

## v8.3 — 2026-03-07

### Motores activos
- MotorCarga, MotorValidacion, MotorPadron, MotorResultados
- MotorTerritorial, MotorAlianzas, MotorCurules, MotorKPIs
- MotorReplay, MotorEscenarios

### Datos
- Dataset 2024 completo activado
- D'Hondt con umbral 2% (Ley 275-97, Art. 68)
- ENPP Laakso-Taagepera (1979)
