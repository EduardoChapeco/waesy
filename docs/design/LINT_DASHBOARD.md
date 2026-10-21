# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-21T20:31:17.449Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2285 | 2285 | Estável |
| **Arquivos com Débito** | 900 | 900 | Monitorado |
| **Total de Violações** | **12233** | **12233** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1341** | 1341 | PASS |
| **P1 (Bloqueia Merge)** | **8292** | 8292 | PASS |
| **P2 (Fila de Correção)** | 1338 | 1338 | Acompanhamento |
| **P3 (Polimento)** | 1262 | 1262 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5430 | 559 | 3690 | 641 | 540 |
| `routes/workspace` | 2113 | 422 | 1314 | 107 | 270 |
| `routes/store` | 1447 | 112 | 938 | 188 | 209 |
| `routes/admin` | 1002 | 86 | 748 | 50 | 118 |
| `components/tourism` | 966 | 61 | 733 | 127 | 45 |
| `components/ui` | 326 | 38 | 233 | 15 | 40 |
| `lib` | 254 | 1 | 218 | 35 | 0 |
| `services` | 210 | 0 | 145 | 63 | 2 |
| `components/chat` | 197 | 4 | 116 | 62 | 15 |
| `components/builder` | 130 | 42 | 50 | 21 | 17 |
| `routes/other` | 124 | 11 | 91 | 16 | 6 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3341 |
| **DL-14** | Diretriz do Catálogo | `P1` | 1995 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1338 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1144 |
| **DL-27** | Diretriz do Catálogo | `P3` | 996 |
| **DL-01** | Diretriz do Catálogo | `P1` | 864 |
| **DL-03** | Diretriz do Catálogo | `P1` | 477 |
| **DL-07** | Diretriz do Catálogo | `P2` | 467 |
| **DL-23** | Diretriz do Catálogo | `P2` | 358 |
| **DL-28** | Diretriz do Catálogo | `P1` | 278 |
| **DL-30** | Diretriz do Catálogo | `P3` | 266 |
| **DL-09** | Diretriz do Catálogo | `P2` | 183 |
| **DL-05** | Diretriz do Catálogo | `P1` | 131 |
| **DL-29** | Diretriz do Catálogo | `P2` | 115 |
| **DL-08** | Diretriz do Catálogo | `P2` | 103 |
| **DL-26** | Diretriz do Catálogo | `P2` | 86 |
| **DL-12** | Diretriz do Catálogo | `P1` | 30 |
| **DL-25** | Diretriz do Catálogo | `P2` | 21 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

