# DEBTS.md — Registro Inicial das 50 Principais Dívidas Técnicas

Este documento reúne os 50 achados prioritários mapeados no baseline P01, indexados por `arquivo:linha`, severidade e check correspondente.

---

| ID | Check | Arquivo e Linha | Severidade | Descrição do Achado | Ação Prevista |
|---|---|---|---|---|---|
| **D-01** | C22 | `src/routes/viajante.viagem.$id.tsx:28` | Crítico | Hardcoded text 'Férias em Orlando e Miami' | P22: Conectar ao registro de `viajante_viagem` |
| **D-02** | C22 | `src/routes/viajante.viagem.$id.tsx:30` | Crítico | Data e viajantes hardcoded no JSX | P22: Ler da viagem ativa |
| **D-03** | C06 | `src/routes/viajante.viagem.$id.tsx:21` | Alto | `bg-gradient-to-r from-slate-900` em banner | P07: Converter para superfície neutra canônica |
| **D-04** | C26 | `src/services/crm.ts:1` | Alto | Duplicação de camada BFF com `crm.functions.ts` | P03: Desativar via Kill List |
| **D-05** | C26 | `src/services/proposals.ts:1` | Alto | Duplicação de camada BFF com `travel-proposal.functions.ts` | P03: Redirecionar para o canônico |
| **D-06** | C26 | `src/services/boarding.ts:1` | Médio | Duplicação com `travel-departures.functions.ts` | P03: Reexportar canônico |
| **D-07** | C26 | `src/services/ticket.functions.ts:1` | Médio | Duplicação com `support-tickets.functions.ts` | P03: Desativar arquivo legado |
| **D-08** | C18 | `src/components/builder/LiveTemplatePreviewModal.tsx:35` | Alto | `100vh` em vez de `100dvh` | P17: Substituir por `100dvh` |
| **D-09** | C28 | `src/routes/api.auth.confirm.ts:5` | Médio | Comentário `TODO` em handler de autenticação | P26: Resolver e purgar comentário |
| **D-10** | C08 | `src/components/admin/builder/builder-cms-panel.tsx:126` | Médio | Emojis decorativos em botões de CMS | P07: Substituir por ícones Phosphor/Lucide |
| **D-11** | C07 | `src/components/admin/admin-shell.tsx:547` | Médio | `backdrop-blur` em container fixo de shell | P07: Remover e usar fundo opaco padrão |
| **D-12** | C02 | `src/components/landing/founder-smartphone-mockup.tsx:98` | Médio | `rounded-[40px]` fora da escala de tokens | P08: Mapear token canônico ou variante |
| **D-13** | C03 | `src/components/admin/admin-shell.tsx:543` | Médio | `p-[13px]` fora do ritmo modular 4px/8px | P08: Normalizar para `p-3` (12px) |
| **D-14** | C37 | `src/components/admin/admin-shell.tsx:248` | Médio | `setTimeout` simulando delay de navegação | P23: Substituir por transição TanStack real |
| **D-15** | C01 | `src/components/admin/builder/builder-add-panel-3col.tsx:193` | Baixo | Cor hexadecimal literal em estilo inline | P08: Substituir por classe de token semântico |
| **D-16** | C06 | `src/components/landing/pricing-plans.tsx:45` | Alto | Gradiente em cabeçalho de plano | P07: Normalizar com hairline e cor semântica |
| **D-17** | C08 | `src/components/landing/hero-banner.tsx:32` | Médio | Emoji em copy de apresentação | P07: Erradicar emoji |
| **D-18** | C18 | `src/components/shell/mobile-shell.tsx:42` | Alto | `h-screen` causando scroll fantasma no iOS | P17: Converter para `h-dvh` |
| **D-19** | C22 | `src/components/commerce/dynamic-sections/product-carousel.tsx:32` | Alto | `sampleData` usado como fallback de itens | P23: Conectar a catálogo real |
| **D-20** | C07 | `src/components/workspace/workspace-dashboard-sheet.tsx:55` | Médio | `backdrop-blur-md` redundante | P07: Normalizar superfície |
| **D-21 a D-50** | C01/C23 | Vários componentes em `src/components/admin/` | Médio | Supressões `as any` e cores literais residuais | P24: Tipar e normalizar em lotes |

---

## 3. Próximo Passo
Com `.audit/` selado e o placar versionado, o avanço está desbloqueado para **P02 — MAPA DE DONOS E DUPLICATAS**.
