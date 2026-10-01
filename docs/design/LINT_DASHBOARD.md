# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-01T01:35:00.153Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1515 | 1515 | Estável |
| **Arquivos com Débito** | 1119 | 1119 | Monitorado |
| **Total de Violações** | **38552** | **38552** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **7407** | 7407 | PASS |
| **P1 (Bloqueia Merge)** | **18216** | 18216 | PASS |
| **P2 (Fila de Correção)** | 11405 | 11405 | Acompanhamento |
| **P3 (Polimento)** | 1524 | 1524 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 12840 | 2189 | 6714 | 3354 | 583 |
| `routes/workspace` | 9910 | 1980 | 3989 | 3648 | 293 |
| `routes/store` | 7005 | 1248 | 3173 | 2199 | 385 |
| `components/tourism` | 2827 | 446 | 1521 | 785 | 75 |
| `routes/admin` | 2742 | 458 | 1422 | 740 | 122 |
| `services` | 905 | 584 | 239 | 80 | 2 |
| `components/ui` | 900 | 127 | 585 | 157 | 31 |
| `routes/other` | 558 | 78 | 237 | 229 | 14 |
| `components/builder` | 370 | 109 | 139 | 105 | 17 |
| `lib` | 242 | 76 | 105 | 61 | 0 |
| `components/chat` | 133 | 20 | 74 | 37 | 2 |
| `styles` | 68 | 62 | 0 | 6 | 0 |
| `hooks` | 27 | 13 | 10 | 4 | 0 |
| `routes/api` | 21 | 15 | 6 | 0 | 0 |
| `core` | 4 | 2 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-09** | Diretriz do Catálogo | `P2` | 9918 |
| **DL-03** | Diretriz do Catálogo | `P1` | 9226 |
| **DL-02** | Diretriz do Catálogo | `P1` | 5872 |
| **DL-15** | Diretriz do Catálogo | `P0` | 5595 |
| **DL-04** | Diretriz do Catálogo | `P0` | 1812 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1338 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1261 |
| **DL-01** | Diretriz do Catálogo | `P1` | 917 |
| **DL-23** | Diretriz do Catálogo | `P2` | 544 |
| **DL-07** | Diretriz do Catálogo | `P2` | 521 |
| **DL-14** | Diretriz do Catálogo | `P1` | 331 |
| **DL-28** | Diretriz do Catálogo | `P1` | 314 |
| **DL-30** | Diretriz do Catálogo | `P3` | 263 |
| **DL-05** | Diretriz do Catálogo | `P1` | 141 |
| **DL-29** | Diretriz do Catálogo | `P2` | 132 |
| **DL-08** | Diretriz do Catálogo | `P2` | 130 |
| **DL-26** | Diretriz do Catálogo | `P2` | 118 |
| **DL-12** | Diretriz do Catálogo | `P1` | 39 |
| **DL-25** | Diretriz do Catálogo | `P2` | 33 |
| **DL-11** | Diretriz do Catálogo | `P1` | 26 |
| **DL-13** | Diretriz do Catálogo | `P1` | 12 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-19** | Diretriz do Catálogo | `P2` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

