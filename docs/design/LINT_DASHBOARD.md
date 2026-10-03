# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-03T11:53:57.952Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1803 | 1803 | Estável |
| **Arquivos com Débito** | 1097 | 1097 | Monitorado |
| **Total de Violações** | **18692** | **18692** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **7262** | 7262 | PASS |
| **P1 (Bloqueia Merge)** | **8495** | 8495 | PASS |
| **P2 (Fila de Correção)** | 1453 | 1453 | Acompanhamento |
| **P3 (Polimento)** | 1482 | 1482 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 7021 | 2244 | 3556 | 641 | 580 |
| `routes/store` | 3222 | 1217 | 1399 | 246 | 360 |
| `routes/workspace` | 3096 | 1870 | 820 | 121 | 285 |
| `components/tourism` | 1622 | 446 | 910 | 191 | 75 |
| `routes/admin` | 1312 | 456 | 677 | 57 | 122 |
| `services` | 902 | 585 | 237 | 78 | 2 |
| `components/ui` | 629 | 126 | 465 | 7 | 31 |
| `lib` | 368 | 89 | 219 | 60 | 0 |
| `routes/other` | 218 | 78 | 113 | 18 | 9 |
| `components/builder` | 191 | 107 | 46 | 21 | 17 |
| `components/chat` | 49 | 13 | 35 | 0 | 1 |
| `hooks` | 28 | 14 | 10 | 4 | 0 |
| `routes/api` | 21 | 15 | 6 | 0 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `core` | 4 | 2 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-15** | Diretriz do Catálogo | `P0` | 5509 |
| **DL-02** | Diretriz do Catálogo | `P1` | 5322 |
| **DL-04** | Diretriz do Catálogo | `P0` | 1753 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1319 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1221 |
| **DL-01** | Diretriz do Catálogo | `P1` | 1014 |
| **DL-23** | Diretriz do Catálogo | `P2` | 529 |
| **DL-07** | Diretriz do Catálogo | `P2` | 501 |
| **DL-28** | Diretriz do Catálogo | `P1` | 312 |
| **DL-14** | Diretriz do Catálogo | `P1` | 310 |
| **DL-30** | Diretriz do Catálogo | `P3` | 261 |
| **DL-05** | Diretriz do Catálogo | `P1` | 138 |
| **DL-29** | Diretriz do Catálogo | `P2` | 130 |
| **DL-08** | Diretriz do Catálogo | `P2` | 127 |
| **DL-26** | Diretriz do Catálogo | `P2` | 116 |
| **DL-12** | Diretriz do Catálogo | `P1` | 39 |
| **DL-25** | Diretriz do Catálogo | `P2` | 33 |
| **DL-11** | Diretriz do Catálogo | `P1` | 25 |
| **DL-13** | Diretriz do Catálogo | `P1` | 12 |
| **DL-09** | Diretriz do Catálogo | `P2` | 8 |
| **DL-03** | Diretriz do Catálogo | `P1` | 4 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-19** | Diretriz do Catálogo | `P2` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

