# Arquitetura — Plataforma Waesy

Documento canônico de arquitetura. Fase 1. A Waesy atua como Plataforma Comunitária e CMS Universal, possuindo um modelo de _Context Switching_ para Lojas, Artistas e Pessoas Físicas.

## 1. Visão geral em camadas

O sistema é organizado em camadas estritamente unidirecionais. Nenhuma camada superior pode pular uma camada intermediária. Em particular, **componentes React nunca acessam o Supabase diretamente**: todo acesso a dados passa por serviços de domínio tipados, que por sua vez chamam funções de servidor (BFF).

```text
┌──────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 + TanStack Start + Tailwind v4 + shadcn/ui)       │
│                                                                       │
│  /components/ui        primitivos visuais (shadcn), sem regra de     │
│                         negócio                                      │
│  /components/commerce  blocos de vitrine/carrinho/checkout           │
│  /components/admin     blocos de painel administrativo               │
│  /features             composição de casos de uso por domínio        │
│  /routes                                                              │
│    /routes/*           páginas (file-based routing), loaders/actions │
│    /routes/api/*       endpoints HTTP expostos (webhooks, uploads)   │
│                                                                       │
│  Consomem apenas: hooks/queries que chamam a camada de serviços.      │
│  Nunca importam o client Supabase nem tipos de tabela diretamente.   │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ chamadas tipadas (DTOs de entrada/saída)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVIÇOS DE DOMÍNIO (/services)                                      │
│                                                                       │
│  Ex.: catalogService, cartService, orderService, inventoryService,   │
│  paymentService, shippingService, cmsService, ledgerService          │
│                                                                       │
│  Responsabilidades:                                                  │
│   - validar entrada/saída com schemas zod compartilhados             │
│   - orquestrar regras de negócio e políticas por role/tenant         │
│   - traduzir entidades persistidas em DTOs de apresentação           │
│   - nunca conter SQL/consultas Supabase diretamente (chamam BFF)     │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ invoca
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ BFF / SERVER FUNCTIONS (createServerFn, src/routes/api/**)           │
│                                                                       │
│  - único ponto autorizado a instanciar o client Supabase com         │
│    privilégios de serviço ou de sessão                               │
│  - aplica idempotência (idempotency_key) em mutações financeiras/    │
│    estoque/pedido                                                    │
│  - recomputa totais monetários e de estoque no servidor              │
│  - grava audit log e publica eventos no outbox                       │
│  - normaliza erros no catálogo de códigos (ver API_CONTRACTS.md)     │
│  - correlaciona logs por correlation_id                              │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ SQL/RPC via client Supabase autenticado
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PERSISTÊNCIA (Supabase / Postgres)                                   │
│                                                                       │
│  - RLS habilitada em 100% das tabelas, política padrão: negar tudo   │
│    (deny-by-default); acesso liberado por policy explícita por role  │
│    e por organization_id/store_id                                    │
│  - tabelas append-only para ledgers (estoque, créditos, gift card,   │
│    caixa) e para audit log                                           │
│  - outbox table para eventos assíncronos                             │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ adapters
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PROVIDERS EXTERNOS (via adapters, nunca chamados diretamente)        │
│                                                                       │
│  Pagamento: Mercado Pago, Asaas, Stripe (interface PaymentProvider)  │
│  Frete: transportadoras/manual/futuros providers                     │
│  Integrações: feature flags + integration_connections                │
│  (status: unconfigured | testing | active | error — nunca simular    │
│  sucesso quando não configurado)                                     │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Por que componentes nunca tocam o Supabase diretamente

- **Segurança**: a RLS é a última linha de defesa, não a primeira. A lógica de autorização por papel (owner, admin, manager, seller, stock, finance, content, support, customer) e por tenant é aplicada na camada de serviço/BFF, evitando vazamento de dados entre lojas/organizações por erro de policy.
- **Consistência transacional**: operações financeiras, de estoque e de pedido exigem múltiplas escritas atômicas (ledger + saldo materializado + audit log + outbox). Isso só é seguro dentro de uma função de servidor, nunca espalhado em múltiplas chamadas do cliente.
- **Evolução de schema**: o cliente React depende de DTOs estáveis; o schema do banco pode evoluir (migrações, versionamento de ProductType) sem quebrar o frontend.
- **Idempotência**: chaves de idempotência só fazem sentido cercadas por uma transação de servidor; o cliente não pode garantir isso.
- **Testabilidade**: serviços de domínio podem ser testados com mocks de BFF, sem subir infraestrutura de banco.

## 3. DTOs vs entidades persistidas

- Entidades persistidas (tabelas) modelam o estado interno, incluindo colunas de auditoria, chaves técnicas e campos sensíveis (hashes, IDs de provedor externo).
- DTOs são contratos de entrada/saída da camada de serviços e do BFF, definidos com **zod** e compartilhados entre frontend e servidor (pasta `/shared/schemas` ou equivalente por domínio).
- Um DTO nunca expõe: hashes de token, segredos de integração, IDs internos de outras organizações, ou mais PII do que o necessário para o caso de uso.
- Toda função de servidor valida entrada e saída contra o schema zod correspondente antes de retornar ao cliente — falha de validação de saída é tratada como bug, não repassada ao usuário.

## 4. Validação de schema compartilhada (zod)

- Cada domínio possui um módulo de schemas zod único, importado tanto por `/services` quanto por `src/routes/api`.
- Regras de negócio numéricas (preço, desconto, quantidade) são validadas nos limites de domínio (não negativos, inteiros para centavos) já no schema, antes de qualquer lógica de serviço.
- Schemas de entidade (persistência) e schemas de DTO (contrato) são arquivos distintos; um `toDTO()`/`fromDTO()` explícito faz a tradução, nunca reaproveitamos o schema de tabela como contrato público.

## 5. Estratégia de cache e invalidação

- Conteúdo público (catálogo, CMS) é cacheado por **versão publicada**: cada Page/Product/Collection possui um identificador de versão; o cache é chaveado por `(recurso, versão_publicada)`.
- Publicar uma nova versão gera invalidação explícita da chave anterior (nunca time-based apenas); o outbox emite um evento `content.published` consumido para invalidar CDN/edge cache e caches em memória.
- Dados privados/transacionais (carrinho, pedidos, saldo) não são cacheados no cliente além do necessário para UX otimista; o servidor é sempre a fonte de verdade e recomputa totais a cada leitura relevante.
- Queries do cliente (TanStack Query) usam chaves estáveis e granulares (por `store_id` + recurso + filtros), evitando invalidação em cascata desnecessária.

## 6. Event outbox, filas e dead-letter

- Toda mutação relevante para terceiros (webhooks de saída, notificações, feeds de marketplace) grava um registro na tabela outbox dentro da mesma transação da mutação de negócio.
- Um worker consome o outbox e tenta entregar; falhas seguem política de retry com backoff exponencial e um número máximo de tentativas.
- Após esgotar tentativas, o evento é movido para dead-letter, permanece auditável e pode ser reprocessado manualmente por um operador autorizado.
- Consumo de webhooks recebidos (ex.: pagamento) é deduplicado por `provider_event_id`.

## 7. Observabilidade

- Logs estruturados (JSON) em toda função de servidor, contendo `correlation_id` propagado do frontend (gerado por requisição) até os adapters de provider.
- Métricas: contagem/latência por endpoint de BFF, taxa de erro por código, filas de outbox (tamanho, idade do item mais antigo, taxa de dead-letter).
- Erros nunca incluem PII (nome, e-mail, endereço, documento) nem segredos (tokens, chaves de API, hashes); mensagens de erro para o usuário são genéricas e mapeadas pelo catálogo de códigos.

## 8. Performance

- Code-splitting por rota (file-based routing do TanStack Start carrega apenas o bundle da rota acessada).
- Imagens responsivas com carregamento preguiçoso (`loading="lazy"`), servidas via derivativos WebP/AVIF e `srcset` por breakpoint.
- Skeletons dimensionados para não causar layout shift (mesma altura/proporção do conteúdo final).
- Seletores de estado e queries estáveis e restritos ao mínimo necessário (evitar re-render amplo); nenhuma memoização "por precaução" sem medição — evitar `useMemo`/`useCallback` aleatórios sem justificativa de performance.
- Paginação/streaming em listagens de catálogo; nunca carregar catálogos inteiros no cliente.

## 9. Convenções de dinheiro e datas

- Todo valor monetário é armazenado e transmitido como **inteiro em centavos** mais o campo de moeda (`currency: "BRL"`). Nunca `float`/`number` fracionário para dinheiro.
- Toda data é armazenada em UTC no formato ISO 8601; exibição ao usuário é convertida para `America/Sao_Paulo` na camada de apresentação, nunca no banco.

## 10. Aplicação multi-tenant

- Toda entidade relevante carrega `organization_id` e, quando aplicável, `store_id`.
- Toda policy de RLS filtra por esses campos; toda query de serviço/BFF recebe o tenant do contexto de sessão autenticada, nunca de parâmetro confiável vindo do cliente sem validação cruzada.
- Identificadores internos usam UUID; nenhuma sequência numérica previsível é exposta como identificador público de entidade sensível.

## 11. Arquitetura Canônica de Módulos Especializados

### 11.1 Agendamentos & Clínicas (Booking & Services)
- O sistema possui arquitetura relacional e transacional nativa para gestão de agendas, recursos e pacotes de serviços:
  - Tabelas: `booking_appointments`, `booking_resources`, `booking_services`, `service_packages`, `service_package_passes`.
  - Módulos de Operação: `/workspace/agenda`, `/workspace/agenda/recursos`, `/workspace/agenda/servicos`, `/workspace/pacotes`.
  - Consumo Público: `/_store/agendar`, `/_store/conta/agendamentos`, `/_store/conta/pacotes`.
  - BFF: `src/services/booking.functions.ts` e `src/services/service-packages.functions.ts`.

### 11.2 Turismo, Cotações & Contratos Digitais (Travel & Hospitality)
- Ecossistema completo para agências de viagens e operadoras turísticas:
  - Tabelas: `travel_proposals`, `travel_contracts`, `travel_contract_signatures`, `travel_groups`, `travel_quotes`, `whatsapp_leads`.
  - Módulos de Operação: `/workspace/turismo/propostas`, `/workspace/turismo/contratos`, `/workspace/turismo/grupos`, `/workspace/turismo/cotacoes`.
  - Consumo Público: `/_store/turismo`, `/_store/proposta/$token`, `/_store/contrato/$token`, `/verify/document/$code`.
  - BFF: `src/services/tourism.functions.ts`, `src/services/travel-proposal.functions.ts`, `src/services/travel-contract.functions.ts`.

### 11.3 Construtor Visual Universal & Hotpages (Visual Builder Engine)
- Motor central de renderização de experiências e páginas personalizadas para qualquer nicho comercial:
  - Tabelas: `cms_documents`, `cms_nodes`, `hotpages`.
  - Módulos de Operação: `/workspace/marketing/vitrine`, `/workspace/marketing/hotpages`, `/workspace/builder/$documentId/editor`.
  - Consumo Público: Renderizado dinamicamente via `ExperienceRenderer` em `/_store/index`, `/_store/ofertas`, `/_store/bio/$slug` e Landing Pages.
  - BFF: `src/services/builder.functions.ts` e `src/services/hotpage.functions.ts`.

### 11.4 Ledger Criptográfico de Tokens & Solvência
- Arquitetura de carteiras de tokens e ledger imutável com prova matemática de solvência:
  - Tabelas: `store_token_wallets`, `user_token_wallets`, `token_ledger_immutable`, `token_pricing_rules`.
  - Módulos de Operação: `/workspace/tokens`, `/admin-master/tokens`.
  - Consumo Público: `/_store/conta/tokens`.
  - BFF: `src/services/tokens.functions.ts`.

### 11.5 Arquitetura Waesy Care Finance & Supply Chain Finance (Saúde de Caixa das PMEs)
- Camada de engenharia e inteligência financeira desenhada para blindar o comerciante contra asfixia de capital de giro e descasamento de caixa:
  - **Tabelas Canônicas:**
    - `store_inbound_invoices`: Registro de notas fiscais de entrada (chave de 44 dígitos, fornecedor, CNPJ, valor total).
    - `supplier_invoice_split_schedules`: Duplicatas agendadas para liquidação atômica interna em D+0 com R$ 0,00 de taxas.
    - `store_settlement_policies`: Política de payout diferenciada (externo D+7 a D+30 vs interno D+0 para fornecedores).
    - `store_cash_safes` & `store_cash_safe_entries`: Cofres blindados com rendimento CDI diário (Aluguel e Folha de Pagamento).
    - `store_working_capital_advances` & `store_working_capital_installments`: Giro solidário amortizado como percentual suave das vendas diárias (5% a 15%), com carência zero nos dias de movimento fraco.
    - `store_carnes` & `store_carne_installments`: Carnês digitais e crediário com régua acolhedora e conciliação empática.
  - **Módulos de Operação no Workspace:**
    - `/workspace/financeiro/recebiveis` (Gestão de Carnês, Notificações Empáticas, Relatório de Contas a Receber).
    - `/workspace/financeiro/caixa` (Fluxo de Caixa Operacional, Turnos, Sangrias e Suprimentos).
    - `/workspace/financeiro/pagamentos` (Histórico de Liquidações e Baixas).
  - **Camada BFF (`/services`):**
    - `src/services/receivables.functions.ts`: CRUD de carnês, conciliação e lembretes amigáveis.
    - `src/services/cash-management.functions.ts`: Gestão de cofres, antecipação suave de giro e conciliação de NF-e de entrada.
  - **Invariantes Arquiteturais:**
    - Todo valor em inteiros de centavos (`_cents`).
    - Nenhuma chamada ao Supabase em componentes visuais.
    - Isolamento Multi-Tenant estrito derivado da sessão via `getServerIdentity()`.

### 11.6 Ledger Criptográfico Imutável (Padrão Bacen / SHA-256 Blockchain-Like) & Auditoria Forense
- Camada de contabilidade criptográfica imutável e trilha forense universal para todas as mutações financeiras (Tokens, Carnês, PIX, Carteira, Comissões):
  - **Tabelas Canônicas:**
    - `public.financial_immutable_ledger`: Tabela append-only protegida por trigger inviolável (`prevent_ledger_modification`), encadeamento de digest SHA-256 (`entry_hash` e `prev_hash`), sequência numérica monotônica (`sequence_number`), carimbo de tempo, chave de idempotência e telemetria forense (IP Cloudflare, país, cidade, User-Agent, ator e papel).
    - `public.forensic_audit_events`: Tabela de telemetria forense profunda para todas as mutações sistêmicas com checksum e dados de sessão.
  - **Stored Procedures & Verificação Matemática:**
    - `record_immutable_ledger_entry`: Executada com `SECURITY DEFINER`, computa o digest SHA-256 e anexa o bloco à cadeia.
    - `verify_ledger_chain_integrity`: Audita matematicamente toda a cadeia desde o bloco Genesis (`0000...0000`), identificando qualquer adulteração física ou quebra de continuidade.
  - **Módulos de Operação e Governança:**
    - `/admin-master/auditoria-forense` (Painel Master de Auditoria Forense, Verificação de Cadeia em Tempo Real, Visualização de Hashes e Histórico Forense).
  - **Camada BFF (`/services`):**
    - `src/services/immutable-ledger.functions.ts`: Funções `recordLedgerTransaction`, `recordLedgerEntryCore`, `verifyLedgerIntegrity` e `listLedgerEntries`.
    - Integrações bilaterais automáticas em `tokens.functions.ts` e `receivables.functions.ts`.
