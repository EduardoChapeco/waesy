# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-14T16:54:47.037Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2074 | 2074 | Estável |
| **Arquivos com Débito** | 888 | 889 | Monitorado |
| **Total de Violações** | **13062** | **13063** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1505** | 1505 | PASS |
| **P1 (Bloqueia Merge)** | **8816** | 8816 | PASS |
| **P2 (Fila de Correção)** | 1379 | 1380 | Acompanhamento |
| **P3 (Polimento)** | 1362 | 1362 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5828 | 620 | 3924 | 707 | 577 |
| `routes/workspace` | 2251 | 453 | 1398 | 124 | 276 |
| `routes/store` | 1567 | 142 | 1036 | 146 | 243 |
| `components/tourism` | 1135 | 95 | 791 | 178 | 71 |
| `routes/admin` | 1038 | 90 | 777 | 51 | 120 |
| `components/ui` | 313 | 38 | 219 | 14 | 42 |
| `services` | 258 | 0 | 184 | 72 | 2 |
| `lib` | 255 | 1 | 219 | 35 | 0 |
| `routes/other` | 162 | 15 | 120 | 18 | 9 |
| `components/builder` | 135 | 42 | 57 | 19 | 17 |
| `components/chat` | 86 | 4 | 75 | 2 | 5 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 3739 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2162 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1502 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1253 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1107 |
| **DL-01** | Diretriz do Catálogo | `P1` | 941 |
| **DL-07** | Diretriz do Catálogo | `P2` | 517 |
| **DL-23** | Diretriz do Catálogo | `P2` | 431 |
| **DL-28** | Diretriz do Catálogo | `P1` | 291 |
| **DL-30** | Diretriz do Catálogo | `P3` | 255 |
| **DL-03** | Diretriz do Catálogo | `P1` | 231 |
| **DL-05** | Diretriz do Catálogo | `P1` | 135 |
| **DL-29** | Diretriz do Catálogo | `P2` | 121 |
| **DL-08** | Diretriz do Catálogo | `P2` | 116 |
| **DL-26** | Diretriz do Catálogo | `P2` | 90 |
| **DL-09** | Diretriz do Catálogo | `P2` | 76 |
| **DL-12** | Diretriz do Catálogo | `P1` | 32 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

