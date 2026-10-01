# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-01T20:28:30.060Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1588 | 1581 | Estável |
| **Arquivos com Débito** | 1125 | 1122 | Monitorado |
| **Total de Violações** | **38320** | **38314** | FAIL (Regressão) |
| **P0 (Bloqueia Entrega)** | **7281** | 7275 | FAIL |
| **P1 (Bloqueia Merge)** | **18237** | 18237 | PASS |
| **P2 (Fila de Correção)** | 11293 | 11293 | Acompanhamento |
| **P3 (Polimento)** | 1509 | 1509 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 12801 | 2195 | 6690 | 3334 | 582 |
| `routes/workspace` | 9732 | 1913 | 3923 | 3611 | 285 |
| `routes/store` | 7003 | 1246 | 3168 | 2204 | 385 |
| `components/tourism` | 2785 | 446 | 1507 | 757 | 75 |
| `routes/admin` | 2742 | 458 | 1422 | 740 | 122 |
| `services` | 903 | 582 | 239 | 80 | 2 |
| `components/ui` | 892 | 127 | 582 | 152 | 31 |
| `routes/other` | 535 | 78 | 231 | 217 | 9 |
| `lib` | 399 | 83 | 255 | 61 | 0 |
| `components/builder` | 369 | 109 | 140 | 103 | 17 |
| `components/chat` | 97 | 13 | 62 | 21 | 1 |
| `hooks` | 28 | 14 | 10 | 4 | 0 |
| `routes/api` | 21 | 15 | 6 | 0 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `core` | 4 | 2 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-09** | Diretriz do Catálogo | `P2` | 9837 |
| **DL-03** | Diretriz do Catálogo | `P1` | 9178 |
| **DL-02** | Diretriz do Catálogo | `P1` | 5822 |
| **DL-15** | Diretriz do Catálogo | `P0` | 5531 |
| **DL-04** | Diretriz do Catálogo | `P0` | 1750 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1329 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1248 |
| **DL-01** | Diretriz do Catálogo | `P1` | 1056 |
| **DL-23** | Diretriz do Catálogo | `P2` | 538 |
| **DL-07** | Diretriz do Catálogo | `P2` | 499 |
| **DL-14** | Diretriz do Catálogo | `P1` | 326 |
| **DL-28** | Diretriz do Catálogo | `P1` | 312 |
| **DL-30** | Diretriz do Catálogo | `P3` | 261 |
| **DL-05** | Diretriz do Catálogo | `P1` | 138 |
| **DL-29** | Diretriz do Catálogo | `P2` | 130 |
| **DL-08** | Diretriz do Catálogo | `P2` | 127 |
| **DL-26** | Diretriz do Catálogo | `P2` | 121 |
| **DL-12** | Diretriz do Catálogo | `P1` | 39 |
| **DL-25** | Diretriz do Catálogo | `P2` | 32 |
| **DL-11** | Diretriz do Catálogo | `P1` | 25 |
| **DL-13** | Diretriz do Catálogo | `P1` | 12 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-19** | Diretriz do Catálogo | `P2` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

