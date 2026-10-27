# 🗂️ MASTER LEDGER V99 — SINGULARITY PROTOCOL
## Plano Matricial de Auditoria & Lapidação Contínua — Waesy

> **Estado:** EXECUÇÃO ATIVA & AUDITADO | **Filtro:** 7 Camadas (Banco → BFF → UI → Governança → Silêncio Visual → Ergonomia 3 Toques → Fluidez)

---

## 🚀 MASTER PROMPT V100 — END-TO-END CONVERSION MATRIX, ORDER INTEGRITY & HUMAN UX (100% BLINDADO)

| # | Camada / Entrega | Arquivo | Status |
|---|---|---|---|
| **V100.1** | **FASE 1 — Rastreio Real de Visualizações (Telemetry Fix):** Invocação real da RPC `increment_classified_view` no Supabase com proteção anti-spam por sessão (`sessionStorage`) em Server Component e Hook | `src/routes/_store.classificados.$id.tsx`, `src/components/commerce/product-telemetry.tsx`, `src/services/classifieds.functions.ts` | ✅ ENTREGUE & AUDITADO |
| **V100.2** | **FASE 2 — Utilitário de IDs Humanos:** Gerador canônico de Short IDs `#WSY-XXXX` (ex: `#WSY-9X2A`) sem caracteres ambíguos | `src/lib/order-id.ts` | ✅ ENTREGUE & AUDITADO |
| **V100.3** | **FASE 2 — Erradicação de Ghost Orders:** Gravação atômica real nas tabelas `orders` e `order_items` com `short_id` gravado em `custom_fields` e `customer_snapshot` antes de qualquer redirecionamento | `src/services/quick-order.functions.ts`, `src/services/checkout.functions.ts` | ✅ ENTREGUE & AUDITADO |
| **V100.4** | **FASE 2 — Botão "Pedir Agora" Conectado à Base:** Disparo de `createQuickOrder` com feedback imediato de ID humano `#WSY-XXXX` no modal de checkout | `src/components/classifieds/convenience-showcase-view.tsx` | ✅ ENTREGUE & AUDITADO |
| **V100.5** | **FASE 3 — The WhatsApp Concierge (UX Copywriting):** Mensagem educada e humanizada conforme template exigido: *"Olá! Gostaria de fazer o pedido #WSY-XXXX que vi no Waesy. 📦 1x Produto (R$ XX,XX). Podemos confirmar o envio?"* | `src/services/quick-order.functions.ts` | ✅ ENTREGUE & AUDITADO |
| **V100.6** | **FASE 4 — Expurgo de Jargão Técnico:** Erradicação de códigos brutos (`draft`, `awaiting_payment`, `processing`, `500 API`) em favor de termos humanos ("Aguardando confirmação", "Em preparação", "A caminho", "Concluído") | `src/routes/_store.conta.pedidos.index.tsx`, `src/routes/_store.conta.pedidos.$id.tsx`, `src/routes/_store.pedido.$publicToken.confirmacao.tsx` | ✅ ENTREGUE & AUDITADO |
| **V100.7** | **FASE 4 — Badges com Cores Suaves:** Substituição de texto cru por badges suaves (Amarelo para aguardando, Azul para em preparação, Verde para confirmado/entregue) | `src/routes/_store.conta.pedidos.index.tsx`, `src/routes/_store.conta.pedidos.$id.tsx` | ✅ ENTREGUE & AUDITADO |
| **V100.8** | **Validação de Compilação em Produção:** `npm run build` aprovado com 0 erros (cliente Vite + SSR Nitro + Cloudflare Worker `dist/_worker.js`) | `dist/_worker.js` | ✅ COMPILADO COM 0 ERROS |

---

## 🔴 DOMÍNIO 0 — Core Layouts & Global Physics

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 0.1 | Remover lógica `isMarketingLanding` stale do `_store.tsx` (shell unificado) | `_store.tsx` | ✅ CONCLUÍDO |
| 0.2 | Adicionar `/cadastroantecipado` ao `isStandalonePage` no `app-shell.tsx` | `app-shell.tsx` | ✅ CONCLUÍDO |
| 0.3 | Adicionar `/receitas` à lista `isCleanMobileAppPage` | `app-shell.tsx` | ✅ CONCLUÍDO |
| 0.4 | Garantir `100dvh` em standalone page wrapper | `app-shell.tsx` | ✅ CONCLUÍDO |
| 0.5 | Purgar `isMarketplace`/`isMarketingLanding` do shell | `_store.tsx` | ✅ CONCLUÍDO |
| 0.6 | `WorkspaceErrorComponent` — título opaco alterado para erro técnico transparente | `workspace.tsx` | ✅ CONCLUÍDO |
| 0.7 | `workspace.tsx` — sessão deduplicada via context provido por `beforeLoad` e preservação de redirects | `workspace.tsx` | ✅ CONCLUÍDO |
| 0.8 | `NativeMobileHeader` — verificação e propagação universal | Vários | ✅ CONCLUÍDO |

---

## 🟠 DOMÍNIO 1 — Vitrine Pública & Home Feed

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 1.1 | Home (`/`) — SEO title corrigido para Vitrine | `_store.index.tsx` | ✅ CONCLUÍDO |
| 1.2 | Home — `isMarketplace` logic stale purgada | `_store.index.tsx` | ✅ CONCLUÍDO |
| 1.3 | Classificados Index — layout com zero dead space mobile (`px-0 sm:px-6`) | `_store.classificados.index.tsx` | ✅ CONCLUÍDO |
| 1.4 | Classificados Detail — layout e erro com fallback gracioso | `_store.classificados.$id.tsx` | ✅ CONCLUÍDO |
| 1.5 | Empregos Index — sticky filter bar verificado com touch targets ergonômicos (44px) | `_store.empregos.index.tsx` | ✅ CONCLUÍDO |
| 1.6 | Receitas Index — grid e header mobile canônico (`px-0 sm:px-4 md:px-0`) | `_store.receitas.index.tsx` | ✅ CONCLUÍDO |
| 1.7 | Bio da Loja — botões com física anti-esmagamento | `_store.bio.$slug.tsx` | ✅ CONCLUÍDO |
| 1.8 | Turismo Index — filtro regional com snap-x snap-mandatory e snap-start | `_store.turismo.index.tsx` | ✅ CONCLUÍDO |
| 1.9 | Eventos — filtros com snap scroll nativo snap-x snap-mandatory | `_store.eventos.tsx` | ✅ CONCLUÍDO |
| 1.10 | Notícias — verificação em isCleanMobileAppPage | `_store.noticias.index.tsx` | ✅ CONCLUÍDO |
| 1.11 | Global Menu Hub — erradicação de títulos compostos com anos ("Circuito 2027") | `global-menu-hub.tsx` | ✅ CONCLUÍDO |

---

## 🟡 DOMÍNIO 2 — Perfis Civis & Conta do Utilizador

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 2.1 | Conta Index — botões do header: grid-cols-2 no mobile / flex no desktop | `_store.conta.index.tsx` | ✅ CONCLUÍDO |
| 2.2 | Conta Pedidos — listagem canônica com NativeMobileHeader e chips de status | `_store.conta.pedidos.index.tsx` | ✅ CONCLUÍDO |
| 2.3 | Conta Agendamentos — CTAs mobile com grid-cols-2 anti-esmagamento | `_store.conta.agendamentos.tsx` | ✅ CONCLUÍDO |
| 2.4 | Conta Finanças — auditado (valores monetários em integer cents `formatCents`) | `_store.conta.financas.tsx` | ✅ CONCLUÍDO |
| 2.5 | Membro.$id — Instagram profile header adaptado com snap-x, layout responsivo em 360px e touch targets 44px | `_store.membro.$id.tsx` | ✅ CONCLUÍDO |
| 2.6 | Conta Classificados Novo — padronização do botão Voltar (icon-only Apple HIG) | `_store.conta.classificados.novo.tsx` | ✅ CONCLUÍDO |

---

## 🟢 DOMÍNIO 3 — Workspace Operacional

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 3.1 | Workspace Shell — diagnóstico de erro destrutivo e transparente | `workspace.tsx` | ✅ CONCLUÍDO |
| 3.2 | Workspace Index — erradicação de AI-Smell (removido bloco conversacional "Diretrizes Operacionais / Boas Práticas"), métricas reais e ações rápidas | `workspace.index.tsx` | ✅ CONCLUÍDO |
| 3.3 | CRM Command Center — Central completa de CRM operacional com KPIs reais (Total, Ativos, Novos, LTV Médio), busca instantânea, filtros por status e disparo WhatsApp | `workspace.crm.tsx` | ✅ CONCLUÍDO |
| 3.4 | Pedidos Gestor — cupom térmico e ações padronizadas com formatMoney | `workspace.pedidos.gestor.tsx` | ✅ CONCLUÍDO |
| 3.5 | PDV — carrossel de categorias com snap-x snap-mandatory e touch targets ergonômicos | `workspace.pdv.index.tsx` | ✅ CONCLUÍDO |
| 3.6 | Toolbar Canônica — propagação universal de snap scroll (`snap-x snap-mandatory` e `snap-start`) em todas as listagens operacionais | `workspace-canonical-toolbar.tsx` | ✅ CONCLUÍDO |
| 3.7 | Advocacia — barra de filtros de prazos com snap-x nativo e botões shrink-0 | `workspace.advocacia.index.tsx` | ✅ CONCLUÍDO |

---

## 🔵 DOMÍNIO 4 — Checkout & Transações

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 4.1 | Checkout — barras de navegação entre etapas: grid-cols-2 no mobile / flex no desktop (Etapa 4 perfeitamente alinhada) | `_store.checkout.tsx` | ✅ CONCLUÍDO |
| 4.2 | Carrinho — container sem dead space (`px-0 sm:px-4 md:px-0`) | `_store.carrinho.tsx` | ✅ CONCLUÍDO |
| 4.3 | Quick Order Flow — persistência direta atômica e Human Short ID | `convenience-showcase-view.tsx` | ✅ CONCLUÍDO |

---

## 🟣 DOMÍNIO 5 — PWA, Brand Synchronization & Mobile Experience

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 5.1 | Extração e sincronização dos assets canônicos de `platform_brand_settings` | `public/brand-favicon.png`, `public/brand-logo.png` | ✅ CONCLUÍDO |
| 5.2 | Geração de ícones reais otimizados bicubic (192px, 512px, maskable, apple-touch-icon, favicon.ico 21KB) | `public/icons/*`, `public/favicon.*` | ✅ CONCLUÍDO |
| 5.3 | `manifest.json` com schema PWA oficial, atalhos rápidos (`/mercado`, `/buscar`, `/turismo`, `/conta`), categorias e cores | `public/manifest.json` | ✅ CONCLUÍDO |
| 5.4 | Server Handler dinâmico conectado atomicamente a `platform_brand_settings` e multi-tenant de lojas | `src/routes/api.pwa.manifest[.]json.ts` | ✅ CONCLUÍDO |
| 5.5 | `__root.tsx` sincronizado com apple-touch-icon, apple-mobile-web-app-title, application-name e link dinâmico | `src/routes/__root.tsx` | ✅ CONCLUÍDO |
| 5.6 | Service Worker `waesy-v2-pwa-sync` com cache de assets PWA estáticos e navegação resiliente | `public/sw.js` | ✅ CONCLUÍDO |
| 5.7 | Padronização dos botões Voltar no padrão Apple HIG (icon-only, touch target mínimo 44px) | `_store.cadastro.tsx`, `_store.entrar.tsx`, `_store.contato.tsx`, `_store.carrinho.tsx`, `_store.loja.$slug.senha.tsx`, etc. | ✅ CONCLUÍDO |
| 5.8 | Erradicação de jargões técnicos ("Master OS") e correção de vazamento de margem `-mx-4 px-4` com snap-x | `workspace.comercial.tsx`, `_store.entrar.tsx`, `_store.conta.pedidos.index.tsx` | ✅ CONCLUÍDO |

---

## 🟢 DOMÍNIO 6 — Ergonomia Apple HIG Universal, Sanitize & Zero-Jank

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 6.1 | Alvos de toque Apple HIG (44px/size-11) em botões flutuantes e menus contextuais | `booking-detail-mobile.tsx`, `event-detail-mobile.tsx`, `classified-detail-mobile.tsx`, `job-detail-mobile.tsx` | ✅ CONCLUÍDO |
| 6.2 | Refinamento da barra de chat mobile (`h-11` input e botões `size-11`) | `_store.conta.conversas.$id.tsx` | ✅ CONCLUÍDO |
| 6.3 | Saneamento canônico de contatos WhatsApp com `sanitizeWhatsAppPhone` (sem duplicidade 55) | `_store.pedido.$publicToken.confirmacao.tsx` | ✅ CONCLUÍDO |
| 6.4 | Isolamento de Shell Mobile (Regra 16) incluindo `/pedido` em `isCleanMobileAppPage` | `src/components/shell/app-shell.tsx` | ✅ CONCLUÍDO |
| 6.5 | Padronização de botões de retorno e compartilhamento nos fluxos de turismo, concurso, match e mobilidade | `_store.turismo.$id.tsx`, `_store.concurso.$id.tsx`, `_store.match-time.tsx`, `_store.mobilidade.tsx` | ✅ CONCLUÍDO |
| 6.6 | Padronização de botões de retorno nas páginas de métricas, criadores, salão e loja | `_store.conta.metricas.tsx`, `_store.conta.criadores.tsx`, `_store.garcom.tsx`, `_store.loja.$slug.tsx` | ✅ CONCLUÍDO |
| 6.7 | Alvos de toque de 44px no Diretório de Empresas e compartilhamento de perfil | `_store.diretorio.index.tsx`, `canonical-store-profile-view.tsx` | ✅ CONCLUÍDO |
| 6.8 | Validação de compilação sem erros (`npm run build` -> 0 erros) | `dist/_worker.js` | ✅ CONCLUÍDO |

---

## 🟢 DOMÍNIO 7 — Sincronização PWA da Marca & Erradicação Universal de Mocks / Silent Fallbacks (Regras 10, 19, 21, 22)

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 7.1 | Sincronização e geração canônica dos ícones PWA (`192x192`, `512x512`, maskables com 10% safe area, `apple-touch-icon.png` 180x180) a partir da marca real de alta resolução (`public/brand-favicon.png`, 1254x1254) | `public/icons/*`, `public/apple-touch-icon.png`, `public/manifest.json` | ✅ CONCLUÍDO |
| 7.2 | Atualização do Service Worker com bump de cache para `waesy-v3-brand-pwa-sync` para expurgo imediato de assets obsoletos | `public/sw.js` | ✅ CONCLUÍDO |
| 7.3 | Expansão de rotas móveis nativas limpas (Regra 16) em `isCleanMobileAppPage`: `/concurso`, `/garcom`, `/mobilidade`, `/match-time`, `/reputacao`, `/reclamar` | `src/components/shell/app-shell.tsx` | ✅ CONCLUÍDO |
| 7.4 | Erradicação de notas falsas 5.0 / 4.8 / 4.5 e avaliações simuladas nos serviços de Diretório, Turismo, Destinos e Harvester | `directory.functions.ts`, `travel-catalog.functions.ts`, `tourism.functions.ts`, `places-harvester.ts` | ✅ CONCLUÍDO |
| 7.5 | Erradicação de notas 5.0 forçadas e estatísticas simuladas na reputação Deals, Loja, CMS e CSAT do Atendimento | `deal-reviews.functions.ts`, `store.functions.ts`, `company-reputation-card.tsx`, `cms.functions.ts`, `workspace.avaliacoes.tsx`, `workspace.atendimento.index.tsx`, `jobs.functions.ts` | ✅ CONCLUÍDO |
| 7.6 | Erradicação de fallback arbitrário de 12x em favor de parcelamento dinâmico (1-24x) e modo "À vista" para 1x (Regra 22) | `_store.conta.classificados.novo.tsx`, `editorial-showcase-view.tsx`, `workspace.turismo.hoteis.tsx`, `TravelImmersiveStory.tsx`, `TravelPassportBoarding.tsx`, `TravelCurvedEditorial.tsx` | ✅ CONCLUÍDO |
| 7.7 | Blindagem da página de Reputação Comercial contra scores fictícios (RA 1000 simulado, concorrentes mockados) com estados vazios verídicos | `claim.reputacao.$entityId.tsx` | ✅ CONCLUÍDO |
| 7.8 | Validação integral de produção com 0 erros (`npm run build` -> 0 erros, worker bundle gerado) | `dist/_worker.js` | ✅ CONCLUÍDO |

---

## 🟢 DOMÍNIO 8 — Migração Canônica do Currículo para o Ecossistema Civil & Desacoplamento do Workspace

| # | Micro-Tarefa | Arquivo | Status |
|---|---|---|---|
| 8.1 | Criação da rota canônica civil de Currículo Profissional (`/conta/curriculo`) com layout modular, exportação PDF A4/Story e QR Code público | `src/routes/_store.conta.curriculo.tsx` | ✅ CONCLUÍDO |
| 8.2 | Desacoplamento e redirecionamento instantâneo da rota corporativa `/workspace/curriculo/editor` para `/conta/curriculo` | `src/routes/workspace.curriculo.editor.tsx` | ✅ CONCLUÍDO |
| 8.3 | Inclusão de "Meu Currículo" na Central da Minha Conta (`/conta`) no grupo Oportunidades | `src/routes/_store.conta.index.tsx` | ✅ CONCLUÍDO |
| 8.4 | Integração direta na tela de Candidaturas (`/conta/candidaturas`) com atalho prioritário para "Meu Currículo" | `src/routes/_store.conta.candidaturas.tsx` | ✅ CONCLUÍDO |
| 8.5 | Integração na Vitrine de Empregos (`/empregos`) com botão destacado para "Meu Currículo Digital" | `src/routes/_store.empregos.index.tsx` | ✅ CONCLUÍDO |
| 8.6 | Correção no menu de ferramentas de loja do Workspace substituindo "Currículo Builder" por "Recrutamento & Vagas" corporativo | `src/components/workspace/workspace-all-tools-dialog.tsx` | ✅ CONCLUÍDO |
| 8.7 | Inclusão de `/curriculo` na lista de páginas nativas limpas mobile (`isCleanMobileAppPage`) do AppShell | `src/components/shell/app-shell.tsx` | ✅ CONCLUÍDO |
| 8.8 | Persistência real em `profiles.resume_data` via `updateMemberResumeData` e `updateProfile` com RLS e Zod estrito | `src/services/auth.functions.ts` | ✅ CONCLUÍDO |

---

## 📊 Resumo Consolidado de Auditoria & Execução

| Domínio | Escopo | Concluídas |
|---|---|---|
| **Master Prompt V100** | **End-to-End Conversion Matrix, Order Integrity & Human UX** | **8 / 8 ✅** |
| Domínio 0 | Core Layouts & Global Physics | 8 / 8 ✅ |
| Domínio 1 | Vitrine Pública & Home Feed | 11 / 11 ✅ |
| Domínio 2 | Perfis Civis & Conta | 6 / 6 ✅ |
| Domínio 3 | Workspace Operacional & CRM Command Center | 7 / 7 ✅ |
| Domínio 4 | Checkout & Transações | 3 / 3 ✅ |
| Domínio 5 | PWA, Brand Synchronization & Mobile Experience | 8 / 8 ✅ |
| Domínio 6 | Ergonomia Apple HIG Universal, Sanitize & Zero-Jank | 8 / 8 ✅ |
| Domínio 7 | Sincronização PWA da Marca & Erradicação Universal de Mocks | 8 / 8 ✅ |
| Domínio 8 | Migração Canônica do Currículo para o Ecossistema Civil | 8 / 8 ✅ |
| **TOTAL GERAL DE ENTREGAS VINCULANTES** | **Auditoria E2E Sem Mocks ou Pendências** | **75 / 75 ✅** |
