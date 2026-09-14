# Contratos de API — Waesy Commerce (v1)

Contratos versionados da camada BFF/server-function (`createServerFn` e rotas sob `src/routes/api`). Consumidos exclusivamente pela camada de serviços de domínio (`/services`), nunca diretamente por componentes React.

Convenções globais:

- Todos os contratos abaixo pertencem à versão **v1**; mudanças incompatíveis exigem `v2` publicada em paralelo.
- Todo valor monetário nos DTOs consumidos pelo frontend segue o sufixo `Cents` em camelCase (ex: `priceCents: number`, `amountCents: number`) ou, quando estritamente isolado, o formato `MoneyDTO` (`{ amountCents: number, currency: "BRL" }`). Nunca ponto flutuante. O banco de dados utiliza `_cents` (ex: `price_cents`).
- Toda data é ISO 8601 UTC (`created_at`, `updated_at`, `expires_at`, etc.); conversão para `America/Sao_Paulo` é responsabilidade exclusiva da apresentação.
- Toda resposta é envolvida em um envelope padrão de sucesso/erro (seção 1).
- Respostas nunca incluem segredos (tokens de provedor, chaves de API, hashes de senha/código) nem PII além do estritamente necessário ao caso de uso do chamador autenticado.
- Toda operação mutável de caráter financeiro, de estoque ou de pedido **exige** `idempotency_key` (string, UUID recomendado) no corpo da requisição; repetir a mesma chave com o mesmo payload retorna o resultado original sem reexecutar efeitos colaterais; reutilizar a chave com payload divergente retorna erro `idempotency_key_conflict`.
- Marcação de status de implementação:
  - **[Fase 0 — contrato apenas]**: schema definido e congelado, sem implementação funcional ainda.
  - **[Implementação inicial]**: previsto para implementação já no curto prazo pós-Fase 0.

## 1. Envelope de resposta

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
  correlation_id: string;
};

type ApiError = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string; // mensagem segura para exibição, sem detalhes internos
    details?: Record<string, unknown>; // apenas dados não sensíveis (ex.: campo inválido)
  };
  correlation_id: string;
};
```

## 2. Catálogo de códigos de erro

```ts
type ErrorCode =
  | "validation_error" // payload não conforme ao schema zod
  | "unauthorized" // sessão ausente/inválida
  | "forbidden" // sessão válida sem permissão para o recurso/ação
  | "not_found" // recurso inexistente ou fora do tenant do chamador
  | "conflict" // ex.: transição de estado não autorizada, versão desatualizada
  | "idempotency_key_missing" // operação mutável sensível sem idempotency_key
  | "idempotency_key_conflict" // mesma chave, payload divergente
  | "rate_limited" // limite de requisições excedido
  | "unconfigured_integration" // integration_connections.status = unconfigured
  | "integration_error" // provedor externo retornou erro (status = error)
  | "insufficient_stock" // reserva/baixa de estoque não pôde ser satisfeita
  | "insufficient_balance" // crédito/gift card sem saldo suficiente
  | "expired_quote" // cotação de frete/preço expirada
  | "payment_declined" // pagamento recusado pelo provedor
  | "internal_error"; // falha inesperada, sem detalhes internos expostos
```

Toda função de servidor mapeia exceções internas para um destes códigos antes de responder; nenhum stack trace ou mensagem de driver/banco é repassado ao cliente.

## 3. Catálogo — leitura pública

### 3.1 Listar produtos — `[Fase 0 — contrato apenas]`

`GET/POST /api/v1/catalog/products`

```ts
type ListProductsRequest = {
  store_id: string; // uuid
  category_slug?: string;
  collection_slug?: string;
  filters?: Record<string, string | string[]>; // por FieldDefinition filterable
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  page?: number; // default 1
  page_size?: number; // default 24, máx 60
};

type ProductListItemDTO = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  priceCents: number;
  compareAtCents?: number | null;
  isOutOfStock: boolean;
};

type ListProductsResponse = {
  items: ProductListItemDTO[];
  page: number;
  page_size: number;
  total_count: number;
};
```

### 3.2 Obter produto por slug — `[Fase 0 — contrato apenas]`

`GET /api/v1/catalog/products/:slug`

```ts
type GetProductBySlugRequest = { store_id: string; slug: string };

type ProductDetailDTO = {
  id: string;
  slug: string;
  name: string;
  description_html: string;
  attributes: { key: string; label: string; value: string | number | boolean }[]; // apenas displayable
  options: { key: string; label: string; values: string[] }[];
  variants: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    effectivePriceCents: number;
    availableQty: number;
  }[];
  media: { url: string; alt: string; is_cover: boolean }[];
  categories: { slug: string; name: string }[];
};
```

### 3.3 Listar categorias / coleções — `[Fase 0 — contrato apenas]`

`GET /api/v1/catalog/categories`, `GET /api/v1/catalog/collections`

```ts
type CategoryDTO = {
  slug: string;
  name: string;
  parent_slug: string | null;
  ordering: number;
  image_url?: string;
};

type CollectionDTO = {
  slug: string;
  name: string;
  banner_url?: string;
};
```

## 4. Carrinho e checkout

### 4.1 Recalcular/obter carrinho — `[Fase 0 — contrato apenas]`

`POST /api/v1/cart/sync`

```ts
type CartLineInput = { variant_id: string; quantity: number };

type SyncCartRequest = {
  store_id: string;
  cart_id?: string; // ausente = cria novo
  lines: CartLineInput[];
  coupon_code?: string;
};

type CartLineDTO = {
  variantId: string;
  qty: number;
  priceCents: number;
  lineTotalCents: number;
  isOutOfStock?: boolean;
};

type CartDTO = {
  id: string;
  items: CartLineDTO[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode?: string | null;
};
```

Nota: preço, disponibilidade e desconto nunca são aceitos do cliente — apenas `variant_id` e `quantity` são entrada; todo o resto é recomputado.

### 4.2 Criar pedido a partir do carrinho — `[Implementação inicial]` — requer `idempotency_key`

`POST /api/v1/checkout/orders`

```ts
type CreateOrderRequest = {
  idempotency_key: string;
  store_id: string;
  cart_id: string;
  shipping_address_id: string;
  shipping_method: { type: "pickup" | "manual_table" | "manual_quote"; quote_id?: string };
};

type OrderDTO = {
  id: string;
  status: OrderStatus; // ver seção 5
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string; // ISO UTC
};
```

## 5. Pedidos

```ts
type OrderStatus =
  | "draft"
  | "awaiting_shipping_quote"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "payment_failed"
  | "returned"
  | "refunded";
```

### 5.1 Obter pedido — `[Implementação inicial]`

`GET /api/v1/orders/:order_id`

Retorna `OrderDTO` completo com snapshot de itens, endereço e histórico de transições (`status_history: { status: OrderStatus; at: string }[]`).

### 5.2 Transicionar pedido — `[Implementação inicial]` — requer `idempotency_key`

`POST /api/v1/orders/:order_id/transition`

```ts
type TransitionOrderRequest = {
  idempotency_key: string;
  to_status: OrderStatus;
  reason?: string; // obrigatório para cancelled/returned/refunded
};
```

Erros possíveis específicos: `conflict` (transição não autorizada a partir do estado atual ou para o role do chamador), `insufficient_stock` (se a transição exigir reconfirmação de reserva).

## 6. Frete

### 6.1 Cotar frete — `[Fase 0 — contrato apenas]`

`POST /api/v1/shipping/quote`

```ts
type ShippingQuoteRequest = {
  store_id: string;
  cart_id: string;
  destination_zip: string;
};

type ShippingQuoteOptionDTO = {
  quote_id: string;
  type: "pickup" | "manual_table" | "manual_quote" | "provider";
  label: string;
  priceCents: number;
  eta_days_min?: number;
  eta_days_max?: number;
  expires_at: string; // ISO UTC — cotações manuais/provider expiram
};

type ShippingQuoteResponse = { options: ShippingQuoteOptionDTO[] };
```

Se nenhum provider de frete automático estiver `active` em `integration_connections`, apenas opções `pickup`/`manual_table`/`manual_quote` são retornadas; nunca se simula uma cotação de provider não configurado (erro `unconfigured_integration` se solicitado explicitamente).

## 7. Pagamentos

### 7.1 Criar intenção de pagamento — `[Fase 0 — contrato apenas]` — requer `idempotency_key`

`POST /api/v1/payments/intents`

```ts
type CreatePaymentIntentRequest = {
  idempotency_key: string;
  order_id: string;
  provider:
    | "mercado_pago"
    | "asaas"
    | "stripe"
    | "manual_proof"
    | "carne"
    | "gift_card"
    | "customer_credit";
  return_url?: string;
};

type PaymentIntentDTO = {
  payment_id: string;
  status: "pending" | "authorized" | "paid" | "failed";
  provider: string;
  checkout_url?: string; // quando aplicável (redirecionamento a provedor)
  pix_qr_code?: string; // quando aplicável, nunca dados sensíveis de cartão
};
```

Restrição explícita: **jamais** trafegam dados brutos de cartão (PAN, CVV) por este contrato; tokenização ocorre no provedor via SDK client-side dedicado, o BFF só recebe token/opaque reference do provedor.

### 7.2 Webhook de pagamento (entrada) — `[Fase 0 — contrato apenas]`

`POST /api/v1/payments/webhooks/:provider`

```ts
type PaymentWebhookPayload = {
  provider_event_id: string; // usado para deduplicação
  provider_payment_id: string;
  event_type: string;
  raw_payload: Record<string, unknown>; // armazenado para auditoria, nunca reexposto integralmente por API pública
};
```

Resposta sempre `200 OK` com envelope `ApiSuccess<{ processed: boolean; deduplicated: boolean }>` após persistência do evento, mesmo em caso de erro de negócio subsequente (para evitar reentrega agressiva do provedor); erros de negócio são tratados de forma assíncrona via outbox/worker.

### 7.3 Upload de comprovante manual — `[Fase 0 — contrato apenas]`

`POST /api/v1/payments/:payment_id/proof`

```ts
type SubmitProofRequest = { media_asset_id: string };
type ProofDTO = { proof_id: string; status: "pending_review" | "accepted" | "rejected" };
```

## 8. Mídia — upload via URL assinada

### 8.1 Solicitar URL de upload — `[Implementação inicial]`

`POST /api/v1/media/upload-url`

```ts
type RequestUploadUrlRequest = {
  store_id: string;
  intended_use: "product_media" | "review_media" | "chat_attachment" | "payment_proof" | "avatar";
  content_type: string; // MIME declarado pelo cliente, revalidado no servidor pelo conteúdo real
  size_bytes: number;
};

type UploadUrlDTO = {
  media_asset_id: string; // criado em estado "uploading", privado
  signed_upload_url: string;
  expires_at: string; // ISO UTC
};
```

### 8.2 Confirmar upload / consultar status de processamento — `[Implementação inicial]`

`GET /api/v1/media/:media_asset_id`

```ts
type MediaAssetDTO = {
  media_asset_id: string;
  status: "uploading" | "processing" | "ready" | "rejected";
  original_url?: string; // signed URL, apenas para papéis autorizados
  derivatives?: { format: "webp" | "avif"; width: number; url: string }[];
  focal_point?: { x: number; y: number };
};
```

`status: rejected` ocorre quando a validação real de MIME falha; o motivo não é exposto em detalhe ao cliente final (log interno apenas).

## 9. Regras transversais de idempotência

Endpoints que **exigem** `idempotency_key` (lista não exaustiva, cobre toda mutação financeira/estoque/pedido):

- `POST /api/v1/checkout/orders`
- `POST /api/v1/orders/:order_id/transition`
- `POST /api/v1/payments/intents`
- `POST /api/v1/inventory/movements` (Fase 0 — contrato apenas)
- `POST /api/v1/gift-cards/:code/redeem` (Fase 0 — contrato apenas)
- `POST /api/v1/credits/:customer_id/adjust` (Fase 0 — contrato apenas)
- `POST /api/v1/cash-shifts/:shift_id/entries` (Fase 0 — contrato apenas)

Comportamento: chave ausente nesses endpoints retorna `idempotency_key_missing` antes de qualquer processamento; a chave é armazenada com hash do payload por um período mínimo de retenção operacional para permitir deduplicação segura de reentregas de rede.

## 10. Exposição de dados sensíveis — política

- Nenhum contrato retorna: senha/hash, segredos/tokens de integração, código completo de gift card (apenas últimos dígitos/máscara), dados de cartão, `raw_payload` de webhook para consumidores externos ao domínio de pagamentos.
- Endereços e documentos pessoais só são retornados ao próprio titular (`customer`) ou a roles com permissão explícita (`admin`, `finance`, `support` conforme caso), nunca em listagens públicas de catálogo/CMS.
- Todo campo de dinheiro é trafegado no formato achatado `priceCents`, `amountCents`, etc. em 100% dos contratos desta especificação de DTOs, enquanto no banco de dados e APIs REST mantêm o sufixo numérico de `_cents`.

## 11. Feeds Externos (Integrações Fase 5)

### GET /api/feed/google.xml (ou /api/feed/meta.xml)

Retorna um XML formatado para o Merchant Center (RSS 2.0).
**Headers**: \Content-Type: application/xml\
**Cache**: \Cache-Control: public, max-age=3600, s-maxage=3600\

Mapeamento de colunas principais:

- \<g:id>\: \product_variants.id\ (se houver variação, combinando com SKU) ou \products.id\
- \<g:title>\: \products.title\
- \<g:description>\: \products.short_description\ ou fallback para \description\
- \<g:price>\: \product_variants.price_cents / 100\ formatado como "XX.XX BRL"
- \<g:availability>\: \in stock\ se \stock_on_hand - stock_reserved > 0\, senão \out of stock\
- \<g:image_link>\: O primeiro link de mídia da \product_media\ ou capa do produto.

### PATCH /api/v1/carts/:cart_id/contact (Fase 5 - Carrinhos Abandonados)

Atualiza as informações de contato do visitante (Guest) antes da efetivação do pedido.
Request: { guest_email: string (optional), guest_phone: string (optional) }
Response: { success: boolean }

### POST /api/v1/shipping/calculate (Atualizado - Melhor Envio)

Calcula opções de frete disponíveis combinando regras manuais da loja e cotações em tempo real via API do Melhor Envio (se ativa).
Request: { zipcode: string }
Response: Array<{ id: string, name: string, price_cents: number, estimated_days: number | null }>

### GET /api/feed/xml (Fase 5 - Feed XML de Produtos)

Gera um Feed RSS 2.0 com namespace g: (Google Base) compatível com Google Merchant Center e Meta Commerce Manager.
Query Params: store (optional UUID)
Response: Documento XML (Content-Type: application/xml; charset=utf-8)

### POST /api/webhooks/shipment (Fase 5 - Webhook de Rastreamento)

Recepção de eventos de transporte para atualização de rastreamento e status do pedido.
Request: { order_id?: string, tracking_code?: string, carrier_name?: string, status?: 'shipped' | 'delivered', tracking_url?: string }
Response: { success: boolean, order_id: string, new_status: string }

### POST /api/v1/orders/:id/shipment (Fase 5 - Atualização de Rastreamento)

Cadastra ou atualiza o código de rastreamento do envio no painel admin.
Request: { orderId: string, trackingCode: string, carrierName?: string, trackingUrl?: string, newStatus?: 'shipped' | 'delivered' }
Response: Order Object

---

## 12. Construtor Visual & Hotpages (BFF Contracts)

### 12.1 Obter Documento Público de Experiência
`GET /services/builder.functions/getPublicExperienceDocumentBySlug`
- **Request:** `{ slug: string, document_type?: string, storeId?: string }`
- **Response:** `{ status: "ok", data: { document: ExperienceDocument, tree: ExperienceNode[] } }`

### 12.2 Criar Documento de Experiência / Hotpage
`POST /services/builder.functions/createExperienceDocument`
- **Request:** `{ title: string, slug: string, document_type: "storefront" | "biolink" | "campaign" | "seller_showcase", template_id?: string }`
- **Response:** `{ success: boolean, documentId: string }`

### 12.3 Salvar e Publicar Versão do Documento
`POST /services/builder.functions/publishExperienceVersion`
- **Request:** `{ documentId: string, change_log?: string }`
- **Response:** `{ success: boolean, version: number }`

---

## 13. Turismo, Cotações & Assinatura Digital (BFF Contracts)

### 13.1 Registrar Lead de Cotação de Viagem
`POST /services/whatsapp-leads.functions/recordWhatsAppLead`
- **Request:** `{ entity_type: "tourism" | "quote" | "store", phone_target: string, entity_title?: string, notes?: string, device_type?: "desktop" | "mobile" }`
- **Response:** `{ success: boolean, leadId: string }`

### 13.2 Assinatura Eletrônica de Contrato Turístico (SHA-256)
`POST /services/travel-contract.functions/signTravelContract`
- **Request:** `{ token: string, signerName: string, signerDocument: string, signatureImage?: string, ipAddress: string, userAgent: string }`
- **Response:** `{ success: boolean, certificateSerial: string, message: string }`

---

## 14. Agendamentos & Pacotes de Serviços (BFF Contracts)

### 14.1 Consultar Horários Disponíveis
`GET /services/booking.functions/getAvailableBookingSlots`
- **Request:** `{ storeId: string, serviceId: string, date: string, resourceId?: string }`
- **Response:** `{ slots: Array<{ time: string, available: boolean, resourceId?: string }> }`

### 14.2 Confirmar Agendamento de Serviço
`POST /services/booking.functions/createBookingAppointment`
- **Request:** `{ serviceId: string, scheduledDate: string, startTime: string, customerName: string, customerPhone: string, resourceId?: string }`
- **Response:** `{ success: boolean, appointmentId: string, status: "confirmed" | "pending" }`

---

## 15. Ledger de Tokens & Observabilidade (BFF Contracts)

### 15.1 Consultar Saldo da Carteira de Tokens
`GET /services/tokens.functions/getStoreTokenWallet`
- **Request:** `{ storeId: string }`
- **Response:** `{ balance: number, locked: number, totalEarned: number, totalSpent: number }`

### 15.2 Obter Logs de Sistema com Correlation ID
`GET /services/admin-logs.functions/getSystemLogs`
- **Request:** `{}` (Requer Platform Admin)
- **Response:** `Array<{ id: string, route: string, error_message: string, stack_trace?: string, severity: string, created_at: string }>`

---

## 16. Governança Executiva, Metas & Valuation (BFF Contracts)

### 16.1 Consultar Métricas Executivas de Crescimento & Valuation
`GET /services/growth-targets.functions/getExecutiveGrowthMetrics`
- **Autenticação:** Sessão ativa obrigatória com role `platform_admin` ou e-mail master autorizado.
- **Request:** `{}`
- **Response:**
  ```ts
  {
    real: {
      profilesCount: number,
      storesCount: number,
      ordersCount: number,
      realGmvCents: number,
      paidOrdersCents: number,
      paidInvoicesCents: number,
      realDirectRevenueCents: number,
      classifiedsCount: number,
      totalExpensesCents: number,
      totalInvestmentsCents: number,
      netCashFlowCents: number,
      realConversionRate: number,
      currentCalculatedValuationCents: number
    },
    codebase: {
      srcFiles: number,
      srcLines: number,
      srcBytes: number,
      supabaseLines: number,
      totalLines: number,
      routesCount: number,
      servicesCount: number,
      componentsCount: number,
      techAssetValueCents: number
    },
    targets: Array<{
      period_key: string,
      label: string,
      stage_order: number,
      target_stores: number,
      target_clients: number,
      target_mrr_cents: number,
      target_arr_cents: number,
      target_gmv_monthly_cents: number,
      target_expenses_monthly_cents?: number,
      target_valuation_conservative_cents: number,
      target_valuation_strategic_cents: number,
      notes?: string
    }>,
    financialRecords: Array<{
      id: string,
      entry_type: "expense" | "investment" | "revenue_adjustment",
      category: string,
      amount_cents: number,
      description: string,
      entry_date: string,
      receipt_url?: string,
      recorded_by?: string,
      created_at: string
    }>
  }
  ```

### 16.2 Registrar Lançamento Financeiro no Livro-Caixa
`POST /services/growth-targets.functions/recordFinancialEntry`
- **Autenticação:** Requer `platform_admin`.
- **Request (Zod Schema):**
  ```ts
  {
    entryType: "expense" | "investment" | "revenue_adjustment",
    category: string,
    amountCents: number, // Valor positivo inteiro em centavos
    description: string,
    entryDate?: string, // Formato YYYY-MM-DD
    receiptUrl?: string
  }
  ```
- **Response:** Objeto do registro recém-criado em `platform_financial_records`.

### 16.3 Estornar / Remover Lançamento Financeiro
`POST /services/growth-targets.functions/deleteFinancialEntry`
- **Autenticação:** Requer `platform_admin`.
- **Request (Zod Schema):** `{ id: string }` (UUID válido)
- **Response:** `{ success: true }`

---

## 17. Waesy Care Finance & Saúde de Caixa das PMEs (BFF)

Contratos dedicados à proteção contra asfixia de caixa, antecipação justa, liquidação de fornecedores em D+0 e cobrança acolhedora.

### 17.1 Listar e Filtrar Carnês da Loja
`POST /services/receivables.functions/listStoreCarnes`
- **Autenticação:** Requer `owner`, `admin` ou `finance` no escopo da loja (`store_id` derivado da sessão via `getServerIdentity`).
- **Request (Zod Schema):**
  ```ts
  {
    filter?: "all" | "due_soon" | "late" | "pending_conciliation" | "settled",
    search?: string,
    limit?: number,
    offset?: number
  }
  ```
- **Response:** Array de objetos `CarneWithInstallmentsDTO` contendo identificação do cliente, parcelas, valor em centavos (`amount_cents`), status e dias de atraso.

### 17.2 Obter Relatório Resumo de Contas a Receber
`POST /services/receivables.functions/getCarnesReportSummary`
- **Autenticação:** Requer acesso ao financeiro da loja.
- **Request:** `{}`
- **Response:**
  ```ts
  {
    totalReceivableCents: number,
    totalOverdueCents: number,
    dueNext7DaysCents: number,
    settledThisMonthCents: number,
    activeCarnesCount: number,
    overdueInstallmentsCount: number,
    averageDaysToPayment: number
  }
  ```

### 17.3 Conciliar ou Ajustar Parcela com Perdão de Encargos
`POST /services/receivables.functions/approveInstallmentPayment`
- **Autenticação:** Requer papel financeiro na loja.
- **Request (Zod Schema):**
  ```ts
  {
    installmentId: string, // UUID
    paymentMethod: "pix" | "dinheiro" | "cartao_debito" | "cartao_credito" | "transferencia",
    waiveInterest?: boolean, // Se true, zera juros e multas por empatia
    discountCents?: number, // Desconto voluntário de pontualidade
    notes?: string
  }
  ```
- **Response:** `{ success: true, settledAt: string, finalAmountCents: number }`

### 17.4 Disparar Cobrança Humanizada em Massa (WhatsApp)
`POST /services/receivables.functions/sendMassBillingReminders`
- **Autenticação:** Requer papel financeiro na loja.
- **Request (Zod Schema):**
  ```ts
  {
    installmentIds: string[], // Lista de UUIDs
    templateType: "friendly" | "due_warning" | "overdue_discount" | "custom",
    discountPercent?: number, // Ex: 5% a 10% para incentivar quitação imediata
    customMessage?: string
  }
  ```
- **Response:** `{ dispatchedCount: number, failedCount: number }`

### 17.5 Provisionar Saldo em Cofre Blindado (Aluguel / Folha)
`POST /services/cash-management.functions/configureCashSafe`
- **Autenticação:** Requer `owner` da loja.
- **Request (Zod Schema):**
  ```ts
  {
    safeType: "payroll" | "rent" | "taxes" | "emergency",
    targetAmountCents: number,
    targetDate: string, // YYYY-MM-DD
    autoRetainPercentage: number, // 2% a 15% retidos automaticamente de cada venda
    allowEmergencyEarlyWithdraw: boolean
  }
  ```
- **Response:** Objeto `StoreCashSafeDTO` com saldo atual, rendimento CDI diário e meta.

### 17.6 Simular e Contratar Giro Solidário por Vendas
`POST /services/cash-management.functions/applyWorkingCapitalAdvance`
- **Autenticação:** Requer `owner` da loja (exclusivo para quem possui histórico mínimo de 30 dias de vendas).
- **Request (Zod Schema):**
  ```ts
  {
    requestedAmountCents: number,
    dailySalesRetentionPercentage: number, // 5% a 15%
    purpose: "working_capital" | "inventory_restock" | "store_renovation" | "emergency_cash"
  }
  ```
- **Response:**
  ```ts
  {
    advanceId: string,
    approvedAmountCents: number,
    totalRepaymentCents: number,
    monthlyInterestRatePercent: number, // Ex: 1.4%
    status: "active",
    firstRetentionStartsAt: string
  }
  ```

### 17.7 Vincular NF-e de Fornecedor para Liquidação D+0 sem Taxas
`POST /services/cash-management.functions/registerSupplierInvoice`
- **Autenticação:** Requer acesso ao financeiro da loja.
- **Request (Zod Schema):**
  ```ts
  {
    nfeAccessKey: string, // 44 dígitos
    supplierCnpj: string,
    supplierName: string,
    totalInvoiceCents: number,
    installments: Array<{
      installmentNumber: number,
      dueDate: string,
      amountCents: number
    }>
  }
  ```
- **Response:** Objeto `StoreInboundInvoiceDTO` com duplicatas agendadas para liquidação interna em D+0 com isenção total de tarifa de saque.



