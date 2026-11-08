# 02 — Universo Auditado e Mapeamento de Ativos

## 1. Composição do Universo Auditado
A plataforma Waesy foi submetida a varredura mecânica integral de código-fonte, abrangendo todos os artefatos de interface, serviços e dados.

| Categoria do Ativo | Universo Mapeado | Universo Auditado | Fonte da Evidência |
| :--- | :--- | :--- | :--- |
| **Rotas de TanStack Router** | 443 arquivos | 443 rotas | `src/routes/**/*.tsx` |
| **Páginas Interativas Reais** | 406 páginas | 406 páginas | [pages.csv](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/inventory/waesy-platform/pages.csv) |
| **Rotas Utilitárias / Redirects** | 37 rotas | 37 rotas | Redirecionamentos puros e cascas |
| **Componentes de Interface (UI)** | 883 arquivos | 883 componentes | `src/components/` e `src/design-system/` |
| **Fluxos Operacionais de Negócio** | 52 fluxos | 52 fluxos | [workflow-audit.csv](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/audits/waesy-redesign-acceptance/workflow-audit.csv) |
| **Server Functions (BFF)** | 352 arquivos | 352 funções | `src/services/**/*.functions.ts` |
| **Tabelas e Entidades PostgreSQL** | 775 tabelas | 775 tabelas | Migrações em `supabase/migrations/` |

---

## 2. Distribuição das 406 Páginas por Domínio de Negócio

| Domínio de Negócio | Total de Páginas | Aprovadas | Parciais | Funcionais | Não Conformes | Identificadas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Workspace (Operações Comerciais)** | 184 | 5 | 22 | 98 | 54 | 5 |
| **Vitrines Públicas e Lojas (_store)** | 148 | 0 | 8 | 112 | 20 | 8 |
| **Admin Master (Gestão Central)** | 52 | 0 | 2 | 36 | 11 | 3 |
| **Portais Verticais e Subpainéis** | 22 | 0 | 0 | 11 | 1 | 10 |
| **Total Consolidado** | **406** | **5** | **32** | **257** | **86** | **26** |
