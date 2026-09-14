# Modelo de Domínio — Plataforma Waesy

Documento canônico de entidades, relações, invariantes e máquinas de estado da Waesy.

Convenções gerais: identificadores internos são UUID; dinheiro é inteiro em centavos + `currency`; datas são ISO UTC persistidas, exibidas em `America/Sao_Paulo`; toda tabela carrega `organization_id` (e `store_id` quando aplicável) para isolamento multi-tenant; toda tabela sensível possui RLS deny-by-default.

## 1. Organização, Perfis e Contextos (Social vs Business)

A plataforma Waesy suporta múltiplos perfis para um mesmo usuário.

```text
User (1) ──< UserProfile (N) (Contextos Sociais/Administrativos)
UserProfile ──< OrganizationRole (N) >── Organization (1)
Organization (1) ──< BusinessProfile (Loja/Banda/Organizador)
```

- **User**: identidade de autenticação (Supabase Auth).
- **UserProfile**: O perfil social do usuário ("Pessoa Física").
- **Organization / BusinessProfile**: Entidade jurídica/coletiva. O usuário pode alternar a interface para operar sob este contexto. Todas as query keys e sessões mudam ao fazer o _Context Switch_.
- **Role**: `owner`, `admin`, `manager`, `seller`, `content`, `customer`.

### 1.1 Entidade Store & Governança de Configurações (Settings JSONB)

A tabela `stores` isola as unidades de comércio e serviços sob uma `organization_id`. Para garantir estabilidade do schema de banco e compatibilidade total com novos nichos sem necessidade de migrações estruturais frequentes:

```text
stores
  ├── id (uuid, PK)
  ├── organization_id (uuid, FK -> organizations)
  ├── name (text)
  ├── slug (text, unique)
  ├── cnpj (text, optional)
  ├── email (text, optional)
  ├── phone (text, optional)
  ├── address (text, optional)
  ├── city (text)
  ├── state (text)
  ├── zip_code (text, optional)
  ├── is_active (boolean)
  ├── is_platform_root (boolean)
  ├── created_at / updated_at (timestamptz)
  └── settings (JSONB)
        ├── type (ecommerce | gastronomy | services | market | fashion | etc.)
        ├── logoUrl / bannerUrl / faviconUrl
        ├── working_hours (grade semanal de funcionamento)
        ├── delivery_zones (tabela de bairros e taxas de entrega)
        ├── compliance_documents (documentação regulatória)
        └── custom_checkout_fields (campos customizados do checkout)
```

- **Invariante de Provisionamento**: Todo dado estendido (segmento, mídias, operação e taxas) é persistido e lido via `settings: JSONB` de forma estrita e segura em `onboarding.functions.ts` e `store.functions.ts`.

## 2. Catálogo

```text
ProductType (versionado) ──< ProductTypeVersion ──< FieldDefinition
        │
        ▼
     Product ──< ProductOption ──< ProductOptionValue
        │
        ▼
   ProductVariant (SKU único) ──< VariantMedia
        │
Category (árvore, parent_id) >──< ProductCategory >──< Product
Collection >──< ProductCollection >──< Product
```

### 2.1 ProductType e FieldDefinition (schema de atributos versionado)

- **ProductType**: define um "tipo" de produto (ex.: Tênis, Bolsa, Acessório). Possui versões; cada `Product` referencia uma `product_type_version_id` fixa no momento da criação/edição, garantindo que alterações futuras do tipo não reescrevam produtos existentes silenciosamente.
- **ProductTypeVersion**: snapshot imutável do schema de atributos (equivalente a um JSON Schema). Uma nova versão é criada a cada alteração estrutural; versões antigas nunca são editadas, apenas superadas.
- **FieldDefinition**: campo do tipo, com:
  - `kind`: `text | rich_text | number | measure | boolean | date | select_single | select_multi | color | size | reference | file`
  - flags: `required`, `filterable`, `comparable`, `displayable`
  - `unit` (para `measure`), `options` (para `select_*`/`color`/`size`), `reference_target` (para `reference`).
- Invariante: um FieldDefinition marcado `required` não pode ser removido de uma versão publicada; apenas descontinuado em nova versão.

### 2.2 Product, Option e Variant

- **Product**: núcleo genérico — nome, descrição, `product_type_version_id`, status (`draft | active | archived`), SEO, atributos preenchidos conforme `FieldDefinition`.
- **ProductOption / ProductOptionValue**: eixos de variação (ex.: Cor, Tamanho) e seus valores possíveis.
- **ProductVariant**: combinação concreta de valores de opção.
  - `id (uuid)`, `sku` único globalmente (por organização), `barcode` opcional, `price_override_cents` (nulo = usa preço base do produto), `cost_cents`, `weight_grams`, `dimensions`, `status (active | inactive)`.
  - Invariante: `sku` é único e imutável após criação; não é reaproveitado mesmo após arquivamento (evita colisão com históricos de pedido).

### 2.3 Categoria, coleção e mídia

- **Category**: árvore via `parent_id`, `ordering`, imagem, campos de SEO. Invariante: sem ciclos (validado no serviço antes de persistir `parent_id`).
- **Collection**: agrupamento não hierárquico e não exclusivo de produtos (curadoria, campanhas).
- **MediaAsset**: ver seção 8 (mídia).

## 3. Inventário

```text
ProductVariant (1) ──< InventoryLevel (N, por Location)
InventoryLevel: available = on_hand - reserved (derivado)
ProductVariant + Location ──< InventoryMovement (append-only)
```

- **InventoryMovement** (imutável, append-only): `type ∈ { purchase, sale, reserve, release, return, exchange_in, exchange_out, adjustment, transfer, damage }`, `quantity`, `variant_id`, `location_id` (+ `location_id_destination` para `transfer`), `reference` (pedido/documento), `created_at`, `created_by`.
- **InventoryLevel**: saldo materializado por `(variant_id, location_id)`: `on_hand`, `reserved`. **Nunca editado diretamente** — todo saldo é recalculado/atualizado exclusivamente como efeito de um `InventoryMovement` gravado na mesma transação.
- **Reservation**: reserva de estoque com `expires_at`; ao expirar sem confirmação, um job libera a quantidade via movimento `release`.
- Invariante central: `available = on_hand - reserved` é sempre derivado, nunca uma coluna independente editável.

## 4. Pedidos (Order) — snapshots e máquina de estados

- Um `Order` congela, no momento da criação/confirmação, **snapshots imutáveis** de: produto/variante (nome, SKU, atributos exibidos), preço unitário praticado, descontos aplicados, endereço de entrega, método e valor de frete cotado. Alterações futuras no catálogo não afetam pedidos já criados.
- `OrderItem` guarda o snapshot por linha; nunca faz join "ao vivo" com o catálogo para exibir um pedido histórico.
- Totais (`subtotal_cents`, `discount_cents`, `shipping_cents`, `total_cents`) são sempre recomputados no servidor a cada transição relevante, nunca confiando em total enviado pelo cliente.

```text
                         ┌─────────┐
                         │  draft  │
                         └────┬────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
  ┌───────────────────────────┐   ┌───────────────────────┐
  │ awaiting_shipping_quote    │   │ awaiting_payment       │
  └────────────┬───────────────┘   └───────────┬────────────┘
               └──────────────┬─────────────────┘
                               ▼
                         ┌───────────┐
                         │   paid     │◄─────────────┐ (retry)
                         └─────┬──────┘               │
                               ▼                      │
                        ┌─────────────┐        ┌──────┴───────┐
                        │ processing  │        │ payment_failed│
                        └──────┬──────┘        └───────────────┘
               ┌───────────────┴────────────────┐
               ▼                                 ▼
     ┌───────────────────┐             ┌───────────────┐
     │ ready_for_pickup    │             │   shipped     │
     └──────────┬──────────┘             └───────┬───────┘
                └───────────────┬─────────────────┘
                                 ▼
                          ┌────────────┐
                          │ delivered  │
                          └─────┬──────┘
                                ▼
                          ┌────────────┐
                          │ completed  │
                          └────────────┘

  Transições transversais autorizadas a partir de estados não terminais:
    * → cancelled     (antes de shipped/delivered, conforme política de role)
    delivered/completed → returned
    returned → refunded
```

- Invariante: toda transição é validada por uma tabela de transições autorizadas por estado de origem/destino e por role; transições fora da tabela são rejeitadas com erro `conflict`.
- Invariante: `cancelled`, `refunded` liberam reservas/estoque associado via `InventoryMovement` (`release`/`return`), nunca por edição direta de saldo.
- Estados terminais: `completed`, `cancelled`, `refunded`. `returned` é intermediário até virar `refunded` (ou reposição via troca).

## 5. Frete (Shipping)

- **Pickup**: retirada em `Location`, sem cálculo de frete monetário.
- **Manual table**: tabela de faixas (CEP/região/peso) mantida pela loja.
- **Manual quote**: cotação manual registrada por um operador, com `expires_at` e snapshot do valor cotado; se expirar antes da confirmação do pedido, exige nova cotação.
- **Provider adapters** (futuro): interface comum para integração com transportadoras/serviços de cotação automática; enquanto não configurado, o `integration_connections.status` permanece `unconfigured` e a opção não é oferecida ao cliente (nunca simular sucesso).

## 6. Pagamentos

```text
PaymentProvider (interface) → { MercadoPagoAdapter | AsaasAdapter | StripeAdapter }

Order (1) ──< Payment (N, tentativas de pagamento agregadas)
Payment (1) ──< PaymentAttempt (N)
Webhook recebido → deduplicado por provider_event_id → atualiza Payment/Order
```

- **Payment**: intenção/registro de cobrança vinculado a um `Order`, com `status` (`pending | authorized | paid | failed | refunded | cancelled`) e `provider`, `provider_payment_id` em campo próprio (nunca reaproveitando `id` interno).
- **PaymentAttempt**: cada tentativa (inclusive falhas) é registrada de forma append-only para auditoria e conciliação.
- **Webhook**: eventos recebidos de provedores são deduplicados por `provider_event_id`; reprocessar o mesmo evento é no-op idempotente.
- **Comprovante manual (proof)**: upload de comprovante com `status ∈ { pending_review, accepted, rejected }`, revisado por role `finance`.
- **Carnê** (carteira de parcelamento interno): `CarneSchedule` ──< `CarneInstallment` ──< `CarneReceipt`. Parcelas em atraso (`overdue`) são calculadas a partir de `due_date` vs. data atual, nunca por flag editável manualmente.
- **Crédito de cliente / Gift card**: saldo é sempre derivado de um ledger append-only (`CreditLedgerEntry` / `GiftCardLedgerEntry`); resgate de gift card é uma operação atômica única (um mesmo código não pode ser resgatado em paralelo além do saldo disponível — controle via transação com bloqueio/checagem de saldo antes do commit). Código do gift card é armazenado como hash; o token entregue ao portador é opaco e não reversível para o hash.

Invariante geral de pagamentos/créditos/caixa: **nenhum saldo é editado diretamente; todo saldo é resultado de agregação sobre um ledger append-only.**

## 7. CMS

```text
Page ──< PageVersion ──< SectionInstance
Page + Channel → no máximo 1 PageVersion com status = published
NavigationMenu, ThemeSettings: versionados por loja
```

- **Page**: entidade estável (slug, tipo). **PageVersion**: conteúdo versionado e imutável após publicação (nova edição gera nova versão em rascunho).
- Invariante: **exatamente uma versão publicada por página e por canal** em um dado instante; publicar uma nova versão despublica atomicamente a anterior na mesma transação.
- **SectionInstance**: blocos de conteúdo ordenados dentro de uma versão.
- **NavigationMenu**, **ThemeSettings**: configuração de loja, também versionados para permitir rollback.

## 8. Mídia

- **MediaAsset**: arquivo original preservado sempre; durante upload permanece privado (sem URL pública) até validação real de MIME e processamento assíncrono.
- Derivativos gerados de forma assíncrona: variantes WebP/AVIF em múltiplos tamanhos, com ponto focal (`focal_point_x/y`) para recorte responsivo.
- Acesso a arquivos privados apenas via URL assinada com expiração curta.
- Invariante: o arquivo original nunca é sobrescrito pelos derivativos; falha de processamento não expõe o asset como pronto.

## 9. Histórias, perfil público, avaliações, chat

- **Story**: conteúdo efêmero/vitrine, vinculado a `Store`.
- **PublicProfile/Portfolio**: página pública de vendedor/loja.
- **Review**: `status ∈ { pending, approved, rejected }`; `verified_purchase` calculado a partir de existência de `Order` `completed` do autor para o produto, nunca autodeclarado.
- **ChatThread**/`ChatMessage`: conversa entre `customer` e `support`/`seller`, com participantes e histórico imutável de mensagens.

## 10. Caixa (cash management)

```text
CashRegister (equipamento/ponto) ──< CashShift (abertura/fechamento) ──< CashEntry (append-only)
CashShift ──< Settlement (fechamento consolidado)
```

- **CashEntry**: append-only (entradas/saídas de caixa vinculadas ou não a um pedido).
- **CashShift**: turno de caixa com `opened_at`/`closed_at`, saldo inicial e saldo apurado ao fechar (comparado ao saldo esperado calculado a partir dos `CashEntry`, nunca editado manualmente sem gerar um `CashEntry` de ajuste auditável).
- **Settlement**: consolidação de um ou mais turnos para fins financeiros/contábeis.

## 11. Comissões

- **CommissionRule**: versionada; cálculo de comissão de venda é sempre feito **no servidor** no momento da confirmação do pedido, usando a versão da regra vigente naquele momento (snapshot na comissão gerada).
- **Commission**: gerada por pedido/vendedor; em caso de cancelamento/devolução do pedido associado, gera **estorno (reversal)** como novo lançamento, nunca edição/exclusão da comissão original.

## 12. Cupons

- **Coupon**: código, tipo (percentual/valor fixo/frete grátis), regras de elegibilidade, limites de uso (total e por cliente), validade.
- Validação e aplicação de cupom sempre recalculada no servidor no momento do checkout; nunca confiar em desconto calculado no cliente.

## 13. LGPD — consentimentos

- **Consent**: registrado por `(user_id, purpose, policy_version)`, com timestamp e forma de coleta. Novo texto de política gera nova `policy_version`; consentimentos antigos permanecem imutáveis como histórico, novo consentimento é solicitado explicitamente.

## 14. Auditoria e outbox (transversais)

- **AuditLog**: append-only, registra ator, ação, entidade afetada, timestamp, `correlation_id`; nunca editável ou removível por rotina de aplicação.
- **OutboxEvent**: append-only, com `status (pending | delivered | dead_letter)`, tentativas e próxima janela de retry (backoff exponencial).

## 15. Invariantes gerais (resumo)

1. Nenhum saldo (estoque, crédito, gift card, caixa) é editado diretamente — sempre derivado de um ledger append-only.
2. Snapshots de pedido (preço, produto, endereço, frete) são imutáveis após criação da linha.
3. Toda transição de estado de pedido é validada contra tabela de transições autorizadas.
4. No máximo uma versão de página publicada por página/canal a qualquer momento.
5. SKU de variante é único e nunca reaproveitado.
6. Webhooks são idempotentes via `provider_event_id`.
7. Toda entidade sensível carrega `organization_id`/`store_id` para isolamento multi-tenant.

## 16. Crescimento e Integrações (Feeds)

- **Feed XML de Catálogo (Google Merchant Center / Meta)**:
  - Gerado sob demanda pela rota /api/feed/google.
  - Produtos e variantes com \status != 'active'\ ou estoque zerado (caso não configure over-selling) não devem aparecer no feed.
  - A geração não consome limites de API em clientes, deve ter headers corretos (\Content-Type: application/xml\) e cache razoável.
  - A tabela \integration_credentials\ gerencia quais provedores estão ativos; o Feed em si não exige credencial porque é público (porém obscurificado via ID da loja) ou usa tokens, mas na arquitetura atual, a rota da loja pública acessa via subdomínio/URL padrão da loja.

## 17. Carrinhos Abandonados (Motor)

- **Captura Antecipada (Funil de Conversão):**
  - Durante o checkout, o e-mail e/ou telefone do visitante (guest_email, guest_phone) são salvos na tabela carts na Etapa 1.
- **Engine (process_abandoned_carts):**
  - Identifica carrinhos com updated_at < now() - 2 horas que possuem itens e cujos usuários não completaram o pedido.
  - Copia o snapshot dos itens e os dados de contato para a tabela append-only abandoned_carts_log (se ainda não existir).
  - Status inicial é pending. Pode evoluir para contacted, recovered ou lost através do painel admin.

## 18. Integração de Logística Automatizada (Melhor Envio)

- **Cotação Dinâmica de Frete:**
  - Caso a integração melhor_envio esteja com status is_active: true e possua credencial configurada, a plataforma realiza consulta em tempo real à API.
  - **Higienização de CEPs:** CEPs de origem e destino possuem formatação removida antes da requisição.
  - **Conversão Monetária:** Os valores retornados são convertidos para centavos inteiros.
  - **Resiliência:** Em caso de indisponibilidade ou falha externa da API, o sistema não interrompe a operação e recorre graciosa e unicamente às taxas manuais cadastradas no painel.

## 19. Feeds de Produtos XML (Google Merchant & Meta Commerce)

- **Geração de RSS XML Standard:**
  - Endpoint de acesso público: GET /api/feed/xml.
  - **Especificações Google Shopping:**
    - Identificador: <g:id> contendo o SKU da variação ou ID.
    - Agrupamento: <g:item_group_id> contendo o ID do produto pai.
    - Preço Padrão e Promocional: Convertidos de price_cents e compare_at_cents para o formato ISO X.XX BRL.
    - Disponibilidade: in stock se estoque líquido (stock_on_hand - stock_reserved > 0), senão out of stock.
    - Categorização: Inclui <g:google_product_category>Community & Marketplace Goods</g:google_product_category> e <g:identifier_exists>false</g:identifier_exists> para evitar avisos no Google Merchant Center.

## 20. Rastreamento e Webhooks de Logística

- **Rastreamento de Pedidos:**
  - O pedido armazena `tracking_code`, `carrier_name`, `tracking_url`, `shipped_at` e `delivered_at`.
  - Links automáticos são gerados para Correios (`https://rastreamento.correios.com.br/...`) ou agregadores de frete.
- **Webhooks de Logística (`POST /api/webhooks/shipment`):**
  - Permite a parceiros de entrega notificar automaticamente mudanças de status (`shipped`, `delivered`).
  - **Idempotência & Auditoria:** Toda notificação é registrada na tabela append-only `shipment_webhook_logs`.

## 21. Agendas Orquestradas (Multi-Recurso)

A plataforma suporta negócios (como Técnicos, Clínicas, Locadoras, Estúdios) que não possuem apenas uma "agenda da empresa", mas precisam orquestrar múltiplos eixos de tempo:

- **ScheduleResource**: Representa qualquer entidade agendável (`type ∈ { person, equipment, space }`).
- **ResourceAvailability**: Regras de disponibilidade recorrente ou exceções de um recurso específico.
- **Booking / Event**: Um compromisso na agenda. Pode referenciar múltiplos `ScheduleResource` na mesma transação.
- **Conflito (Race Condition):** A criação de um `Booking` atua como uma transação relacional que adquire um lock nas linhas dos recursos para o intervalo de tempo desejado. O agendamento falha atomicamente se qualquer um dos recursos for reservado milissegundos antes por outra transação.

## 22. Orçamentos e Carrinhos Híbridos (Quote & Hybrid Cart)

Negócios de serviços e eventos frequentemente negociam pacotes que misturam venda, locação e serviço:

- **Quote (Orçamento)**: Entidade que agrupa intenções de compra com validade (`expires_at`).
- **QuoteItem**: Pode ser:
  1. `product_variant` (venda de item físico, diminui estoque ao aprovar).
  2. `service` (prestação de serviço, sem controle de estoque tangível).
  3. `rental_equipment` (bloqueia disponibilidade na agenda ao aprovar).
- **Conversão**: Quando o cliente aprova o `Quote`, ele gera atomicamente um `Order` (Pedido) e um `Booking` (Agenda). O preço final do `Order` usa o snapshot imutável definido no `Quote`, independentemente de alterações posteriores no catálogo.

## 23. Afiliação e Comissionamento de Terceiros (Partners/Affiliates)

Para suportar indicações:

- **StoreAffiliate**: Vínculo (partnership) entre uma conta `BusinessProfile` e um `UserProfile` ou outro `BusinessProfile`.
- **AffiliateLink / ReferralToken**: O parceiro pode gerar um link com um token de rastreio (`?ref=parceiro123`).
- **Atribuição**: O token é guardado na sessão/cookie do visitante (`store_affiliate_ref`).
- **CommissionLedger**: Quando o `Order` transiciona para `paid` ou `completed`, o sistema avalia a `CommissionRule` vigente e gera um `CommissionLedgerEntry` (append-only) creditando o parceiro. Esse saldo aparece em um submódulo de "Comissões" (Third-party Commissions) na interface da maquiadora, de onde ela pode gerar uma fatura (`PayoutRequest`) contra a loja principal.

---

## 24. Identidade, Perfis Públicos e Sistema de Handles (@)

### 24.1 Sistema de Handles Globais

- **Normalização**: Minúsculas, apenas caracteres `[a-z0-9_]`, comprimento entre 3 e 30 caracteres.
- **Unicidade Case-Insensitive**: Nenhum perfil pode colidir com outro (ex.: `@eduardo` e `@Eduardo` são idênticos).
- **Reserved Handles**: Lista de sistema protegida (`admin`, `waesy`, `suporte`, `api`, `auth`, `termos`, `privacidade`, `seguranca`, `loja`, `mural`, `mapa`, `mercado`, `agenda`).
- **Cooldown & Histórico**: Alteração de handle grava registro em `handle_history`. Existe cooldown de 14 dias entre alterações. O handle antigo redireciona temporariamente por 30 dias para evitar quebra de links antes de ser liberado.
- **Tipos de Perfil**:
  - `personal`: Pessoa física com avatar, bio, cidade, posts, moments, histórias, classificados e listas públicas.
  - `professional`: Profissional autônomo com portfólio, serviços, agenda e avaliações.
  - `institutional`: Organização/Empresa com logo, cover, horários, catálogo de produtos/serviços, FAQ, eventos e equipe.

---

## 25. Dynamic Listing Engine & Category Schemas

### 25.1 Núcleo de Classificados & Capabilities

- **Tabelas**: `classifieds`, `listing_categories`, `listing_category_versions`, `listing_attributes`.
- **Esquema Dinâmico por Categoria**:
  - `sale` / `trade` / `donation`: Desapegos com condição (`new`, `used`, `refurbished`), negociabilidade, entrega/retirada, garantia e nota fiscal.
  - `vehicle`: Marca, modelo, versão, ano fab/mod, quilometragem, câmbio, combustível, opcionais, aceita troca/financiamento.
  - `real_estate`: Finalidade (venda, aluguel, temporada), área útil m², quartos, suítes, banheiros, vagas, condomínio, IPTU, comodidades e nível de precisão pública de localização.
  - `service`: Modalidade (presencial, remoto, domicílio), área de atendimento, duração estimada, disponibilidade e portfólio.
  - `job` / `job_offer`: Regime (CLT, PJ, estágio), carga horária, faixa salarial e requisitos.
- **Máquina de Estados de Listing**:
  `draft` ➔ `under_review` ➔ `published` ➔ `paused` ➔ `reserved` ➔ `negotiating` ➔ `sold` / `rented` / `completed` ➔ `archived`.

---

## 26. Negociações, Deals e Transações P2P

- **Deal Lifecycle**: `listing` ➔ `negotiation` ➔ `deal` ➔ `contract` ➔ `receivables` ➔ `handover` ➔ `termination`.
- **Deal**: Registra o acordo formal entre vendedor e comprador (valor acordado, entrada, caução, parcelas, data de início e término em caso de locação).
- **Invariante**: Mutações em deals gravam trilha de auditoria e notificam ambas as partes em tempo real.

---

## 27. Contract Engine Canônico & Assinatura Eletrônica

### 27.1 Modelo de Contratos

- **Entidades**: `ContractTemplate`, `ContractTemplateVersion`, `ClauseLibrary`, `ClauseVersion`, `Contract`, `ContractVersion`, `ContractParty`, `ContractSigner`, `SignatureEnvelope`, `SigningSession`, `SignatureEvidence`, `VerificationPolicy`.
- **Imutabilidade**: Ao emitir um contrato para assinatura, a versão é congelada (`status = 'sealed'`). Qualquer correção gera nova versão e invalida o envelope anterior com justificativa registrada.
- **AI Contract Assistant**: Sugere cláusulas, detecta riscos e calcula diferenças estruturadas. A IA nunca altera o documento sem aprovação explícita do usuário.
- **Níveis de Assinatura Eletrônica**:
  - `basic`: Aceite eletrônico autenticado com registro de IP, timestamp e consentimento.
  - `advanced`: Verificação via OTP (E-mail/SMS), autenticação de dois fatores e hash criptográfico do documento.
  - `qualified`: Assinatura via provedor compatível com certificado digital.
- **Evidence Bundle**: Manifest criptográfico append-only contendo `document_hash`, `signer_id`, `auth_method`, `timestamps`, `device_session_metadata`, `consent_events` e `signature_digest`.
- **Verificação Pública (`/verify/document/:code`)**: Exibe autenticidade, status, data de emissão e assinaturas válidas sem expor PII ou conteúdo sigiloso.

---

## 28. Identity Verification Engine & Privacidade LGPD

- **Níveis de Verificação**: `email`, `phone`, `identity_document`, `selfie_liveness`, `external_identity`, `qualified_identity`.
- **Segurança de Documentos e Biometria**:
  - Armazenamento em bucket restrito e isolado (`identity-vault`), com criptografia em repouso e acesso exclusivo via URLs assinadas de curta duração (máx. 60s).
  - Dados sensíveis nunca são exibidos à contraparte. A contraparte visualiza apenas o selo "Identidade Verificada (Nível X)".
  - Política de Retenção (`retention_policy`): Documentos são expurgados após o prazo legal e verificação concluída.

---

## 29. Cobranças P2P & Receivables

- **Receivables & Installments**: Geração automática de parcelas a partir de deals e locações.
- **Controle Manual & Comprovantes**: Usuários registram pagamentos com anexação de comprovante, data e forma de pagamento. Parcela vencida altera estado via cron job seguro.

---

## 30. Integration Orchestrator & Secret Vault

- **Secret Vault**: Credenciais e chaves de API nunca retornam ao frontend. São armazenadas criptografadas e referenciadas via `credential_reference`.
- **BYOK (Bring Your Own Key)**: Suporte a credenciais em nível global (Admin Master), organizacional (Tenant) ou pessoal.
- **AI Routing Engine**: Roteia chamadas conforme capability configurada (`contract_clause_assistant` ➔ Gemini/OpenRouter, `ocr` ➔ Vision, `maps` ➔ Geocoding), respeitando rate limits e budgets diários/mensais.

---

## 31. Capabilities de Restaurantes (Food) e Serviços Profissionais

- **Modifier Engine (Restaurantes)**: Suporte a grupos de modificadores (Tamanhos, Bordas, Extras, Quantidade Mín/Máx, Preço Delta) validados estritamente no backend.
- **KDS (Kitchen Display System)**: Superfície operacional para cozinha com estados `new` ➔ `accepted` ➔ `preparing` ➔ `ready` ➔ `completed`.
- **Mesas & Reservas**: Gestão visual de salão com QR Code nas mesas, pedidos abertos e reservas.
- **Service Extras & Master Providers**: Alocação de profissionais/mestres com taxas adicionais e orquestração de agenda.

---

## 32. Ciclo de Vida de Conteúdo, State Machine & Content Actions Matrix

### 32.1 State Machine Canônica de Conteúdo

```text
[ draft ]
   │
   ▼
[ published / active ] ◄──┐
   │         │            │
   ├─────────┼────────────┤ (reativar)
   │         ▼            │
   │    [ paused ] ───────┘
   │         │
   ▼         ▼
[ reserved ] ──► [ completed / sold / rented ]
   │                    │
   ▼                    ▼
[ archived ] ◄──────────┘
   │
   ▼
[ soft_deleted / hard_deleted ]
```

### 32.2 Matriz de Autoridade e Ações Contextuais (ContentActionsMenu)

- **Determinação Server-Side**: O backend calcula `isOwner`, `canManage` e `viewerContext` (`owner | admin | visitor | anonymous`) baseado no JWT da sessão e na chave `author_profile_id`.
- **Ações do Proprietário (`isOwner=true`)**:
  - `Editar Publicação`
  - `Pausar / Reativar Anúncio` (altera status e oculta/exibe nas buscas e feeds públicos)
  - `Marcar como Reservado` (bloqueia novas propostas diretas)
  - `Marcar como Concluído / Vendido / Alugado` (registra fechamento de negócio)
  - `Arquivar` (preserva histórico e contratos, remove da vitrine ativa)
  - `Excluir` (com verificação de dependências: se houver propostas/contratos vinculados, o item é arquivado com segurança)
- **Ações do Visitante (`isOwner=false`)**:
  - `Salvar nos Favoritos` (persiste na área pessoal)
  - `Compartilhar Conteúdo` (Web Share API + ShareModal canônico com links nativos de WhatsApp, Telegram, X, Email e Clipboard API)
  - `Fazer Proposta / Negociar` (dispara criação estruturada em `deals`)
  - `Denunciar Publicação` (dispara fila de moderação com log de auditoria)

### 32.3 Diretrizes Visuais Canônicas (Design Ops)

- **Sem Breadcrumbs Administrativos Artificiais**: Páginas públicas sociais, classificados e eventos iniciam de maneira limpa com suas mídias, títulos, badges contextuais e ações prioritárias, sem heros inflados ou trilhas burocráticas no topo.

---

## 33. Governança Estratégica, Metas de Crescimento & Livro-Caixa Corporativo

Para possibilitar o acompanhamento executivo de dados reais vs. metas projetadas e auditorias de M&A (Due Diligence):

```text
PlatformGrowthTarget (Metas por Fase)
  ├── id (uuid, PK)
  ├── period_key (text, unique: fase_1_500_stores | fase_2_1000_stores | fase_3_5000_stores_100k_clients)
  ├── label (text)
  ├── stage_order (int)
  ├── target_stores (int)
  ├── target_clients (int)
  ├── target_mrr_cents (bigint)
  ├── target_arr_cents (bigint)
  ├── target_gmv_monthly_cents (bigint)
  ├── target_expenses_monthly_cents (bigint)
  ├── target_investments_cents (bigint)
  ├── target_conversion_rate (numeric 5,2)
  ├── target_valuation_conservative_cents (bigint)
  ├── target_valuation_strategic_cents (bigint)
  ├── notes (text)
  └── created_at / updated_at (timestamptz)

PlatformFinancialRecord (Livro-Caixa Auditável)
  ├── id (uuid, PK)
  ├── entry_type (text: expense | investment | revenue_adjustment)
  ├── category (text: infraestrutura | marketing | pessoal | aporte_societario | etc.)
  ├── amount_cents (bigint, positivo)
  ├── description (text)
  ├── entry_date (date)
  ├── receipt_url (text, optional)
  ├── recorded_by (uuid, FK -> auth.users)
  └── created_at / updated_at (timestamptz)
```

### Invariantes de Governança
1. **Deny-by-Default Restrito**: Ambas as tabelas possuem RLS habilitado, com acesso concedido exclusivamente a usuários com role `platform_admin`.
2. **Dinheiro em Centavos**: Todo valor monetário é armazenado como `bigint` em centavos de Real (`amount_cents`, `target_mrr_cents`, etc.), nunca float.
3. **Auditoria de Responsabilidade**: Todo lançamento financeiro manual registra o UUID do administrador responsável (`recorded_by`).

---

## 34. Supply Chain Finance, Payout D+7/D+30 & Liquidação de NF-e de Entrada

Estrutura de dados para viabilizar retenção de saldo e liquidação com taxa zero para fornecedores homologados:

```text
StoreInboundInvoice (NF-e de Entrada de Fornecedor)
  ├── id (uuid, PK)
  ├── store_id (uuid, FK -> stores)
  ├── supplier_cnpj (text, 14 dígitos)
  ├── supplier_name (text)
  ├── nfe_key (text, 44 dígitos único)
  ├── nfe_number (text)
  ├── nfe_serie (text)
  ├── total_amount_cents (bigint)
  ├── xml_url / danfe_pdf_url (text, optional)
  ├── status (pending | scheduled | paid | cancelled)
  ├── payment_due_date (date)
  ├── installments (jsonb: array de duplicatas { dup_number, amount_cents, due_date, status })
  └── created_at / updated_at (timestamptz)

StoreSettlementPolicy (Regra Paramétrica de Payout)
  ├── store_id (uuid, PK -> stores)
  ├── standard_payout_days (int: 7 | 14 | 30)
  ├── early_payout_fee_percentage (numeric 5,2: ex 2.50% a 3.50%)
  ├── allow_b2b_supplier_d0 (boolean: true)
  └── updated_by (uuid, FK -> auth.users)
```

### Invariantes do Modelo
1. **Verificação de Chave Única:** Uma mesma chave de NF-e (44 dígitos) só pode ser liquidada uma única vez no ecossistema (`unique(nfe_key)`).
2. **Liquidação Vinculada à Data:** O pagamento automático ao fornecedor é agendado rigorosamente para a data de vencimento da duplicata (`due_date`), preservando o fluxo de caixa do lojista e a custódia da plataforma até o momento exato do vencimento.
3. **Isenção de Taxa Condicional:** O sistema aplica taxa zero de antecipação (`early_payout_fee = 0`) exclusivamente quando o destinatário dos recursos é o CNPJ emissor da NF-e de entrada vinculada.

---

## 35. Waesy Care Finance: Entidades de Apoio ao Fluxo de Caixa Humano

```text
StoreCashSafe (Cofres Inteligentes de Proteção)
  ├── id (uuid, PK)
  ├── store_id (uuid, FK -> stores)
  ├── name (text: "Salários da Equipe", "Aluguel", "Reserva de Emergência")
  ├── target_amount_cents (bigint)
  ├── current_amount_cents (bigint)
  ├── auto_split_percentage (numeric 4,2: ex 10.00%)
  ├── unlock_date (date: ex dia 5 de cada mês)
  ├── status (active | paused | unlocked)
  └── created_at / updated_at (timestamptz)

StoreWorkingCapitalAdvance (Giro Solidário por Vendas)
  ├── id (uuid, PK)
  ├── store_id (uuid, FK -> stores)
  ├── approved_amount_cents (bigint)
  ├── outstanding_balance_cents (bigint)
  ├── daily_sales_deduction_rate (numeric 4,2: ex 10.00%)
  ├── monthly_interest_rate (numeric 4,2: ex 1.50%)
  ├── status (active | settled | renegotiated)
  ├── disbursed_at (timestamptz)
  └── created_at / updated_at (timestamptz)

SupplierInvoiceSplitSchedule (Provisionamento Suave de NF-e)
  ├── id (uuid, PK)
  ├── store_id (uuid, FK -> stores)
  ├── inbound_invoice_id (uuid, FK -> store_inbound_invoices)
  ├── daily_reserve_cents (bigint)
  ├── total_reserved_cents (bigint)
  ├── target_due_date (date)
  ├── auto_pay_enabled (boolean: true)
  ├── emergency_advance_cents (bigint, default 0)
  └── status (accumulating | ready_to_pay | paid | defaulted)
```

### Invariantes Humanas de Caixa:
1. **Cobrança Proporcional ao Dia:** O Capital de Giro por Vendas NUNCA cobra parcela fixa; a amortização ocorre exclusivamente como fração do faturamento real do dia. Se a loja não faturar, o valor retido é zero.
2. **Separação Intocável de Folha:** O saldo do Cofre de Salários só pode ser movimentado para pagamentos registrados no módulo de folha ou com desbloqueio explícito pelo proprietário da loja.



