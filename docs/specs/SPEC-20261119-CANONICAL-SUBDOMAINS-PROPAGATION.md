# SPEC-20261119-CANONICAL-SUBDOMAINS-PROPAGATION — Propagação Canônica dos Subdomínios e Marcas Verticais (Eventio, Wider, Juris, Store & Mercado)

## 1. Contexto e Objetivo
Alinhar integralmente a Fonte Única da Verdade (SSOT) de subsistemas verticais, motor multi-marca, presets de landing pages, navegação contextual de workspace, onboarding corporativo, catálogo de banco de dados (Supabase) e roteamento Edge Worker (Cloudflare Pages) com a topologia oficial de DNS de `waesy.com.br`:
- **Eventos & Bilheteria:** `eventio` (`eventio.waesy.com.br`), preservando alias retrocompatível para `passhub`.
- **Gastronomia & KDS:** `wider` (`wider.waesy.com.br`), preservando alias retrocompatível para `tableway`.
- **Jurídico & Processos:** `juris` (`juris.waesy.com.br`), preservando alias retrocompatível para `lexcloud`.
- **Lojas & Varejo:** `store` (`store.waesy.com.br`), preservando alias retrocompatível para `varejo`.
- **Supermercados & Mercearias:** `mercado` (`mercado.waesy.com.br`), desmembrado como vertical própria dedicada a itens pesáveis, balança, lotes/validade e encartes.

## 2. Requisitos Normativos (Sintaxe EARS)

- **[EARS-01] (Ubíquo — Catálogo SSOT de Subsistemas e DNS):** O módulo `src/lib/vertical-subsystems.ts` DEVE declarar `wider` (`wider.waesy.com.br`), `eventio` (`eventio.waesy.com.br`), `juris` (`juris.waesy.com.br`), `store` (`store.waesy.com.br`) e `mercado` (`mercado.waesy.com.br`) em `CANONICAL_VERTICAL_SUBSYSTEMS`, mantendo resolução retrocompatível por host e por slug para `tableway`, `passhub`, `lexcloud` e `varejo`.
- **[EARS-02] (Event-Driven — Resolução Multi-Marca por Host e ID):** QUANDO `resolveBrandContextFromHost` ou `getBrandVerticalById` em `src/lib/multi-brand-engine.ts` receber os identificadores ou hosts de `wider`, `eventio` ou `juris` (ou seus aliases legados `tableway`, `passhub`, `lexcloud`), o motor DEVE retornar deterministicamente a configuração da marca vertical correspondente com nomenclatura, módulos e nicho primário.
- **[EARS-03] (State-Driven — Presets de Landing Page Vertical e BFF):** ENQUANTO uma requisição atingir um subdomínio vertical ou `/sistemas/$slug` para `wider`, `eventio`, `juris`, `store` ou `mercado`, `src/lib/vertical-landing-presets.ts` e `src/services/vertical-landings.functions.ts` DEVEM capturar sincronamente o cabeçalho `Host`/`X-Forwarded-Host` e renderizar a landing page isolada com módulos, métricas, planos e CTAs de autenticação parametrizados.
- **[EARS-04] (Event-Driven — Propagação no Onboarding e Workspace):** QUANDO um empreendedor iniciar cadastro a partir de uma vertical (`/painel?vertical=...` -> `/onboarding/empresa`), o fluxo DEVE pré-selecionar e persistir o nicho, `brand_origin` e `vertical_sku` na tabela `public.stores`, e `src/lib/workspace-navigation.ts` DEVE inferir o segmento correto para `wider`, `eventio`, `juris`, `store` e `mercado`.
- **[EARS-05] (Ubíquo — Reconciliação de Banco de Dados e BFF):** A migração SQL e o serviço `src/services/vertical-subsystems.functions.ts` DEVEM reconciliar os registros de `public.platform_vertical_subsystems`, `public.platform_landing_pages` e `public.stores` para os slugs canônicos `wider`, `eventio`, `juris`, `store` e `mercado`, garantindo que o Hub Waesy e o Admin Master exibam os 24 subdomínios oficiais sem duplicatas legadas.

## 3. Escopo de Arquivos Autorizados
1. `src/lib/vertical-subsystems.ts`
2. `src/lib/multi-brand-engine.ts`
3. `src/lib/vertical-landing-presets.ts`
4. `src/lib/workspace-navigation.ts`
5. `src/services/vertical-subsystems.functions.ts`
6. `src/services/vertical-landings.functions.ts`
7. `src/services/multi-brand.functions.ts`
8. `src/services/enterprise-onboarding.functions.ts`
9. `src/routes/onboarding.empresa.tsx`
10. `src/components/landing/vertical-landing-hero.tsx`
11. `src/components/landing/vertical-landing-view.tsx`
12. `supabase/migrations/20270616000000_canonical_subdomains_eventio_wider_juris_store_mercado.sql`
13. `src/lib/__tests__/multi-brand-engine.test.ts`
14. `src/routes/__tests__/vertical-isolation-landings.test.tsx`
15. `src/services/security-vertical-governance.test.ts`
16. `docs/specs/SPEC-MULTI-BRAND-VERTICAL-ECOSYSTEM.md`
17. `docs/design/DECISIONS.md`

## 4. Critérios de Aceite e Evidências
- `npm run typecheck` com Exit Code 0.
- Testes unitários e de integração (`vitest run`) com 100% de aprovação.
- `node scripts/design-lint.mjs --ratchet` com zero novas violações P0/P1.
- `npm run build` gerando `dist/_worker.js/index.js` otimizado.
- Deploy de banco (`Supabase`) e Edge (`Cloudflare Pages`) executados e verificados.
