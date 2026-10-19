# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-19T21:40:57.705Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2174 | 2174 | Estável |
| **Arquivos com Débito** | 886 | 886 | Monitorado |
| **Total de Violações** | **12624** | **12624** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1426** | 1426 | PASS |
| **P1 (Bloqueia Merge)** | **8554** | 8554 | PASS |
| **P2 (Fila de Correção)** | 1331 | 1331 | Acompanhamento |
| **P3 (Polimento)** | 1313 | 1313 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 5547 | 565 | 3755 | 681 | 546 |
| `routes/workspace` | 2230 | 445 | 1398 | 110 | 277 |
| `routes/store` | 1527 | 134 | 1020 | 142 | 231 |
| `components/tourism` | 1169 | 96 | 821 | 180 | 72 |
| `routes/admin` | 999 | 86 | 745 | 50 | 118 |
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
| **DL-02** | Diretriz do Catálogo | `P1` | 3480 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2134 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1423 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1169 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1056 |
| **DL-01** | Diretriz do Catálogo | `P1` | 888 |
| **DL-07** | Diretriz do Catálogo | `P2` | 495 |
| **DL-23** | Diretriz do Catálogo | `P2` | 405 |
| **DL-03** | Diretriz do Catálogo | `P1` | 400 |
| **DL-28** | Diretriz do Catálogo | `P1` | 287 |
| **DL-30** | Diretriz do Catálogo | `P3` | 257 |
| **DL-05** | Diretriz do Catálogo | `P1` | 134 |
| **DL-29** | Diretriz do Catálogo | `P2` | 120 |
| **DL-08** | Diretriz do Catálogo | `P2` | 104 |
| **DL-09** | Diretriz do Catálogo | `P2` | 90 |
| **DL-26** | Diretriz do Catálogo | `P2` | 86 |
| **DL-12** | Diretriz do Catálogo | `P1` | 30 |
| **DL-25** | Diretriz do Catálogo | `P2` | 26 |
| **DL-11** | Diretriz do Catálogo | `P1` | 21 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

