# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-23T02:11:46.032Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2237 | 2237 | Estável |
| **Arquivos com Débito** | 891 | 891 | Monitorado |
| **Total de Violações** | **12285** | **12307** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1357** | 1359 | PASS |
| **P1 (Bloqueia Merge)** | **8339** | 8350 | PASS |
| **P2 (Fila de Correção)** | 1314 | 1319 | Acompanhamento |
| **P3 (Polimento)** | 1275 | 1279 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5573 | 559 | 3779 | 688 | 547 |
| `routes/workspace` | 2125 | 424 | 1315 | 110 | 276 |
| `routes/store` | 1418 | 113 | 922 | 175 | 208 |
| `components/tourism` | 1034 | 76 | 769 | 129 | 60 |
| `routes/admin` | 1002 | 86 | 748 | 50 | 118 |
| `components/ui` | 310 | 38 | 219 | 14 | 39 |
| `lib` | 254 | 1 | 218 | 35 | 0 |
| `services` | 210 | 0 | 145 | 63 | 2 |
| `routes/other` | 124 | 11 | 91 | 16 | 6 |
| `components/builder` | 120 | 40 | 47 | 19 | 14 |
| `components/chat` | 81 | 4 | 70 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3389 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2018 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1354 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1148 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1009 |
| **DL-01** | Diretriz do Catálogo | `P1` | 875 |
| **DL-07** | Diretriz do Catálogo | `P2` | 479 |
| **DL-03** | Diretriz do Catálogo | `P1` | 437 |
| **DL-23** | Diretriz do Catálogo | `P2` | 355 |
| **DL-28** | Diretriz do Catálogo | `P1` | 280 |
| **DL-30** | Diretriz do Catálogo | `P3` | 266 |
| **DL-09** | Diretriz do Catálogo | `P2` | 141 |
| **DL-05** | Diretriz do Catálogo | `P1` | 130 |
| **DL-29** | Diretriz do Catálogo | `P2` | 119 |
| **DL-08** | Diretriz do Catálogo | `P2` | 106 |
| **DL-26** | Diretriz do Catálogo | `P2` | 84 |
| **DL-12** | Diretriz do Catálogo | `P1` | 29 |
| **DL-25** | Diretriz do Catálogo | `P2` | 25 |
| **DL-11** | Diretriz do Catálogo | `P1` | 22 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

