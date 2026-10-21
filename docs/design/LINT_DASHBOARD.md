# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-21T01:13:42.762Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2195 | 2195 | Estável |
| **Arquivos com Débito** | 883 | 883 | Monitorado |
| **Total de Violações** | **12414** | **12414** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1396** | 1396 | PASS |
| **P1 (Bloqueia Merge)** | **8455** | 8455 | PASS |
| **P2 (Fila de Correção)** | 1270 | 1270 | Acompanhamento |
| **P3 (Polimento)** | 1293 | 1293 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5480 | 558 | 3701 | 675 | 546 |
| `routes/workspace` | 2218 | 444 | 1390 | 109 | 275 |
| `routes/store` | 1524 | 132 | 1028 | 139 | 225 |
| `components/tourism` | 1037 | 76 | 772 | 129 | 60 |
| `routes/admin` | 1002 | 86 | 748 | 50 | 118 |
| `components/ui` | 310 | 38 | 219 | 14 | 39 |
| `lib` | 254 | 1 | 218 | 35 | 0 |
| `services` | 212 | 0 | 138 | 72 | 2 |
| `routes/other` | 136 | 10 | 105 | 15 | 6 |
| `components/builder` | 126 | 42 | 50 | 17 | 17 |
| `components/chat` | 81 | 4 | 70 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3442 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2108 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1393 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1155 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1036 |
| **DL-01** | Diretriz do Catálogo | `P1` | 879 |
| **DL-07** | Diretriz do Catálogo | `P2` | 485 |
| **DL-03** | Diretriz do Catálogo | `P1` | 392 |
| **DL-23** | Diretriz do Catálogo | `P2` | 363 |
| **DL-28** | Diretriz do Catálogo | `P1` | 283 |
| **DL-30** | Diretriz do Catálogo | `P3` | 257 |
| **DL-05** | Diretriz do Catálogo | `P1` | 134 |
| **DL-29** | Diretriz do Catálogo | `P2` | 114 |
| **DL-08** | Diretriz do Catálogo | `P2` | 102 |
| **DL-09** | Diretriz do Catálogo | `P2` | 90 |
| **DL-26** | Diretriz do Catálogo | `P2` | 86 |
| **DL-12** | Diretriz do Catálogo | `P1` | 30 |
| **DL-25** | Diretriz do Catálogo | `P2` | 25 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

