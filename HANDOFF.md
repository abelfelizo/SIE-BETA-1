# SIE 2028 — HANDOFF v8.9-pre
## Fecha: 2026-03-08
## Estado: Sesión interrumpida — contexto al límite

---

## RESUMEN EJECUTIVO

Se completó alianzas_2020.json con datos reales JCE (Relación General Definitiva del Cómputo Electoral, 05 julio 2020). El archivo reemplaza los placeholders anteriores con datos exactos de bloques y partidos por nivel.

**Cobertura actual de alianzas_2020.json:**
- Presidencial: COMPLETO (6 bloques nacionales)
- Senadores: COMPLETO (32/32 provincias)
- Diputados exterior: COMPLETO (3/3 circunscripciones)
- Diputados interior: PENDIENTE (faltan PDFs por circunscripción)

---

## ARCHIVOS CRÍTICOS — ESTADO ACTUAL



---

## DATOS JCE RECIBIDOS EN ESTA SESIÓN (YA INTEGRADOS)

### 1. Presidencial 2020 — Nacional
| Bloque | Votos | % |
|--------|-------|---|
| PRM y Aliados | 2,154,866 | 52.51% |
| PLD y Aliados | 1,537,078 | 37.46% |
| PRSC y Aliados (FP dentro) | 365,226 | 8.90% |
| ALPAIS | 39,458 | 0.96% |
| **NOTA CRÍTICA:** FP corrió DENTRO del bloque PRSC en 2020 con 233,538 votos | | |

Totales: 4,103,362 válidos / 4,163,305 emitidos / 7,529,932 inscritos / 55.29% participación

### 2. Senadores — 32 provincias (todos integrados)

Ganadores por bloque:
- PRM (bloque directo): 18 provincias
- PLD (bloque directo): 6 provincias  
- PRSC (bloque, con PRM dentro): 4 provincias → 06 Dajabon, 14 La Vega, 22 H.Mirabal, 29 Stgo.Rodriguez
- FP (bloque, con PRM dentro): 1 provincia → 24 San Cristobal
- DXC (bloque, con PRM dentro): 1 provincia → 28 Santiago
- BIS (bloque, con PRM dentro): 1 provincia → 31 San Jose de Ocoa
- PLR (solo): 1 provincia → 02 La Altagracia

**Casos especiales documentados en alianzas_2020.json con campo nota:**
- 02 La Altagracia: PLR gana solo (28.80%), PRSC incluye PRM (43.77%)
- 05 Barahona: PLD GANA (único caso donde PLD gana con PRM en bloque rival PRSC)
- 09 Elias Piña: PLD gana por mínimo 48.50% vs 47.76%
- 24 San Cristobal: FP encabeza bloque (14,599 FP + 107,254 PRM)
- 25 San Juan: PRM dentro de bloque ALPAIS
- 28 Santiago: DXC encabeza (8,777 DXC + 189,263 PRM)
- 31 San Jose de Ocoa: BIS encabeza (503 BIS + 11,883 PRM)
- 32 Santo Domingo: FP corre bloque propio (39,217 FP, separado del PRM)

### 3. Diputados Exterior — 3 circunscripciones (integradas)
| Circ | Inscritos | PRM% | PLD% | BIS% | PRSC% |
|------|-----------|------|------|------|-------|
| 1 | 366,718 | 56.86% | 18.76% | 7.60% | 6.75% |
| 2 | 118,071 | 54.05% | 21.92% | 9.49% | 5.26% |
| 3 | 111,090 | 52.30% | 23.68% | 16.35% (con FP) | — |

**Nota circ.3:** En exterior circ.3, PRSC incluye FP con 2,688 votos (10.12% del bloque).

---

## PENDIENTE — PRÓXIMA SESIÓN

### PRIORIDAD 1: Diputados interior 2020 (bloqueado por tamaño contexto)
El usuario tiene 2 PDFs de diputados por circunscripción interior que no pudo adjuntar.
- Estructura esperada: datos por circunscripción (≈51 circ. domésticas + DN especial)
- Bloques similares a senadores pero con variaciones locales
- Dónde integrar:  (actualmente )

### PRIORIDAD 2: Recalcular curules_resultado_2020.json con alianzas reales
El archivo actual tiene datos pero puede necesitar ajuste con los bloques correctos.

### PRIORIDAD 3: Release v8.9
Una vez completos los diputados interior, empaquetar release oficial.

### PRIORIDAD 4 (acordada): Alcaldes y directores municipales 2020 y 2024
Segunda interacción acordada con el usuario.

---

## ESTRUCTURA alianzas_2020.json — REFERENCIA RÁPIDA



---

## GLOBALS ACTIVOS EN RUNTIME

### 2024 (15 vars):
, , , , ,
, , , , ,
, , , , 

### 2020 (9 vars):
, , , ,
, , ,
, 

---

## DATOS VERIFICADOS — INVARIANTES

### 2024
| Métrica | Valor |
|---------|-------|
| Padrón total | 8,145,548 |
| Padrón doméstico | 7,281,764 |
| Padrón exterior | 863,784 |
| Participación presidencial | 54.37% |
| PRM con alianzas | 57.44% — 2,507,297 votos |
| FP | 28.85% — 1,259,427 votos |
| PLD | 10.39% — 453,468 votos |
| Curules totales | 222 (Sen:32 + Dip:178 + Nac:5 + Ext:7) |

### 2020
| Métrica | Valor |
|---------|-------|
| Padrón total | 7,529,932 |
| Padrón doméstico | 6,934,053 |
| Padrón exterior | 595,879 |
| Participación presidencial | 55.29% |
| PRM bloque | 2,154,866 (52.51%) |
| PLD bloque | 1,537,078 (37.46%) |
| PRSC bloque (incl. FP) | 365,226 (8.90%) — FP:233,538 |

---

## TRANSCRIPTS DE REFERENCIA
- 
- 
- Ver  para catálogo completo

---

## COMANDO PARA CONTINUAR

Al iniciar nueva sesión, el asistente debe:
1. Leer este HANDOFF
2. Verificar  en disco (99 KB, 32 senadores, 3 circ.exterior)
3. Recibir los 2 PDFs de diputados interior
4. Añadir los datos a 
5. Verificar si  necesita ajustes
6. Empaquetar v8.9

---
*Generado automáticamente — SIE 2028 session handoff*
