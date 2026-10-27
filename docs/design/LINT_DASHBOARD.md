# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-27T02:42:48.439Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2383 | 2354 | Estável |
| **Arquivos com Débito** | 827 | 804 | Monitorado |
| **Total de Violações** | **6251** | **5608** | FAIL (Regressão) |
| **P0 (Bloqueia Entrega)** | **12** | 0 | FAIL |
| **P1 (Bloqueia Merge)** | **4201** | 3913 | FAIL |
| **P2 (Fila de Correção)** | 1729 | 1439 | Acompanhamento |
| **P3 (Polimento)** | 309 | 256 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 2589 | 12 | 1535 | 927 | 115 |
| `routes/workspace` | 1197 | 0 | 1016 | 109 | 72 |
| `routes/store` | 602 | 0 | 345 | 215 | 42 |
| `components/tourism` | 481 | 0 | 352 | 126 | 3 |
| `routes/admin` | 330 | 0 | 232 | 50 | 48 |
| `lib` | 269 | 0 | 233 | 36 | 0 |
| `services` | 242 | 0 | 180 | 61 | 1 |
| `components/ui` | 222 | 0 | 172 | 34 | 16 |
| `components/builder` | 113 | 0 | 57 | 51 | 5 |
| `routes/other` | 92 | 0 | 46 | 45 | 1 |
| `components/chat` | 86 | 0 | 18 | 62 | 6 |
| `hooks` | 11 | 0 | 7 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-14** | Diretriz do Catálogo | `P1` | 1802 |
| **DL-02** | Diretriz do Catálogo | `P1` | 1058 |
| **DL-01** | Diretriz do Catálogo | `P1` | 882 |
| **DL-09** | Diretriz do Catálogo | `P2` | 569 |
| **DL-07** | Diretriz do Catálogo | `P2` | 470 |
| **DL-23** | Diretriz do Catálogo | `P2` | 357 |
| **DL-30** | Diretriz do Catálogo | `P3` | 270 |
| **DL-03** | Diretriz do Catálogo | `P1` | 233 |
| **DL-05** | Diretriz do Catálogo | `P1` | 129 |
| **DL-29** | Diretriz do Catálogo | `P2` | 126 |
| **DL-08** | Diretriz do Catálogo | `P2` | 100 |
| **DL-26** | Diretriz do Catálogo | `P2` | 81 |
| **DL-27** | Diretriz do Catálogo | `P3` | 39 |
| **DL-18** | Diretriz do Catálogo | `P1` | 35 |
| **DL-12** | Diretriz do Catálogo | `P1` | 30 |
| **DL-25** | Diretriz do Catálogo | `P2` | 21 |
| **DL-11** | Diretriz do Catálogo | `P1` | 20 |
| **DL-15** | Diretriz do Catálogo | `P0` | 12 |
| **DL-13** | Diretriz do Catálogo | `P1` | 10 |
| **DL-06** | Diretriz do Catálogo | `P2` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |
| **DL-28** | Diretriz do Catálogo | `P1` | 2 |

