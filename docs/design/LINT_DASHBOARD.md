# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-19T11:08:59.333Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2169 | 2118 | Estável |
| **Arquivos com Débito** | 878 | 884 | Monitorado |
| **Total de Violações** | **12306** | **12651** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1423** | 1453 | PASS |
| **P1 (Bloqueia Merge)** | **8289** | 8554 | PASS |
| **P2 (Fila de Correção)** | 1298 | 1339 | Acompanhamento |
| **P3 (Polimento)** | 1296 | 1305 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5328 | 566 | 3575 | 651 | 536 |
| `routes/workspace` | 2200 | 441 | 1377 | 111 | 271 |
| `routes/store` | 1493 | 135 | 987 | 140 | 231 |
| `components/tourism` | 1135 | 95 | 791 | 178 | 71 |
| `routes/admin` | 998 | 86 | 744 | 50 | 118 |
| `components/ui` | 310 | 38 | 219 | 14 | 39 |
| `lib` | 254 | 1 | 218 | 35 | 0 |
| `services` | 211 | 0 | 137 | 72 | 2 |
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
| **DL-02** | Diretriz do Catálogo | `P1` | 3468 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2083 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1420 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1150 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1042 |
| **DL-01** | Diretriz do Catálogo | `P1` | 887 |
| **DL-07** | Diretriz do Catálogo | `P2` | 487 |
| **DL-23** | Diretriz do Catálogo | `P2` | 418 |
| **DL-28** | Diretriz do Catálogo | `P1` | 287 |
| **DL-30** | Diretriz do Catálogo | `P3` | 254 |
| **DL-03** | Diretriz do Catálogo | `P1` | 218 |
| **DL-05** | Diretriz do Catálogo | `P1` | 133 |
| **DL-29** | Diretriz do Catálogo | `P2` | 117 |
| **DL-08** | Diretriz do Catálogo | `P2` | 101 |
| **DL-26** | Diretriz do Catálogo | `P2` | 85 |
| **DL-09** | Diretriz do Catálogo | `P2` | 62 |
| **DL-12** | Diretriz do Catálogo | `P1` | 31 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

