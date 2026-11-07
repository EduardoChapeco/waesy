# 05 — Auditoria do Ecossistema de Componentes

## 1. Concorrência entre Componentes Canônicos e Legados

O inventário de componentes está registrado no arquivo [component-audit.csv](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/audits/waesy-redesign-acceptance/component-audit.csv).

| Componente Canônico Aprovado | Componente Legado Concorrente | Rotas Afetadas | Situação |
| :--- | :--- | :--- | :--- |
| **WorkspaceCanonicalToolbar** | `PageHeader` (`page-header.tsx`) | 86 rotas | Legado gera 120px de altura e botões desalinhados |
| **KpiMetricCard** | `StatTile` (`StatTile.tsx`) | 18 rotas | Legado aninha cartões e viola DL-31 |
| **UniversalViewManager** | Tabelas estáticas isoladas | 45 rotas | Bloqueia visualização em Kanban e Cards |
| **FullViewportKanban** | Kanbans ad-hoc em divs simples | 12 rotas | Perda de drag-and-drop nativo e física elástica |

---

## 2. Auditoria da Invariante Single Sovereign Surface (DL-31)
- Foram identificadas **138 páginas** apresentando o padrão "Containeritis" (cards de conteúdo envolvidos diretamente por caixas `rounded-xl border bg-card p-6` que envolvem outros cartões `rounded-lg border bg-card p-4`).
- A remediação exige descompactar o contêiner externo, transformando o cartão de dados no elemento de superfície único e soberano.
