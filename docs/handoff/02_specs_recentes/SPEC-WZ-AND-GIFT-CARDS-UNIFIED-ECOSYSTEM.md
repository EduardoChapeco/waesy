# SPEC-WZ-AND-GIFT-CARDS-UNIFIED-ECOSYSTEM — Arquitetura Canônica $WZ, Unificação de Saldos e Vales-Presente End-to-End

## 1. Contexto e Motivação
Historicamente, o ecossistema Waesy acumulou lógicas paralelas e fragmentadas de valor interno:
1. `customer_credits` (créditos em centavos por loja, com endpoints de saque via PIX);
2. `user_token_wallets` e `store_token_wallets` (carteiras de tokens com lógicas parciais de bônus e compras);
3. `stores.settings.token_wallet` e `profiles.preferences.token_wallet` (saldos JSON manipulados diretamente sem garantias ACID);
4. `gift_cards` (cartões em centavos de BRL desvinculados do motor de tokens, com resgates superficiais na UI sem integração com o ledger);
5. Lógicas de cobrança de IA e scraping debitando diretamente JSONs de configuração ou estimando tokens técnicos de LLM como se fossem unidades comerciais.

Essa multiplicidade cria vulnerabilidades econômicas críticas:
- Lojista concedendo créditos ilimitados que poderiam tentar ser sacados via PIX ou monetizados contra a Waesy;
- Utilização indevida de créditos de loja para pagar custos de infraestrutura da plataforma (IA, impulsionamento de anúncios, Waesy Go);
- Impossibilidade de rastrear se um vale-presente foi efetivamente pago com moeda corrente ou concedido gratuitamente como cortesia promocional.

Esta especificação consolida **toda e qualquer unidade de valor interno sob a moeda canônica `$WZ`**, apoiada no modelo inseparável de **Buckets de Valor** (`wz_token_buckets`) e **Ledger Auditável Imutável** (`wz_token_ledger`), integrando o ciclo de vida completo de **Vales-Presente (Gift Cards)** ao Marketplace, Checkout, Workspace e Site Builder.

---

## 2. Invariantes Econômicas e de Segurança

1. **[INV-01] Unidade Canônica Exclusiva `$WZ`:** Toda operação de benefício, fidelidade, cashback, recarga, cortesia e vale-presente opera na unidade `$WZ`. É vedada a criação de moedas paralelas ou saldos em centavos soltos desvinculados de `$WZ`.
2. **[INV-02] Inseparabilidade do Escopo e Financiamento:** O número em `$WZ` nunca existe isolado. Todo saldo pertence a um Bucket caracterizado por: `issuer_type` (`WAESY` | `MERCHANT`), `issuer_id`, `funding_source` (`PURCHASED` | `MERCHANT_FUNDED` | `PLATFORM_PROMOTIONAL` | `CAMPAIGN_FUNDED` | `CASHBACK` | `REFUND_CREDIT`), e `scope_type` (`GLOBAL` | `MERCHANT`).
3. **[INV-03] Isolamento Estrito de Emissão de Empresa:** Nenhum `$WZ` emitido por uma empresa (`scope_type = 'MERCHANT'`) pode ser consumido em outra empresa, pagar IA, financiar impulsionamento, custear Waesy Go, gerar Pix, pagar boleto ou gerar direito a payout/recebível da Waesy.
4. **[INV-04] Distinção entre Vale Comprado e Cortesia de Loja:**
   - Vale Comprado: Possui pedido e pagamento financeiro em moeda corrente (`funding_source = 'PURCHASED'`);
   - Cortesia de Loja: Concessão manual sem pagamento (`funding_source = 'MERCHANT_FUNDED'`). Opera unicamente como desconto concedido pela própria empresa sobre seus produtos, com impacto econômico estritamente assumido por ela (zero passivo para Waesy).
5. **[INV-05] Anti-Arbitragem e Anti-Monetização do Lojista:** O titular ou operadores da Loja X emitirem `$WZ` para si próprios e comprarem na própria loja resulta em valor econômico líquido zero (`Preço Bruto - WZ Financiado Loja = R$ 0`), sendo categoricamente bloqueada a geração de comissões, recebíveis ou payouts artificiais.
6. **[INV-06] Proibição Absoluta de Saque / PIX de Saldos de Loja:** É terminantemente proibido qualquer resgate ou conversão de `$WZ` de loja em dinheiro ou transferência Pix.
7. **[INV-07] Motor Único de Consumo (`WzSpendingEngine`):** Todo débito de `$WZ` passa pelo motor central transacional. Proibido qualquer `UPDATE` direto em colunas de saldo sem o ciclo `AVAILABLE -> RESERVED -> CONSUMED` e gravação no ledger.
8. **[INV-08] Reconciliação Imutável:** A projeção materializada de qualquer bucket deve ser matematicamente idêntica à soma de suas entradas no ledger: `SUM(wz_token_ledger) = available_balance + reserved_balance`.
9. **[INV-09] Proteção Criptográfica de Vales-Presente:** Códigos de resgate são gerados via CSPRNG de alta entropia, armazenados unicamente como hash no servidor (`redemption_code_hash`). Apenas o trecho mascarado (`•••• •••• WXYZ`) é visível na administração. Links de resgate utilizam tokens opacos não adivinháveis (`claim_token`).

---

## 3. Requisitos em Sintaxe EARS

### [EARS-01] Emissão de Cortesia e Fidelidade por Empresa
- **Quando** um lojista autenticado conceder `$WZ` a um cliente no Workspace (`grantMerchantLoyaltyWz`);
- **O sistema DEVE** validar permissão de gerência, exigir justificativa obrigatória, criar bucket com `issuer_id = store_id`, `scope_id = store_id`, `funding_source = 'MERCHANT_FUNDED'` e `cash_redeemable = false`, gravando a entrada `GRANTED` no ledger;
- **Invariante:** O lojista NÃO DEVE conseguir emitir `$WZ` com escopo global ou financiado pela plataforma.

### [EARS-02] Compra e Emissão Idempotente de Vale-Presente ($WZ)
- **Quando** um cliente concluir o checkout de um produto de Vale-Presente (`createGiftCardOrder`);
- **O sistema DEVE** aguardar a confirmação transacional do pagamento (`confirmGiftCardPayment`), gerar segredo de resgate via CSPRNG, calcular o hash criptográfico, registrar o claim token opaco, emitir o evento `ISSUED` e criar a instância com os atributos de personalização (arte, mensagem, remetente, agendamento de entrega);
- **Invariante:** Nenhum saldo ou vale ativo DEVE ser emitido enquanto o pagamento estiver pendente ou em caso de falha.

### [EARS-03] Abertura e Vinculação de Presente (Claim Experience)
- **Quando** o destinatário acessar o link público seguro (`/gift/:token`);
- **O sistema DEVE** apresentar a interface rica de revelação do presente (mockup 3D, mídia personalizada, mensagem afetuosa, valor em `$WZ` e equivalência informativa), registrar o evento `OPENED` e, mediante clique em "Resgatar", vincular o cartão à conta do usuário autenticado através da criação ou associação do respectivo bucket em `$WZ`;
- **Invariante:** Um vale-presente identificado por CPF só pode ser resgatado se a identidade autenticada coincidir com o hash do CPF destinatário. Códigos já resgatados não podem ser reinvidicados novamente.

### [EARS-04] Consumo e Alocação de Saldo em Compras (Checkout)
- **Quando** o cliente aplicar `$WZ` no checkout de um pedido;
- **O sistema DEVE** filtrar buckets estritamente elegíveis para a loja do pedido (priorizando buckets específicos daquela loja prestes a expirar, seguidos de buckets globais), reservar o montante atomico via `wz_reserve_tokens_atomic`, computar o abate no total do pedido e, na confirmação, converter a reserva em `CONSUMED`;
- **Invariante:** Buckets pertencentes a outras lojas NÃO DEVEM ser selecionados ou abatidos.

### [EARS-05] Cancelamento e Estorno de Compras com Preservação de Buckets
- **Quando** um pedido pago total ou parcialmente em `$WZ` for cancelado;
- **O sistema DEVE** estornar as frações consumidas exatamente para os buckets de origem (`refundWzTransaction`), devolvendo `$WZ` da Loja X para a Loja X e `$WZ` Global para a Waesy Global;
- **Invariante:** O cancelamento NUNCA deve converter saldo de loja em saldo global ou saldo em dinheiro Pix.

### [EARS-06] Faturamento Canônico de IA e Impulsionamento
- **Quando** uma operação tarifável de Inteligência Artificial ou Impulsionamento for executada;
- **O sistema DEVE** converter o custo computacional ou diária de visibilidade em `$WZ` através do `WzQuoteEngine`, debitar estritamente de buckets com `allowed_features @> ARRAY['AI']` ou `ARRAY['BOOST']`;
- **Invariante:** Buckets com `funding_source = 'MERCHANT_FUNDED'` NÃO DEVEM financiar IA ou anúncios da plataforma.

### [EARS-07] Bloco Nativo de Vales-Presente no Site Builder
- **Quando** a loja adicionar uma seção de Vales-Presente em seu site personalizado pelo Omni-Builder;
- **O sistema DEVE** renderizar componentes canônicos (`GiftCardHero`, `GiftCardShowcase`, `GiftCardValueSelector`), consumindo diretamente os produtos do catálogo `gift_card_products` sem duplicação de entidades no banco de dados.

---

## 4. Matriz de Aceite e Evidências
1. Migration `20270217000000_canonical_wz_and_gift_cards_ecosystem.sql` implementando tabelas `wz_conversion_rates`, `wz_token_buckets`, `wz_token_ledger`, `gift_card_products`, `gift_card_instances`, `gift_card_media`, `gift_card_events`, além de procedures ACID e migração de registros legados.
2. Camada BFF `src/lib/wz-quote-engine.ts`, `src/services/wz-engine.functions.ts` e `src/services/giftcard.functions.ts` 100% tipadas com Zod, RPCs defensivas e zero mutações de balance fora do ledger.
3. Remoção completa de saques Pix de créditos em `src/services/credits.functions.ts` e saneamento de `_store.conta.creditos.tsx`.
4. Refatoração completa da interface do usuário em `src/routes/_store.conta.tokens.tsx` (Central `$WZ`), `src/routes/_store.conta.gift-cards.tsx` (Central de Vales Recebidos e Enviados) e `src/routes/_store.gift-card.$claimToken.tsx` (Experiência de Abertura com Mockup 3D).
5. Painel do Lojista em `src/routes/workspace.marketing.gift-cards.tsx` e `src/routes/workspace.tokens.tsx` com separação de vales vendidos vs cortesias promocionais.
6. Integração do Site Builder com blocos de Vales-Presente em `src/components/builder/GiftCardCommerceBlocks.tsx`.
7. Suíte exaustiva de testes E2E em `src/services/__tests__/wz-and-gift-cards-unified.test.ts` cobrindo os 17 cenários exigidos.
8. Compilação TypeScript (`npm run typecheck`) com Exit Code 0.
