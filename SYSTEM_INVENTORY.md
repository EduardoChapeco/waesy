# SYSTEM_INVENTORY.md — Inventário Canônico do Sistema Waesy

> Documento Raiz de Inventário Técnico  
> Total de Arquivos em `src/`: 1.837  
> Tabelas no Banco: 537  
> Skills Registradas: 44  
> Subagentes: 8  
> Verticais de Mineração: 8

## Resumo dos Módulos Principais

| Módulo | Localização | Tecnologia Principal |
| :--- | :--- | :--- |
| **Componentes de UI** | `src/components/` (718 arquivos) | Radix UI, Tailwind CSS v4, Lucide, Framer Motion |
| **Rotas e Páginas** | `src/routes/` (406 arquivos) | TanStack Router v1.170 (file-based routing) |
| **BFF & Server Functions** | `src/services/` (397 arquivos) | TanStack Start `createServerFn`, Zod v3.24 |
| **Engines de Mineração** | `src/services/mining/` (21 arquivos) | Parsers mecânicos, Jaccard, Overpass, PNCP, BCB |
| **Lib & Utilitários** | `src/lib/` (245 arquivos) | Supabase client, formatadores, validadores |
| **Copilot & Agentes** | `src/services/autonomous-copilot-orchestrator.ts` | Model Gateway, MCP tools, state machine |
| **Banco de Dados** | Supabase Postgres (`jfuebqmltksyznovhlwa`) | Postgres 15+, RLS, pg_cron, pg_net, pgvector |
