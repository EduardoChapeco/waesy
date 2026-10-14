# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-14T11:45:26.481Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2016 | 2012 | Estável |
| **Arquivos com Débito** | 872 | 876 | Monitorado |
| **Total de Violações** | **13783** | **13974** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1503** | 1531 | PASS |
| **P1 (Bloqueia Merge)** | **9559** | 9708 | PASS |
| **P2 (Fila de Correção)** | 1372 | 1374 | Acompanhamento |
| **P3 (Polimento)** | 1349 | 1361 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 6231 | 626 | 4317 | 712 | 576 |
| `routes/workspace` | 2364 | 451 | 1523 | 114 | 276 |
| `routes/store` | 1581 | 150 | 1042 | 146 | 243 |
| `components/tourism` | 1357 | 96 | 1006 | 183 | 72 |
| `routes/admin` | 1040 | 90 | 779 | 51 | 120 |
| `components/ui` | 279 | 23 | 220 | 7 | 29 |
| `services` | 258 | 0 | 184 | 72 | 2 |
| `lib` | 255 | 1 | 219 | 35 | 0 |
| `routes/other` | 163 | 15 | 121 | 18 | 9 |
| `components/builder` | 135 | 42 | 57 | 19 | 17 |
| `components/chat` | 86 | 4 | 75 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 4422 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2217 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1500 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1255 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1105 |
| **DL-01** | Diretriz do Catálogo | `P1` | 950 |
| **DL-07** | Diretriz do Catálogo | `P2` | 515 |
| **DL-23** | Diretriz do Catálogo | `P2` | 441 |
| **DL-28** | Diretriz do Catálogo | `P1` | 291 |
| **DL-30** | Diretriz do Catálogo | `P3` | 244 |
| **DL-03** | Diretriz do Catálogo | `P1` | 226 |
| **DL-05** | Diretriz do Catálogo | `P1` | 134 |
| **DL-29** | Diretriz do Catálogo | `P2` | 118 |
| **DL-08** | Diretriz do Catálogo | `P2` | 115 |
| **DL-26** | Diretriz do Catálogo | `P2` | 90 |
| **DL-09** | Diretriz do Catálogo | `P2` | 64 |
| **DL-12** | Diretriz do Catálogo | `P1` | 32 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

