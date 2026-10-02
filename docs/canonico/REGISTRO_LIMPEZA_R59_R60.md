# REGISTRO_LIMPEZA_R59_R60.md — Governança de Limpeza e Destino de Diretórios Legados

**Data:** 2026-10-02  
**Referência:** Plano 4 (Operação Verdade Única) — Bloco 10 (R59 e R60)  
**Status:** HOMOLOGADO  

---

## 1. Fase R59: Remendos da Raiz

| Arquivo Alvo | Status Anterior | Ação Executada | Destino / Justificativa |
| :--- | :--- | :--- | :--- |
| `(Fundação).ini` | Arquivo residual da fase zero (72 KB) | **Removido** | Purgado da raiz. Não possui referência ativa no Vite, CI ou runtime. |
| `fix_tsx.ts` | Script de remendo pontual | **Removido previamente** | Absorvido pelo pipeline canônico de TypeScript. |
| `fix_components.ts` | Script de remendo pontual | **Removido previamente** | Substituído por `src/components/ui/canonical/`. |
| `fix_onboarding.ts` | Script de remendo pontual | **Removido previamente** | Integrado em `system-onboarding.functions.ts`. |
| `refactor_get.ts` | Script de remendo pontual | **Removido previamente** | Substituído por Server Functions tipadas TanStack Start. |
| `sanitize_variants.ts` | Script de remendo pontual | **Removido previamente** | Integrado em `VariantMatrixGrid` e `product-field-registry.ts`. |
| `check_tables.ts` | Verificador de banco | **Removido previamente** | Substituído por `scripts/check-duplication.mjs` e migrations RLS. |
| `audit_imports.cjs` | Script isolado de auditoria | **Removido previamente** | Substituído por `eslint.config.js` e Vite bundler. |
| `policies_to_rewrite.json` | JSON transitório | **Removido previamente** | Consolidado na migration 20261226000000 (RLS lockdown). |
| `audit_report_full.txt` | Dump transitório de log | **Removido previamente** | Substituído pelo ledger em `docs/canonico/`. |

---

## 2. Fase R60: Governança e Destino de Pastas Legadas

Conforme exigido pela diretriz R60 ("decidir destino, com dono e prazo ou remoção"):

| Diretório | Conteúdo / Volume | Dono Designado | Decisão e Destino | Prazo / Retenção |
| :--- | :--- | :--- | :--- | :--- |
| `legacy_quarantine/` | 8 módulos legados (classificados antigos, restaurante v1, CRM v1) | Engenharia de Plataforma | **Isolado / Quarentena**. Manter fora do bundle (`vite.config.ts` ignora). Não importar em novas rotas. | Arquivamento permanente para referência de retrocompatibilidade. |
| `reparo/` | 6 documentos de barreira e checkpoints do ciclo anterior | Conselho de Arquitetura | **Arquivo Histórico de Auditoria**. Não afeta runtime nem bundle. | Preservado como histórico de conformidade. |
| `scratch/` | 26 scripts descartáveis de migração pontual | Engenharia de DevOps | **Pasta de Rascunho / Scratchpad**. Ignorada pelo git em novos deploys e não referenciada por `src/`. | Utilitários transitórios permitidos pelo contrato de runtime. |
| `melhoria/` | 11 relatórios de oportunidade e superfícies | Gestão de Produto (PM) | **Arquivo Histórico de Produto**. | Preservado como histórico. |
| `ia/` | 48 documentos de arquitetura e contratos legados | Arquiteto de IA | **Arquivo Histórico de Especificação**. | Preservado como histórico. |
| `auditoria/` | 10 arquivos de inventário e grafos passados | Equipe de QA & Segurança | **Arquivo Histórico de Auditoria**. | Preservado como histórico. |
| `app/` | `(marketing)/page.tsx` residual de antigo template Next.js | Frontend Lead | **Legado Next.js descontinuado**. Toda a navegação de produção roda em `src/routes/` via TanStack Start. Marcado para não empacotamento. | Descontinuado. |
| `prisma/` | `schema.prisma` isolado | Backend Lead | **Legado de ORM**. O Waesy utiliza Supabase Postgres nativo via `@supabase/supabase-js` e Server Functions. | Mantido como referência de schema histórico. |

---

## 3. Evidência de Não-Interferência no Build de Produção
- Todos os diretórios legados e arquivos históricos residem fora de `src/`.
- O bundler do Vite/TanStack Start compila única e exclusivamente a árvore `src/`.
- Zero imports cruzados entre `src/` e qualquer pasta de quarentena ou histórico.
