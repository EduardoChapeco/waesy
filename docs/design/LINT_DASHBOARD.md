# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-21T05:42:30.046Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2232 | 2232 | Estável |
| **Arquivos com Débito** | 892 | 892 | Monitorado |
| **Total de Violações** | **12324** | **12327** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1371** | 1373 | PASS |
| **P1 (Bloqueia Merge)** | **8403** | 8404 | PASS |
| **P2 (Fila de Correção)** | 1273 | 1273 | Acompanhamento |
| **P3 (Polimento)** | 1277 | 1277 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5598 | 560 | 3796 | 692 | 550 |
| `routes/workspace` | 2143 | 432 | 1330 | 106 | 275 |
| `routes/store` | 1398 | 116 | 945 | 132 | 205 |
| `components/tourism` | 1037 | 76 | 772 | 129 | 60 |
| `routes/admin` | 1002 | 86 | 748 | 50 | 118 |
| `components/ui` | 310 | 38 | 219 | 14 | 39 |
| `lib` | 254 | 1 | 218 | 35 | 0 |
| `services` | 210 | 0 | 145 | 63 | 2 |
| `components/builder` | 131 | 42 | 51 | 21 | 17 |
| `routes/other` | 126 | 11 | 93 | 16 | 6 |
| `components/chat` | 81 | 4 | 70 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3404 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2055 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1368 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1157 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1018 |
| **DL-01** | Diretriz do Catálogo | `P1` | 875 |
| **DL-07** | Diretriz do Catálogo | `P2` | 480 |
| **DL-03** | Diretriz do Catálogo | `P1` | 437 |
| **DL-23** | Diretriz do Catálogo | `P2` | 355 |
| **DL-28** | Diretriz do Catálogo | `P1` | 283 |
| **DL-30** | Diretriz do Catálogo | `P3` | 259 |
| **DL-05** | Diretriz do Catálogo | `P1` | 130 |
| **DL-29** | Diretriz do Catálogo | `P2` | 118 |
| **DL-08** | Diretriz do Catálogo | `P2` | 107 |
| **DL-09** | Diretriz do Catálogo | `P2` | 97 |
| **DL-26** | Diretriz do Catálogo | `P2` | 85 |
| **DL-12** | Diretriz do Catálogo | `P1` | 29 |
| **DL-25** | Diretriz do Catálogo | `P2` | 26 |
| **DL-11** | Diretriz do Catálogo | `P1` | 22 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

