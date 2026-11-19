# BASELINE.md — Baseline Mensurável do Sistema

**Data da Medição:** 2026-11-17  
**Métrica Global:** 2922 arquivos em `src/` | 1.221.377 linhas de código | 46.69 MB

---

## 1. Contagem Estrutural
- **Rotas:** 515
- **Componentes:** 1070
- **Serviços / BFF:** 752
- **Hooks:** 24

---

## 2. Top 20 Maiores Arquivos (Alvos Prioritários de Refatoração / Modularização)
| Arquivo | Linhas | Tamanho (KB) |
|---|---|---|
| `src/integrations/supabase/types.ts` | 45901 | 1446.7 KB |
| `src/routeTree.gen.ts` | 10363 | 429.2 KB |
| `src/routes/_store.conta.classificados.novo.tsx` | 7930 | 398.4 KB |
| `src/components/atendimento/AtendimentoChatWorkspace.tsx` | 6342 | 301.1 KB |
| `src/components/tourism/unified-proposal-workspace.tsx` | 5620 | 274.2 KB |
| `src/components/tourism/crm/TourismPipeCardDossier.tsx` | 5393 | 266.7 KB |
| `src/services/chat.functions.ts` | 6443 | 260.9 KB |
| `src/components/builder/OmniEditor.tsx` | 5247 | 226.4 KB |
| `src/generated/extensions-bundle.server.ts` | 164 | 215.1 KB |
| `src/services/crm.functions.ts` | 5459 | 201.6 KB |
| `src/lib/builder/omni-templates.ts` | 4805 | 190.1 KB |
| `src/components/classifieds/editorial-showcase-view.tsx` | 3376 | 188.4 KB |
| `src/components/commerce/canonical-store-profile-view.tsx` | 3364 | 168.0 KB |
| `src/components/tourism/studio/studio-sidebar-editor.tsx` | 4124 | 164.5 KB |
| `src/services/mining.functions.ts` | 4287 | 155.3 KB |
| `src/components/chat/customer-360-sidebar.tsx` | 3222 | 152.8 KB |
| `src/components/builder/vitrine-block-inspector.tsx` | 3620 | 152.1 KB |
| `src/services/marketplace-hub.functions.ts` | 4054 | 150.0 KB |
| `src/services/travel-proposal.functions.ts` | 3613 | 146.9 KB |
| `src/services/builder.functions.ts` | 4360 | 142.6 KB |

---

## 3. Resumo dos Checks C01-C43
- **Checks Avaliados / Conformes / Abertos:** 18 avaliados (6 conformes, 12 abertos)
- **Abertos:** C01(1315), C06(546), C07(47), C08(10), C09(9), C18(143), C22(22), C23(10911), C26(4), C28(2), C37(154), C40(35)
- **Compilação TypeScript:** 20 erro(s) registrados em .audit/tsc-baseline.txt
- **Design Lint Report:** 0 violações atuais
