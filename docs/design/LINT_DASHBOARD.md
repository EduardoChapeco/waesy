# LINT_DASHBOARD.md — Painel Canônico de Saúde Visual e Catraca

> Gerado automaticamente pelo Design Lint V2 em: `2026-10-05T12:18:21.479Z`

## 1. Resumo Executivo

| Métrica | Atual | Baseline Congelada | Status Catraca |
| :--- | :--- | :--- | :--- |
| **Total de Arquivos** | 1854 | 1854 | Estável |
| **Arquivos com Débito** | 876 | 876 | Monitorado |
| **Total de Violações** | **14339** | **14339** | PASS (<= Baseline) |
| **P0 (Bloqueia Entrega)** | **1563** | 1563 | PASS |
| **P1 (Bloqueia Merge)** | **10074** | 10074 | PASS |
| **P2 (Fila de Correção)** | 1334 | 1334 | Acompanhamento |
| **P3 (Polimento)** | 1368 | 1368 | Acompanhamento |

## 2. Débito Visual por Módulo

| Módulo | Total | P0 | P1 | P2 | P3 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `components/app` | 6215 | 661 | 4330 | 642 | 582 |
| `routes/workspace` | 2475 | 459 | 1612 | 118 | 286 |
| `routes/store` | 1711 | 161 | 1146 | 160 | 244 |
| `components/tourism` | 1408 | 99 | 1045 | 190 | 74 |
| `routes/admin` | 1047 | 93 | 780 | 51 | 123 |
| `components/ui` | 520 | 23 | 460 | 7 | 30 |
| `services` | 317 | 0 | 237 | 78 | 2 |
| `lib` | 256 | 1 | 219 | 36 | 0 |
| `routes/other` | 170 | 15 | 128 | 18 | 9 |
| `components/builder` | 138 | 42 | 58 | 21 | 17 |
| `components/chat` | 46 | 4 | 41 | 0 | 1 |
| `hooks` | 19 | 5 | 10 | 4 | 0 |
| `styles` | 9 | 0 | 0 | 9 | 0 |
| `routes/api` | 6 | 0 | 6 | 0 | 0 |
| `core` | 2 | 0 | 2 | 0 | 0 |

## 3. Débito Visual por Regra Normativa (DL-01 a DL-30)

| Regra | Descrição Sumária | Severidade | Ocorrências |
| :--- | :--- | :--- | :--- |
| **DL-02** | Diretriz do Catálogo | `P1` | 4925 |
| **DL-14** | Diretriz do Catálogo | `P1` | 2291 |
| **DL-15** | Diretriz do Catálogo | `P0` | 1560 |
| **DL-18** | Diretriz do Catálogo | `P1` | 1231 |
| **DL-27** | Diretriz do Catálogo | `P3` | 1125 |
| **DL-01** | Diretriz do Catálogo | `P1` | 1006 |
| **DL-07** | Diretriz do Catálogo | `P2` | 490 |
| **DL-23** | Diretriz do Catálogo | `P2` | 475 |
| **DL-28** | Diretriz do Catálogo | `P1` | 295 |
| **DL-30** | Diretriz do Catálogo | `P3` | 243 |
| **DL-05** | Diretriz do Catálogo | `P1` | 136 |
| **DL-29** | Diretriz do Catálogo | `P2` | 122 |
| **DL-03** | Diretriz do Catálogo | `P1` | 120 |
| **DL-08** | Diretriz do Catálogo | `P2` | 114 |
| **DL-26** | Diretriz do Catálogo | `P2` | 93 |
| **DL-12** | Diretriz do Catálogo | `P1` | 34 |
| **DL-11** | Diretriz do Catálogo | `P1` | 25 |
| **DL-25** | Diretriz do Catálogo | `P2` | 23 |
| **DL-09** | Diretriz do Catálogo | `P2` | 11 |
| **DL-13** | Diretriz do Catálogo | `P1` | 11 |
| **DL-06** | Diretriz do Catálogo | `P2` | 4 |
| **DL-04** | Diretriz do Catálogo | `P0` | 3 |
| **DL-24** | Diretriz do Catálogo | `P2` | 2 |

