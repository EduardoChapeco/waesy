# BASELINE.md — Baseline Mensurável do Sistema (P05)

**Data da Medição:** 2026-10-01  
**Métrica Global:** 2557 arquivos em `src/` | 951.300 linhas de código | 36.21 MB

---

## 1. Contagem Estrutural
- **Rotas:** 461
- **Componentes:** 966
- **Serviços / BFF:** 628
- **Hooks:** 22

---

## 2. Top 20 Maiores Arquivos (Alvos Prioritários de Refatoração / Modularização)
| Arquivo | Linhas | Tamanho (KB) |
|---|---|---|
| `src/integrations/supabase/types.ts` | 45793 | 1442.8 KB |
| `src/lib/data/airports-catalog.ts` | 7513 | 844.4 KB |
| `src/routes/_store.conta.classificados.novo.tsx` | 11764 | 616.1 KB |
| `src/routeTree.gen.ts` | 9572 | 404.5 KB |
| `src/components/builder/OmniEditor.tsx` | 4322 | 189.7 KB |
| `src/components/classifieds/editorial-showcase-view.tsx` | 3191 | 176.5 KB |
| `src/services/mining.functions.ts` | 4432 | 160.7 KB |
| `src/components/commerce/canonical-store-profile-view.tsx` | 3191 | 158.1 KB |
| `src/services/builder.functions.ts` | 4371 | 141.1 KB |
| `src/routes/workspace.atendimento.index.tsx` | 3137 | 140.6 KB |
| `src/services/classifieds.functions.ts` | 4087 | 139.1 KB |
| `src/services/ai-conversations.functions.ts` | 3755 | 137.3 KB |
| `src/services/events.functions.ts` | 3791 | 130.2 KB |
| `src/routes/_store.membro.$id.tsx` | 3692 | 128.1 KB |
| `src/routes/_store.checkout.tsx` | 3011 | 125.3 KB |
| `src/components/commerce/travel/travel-package-form.tsx` | 2606 | 120.7 KB |
| `src/lib/builder/omni-templates.ts` | 3225 | 117.3 KB |
| `src/components/builder/vitrine-block-inspector.tsx` | 2786 | 114.4 KB |
| `src/routes/workspace.comercial.tsx` | 2397 | 113.9 KB |
| `src/services/ads.functions.ts` | 2865 | 111.0 KB |

---

## 3. Resumo dos Checks C01-C43
- **Total de Checks:** 43
- **Checks Conformes (0 violações):** 30
- **Checks Abertos:** 13 (C01, C02, C03, C06, C07, C08, C09, C18, C22, C23, C26, C28, C37)
- **Compilação TypeScript:** 0 erros (`tsc --noEmit` verificado)
- **Teto Design Lint Ratchet:** 38.378 violações congeladas em `design-lint.baseline.json`
