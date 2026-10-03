# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-03T16:12:53.987Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1811 | 1811 | Estável |
| **Arquivos com Débito** | 1106 | 1106 | Monitorado |
| **Total de Violações** | **18727** | **18727** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **7295** | 7295 | PASS |
| **P1 (Bloqueia Merge)** | **8475** | 8475 | PASS |
| **P2 (Fila de Correção)** | 1462 | 1462 | Acompanhamento |
| **P3 (Polimento)** | 1495 | 1495 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 7039 | 2258 | 3541 | 652 | 588 |
| `routes/store` | 3231 | 1224 | 1397 | 249 | 361 |
| `routes/workspace` | 3119 | 1877 | 835 | 119 | 288 |
| `components/tourism` | 1622 | 446 | 910 | 191 | 75 |
| `routes/admin` | 1292 | 456 | 659 | 54 | 123 |
| `services` | 906 | 589 | 237 | 78 | 2 |
| `components/ui` | 629 | 126 | 465 | 7 | 31 |
| `lib` | 369 | 90 | 219 | 60 | 0 |
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
| **DL-15** | Diretriz do Catálogo | `P0` | 5530 |
| **DL-02** | Diretriz do Catálogo | `P1` | 5206 |
| **DL-04** | Diretriz do Catálogo | `P0` | 1765 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1331 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1230 |
| **DL-01** | Diretriz do Catálogo | `P1` | 1014 |
| **DL-23** | Diretriz do Catálogo | `P2` | 526 |
| **DL-07** | Diretriz do Catálogo | `P2` | 507 |
| **DL-14** | Diretriz do Catálogo | `P1` | 314 |
| **DL-28** | Diretriz do Catálogo | `P1` | 312 |
| **DL-30** | Diretriz do Catálogo | `P3` | 265 |
| **DL-05** | Diretriz do Catálogo | `P1` | 138 |
| **DL-29** | Diretriz do Catálogo | `P2` | 131 |
| **DL-08** | Diretriz do Catálogo | `P2` | 128 |
| **DL-26** | Diretriz do Catálogo | `P2` | 116 |
| **DL-03** | Diretriz do Catálogo | `P1` | 84 |
| **DL-12** | Diretriz do Catálogo | `P1` | 39 |
| **DL-25** | Diretriz do Catálogo | `P2` | 33 |
| **DL-11** | Diretriz do Catálogo | `P1` | 25 |
| **DL-09** | Diretriz do Catálogo | `P2` | 12 |
| **DL-13** | Diretriz do Catálogo | `P1` | 12 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-19** | Diretriz do Catálogo | `P2` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

