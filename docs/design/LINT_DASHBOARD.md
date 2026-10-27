# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-27T20:41:10.042Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2480 | 2354 | Estável |
| **Arquivos com Débito** | 828 | 804 | Monitorado |
| **Total de Violações** | **5587** | **5608** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **29** | 0 | FAIL |
| **P1 (Bloqueia Merge)** | **4115** | 3913 | FAIL |
| **P2 (Fila de Correção)** | 1080 | 1439 | Acompanhamento |
| **P3 (Polimento)** | 363 | 256 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 2379 | 22 | 1652 | 551 | 154 |
| `routes/workspace` | 1116 | 0 | 960 | 86 | 70 |
| `routes/store` | 606 | 6 | 404 | 140 | 56 |
| `components/tourism` | 440 | 0 | 335 | 97 | 8 |
| `routes/admin` | 342 | 0 | 243 | 51 | 48 |
| `components/ui` | 208 | 1 | 172 | 19 | 16 |
| `services` | 206 | 0 | 144 | 61 | 1 |
| `lib` | 118 | 0 | 82 | 36 | 0 |
| `routes/other` | 63 | 0 | 45 | 17 | 1 |
| `core` | 32 | 0 | 32 | 0 | 0 |
| `components/chat` | 27 | 0 | 17 | 4 | 6 |
| `components/builder` | 24 | 0 | 16 | 5 | 3 |
| `hooks` | 11 | 0 | 7 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-14** | Diretriz do Catálogo | `P1` | 1732 |
| **DL-02** | Diretriz do Catálogo | `P1` | 984 |
| **DL-01** | Diretriz do Catálogo | `P1` | 648 |
| **DL-07** | Diretriz do Catálogo | `P2` | 436 |
| **DL-03** | Diretriz do Catálogo | `P1` | 373 |
| **DL-23** | Diretriz do Catálogo | `P2` | 315 |
| **DL-30** | Diretriz do Catálogo | `P3` | 276 |
| **DL-18** | Diretriz do Catálogo | `P1` | 206 |
| **DL-29** | Diretriz do Catálogo | `P2` | 117 |
| **DL-08** | Diretriz do Catálogo | `P2` | 105 |
| **DL-05** | Diretriz do Catálogo | `P1` | 104 |
| **DL-27** | Diretriz do Catálogo | `P3` | 87 |
| **DL-26** | Diretriz do Catálogo | `P2` | 79 |
| **DL-15** | Diretriz do Catálogo | `P0` | 29 |
| **DL-12** | Diretriz do Catálogo | `P1` | 28 |
| **DL-25** | Diretriz do Catálogo | `P2` | 21 |
| **DL-11** | Diretriz do Catálogo | `P1` | 19 |
| **DL-28** | Diretriz do Catálogo | `P1` | 12 |
| **DL-13** | Diretriz do Catálogo | `P1` | 9 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |
| **DL-09** | Diretriz do Catálogo | `P2` | 2 |

