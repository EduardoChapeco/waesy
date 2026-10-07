# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-07T17:42:24.352Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1933 | 1854 | Estável |
| **Arquivos com Débito** | 859 | 879 | Monitorado |
| **Total de Violações** | **13754** | **14292** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1524** | 1558 | PASS |
| **P1 (Bloqueia Merge)** | **9584** | 10033 | PASS |
| **P2 (Fila de Correção)** | 1307 | 1333 | Acompanhamento |
| **P3 (Polimento)** | 1339 | 1368 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 6078 | 635 | 4251 | 624 | 568 |
| `routes/workspace` | 2361 | 451 | 1520 | 114 | 276 |
| `routes/store` | 1688 | 161 | 1126 | 157 | 244 |
| `components/tourism` | 1354 | 94 | 1000 | 190 | 70 |
| `routes/admin` | 1045 | 93 | 778 | 51 | 123 |
| `services` | 317 | 0 | 237 | 78 | 2 |
| `components/ui` | 277 | 23 | 218 | 7 | 29 |
| `lib` | 256 | 1 | 219 | 36 | 0 |
| `routes/other` | 162 | 15 | 120 | 18 | 9 |
| `components/builder` | 136 | 42 | 58 | 19 | 17 |
| `components/chat` | 46 | 4 | 41 | 0 | 1 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 4549 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2217 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1521 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1227 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1100 |
| **DL-01** | Diretriz do Catálogo | `P1` | 981 |
| **DL-07** | Diretriz do Catálogo | `P2` | 483 |
| **DL-23** | Diretriz do Catálogo | `P2` | 467 |
| **DL-28** | Diretriz do Catálogo | `P1` | 290 |
| **DL-30** | Diretriz do Catálogo | `P3` | 239 |
| **DL-05** | Diretriz do Catálogo | `P1` | 134 |
| **DL-03** | Diretriz do Catálogo | `P1` | 120 |
| **DL-29** | Diretriz do Catálogo | `P2` | 119 |
| **DL-08** | Diretriz do Catálogo | `P2` | 114 |
| **DL-26** | Diretriz do Catálogo | `P2` | 87 |
| **DL-12** | Diretriz do Catálogo | `P1` | 34 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-09** | Diretriz do Catálogo | `P2` | 8 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

