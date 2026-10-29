# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-29T18:30:27.593Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 2535 | 2520 | Estável |
| **Arquivos com Débito** | 742 | 735 | Monitorado |
| **Total de Violações** | **4045** | **4007** | FAIL (Regressão) |
| **P0 (Bloqueia Entrega)** | **11** | 15 | PASS |
| **P1 (Bloqueia Merge)** | **3239** | 3202 | FAIL |
| **P2 (Fila de Correção)** | 494 | 488 | Acompanhamento |
| **P3 (Polimento)** | 301 | 302 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 1680 | 10 | 1237 | 329 | 104 |
| `routes/workspace` | 886 | 1 | 774 | 40 | 71 |
| `routes/store` | 387 | 0 | 295 | 49 | 43 |
| `components/tourism` | 299 | 0 | 265 | 28 | 6 |
| `routes/admin` | 278 | 0 | 209 | 20 | 49 |
| `components/ui` | 193 | 0 | 171 | 6 | 16 |
| `services` | 159 | 0 | 155 | 2 | 2 |
| `lib` | 82 | 0 | 82 | 0 | 0 |
| `routes/other` | 32 | 0 | 21 | 10 | 1 |
| `components/chat` | 16 | 0 | 8 | 2 | 6 |
| `components/builder` | 12 | 0 | 7 | 2 | 3 |
| `hooks` | 7 | 0 | 7 | 0 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `styles` | 6 | 0 | 0 | 6 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-14** | Diretriz do Catálogo | `P1` | 1457 |
| **DL-02** | Diretriz do Catálogo | `P1` | 786 |
| **DL-01** | Diretriz do Catálogo | `P1` | 633 |
| **DL-07** | Diretriz do Catálogo | `P2` | 473 |
| **DL-30** | Diretriz do Catálogo | `P3` | 287 |
| **DL-03** | Diretriz do Catálogo | `P1` | 146 |
| **DL-05** | Diretriz do Catálogo | `P1` | 104 |
| **DL-18** | Diretriz do Catálogo | `P1` | 54 |
| **DL-12** | Diretriz do Catálogo | `P1` | 29 |
| **DL-11** | Diretriz do Catálogo | `P1` | 19 |
| **DL-27** | Diretriz do Catálogo | `P3` | 14 |
| **DL-15** | Diretriz do Catálogo | `P0` | 11 |
| **DL-29** | Diretriz do Catálogo | `P2` | 9 |
| **DL-13** | Diretriz do Catálogo | `P1` | 9 |
| **DL-08** | Diretriz do Catálogo | `P2` | 7 |
| **DL-23** | Diretriz do Catálogo | `P2` | 4 |
| **DL-28** | Diretriz do Catálogo | `P1` | 2 |
| **DL-24** | Diretriz do Catálogo | `P2` | 1 |

