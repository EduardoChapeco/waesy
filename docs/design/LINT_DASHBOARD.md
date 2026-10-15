# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-15T21:23:43.440Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2105 | 2074 | Estável |
| **Arquivos com Débito** | 887 | 889 | Monitorado |
| **Total de Violações** | **12913** | **13063** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1493** | 1505 | PASS |
| **P1 (Bloqueia Merge)** | **8714** | 8816 | PASS |
| **P2 (Fila de Correção)** | 1358 | 1380 | Acompanhamento |
| **P3 (Polimento)** | 1348 | 1362 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5697 | 608 | 3834 | 689 | 566 |
| `routes/workspace` | 2251 | 453 | 1398 | 124 | 276 |
| `routes/store` | 1555 | 142 | 1029 | 143 | 241 |
| `components/tourism` | 1135 | 95 | 791 | 178 | 71 |
| `routes/admin` | 1038 | 90 | 777 | 51 | 120 |
| `components/ui` | 312 | 38 | 219 | 14 | 41 |
| `services` | 258 | 0 | 184 | 72 | 2 |
| `lib` | 255 | 1 | 219 | 35 | 0 |
| `routes/other` | 162 | 15 | 120 | 18 | 9 |
| `components/builder` | 135 | 42 | 57 | 19 | 17 |
| `components/chat` | 81 | 4 | 70 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3690 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2155 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1490 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1231 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1096 |
| **DL-01** | Diretriz do Catálogo | `P1` | 939 |
| **DL-07** | Diretriz do Catálogo | `P2` | 509 |
| **DL-23** | Diretriz do Catálogo | `P2` | 419 |
| **DL-28** | Diretriz do Catálogo | `P1` | 291 |
| **DL-30** | Diretriz do Catálogo | `P3` | 252 |
| **DL-03** | Diretriz do Catálogo | `P1` | 209 |
| **DL-05** | Diretriz do Catálogo | `P1` | 135 |
| **DL-29** | Diretriz do Catálogo | `P2` | 121 |
| **DL-08** | Diretriz do Catálogo | `P2` | 115 |
| **DL-26** | Diretriz do Catálogo | `P2` | 90 |
| **DL-09** | Diretriz do Catálogo | `P2` | 76 |
| **DL-12** | Diretriz do Catálogo | `P1` | 32 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

