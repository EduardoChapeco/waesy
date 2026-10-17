# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-17T21:38:04.500Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2134 | 2118 | Estável |
| **Arquivos com Débito** | 881 | 884 | Monitorado |
| **Total de Violações** | **12584** | **12651** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1448** | 1453 | PASS |
| **P1 (Bloqueia Merge)** | **8502** | 8554 | PASS |
| **P2 (Fila de Correção)** | 1336 | 1339 | Acompanhamento |
| **P3 (Polimento)** | 1298 | 1305 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5469 | 575 | 3682 | 673 | 539 |
| `routes/workspace` | 2243 | 453 | 1392 | 124 | 274 |
| `routes/store` | 1504 | 135 | 1002 | 140 | 227 |
| `components/tourism` | 1135 | 95 | 791 | 178 | 71 |
| `routes/admin` | 1024 | 90 | 765 | 51 | 118 |
| `components/ui` | 310 | 38 | 219 | 14 | 39 |
| `services` | 258 | 0 | 184 | 72 | 2 |
| `lib` | 255 | 1 | 219 | 35 | 0 |
| `routes/other` | 136 | 10 | 105 | 15 | 6 |
| `components/builder` | 135 | 42 | 57 | 19 | 17 |
| `components/chat` | 81 | 4 | 70 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3570 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2126 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1445 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1164 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1045 |
| **DL-01** | Diretriz do Catálogo | `P1` | 939 |
| **DL-07** | Diretriz do Catálogo | `P2` | 503 |
| **DL-23** | Diretriz do Catálogo | `P2` | 421 |
| **DL-28** | Diretriz do Catálogo | `P1` | 286 |
| **DL-30** | Diretriz do Catálogo | `P3` | 253 |
| **DL-03** | Diretriz do Catálogo | `P1` | 219 |
| **DL-05** | Diretriz do Catálogo | `P1` | 135 |
| **DL-29** | Diretriz do Catálogo | `P2` | 118 |
| **DL-08** | Diretriz do Catálogo | `P2` | 104 |
| **DL-26** | Diretriz do Catálogo | `P2` | 85 |
| **DL-09** | Diretriz do Catálogo | `P2` | 77 |
| **DL-12** | Diretriz do Catálogo | `P1` | 31 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

