# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-02T08:13:11.475Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1726 | 1581 | Estável |
| **Arquivos com Débito** | 1125 | 1122 | Monitorado |
| **Total de Violações** | **37710** | **38314** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **7194** | 7275 | PASS |
| **P1 (Bloqueia Merge)** | **17917** | 18237 | PASS |
| **P2 (Fila de Correção)** | 11128 | 11293 | Acompanhamento |
| **P3 (Polimento)** | 1471 | 1509 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 12801 | 2217 | 6651 | 3354 | 579 |
| `routes/workspace` | 9513 | 1869 | 3842 | 3521 | 281 |
| `routes/store` | 6656 | 1182 | 3011 | 2109 | 354 |
| `components/tourism` | 2785 | 446 | 1507 | 757 | 75 |
| `routes/admin` | 2742 | 458 | 1422 | 740 | 122 |
| `services` | 898 | 577 | 239 | 80 | 2 |
| `components/ui` | 890 | 126 | 581 | 152 | 31 |
| `routes/other` | 535 | 78 | 231 | 217 | 9 |
| `lib` | 370 | 90 | 219 | 61 | 0 |
| `components/builder` | 361 | 107 | 134 | 103 | 17 |
| `components/chat` | 97 | 13 | 62 | 21 | 1 |
| `hooks` | 28 | 14 | 10 | 4 | 0 |
| `routes/api` | 21 | 15 | 6 | 0 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `core` | 4 | 2 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-09** | Diretriz do Catálogo | `P2` | 9681 |
| **DL-03** | Diretriz do Catálogo | `P1` | 8985 |
| **DL-02** | Diretriz do Catálogo | `P1` | 5753 |
| **DL-15** | Diretriz do Catálogo | `P0` | 5467 |
| **DL-04** | Diretriz do Catálogo | `P0` | 1727 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1317 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1210 |
| **DL-01** | Diretriz do Catálogo | `P1` | 1014 |
| **DL-23** | Diretriz do Catálogo | `P2` | 537 |
| **DL-07** | Diretriz do Catálogo | `P2` | 499 |
| **DL-14** | Diretriz do Catálogo | `P1` | 324 |
| **DL-28** | Diretriz do Catálogo | `P1` | 310 |
| **DL-30** | Diretriz do Catálogo | `P3` | 261 |
| **DL-05** | Diretriz do Catálogo | `P1` | 138 |
| **DL-29** | Diretriz do Catálogo | `P2` | 130 |
| **DL-08** | Diretriz do Catálogo | `P2` | 127 |
| **DL-26** | Diretriz do Catálogo | `P2` | 116 |
| **DL-12** | Diretriz do Catálogo | `P1` | 39 |
| **DL-25** | Diretriz do Catálogo | `P2` | 30 |
| **DL-11** | Diretriz do Catálogo | `P1` | 25 |
| **DL-13** | Diretriz do Catálogo | `P1` | 12 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |
| **DL-19** | Diretriz do Catálogo | `P2` | 2 |

