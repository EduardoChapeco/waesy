# PLANO MESTRE DE CONTINUIDADE, REMEDIAÇÃO HOLÍSTICA E MICROFASES EXECUTÁVEIS

**Data de Emissão:** 2026-10-22T21:15:00-03:00  
**Status do Repositório:** Em Execução / Auditoria Contínua  
**Alinhamento Normativo:** `AGENTS.md` (B.1 a B.45), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `docs/PERFORMANCE.md`  
**Governança:** BigTech Executive Board (`pm`, `decompose-prd`, `security-guard`, `design-ops`, `qa-gatekeeper`)

---

## 1. Sumário Executivo & Propósito Deste Documento

Este documento constitui a **Fonte Única da Verdade (SSOT)** do status real do ecossistema Waesy nesta sessão de trabalho. Ele detalha:
1. O que foi **planejado, implementado e comprovado com testes automatizados e builds reais**;
2. O que foi **identificado como pendente, frágil, simulado ou "parece certo mas não está"** (análise anti-falso-positivo);
3. O plano de ataque estruturado em **microfases cirúrgicas e atômicas**, mapeando exatamente cada par **Tabela/Coluna (Postgres) ↔ Contrato BFF (Server Functions Zod) ↔ Rota/Componente UI (React/TanStack) ↔ Teste Automatizado (Vitest)**.

---

## 2. Balanço da Sessão Atual: O que Foi Efetivamente Entregue e Comprovado

Abaixo estão registradas as capacidades que foram criadas, auditadas e comprovadas com testes automatizados executados com sucesso nesta fase:

| Módulo / Iniciativa | Escopo Entregue | Evidência Técnica (Arquivos / Migrations / Testes) | Status de Teste |
| :--- | :--- | :--- | :--- |
| **Inteligência Comercial & Radar de Oportunidades de Turismo** | Migration das tabelas `travel_commercial_contacts`, `travel_interests` e `travel_opportunity_matches` com GIN indexes e RLS deny-by-default; motor determinístico de matching em 5 dimensões sem gasto de tokens; auto-disparo assíncrono em `upsertClassified`; cockpit multi-board com 5 visualizações táteis e importação em lote CSV/Texto. | `supabase/migrations/20261022000003_travel_commercial_intelligence_backlog.sql`<br>`src/services/travel-commercial-intelligence.functions.ts`<br>`src/routes/workspace.turismo.oportunidades.tsx`<br>`src/services/travel-commercial-intelligence.functions.test.ts` | **8/8 PASS** |
| **Motor de Templates, Isolamento de Nichos & Paridade Preview/Público** | Auditoria dos 14 casos canônicos de teste; erradicação de vazamento cruzado de atributos de turismo para os outros 16 nichos em `upsertClassified` e `livePreviewClassified`; normalização da taxonomia singular/plural (`niche-taxonomy-manifest.ts`); engine TetrisGrid com fechamento matemático sem gaps para 1, 3 e 8 cards; allowlist pública expandida garantindo paridade entre o preview e a vitrine pública de classificados. | `src/lib/classifieds/canonical-taxonomy.ts`<br>`src/lib/classifieds/canonical-specs-resolver.ts`<br>`src/lib/ad-engine/template-metamorphosis.ts`<br>`src/lib/classifieds/template-niche-preview.test.ts`<br>`src/components/ad-engine/preview/preview.test.ts` | **14/14 PASS** |
| **Plataforma Canônica de Endereços & Zero Vírgulas Órfãs** | Migration com coluna `has_no_number` em `user_addresses`; formatador canônico `formatCanonicalAddress` com deduplicação de município/UF e sanitização de tokens; stored procedures atômicas `save_user_address_atomic` e `set_default_user_address_atomic`; componente `CanonicalAddressForm` com banner GPS instantâneo, mapa MapLibre GL com pin arrastável, semáforo de CEP e toggle "Sem número"; componente `AddressCardHub` integrado à conta e checkout. | `supabase/migrations/20270223000000_advanced_address_platform_mercadolivre_parity.sql`<br>`src/lib/format-address.ts`<br>`src/lib/format-address.test.ts`<br>`src/services/addresses.functions.ts`<br>`src/components/address/canonical-address-form.tsx`<br>`src/components/address/address-card-hub.tsx`<br>`src/components/address/canonical-address-platform-end-to-end.test.ts` | **13/13 PASS** |
| **Blindagem Anti-Injeção de Ingressos (WCTS-1)** | Assinatura HMAC-SHA256 server-side obrigatória e barreira deny-by-default contra mutações diretas por roles client (`anon`/`authenticated`) na tabela `tickets`. | `src/lib/ticket-crypto.ts`<br>`src/services/ticket-crypto.test.ts` | **6/6 PASS** |
| **Desacoplamento de Pedidos & RBAC Multi-Tenant** | Extração de constantes de status de pedidos para módulo puro `order-constants.ts`, quebrando ciclos de importação em tempo de execução; blindagem RBAC de lojista e isolamento multi-tenant de pedidos. | `src/lib/order-constants.ts`<br>`src/services/order.functions.ts`<br>`src/services/security-rbac-multitenant-isolation.test.ts` | **12/12 PASS** |
| **Sincronização InfoTravel & Mineração de Operadoras** | Extensão Chrome e minerador local Node.js para extração de tarifas, hotéis e aéreos de grandes operadoras (CVC, Agaxtur, Trend, Orinter); BFF `travel-operator-sync.functions.ts` com reconciliação e dual-write no catálogo master. | `tools/infotravel-miner/`<br>`tools/infotravel-extension/`<br>`src/services/travel-operator-sync.functions.ts`<br>`src/services/travel-operator-sync.test.ts` | **4/4 PASS** |
| **Sub-nichos em Cascata & Governança de M&A** | Taxonomia de sub-nichos gastronômicos e serviços com conselhos profissionais (OAB, CREA, CRM); conversão de anúncio em loja com UUID estrito; governança de captação de investimento e NDAs. | `src/services/business-ma-and-subniches.test.ts`<br>`src/services/niche-isolation-and-routing.test.ts`<br>`src/services/niche-taxonomy-and-tokens.test.ts` | **26/26 PASS** |
| **Eliminação de Double Chrome & Refatoração de Negociações** | Erradicação de sub-headers internos conflitantes no mobile (`_store.carrinho.tsx`, `_store.conta.contratos.tsx`); remoção de nested `<FrostedCard>` no módulo de negociações (`_store.conta.negociacoes.tsx`); 13 testes adversariais aprovados. | `src/routes/_store.carrinho.tsx`<br>`src/routes/_store.conta.contratos.tsx`<br>`src/routes/_store.conta.negociacoes.tsx`<br>`src/components/shell/app-shell-mobile-header.adversarial.test.ts` | **13/13 PASS** |
| **Catraca CI do Design Lint (Redução de Débito)** | Redução contínua de violações e congelamento de baseline limpa sem regressões. | `design-lint.baseline.json`<br>`design-lint.report.json`<br>`docs/design/LINT_DASHBOARD.md` | **CATRACA PASS** |

---

## 3. Diagnóstico Holístico: "O que Parece Certo mas Não Está"

Esta seção identifica com precisão cirúrgica os pontos do sistema que compilam e parecem funcionais na superfície, mas contêm **fragilidades de persistência, dados não estruturados, concorrência aberta ou violações de acessibilidade**:

### 3.1 Checkout Transacional & Pedidos (`_store.checkout.tsx` ↔ `checkout.functions.ts` ↔ `orders`)
1. **Redirecionamento Pós-Checkout de Visitante para Rota Protegida (Telas "Pedido não encontrado"):**
   - *Sintoma:* Visitante sem login finaliza compra com sucesso e a tela redireciona para `/conta/pedidos/$id`.
   - *Defeito:* O loader de `/conta/pedidos/$id` exige sessão de usuário autenticado (`ssrClient.auth.getUser()`), gerando erro silencioso e tela vazia "Pedido não encontrado" para clientes visitantes, quando deveria redirecionar para a rota pública `/_store.pedido.$publicToken.confirmacao.tsx`.
2. **Zod Default Ineficiente para Campos Vazios:**
   - *Sintoma:* Se o cliente submete `number: ""`, o Zod aceita sem aplicar o default `"S/N"`.
   - *Defeito:* Ausência de preprocessamento com `z.preprocess()`, gravando strings vazias no banco que geram vírgulas soltas em notas fiscais e etiquetas de entrega.
3. **Passageiros e Reservas em JSONB sem Schema Formal:**
   - *Sintoma:* No checkout de turismo, a UI coleta passageiros (`passengers: Array<{ name, document, birthDate, phone, email, seat }>`), mas o backend grava esses dados dentro de um JSONB genérico `orders.checkout_niche_metadata`.
   - *Defeito:* Não existe coluna tipada `traveler_manifest` na tabela `orders`, nem validação Zod server-side em `CheckoutSchema` que garanta CPF válido ou maioridade do responsável pela reserva.
4. **Concorrência Aberta em Assentos e Horários de Serviços:**
   - *Sintoma:* O cliente escolhe um assento no ônibus (`seat`) ou horário de atendimento de serviço (`serviceTimeSlot`).
   - *Defeito:* A procedure `process_checkout_transaction_v2` verifica estoque de produtos físicos (`product_variants`), mas não executa lock pessimista (`FOR UPDATE`) sobre assentos de viagem ou horários de agenda. Dois clientes podem finalizar o mesmo assento ou horário simultaneamente.
5. **Abatimento de $WZ Não-Transacional:**
   - *Sintoma:* O cliente solicita pagamento parcial utilizando saldo da carteira local $WZ.
   - *Defeito:* O débito do saldo $WZ é acionado no Node.js após a finalização da procedure de banco em bloco `try/catch` desconectado. Se ocorrer timeout de rede entre a criação do pedido e a chamada de débito, o pedido é confirmado sem a dedução real do saldo.

### 3.2 Turismo, Propostas & Vouchers (`workspace.turismo.*` ↔ `propostas` ↔ `vouchers`)
1. **Falta de Deep-Link Hidratado do Radar para Nova Proposta:**
   - *Sintoma:* No cockpit de oportunidades (`workspace.turismo.oportunidades.tsx`), o corretor clica em "Criar Proposta" em um match de 95%.
   - *Defeito:* O botão apenas navega para `/workspace/turismo/propostas/novo` sem repassar os parâmetros de busca (`interest_id`, `contact_id`, `package_id`). O formulário abre em branco, obrigando o usuário a redigitar todas as informações.
2. **Ausência de Revogação Criptográfica de Vouchers Substituídos:**
   - *Sintoma:* Quando um pacote de turismo sofre alteração de voo (reacomodação aérea) ou troca de hotel, novos vouchers são gerados.
   - *Defeito:* O voucher antigo permanece com status ativo em `travel_vouchers` e o QR Code antigo continua escaneável, sem indicar que foi revogado ou reemitido.
3. **Validade Jurídica de Contratos Assinados:**
   - *Sintoma:* A rota pública `_store.contrato.$token.tsx` renderiza o selo visual de assinatura eletrônica.
   - *Defeito:* Falta gravação do hash SHA-256 amarrado ao carimbo de tempo server-side imutável no momento exato da aceitação, gerando vulnerabilidade em disputas judiciais.
4. **Itinerários com Escala Cruzando Meia-Noite:**
   - *Sintoma:* Voos noturnos exibem duração em horas sem indicador claro de chegada no dia seguinte.
   - *Defeito:* Falta badge visual canônico `+1 dia` nos cards de voos (`travel-flight-itinerary-card.tsx`).

### 3.3 Classificados & Editor Unificado (`_store.conta.classificados.novo.tsx`)
1. **Monólito de 11.694 Linhas:**
   - *Sintoma:* O arquivo `_store.conta.classificados.novo.tsx` contém toda a lógica dos 17 nichos, formulários, preview lateral e validações em um único arquivo.
   - *Defeito:* Risco de vazamento cruzado de atributos entre nichos (Regra B.37), lentidão de compilação e re-renders desnecessários.
2. **Rascunhos sem Persistência Cloud (Multi-Dispositivo):**
   - *Sintoma:* O autosave opera unicamente em `localStorage`.
   - *Defeito:* Se o usuário inicia o cadastro no celular e quer continuar no desktop, os dados não estão disponíveis.
3. **Fila de Upload de Imagens sem Retry Granular:**
   - *Sintoma:* Upload de até 15 imagens simultâneas.
   - *Defeito:* O envio ocorre em lote; se uma imagem falha por oscilação de rede móvel, o lote inteiro é abortado sem oferecer botão de reenvio apenas para a imagem que falhou.

### 3.4 Negociações & Custódia Transacional (`_store.conta.negociacoes.tsx` ↔ `deals.functions.ts`)
1. **Falta de Transição Direta de Aceite para Escrow:**
   - *Sintoma:* Quando comprador ou vendedor aceitam uma contraproposta, o status muda para `accepted`.
   - *Defeito:* Não há acionamento automático de ordem em custódia na tabela `orders`, deixando o fluxo transacional sem fechamento financeiro imediato.

### 3.5 Chat Transacional & Resiliência Mobile (`_store.conta.conversas.$id.tsx` ↔ `chat.functions.ts`)
1. **Queda de WebSocket ao Suspender Tela Mobile:**
   - *Sintoma:* Quando o smartphone suspende o navegador em segundo plano, o canal de mensagens em tempo real é cortado.
   - *Defeito:* Ao reativar o aplicativo, falta rotina automática de reconciliação de mensagens perdidas (`visibilitychange` listener com `getMissedMessages`).

### 3.6 Design System & Acessibilidade WCAG 2.2 AA (`DL-15` & `DL-14`)
1. **Violações de DL-15 (`:focus-visible` ausente):**
   - *Sintoma:* Botões e links funcionam com clique de mouse em desktop.
   - *Defeito:* Controles interativos sem `:focus-visible:ring-2 focus-visible:ring-primary`, impedindo navegação por teclado.
2. **Alvos de Toque Móveis < 44px (`DL-14`):**
   - *Sintoma:* Botões com `h-8` ou `h-9` em tabelas e cabeçalhos.
   - *Defeito:* Dimensão inferior a 44px no mobile (`h-11 min-h-11`), gerando erros de toque em smartphones.

---

## 4. Matriz de Microfases Cirúrgicas e Roteiro de Execução

Todas as correções pendentes estão estruturadas em microfases atômicas e testáveis:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ONDA 1: HARDENING DO CHECKOUT TRANSACTIONAL & GUEST ROUTING (CK)       │
│ CK-01: Redirecionamento de Visitantes & Sanitização Zod de Endereço    │
│ CK-02: Schema Zod e Coluna Tipada para Manifesto de Passageiros        │
│ CK-03: Trava Atômica de Concorrência para Assentos e Horários          │
│ CK-04: Abatimento Atômico de Saldo $WZ na Stored Procedure             │
├────────────────────────────────────────────────────────────────────────┤
│ ONDA 2: DESACOPLAMENTO DE CLASSIFICADOS & RASCUNHOS (CL)               │
│ CL-01: Decomposição Modular de _store.conta.classificados.novo.tsx     │
│ CL-02: Persistência Cloud de Rascunhos Multi-Dispositivo               │
│ CL-03: Fila Resiliente de Upload de Mídias com Retry Granular          │
├────────────────────────────────────────────────────────────────────────┤
│ ONDA 3: NEGOCIAÇÕES, CUSTÓDIA & CHAT RESILIENTE (TX)                   │
│ TX-01: Transição Automática de Proposta Aceita para Ordem Escrow       │
│ TX-02: Reconciliação Offline/Background de WebSocket no Chat Mobile    │
├────────────────────────────────────────────────────────────────────────┤
│ ONDA 4: INTEGRAÇÃO COMERCIAL DE TURISMO (TR)                           │
│ TR-01: Deep-Link Hidratado do Radar para Nova Proposta Comercial       │
│ TR-02: Ciclo de Vida, Revogação e Reemissão de Vouchers de Embarque    │
│ TR-03: Itinerários de Voo com Alerta Canônico +1 Dia                   │
├────────────────────────────────────────────────────────────────────────┤
│ ONDA 5: ACESSIBILIDADE WCAG 2.2 AA & CATRACA CI (DS)                   │
│ DS-01: Erradicação Completa das Violações P0 de DL-15                  │
│ DS-02: Adequação de Alvos de Toque Móveis para Piso 44px (DL-14)       │
│ DS-03: Desktop Shell Master-Detail em Telas Expandidas (>= 1024px)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Detalhamento das Microfases

### Microfase CK-01: Redirecionamento de Visitantes & Sanitização Zod de Endereço
- **Objetivo:** Eliminar a tela "Pedido não encontrado" para clientes não autenticados e assegurar que números de endereço vazios virem `"S/N"`.
- **Tabela / Banco:** `orders(public_token)`.
- **Contrato BFF:** `src/services/checkout.functions.ts` — `z.preprocess` em `shippingAddress.number` e retorno de `publicToken`.
- **UI / Frontend:** `src/routes/_store.checkout.tsx` — bifurcação de navegação (`!user` -> `/_store.pedido.$publicToken.confirmacao.tsx`).
- **Critério de Aceite (EARS):** *QUANDO um visitante não autenticado concluir o checkout, O sistema SHALL redirecionar para a confirmação pública com token, exibindo QR Code e recibo sem requerer login.*
- **Teste Automatizado:** Teste unitário de payload em `checkout.functions.test.ts`.

### Microfase CK-02: Manifesto Estrito de Passageiros e Reservas no Checkout
- **Objetivo:** Adicionar tipagem rigorosa para reservas de turismo, validando dados de passageiros antes de confirmar a compra.
- **Tabela / Banco:** `public.orders` (coluna `traveler_manifest JSONB`).
- **Contrato BFF:** `src/services/checkout.functions.ts` — adicionar `TravelerManifestSchema` ao `CheckoutSchema`.
- **UI / Frontend:** `src/routes/_store.checkout.tsx` — validar campos de passageiro com feedback visual inline.
- **Critério de Aceite (EARS):** *SE o carrinho contiver pacotes de turismo, O sistema SHALL exigir nome completo e CPF para todos os passageiros maiores de idade, persistindo os dados em `orders.traveler_manifest`.*
- **Teste Automatizado:** Teste unitário exercitando payload de checkout com passageiros válidos e inválidos.

### Microfase CK-03: Trava Atômica de Concorrência para Assentos e Horários Agendados
- **Objetivo:** Impedir double-booking em viagens com assentos marcados e agendamentos de serviços.
- **Tabela / Banco:** Procedure `process_checkout_transaction_v2` com validação de `seat_allocations` e `service_bookings`.
- **Contrato BFF:** `src/services/checkout.functions.ts`.
- **UI / Frontend:** `src/components/checkout/delivery-selector.tsx` e mapa de assentos.
- **Critério de Aceite (EARS):** *QUANDO dois clientes tentarem finalizar o mesmo assento simultaneamente, O sistema SHALL confirmar o primeiro e rejeitar o segundo com mensagem amigável de assento indisponível.*
- **Teste Automatizado:** Teste concorrente simulando duas finalizações simultâneas do mesmo assento.

### Microfase CK-04: Abatimento Atômico de Saldo $WZ na Procedure de Checkout
- **Objetivo:** Unificar a dedução de saldo de carteira com a confirmação do pedido em uma única transação de banco.
- **Tabela / Banco:** Procedure `process_checkout_transaction_v2` recebendo `p_use_wz_balance BOOLEAN`.
- **Contrato BFF:** `src/services/checkout.functions.ts` — remover dedução pós-pedido em JavaScript e delegar ao Postgres.
- **UI / Frontend:** `src/routes/_store.checkout.tsx` — manter o toggle visual com cálculo dinâmico do saldo restante.
- **Critério de Aceite (EARS):** *SE o abatimento de $WZ falhar por saldo insuficiente, O sistema SHALL abortar a criação do pedido garantindo rollback integral.*
- **Teste Automatizado:** Teste de idempotência e saldo insuficiente.

### Microfase CL-01: Decomposição Modular de `_store.conta.classificados.novo.tsx`
- **Objetivo:** Desmembrar o monólito de 11.694 linhas em 5 passos desacoplados, mantendo 100% da reatividade e paridade.
- **Subcomponentes Alvo:**
  1. `ClassifiedStep1Niche.tsx` (Seleção e confirmação de nicho)
  2. `ClassifiedStep2BasicInfo.tsx` (Título, descrição, categoria e valores)
  3. `ClassifiedStep3Media.tsx` (Upload de fotos e highlights)
  4. `ClassifiedStep4NicheSpecs.tsx` (Ficha técnica específica por nicho via `canonical-specs-resolver`)
  5. `ClassifiedStep5Review.tsx` (Preview lateral, template selector e confirmação)
- **Critério de Aceite (EARS):** *O sistema SHALL manter o mesmo payload de submissão para `upsertClassified`, reduzindo o arquivo principal para menos de 1.000 linhas.*
- **Teste Automatizado:** Suíte existente `template-niche-preview.test.ts` deve continuar 100% verde.

### Microfase CL-02: Persistência Cloud de Rascunhos Multi-Dispositivo
- **Objetivo:** Permitir que o anunciante inicie o cadastro no smartphone e conclua no desktop com persistência transparente.
- **Tabela / Banco:** Migration criando `classified_drafts(id, user_id, niche, step, payload_json, updated_at)`.
- **Contrato BFF:** `saveClassifiedDraft` e `loadClassifiedDraft` em `classifieds.functions.ts`.
- **UI / Frontend:** Hook `useClassifiedCloudDraft` com debounce de 500ms e sync periódico.
- **Critério de Aceite (EARS):** *QUANDO o usuário trocar de aparelho, O formulário de anúncio SHALL carregar automaticamente o rascunho salvo na nuvem.*
- **Teste Automatizado:** Teste de round-trip de rascunhos.

### Microfase CL-03: Fila Resiliente de Upload de Mídias com Retry Granular
- **Objetivo:** Permitir reenvio individual de fotos que falharem durante o upload do anúncio.
- **Tabela / Banco:** Bucket `classifieds-media`.
- **Contrato BFF:** `src/services/storage.functions.ts` (`uploadClassifiedMedia`).
- **UI / Frontend:** Componente de upload com barra de progresso individual e botão de retry por card de foto.
- **Critério de Aceite (EARS):** *SE uma foto falhar durante o envio, O sistema SHALL destacar visualmente o card com erro e disponibilizar botão de reenvio sem reiniciar as fotos já concluídas.*
- **Teste Automatizado:** Teste de mock de falha de rede em `storage-media.test.ts`.

### Microfase TX-01: Transição Automática de Proposta Aceita para Custódia (Escrow)
- **Objetivo:** Transformar negociações aceitas em transações financeiras reais com geração automática de pedido protegido.
- **Tabela / Banco:** Trigger ou RPC `convert_deal_to_order` criando registro em `orders` com tipo de pagamento em custódia segura.
- **Contrato BFF:** Em `src/services/deals.functions.ts`, estender `acceptDealProposal` para invocar a conversão transacional atômica e retornar o `orderId`.
- **UI / Frontend:** Em `src/routes/_store.conta.negociacoes.tsx`, após confirmação de aceite, exibir diálogo informativo de garantia e redirecionar para a finalização do pagamento.
- **Critério de Aceite (EARS):** *QUANDO o comprador aceitar uma contraproposta, O sistema SHALL gerar a ordem de custódia e navegar imediatamente para o pagamento protegido.*
- **Teste Automatizado:** Teste de máquina de estados de negociação.

### Microfase TX-02: Reconciliação Offline/Background de WebSocket no Chat Mobile
- **Objetivo:** Garantir que o chat em dispositivos móveis não perca mensagens ao alternar entre aplicativos ou ao reativar a tela.
- **Tabela / Banco:** Índices compostos em `chat_messages(thread_id, created_at DESC)`.
- **Contrato BFF:** Server function `getMissedMessages({ threadId, sinceTimestamp })` em `src/services/chat.functions.ts`.
- **UI / Frontend:** Em `src/routes/_store.conta.conversas.$id.tsx`, listener `visibilitychange` com reconnect automático.
- **Critério de Aceite (EARS):** *QUANDO a janela voltar a ficar visível, O chat SHALL carregar todas as mensagens emitidas durante a inatividade sem duplicação de cards.*
- **Teste Automatizado:** Teste de reconciliação de mensagens perdidas.

### Microfase TR-01: Deep-Link Hidratado do Radar para Nova Proposta Comercial
- **Objetivo:** Conectar a oportunidade identificada pelo radar à elaboração imediata da proposta comercial sem redigitação.
- **Tabela / Banco:** Consulta a `travel_opportunity_matches` e `travel_interests`.
- **Contrato BFF:** `src/services/travel-commercial-intelligence.functions.ts` (`getOpportunityDetailsForProposalFn`).
- **UI / Frontend:** `src/routes/workspace.turismo.oportunidades.tsx` (passar `?opportunityId=...` no botão "Criar Proposta") e `src/routes/workspace.turismo.propostas.novo.tsx` (ler o ID e hidratar o formulário no loader).
- **Critério de Aceite (EARS):** *QUANDO o corretor clicar em "Criar Proposta" no card de match, O sistema SHALL abrir a tela de proposta com nome, telefone, destino e quantidade de passageiros pré-carregados.*
- **Teste Automatizado:** Teste de navegação e hidratação do loader da rota de proposta.

### Microfase TR-02: Ciclo de Vida, Revogação e Reemissão de Vouchers de Embarque
- **Objetivo:** Garantir que alterações no roteiro de viagem invalidem vouchers obsoletos.
- **Tabela / Banco:** Tabela `public.travel_vouchers` (colunas `status`, `reissued_to_id`, `revoked_reason`).
- **Contrato BFF:** `src/services/travel-vouchers.functions.ts` (`reissueVoucherFn`).
- **UI / Frontend:** `src/routes/_store.voucher.$token.tsx` — renderizar banner informativo caso o voucher tenha sido revogado ou substituído.
- **Critério de Aceite (EARS):** *SE um voo ou passageiro for alterado no pacote, O sistema SHALL marcar o voucher anterior como revogado e emitir novo voucher com novo hash criptográfico.*
- **Teste Automatizado:** Teste unitário de reemissão em `travel-voucher-lifecycle.test.ts`.

### Microfase TR-03: Itinerários de Voo com Alerta Canônico +1 Dia
- **Objetivo:** Exibir itinerários noturnos com indicador claro de chegada no dia seguinte.
- **Tabela / Banco:** `travel_packages`.
- **Contrato BFF:** `src/services/travel-packages.functions.ts`.
- **UI / Frontend:** `src/components/classifieds/travel-flight-itinerary-card.tsx` — badge `+1 dia` nos voos que cruzam a meia-noite.
- **Critério de Aceite (EARS):** *SE a data/hora de chegada for posterior à data de partida, O card SHALL exibir badge discreto "+1 dia" ao lado do horário de destino.*
- **Teste Automatizado:** Teste unitário em `travel-flight-itinerary-card.test.ts`.

### Microfase DS-01: Erradicação das Violações P0 de DL-15 (`:focus-visible`)
- **Objetivo:** Zerar o contador de violações P0 no linter de design, garantindo acessibilidade plena por teclado.
- **Arquivos Identificados:** 32 arquivos mapeados por `tools/find-dl15.mjs` (ex.: `classified-detail-desktop.tsx`, `_store.doacoes.tsx`, `experience-media-carousel.tsx`, `workspace.pedidos.gestor.tsx`, `workspace.advocacia.index.tsx`, `viajante.carteira.tsx`).
- **Ação:** Inserção das classes canônicas `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` em todos os elementos `<button>`, `<Link>` e interativos com `onClick`.
- **Critério de Aceite (EARS):** *A execução de `node scripts/design-lint.mjs` SHALL reportar exatamente 0 violações de severidade P0.*
- **Teste Automatizado:** Execução determinística do design lint via script de CI.

### Microfase DS-02: Adequação de Alvos de Toque Móveis para Piso 44px (DL-14)
- **Objetivo:** Garantir que todos os botões e links de navegação no mobile cumpram o piso físico de 44x44px.
- **Arquivos Identificados:** Tabelas do Workspace, filtros de busca e botões de ação em linhas de dados.
- **Ação:** Aplicação da classe canônica `h-11 min-h-11` em visualizações móveis (<600px).
- **Critério de Aceite (EARS):** *Nenhum controle tátil na viewport móvel SHALL possuir altura ou largura inferior a 44px.*
- **Teste Automatizado:** Verificação automatizada por `design-lint.mjs` contra a regra DL-14.

### Microfase DS-03: Desktop Shell Master-Detail em Telas Expandidas (>= 1024px)
- **Objetivo:** Aproveitar a largura disponível em telas desktop sem esticar caixas móveis.
- **UI / Frontend:** Implementar layout master-detail (lista lateral + detalhe persistente) nas telas de conversas (`_store.conta.conversas`), pedidos (`_store.conta.pedidos`) e negociações (`_store.conta.negociacoes`) para viewports $\ge$ 1024px.
- **Critério de Aceite (EARS):** *EM viewports desktop, O sistema SHALL renderizar a lista de conversas e o chat ativo lado a lado em duas colunas.*
- **Teste Automatizado:** Inspeção de layout responsivo.

---

## 5. Matriz de Rastreabilidade e Catracas de Aceite (Definition of Done)

Para cada microfase executada no repositório, os seguintes gates devem ser comprovados antes de considerar o item concluído:

```text
[G-1] Migration e Schema: Se houver alteração de banco, migration declarativa idempotente com RLS deny-by-default.
[G-2] Contrato BFF: Server Function tipada com Zod, desestruturação defensiva e tratamento de erro amigável.
[G-3] UI / Superfície: Componente squircle, sem brackets arbitrários, com foco teclado (:focus-visible) e alvos >= 44px.
[G-4] Teste Automatizado: Teste unitário ou de integração com Vitest comprovando o caso de uso positivo e negativo.
[G-5] Design Lint: Zero regressão na baseline; catraca de CI limpa.
[G-6] Typecheck & Build: Compilação TypeScript com 0 erros (`npm run typecheck` e `npm run build`).
```

---

*Documento gerado e registrado no repositório para governança contínua e rastreabilidade total do ecossistema Waesy.*
