# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-09T10:47:25.481Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1988 | 1988 | Estável |
| **Arquivos com Débito** | 860 | 860 | Monitorado |
| **Total de Violações** | **13696** | **13696** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1524** | 1524 | PASS |
| **P1 (Bloqueia Merge)** | **9560** | 9560 | PASS |
| **P2 (Fila de Correção)** | 1277 | 1277 | Acompanhamento |
| **P3 (Polimento)** | 1335 | 1335 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 6082 | 635 | 4259 | 620 | 568 |
| `routes/workspace` | 2364 | 451 | 1523 | 114 | 276 |
| `routes/store` | 1693 | 162 | 1143 | 145 | 243 |
| `components/tourism` | 1350 | 96 | 1001 | 183 | 70 |
| `routes/admin` | 1040 | 90 | 779 | 51 | 120 |
| `components/ui` | 277 | 23 | 218 | 7 | 29 |
| `services` | 258 | 0 | 184 | 72 | 2 |
| `lib` | 255 | 1 | 219 | 35 | 0 |
| `routes/other` | 163 | 15 | 121 | 18 | 9 |
| `components/builder` | 135 | 42 | 57 | 19 | 17 |
| `components/chat` | 45 | 4 | 40 | 0 | 1 |
| `hooks` | 17 | 5 | 8 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 4579 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2215 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1521 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1226 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1097 |
| **DL-01** | Diretriz do Catálogo | `P1` | 917 |
| **DL-07** | Diretriz do Catálogo | `P2` | 485 |
| **DL-23** | Diretriz do Catálogo | `P2` | 435 |
| **DL-28** | Diretriz do Catálogo | `P1` | 292 |
| **DL-30** | Diretriz do Catálogo | `P3` | 238 |
| **DL-05** | Diretriz do Catálogo | `P1` | 134 |
| **DL-03** | Diretriz do Catálogo | `P1` | 131 |
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

