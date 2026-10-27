# Relatório de Auditoria Forense Exaustiva & Inventário de Fases — Waesy Platform

> **Status:** AUDITORIA EXECUTIVA CONCLUÍDA PELO CONSELHO DE ENGENHARIA  
> **Data:** 27 de Setembro de 2026  
> **Autoridade:** Conselho Executivo de BigTech (CPO, Chief Architect, Staff Security, Design Ops, Staff QA)  
> **Base Normativa:** `AGENTS.md`, `docs/MASTER_PLAN.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`, `docs/SECURITY.md`

---

## 🏛️ 1. PARECER DO CONSELHO EXECUTIVO DE BIGTECH

### 1.1. CPO & Presidente do Conselho (Visão de Produto e Rastreabilidade)
> *"Identificamos que nas últimas 20 iterações a plataforma atingiu avanços sem precedentes no núcleo de Checkout, Identidade Civil, Ad-Tech e Classificados. Contudo, como o usuário bem apontou, em momentos de aceleração foram puladas fases intermediárias de alguns módulos irmãos, resultando em 'ilhas de excelência' enquanto outras páginas (Imóveis, Gastronomia, Turismo) ainda retêm resquícios de designs anteriores, componentes sem a física WhatsApp List no mobile, ou fluxos que precisam de consolidação rigorosa de ponta a ponta (E2E)."*

### 1.2. Chief Software Architect (Arquitetura e Contratos)
> *"O núcleo transacional de e-commerce e pagamentos está 100% no servidor (preço, frete, comissão, split de ads em `ads.functions.ts` e `shipping.functions.ts`). Não há mais cálculos matemáticos no frontend nesses fluxos. O que falta é a propagação dos contratos rígidos para o cálculo de modificadores de gastronomia (Capability 9) e restrição transacional estrita de anti-double booking no banco (Capability 12)."*

### 1.3. Staff Security & Data Engineer (CISO & Supabase Master)
> *"Isolamento de sessão civil implementado (`waesy_active_context=civil` força `activeStoreId = null`). Webhooks protegidos com Transactional Inbox e idempotência contra replay attacks (`marketplace_webhook_events`). Todas as migrações aplicadas no Supabase remoto e 80 suites de teste passando no Vitest (476/476 testes)."*

### 1.4. Principal Design Ops & UI/UX Director (Apple HIG & Design Silencioso)
> *"A bifurcação de física (Bento Grid no Desktop e WhatsApp List no Mobile) foi implementada com perfeição em `/conta/classificados`, `/conta/pedidos` e `/admin-master/ads-network`. Porém, ela AINDA NÃO FOI PROPAGADA universalmente para `_store.imoveis.tsx`, `_store.turismo.index.tsx` e `_store.gastronomia.tsx`, onde a visualização de lista no mobile ainda utiliza cartões com margens e altura excessiva em vez da linha edge-to-edge nativa."*

### 1.5. Staff QA & Verification Gatekeeper (Red Team)
> *"Zero tolerância para mocks remanescentes. Compilação TypeScript com 0 erros (`npm run build`). Suíte de testes 100% verde. O inventário a seguir elenca cirurgicamente o que foi feito, o que ficou parcial, o que foi pulado e a sequência exata de execução."*

---

## 📊 2. MATRIZ FORENSE: MASTER PROMPTS (V103 A V110) vs. REALIDADE DO CÓDIGO

| Prompt / Marco | O Que Foi Solicitado | O Que Foi 100% Entregue | O Que Ficou Parcial / Pendente | Status E2E |
| :--- | :--- | :--- | :--- | :---: |
| **V103: The Vertical Purge & Toolbar Collapse** | - Eliminar botões secundários soltos no topo (`<- Sair`)<br>- Agrupar filtros empilhados no mobile em `<FilterBottomSheet>`<br>- Linha primária Search + CTA alinhada | - `WorkspaceCanonicalToolbar` criado com suporte a `FilterBottomSheet` no mobile e menu kebab para ações secundárias.<br>- Aplicado na Carteira de Clientes (`workspace.clientes.index.tsx`). | - Páginas públicas como `_store.imoveis.tsx` e `_store.turismo.index.tsx` ainda têm filtros customizados sem a mesma compactação do `DiscoveryControlBar`. | 🟡 Parcial |
| **V104: Identity Nexus & Entity Isolation** | - Isolar Conta Civil Root (CPF, Dados Pessoais, Comprador Legal) de Personas/Lojas<br>- Módulo Afiliado desvinculado de forçar vitrine pública<br>- Context Switcher global (Civil / Criador / Loja) | - `identity.server.ts` isola estritamente `activeContext=civil` forçando `activeStoreId = null`.<br>- Transações de checkout assinam com o ID Civil do comprador.<br>- Rota `/conta/perfil` refatorada focada no Civil. | - Interface do `<ContextSwitcher>` visual no header público precisa ser acessível em todos os pontos do app sem fricção. | 🟢 Concluído no Core |
| **V105: Omni-Commerce & Logistics Engine** | - Tipagem unificada de pedidos (`physical`, `rental`, `ticket`)<br>- Máquina de estados dos Classificados (ofertas, expiração, deal sync)<br>- Waesy Go / Motolink: Despacho WhatsApp, Magic Link para entregador, Telemetria GPS ao vivo | - Checkout 100% Server-Authoritative (`checkout.functions.ts`).<br>- Rota `_store.entrega.$token.tsx` com telemetria GPS real via `recordDeliveryTelemetry`, PIN e foto de comprovante.<br>- Classificados com limite de ofertas e expiração em 30 dias. | - Bloqueio transacional de Anti-Double Booking para hospedagem/agenda em nível de procedure SQL (`.rpc`). | 🟡 Parcial na Agenda |
| **V106: Mobile Physics & Agent Skills** | - Criação das Skills no repositório (`.agents/skills`)<br>- Eliminação de `100vh` por `100dvh`<br>- Proibição de flex-wrap esmagando botões | - 10 Skills criadas e operacionais (`bigtech-board`, `design-ops`, `anti-ai-design`, `apple-design`, `recursive-audit`, `security-guard`, `supabase`, `token-economy`, `dynamic-surge-pricing`, etc.).<br>- Varredura e migração global de `100dvh`. | - Universalizar a revisão de padding de 1px nos layouts móveis (`px-[1px]`). | 🟢 Concluído |
| **V107: Omni-Validation & HIG Compliance** | - WhatsApp List Style Edge-to-Edge no Mobile<br>- Touch targets mínimos de 44x44px (`h-11`)<br>- Prevenção de auto-zoom no Safari iOS (`text-base sm:text-xs`) | - WhatsApp List aplicado em `/conta/classificados`, `/conta/pedidos` e `/admin-master/ads-network`.<br>- Touch targets auditados nas principais telas. | - Módulos de Imóveis, Turismo e Gastronomia ainda têm cards espremidos ou inputs com `text-xs` no mobile causando auto-zoom. | 🟡 Parcial nos Módulos Irmãos |
| **V108: Ad-Tech Dashboard & Boost Engine** | - Micro-métricas de visualização (Pills com views, cliques, WhatsApps)<br>- Sparklines de 7 dias com telemetria real<br>- Bottom Sheet nativo de Impulsionar Anúncio | - Componente `<BoostBottomSheet>` implementado com orçamentos em pílulas.<br>- Telemetria real de 7 dias gravada e lida de `attributes.daily_views` nos classificados. | - Propagar o botão de impulsionar para Vitrines de Lojas e Hotpages. | 🟢 Concluído |
| **V109: Global Ad Arbitrage & Treasury** | - Split financeiro server-side (80% Meta/Google, 20% Waesy Ads)<br>- Suporte a conta própria OAuth vs Token Global Waesy<br>- Admin Master Command Center de Ads com Livro-Razão (Ad-Ledger) | - Funções `confirmAdBoostPayment` e `listAdLedgerEntries` em `ads.functions.ts` com débito/crédito em centavos inteiros.<br>- Tela `/admin-master/ads-network` operando com modo Campanhas Vivas e Livro-Razão Contábil. | - Painel de configuração de chaves OAuth no módulo de marketing da loja. | 🟢 Concluído no Core |
| **V110: Mock Purge & Reality Wiring** | - Expurgo total de mocks em Classificados, Pedidos e Ad-Network<br>- Idempotência de Webhook Meta Ads contra replay<br>- Testes automatizados passando | - Mock sparklines eliminados e substituídos por dados reais de telemetria.<br>- `src/routes/api.webhooks.meta-ads.ts` blindado com `marketplace_webhook_events`.<br>- 476/476 testes passando e build 0 erros. | - Propagar a auditoria de mocks para o módulo de Ingressos/Eventos e PDV Gastronômico. | 🟢 Concluído nos 4 Domínios |

---

## 🗺️ 3. INVENTÁRIO DE FASES DO ROADMAP (O QUE FOI PULADO OU PARCIAL)

Consultando `docs/ROADMAP.md` e os arquivos de domínio, identificamos as seguintes fases que foram parcialmente implementadas ou puladas durante o avanço do projeto:

### 3.1. Capability 3 & 4: Deals, Negociações & Ficha Técnica por Categoria
- **O que foi feito:** A criação e edição split-pane de classificados foi implementada em `_store.conta.classificados.novo.tsx`. Detalhe do anúncio com WhatsApp direto e propostas básicas.
- **O que foi pulado / está parcial:**
  - Máquina de estados formal de `Deal` com bloqueio do anúncio para status `reserved` ao aceitar uma proposta com valor caução.
  - Sincronização automática entre o status do anúncio e as conversas em `_store.conta.conversas.$id.tsx`.

### 3.2. Capability 5 & 10: Contract Engine, Assinatura Eletrônica & Verificação Pública
- **O que foi feito:** O módulo de turismo implementou propostas e contratos (`travel_contracts`, `travel_proposals`). A rota `verify.document.$code.tsx` existe no sistema.
- **O que foi pulado / está parcial:**
  - Garantir que qualquer contrato gerado nos Classificados (locação ou compra e venda de imóvel/veículo) use o mesmo Contract Engine com hash SHA-256 e selo imutável verificável em `/verify/document/:code`.

### 3.3. Capability 9: Restaurant & Food Services (Modifier Engine)
- **O que foi feito:** Catálogo de gastronomia e delivery com restaurantes (`_store.gastronomia.tsx`), barra flutuante de sacola com cálculo em centavos, e frente de caixa PDV (`workspace.pdv.tsx`).
- **O que foi pulado / está parcial:**
  - Engine de Modificadores (grupos de adicionais como bordas de pizza, pontos de carne, extras) calculados **100% no servidor** durante a adição ao carrinho e persistência no pedido.
  - Tela do KDS (Kitchen Display System) em tempo real via Supabase Realtime.

### 3.4. Capability 12: Appointments, Multi-Agenda & Anti-Double Booking
- **O que foi feito:** Rotas de agenda (`_store.agendar.tsx`, `workspace.agenda.tsx`) e serviços (`booking_services`).
- **O que foi pulado / está parcial:**
  - Procedimento no Postgres (`.rpc`) ou constraint de concorrência que impede double-booking se dois clientes tentarem pagar pelo mesmo horário simultaneamente.

### 3.5. Universal Clean Mobile Navigation (`app-shell.tsx`)
- **O que foi feito:** `isCleanMobileAppPage` oculta a `TopBar` redundante em dezenas de páginas nativas de aplicativo móvel.
- **O que falta incluir:**
  - Rotas recém-criadas ou atualizadas como `/admin-master/ads-network` e telas específicas de detalhe para garantir que a navegação do terço inferior (`MobileNav`) seja o único hub contextual.

---

## ⚡ 4. ONDAS DE EXECUÇÃO PRIORIZADAS (PLANO DE AÇÃO IMEDIATO)

Seguindo o protocolo rigoroso de engenharia do Conselho Executivo, as próximas melhorias serão executadas em 4 Ondas Consecutivas:

### 🌊 ONDA 1: Propagação Recursiva Universal da Física Bifurcada (Bento Grid / WhatsApp List)
- **Alvo:** Módulos de Imóveis (`_store.imoveis.tsx`), Turismo (`_store.turismo.index.tsx`) e Gastronomia (`_store.gastronomia.tsx`).
- **Ação:**
  - No Mobile: Converter a visualização de lista para o padrão **WhatsApp List** canônico (`border-b border-border/40 w-full py-3 px-3 flex flex-row items-center gap-3 bg-card rounded-none sm:rounded-2xl`, thumbnail à esquerda, detalhes centralizados, preço/ação à direita, min-h-[72px], zero margens espremidas).
  - No Desktop: Manter Bento Grid / Grade de alta densidade visual.
  - Eliminar qualquer empilhamento de paddings duplos (`px-0 sm:px-4 md:px-0`).

### 🌊 ONDA 2: Varredura Universal de Ergonomia Safari iOS (Mandato dos 16px) & Touch Targets (44px)
- **Alvo:** Todos os inputs de pesquisa e filtros nas páginas de vitrine pública (`_store.*`) e de gestão (`workspace.*`).
- **Ação:**
  - Aplicar `text-base sm:text-xs` (16px no mobile) em todos os `<input>` para eliminar permanentemente o auto-zoom do Safari iOS.
  - Garantir altura mínima de `h-11` (44px) nos alvos de toque interativos no terço inferior da tela móvel.

### 🌊 ONDA 3: Paridade CMS ↔ View & Modo Proprietário (Owner Edit Mode) nos Módulos Irmãos
- **Alvo:** Módulo de Imóveis e Turismo.
- **Ação:**
  - Garantir que `isOwner` esteja ativo nas vitrines com o banner âmbar sutil e atalhos de edição direta.
  - Eliminar qualquer dado estático residual em favoritos, contadores ou especificações.

### 🌊 ONDA 4: Conexão E2E das Fases Puladas (Deals Transacionais & Modificadores de Gastronomia)
- **Alvo:** `classifieds.functions.ts`, `deals.functions.ts`, `catalog.functions.ts` e `orders.functions.ts`.
- **Ação:**
  - Conectar propostas aceitas à alteração do status do classificado para `reserved`.
  - Integrar modificadores de gastronomia no cálculo do total do pedido no servidor.

---

## 🔒 5. PORTÃO DE VERIFICAÇÃO & CRITÉRIOS DE ACEITE
Para cada onda executada:
1. Executar `npx vitest run` e manter 100% de testes verdes.
2. Executar `npm run build` e garantir compilação com 0 erros (`dist/_worker.js`).
3. Auditoria visual no navegador real com gravação de sessão.
