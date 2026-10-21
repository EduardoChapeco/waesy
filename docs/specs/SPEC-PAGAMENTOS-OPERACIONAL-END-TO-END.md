# SPEC-PAGAMENTOS-OPERACIONAL-END-TO-END: Centro Operacional Canônico de Cobranças, Pagamentos, Recebimentos, Faturas, Comprovantes e Métodos de Recebimento

## 1. Contexto e Motivação
O módulo Pagamentos (`_store.conta.pagamentos`) opera como o **centro operacional de movimentações financeiras** do usuário, responsável pelo registro de cobranças, tentativas de pagamento, liquidações, dados de recebimento Pix, faturas, reembolsos e emissão de comprovantes.
Anteriormente:
1. O empty state *"Nenhum histórico de pagamento ou cobrança"* mascarava falhas de rede e exceções não tratadas (`catch(() => [])`), convertendo erros em silêncio.
2. As transações exibidas limitavam-se a pedidos de e-commerce e carnês, ignorando pagamentos de corridas Waesy Go, ingressos de eventos, reservas de turismo, transferências P2P e cobranças Pix diretas.
3. A aba de Pix limitava-se a gravar uma chave em `profiles.pix_settings`, sem gerar payload EMV/BACEN real, sem QR Code estático/dinâmico autenticado e sem suporte à criação de cobranças personalizadas para recebimento.
4. Faturas eram tratadas como conceito ambíguo, sem agregação estruturada de vencimentos, parcelamentos e itens discriminados.
5. Faltava rastreabilidade bidirecional entre o pagamento operacional, a entidade comercial geradora (pedido, corrida, carnê, ingresso), o comprovante criptográfico (HMAC-SHA256) e a projeção analítica em Finanças.

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### 2.1 Separação Operacional vs Analítica (Pagamentos vs Finanças)
- **EARS-PAY-01 (Invariante de Fonte Operacional):**
  - *O sistema DEVE* tratar `payment_charges` e `payments` como a única fonte da verdade operacional de movimentações de entrada e saída.
  - *O sistema NÃO DEVE* permitir que a interface ou módulos de UI manipulem saldos ou declarem pagamentos como concluídos sem liquidação auditável no servidor.

- **EARS-PAY-02 (Projeção Unidirecional em Finanças):**
  - *Quando* um pagamento for liquidado com sucesso (`status = 'paid'`), *o sistema DEVE* emitir um evento no barramento `financial_events` com `reference_url` navegável para a entidade de origem, garantindo que o módulo Finanças projete o extrato sem jamais duplicar o lançamento.

### 2.2 Unificação de Origens e Histórico Operacional
- **EARS-PAY-03 (Ingestão de Múltiplos Domínios):**
  - *Quando* o usuário consultar seu histórico de pagamentos, *o sistema DEVE* consolidar transações de todas as verticais ativas: Pedidos de Marketplace (`order`), Waesy Go (`mobility_trip`), Carnês (`carne_installment`), Eventos (`ticket`), Turismo (`tourism_booking`), Transferências P2P (`p2p_transfer`) e Cobranças Pix avulsas (`pix_charge`).

- **EARS-PAY-04 (Rastreabilidade Bidirecional):**
  - *Todo registro de pagamento DEVE* conter o identificador comercial amigável da contraparte, descrição do item ou serviço, valor em centavos inteiros (`amount_cents`), método de pagamento, status comercial legível e link bidirecional para o detalhe da entidade de origem.

- **EARS-PAY-05 (Drawer de Detalhe e Comprovante HMAC):**
  - *Ao abrir* uma transação no histórico, *a interface DEVE* exibir um modal/drawer contendo discriminação completa de valores, taxas, descontos, contraparte, método e botão de acesso direto ao comprovante digital oficial assinado criptograficamente via HMAC-SHA256 (`financial_receipts`).

### 2.3 Estúdio de Recebimento Pix (Estático e Dinâmico)
- **EARS-PAY-06 (Configuração Segura de Chave Pix):**
  - *O sistema DEVE* permitir a configuração de Chave Pix civil (CPF/CNPJ, E-mail, Celular, EVP) e nome do beneficiário com validação server-side e persistência transacional.

- **EARS-PAY-07 (QR Code e Copia e Cola Estático BACEN):**
  - *O sistema DEVE* gerar dinamicamente o código Pix Copia e Cola (EMV payload padrão BACEN com CRC16-CCITT) e QR Code legível com base na chave configurada, permitindo cópia imediata com feedback tátil de toast.

- **EARS-PAY-08 (Criação de Cobrança Pix com Valor - Dinâmica):**
  - *Quando* o usuário preencher valor em R$ e descrição para receber um pagamento, *o sistema DEVE* registrar uma cobrança `payment_charges` com status `pending`, gerar o payload Pix EMV com o valor embutido (sub-campo 54) e fornecer QR Code e código Copia e Cola com expiração auditável.

### 2.4 Faturas e Agregação Comercial
- **EARS-PAY-09 (Exibição Estruturada de Faturas):**
  - *A aba de Faturas DEVE* listar cobranças consolidadas, mensalidades ou faturas de carnês com data de vencimento, cálculo dinâmico de encargos em caso de atraso (multa de 2% e juros de 1% a.m. pro-rata die) e opção de quitação via Pix.

### 2.5 Métodos de Pagamento e Saldos
- **EARS-PAY-10 (Consulta de Meios e Saldo Real):**
  - *A aba de Métodos DEVE* exibir os canais operacionais disponíveis (Pix, Saldo em Carteira Waesy, Cartões Tokenizados e Crediário), consultando o saldo disponível diretamente do ledger de partidas dobradas (`getMyWalletBalance`).

### 2.6 Tratamento de Erros e Empty States Honestos
- **EARS-PAY-11 (Proibição de Mascaramento de Erro):**
  - *O sistema NÃO DEVE* renderizar o empty state de lista vazia quando houver falha de rede, erro no banco ou exceção no loader; nesses casos, *o sistema DEVE* exibir tela de erro explícita com botão "Tentar Novamente".

### 2.7 Design System Bidirecional e Acessibilidade
- **EARS-PAY-12 (Piso de Ergonomia e Acessibilidade):**
  - *Todas as superfícies DEVEM* cumprir:
    1. Dimensão tátil mínima de 44x44px (`h-11 min-h-11`).
    2. Anéis de foco teclado `:focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.
    3. Zero emojis na UI e nos arquivos de backend.
    4. Zero classes arbitrárias fora da grade modular de 4px.
    5. Bifurcação Mobile Native App (<840px) vs Desktop System App ($\ge$840px).

---

## 3. Matriz de Entidades Canônicas

| Entidade | Papel | Tabela / Persistência |
| :--- | :--- | :--- |
| **Cobrança** | Intenção de cobrança / o que precisa ser pago | `payment_charges` |
| **Pagamento** | Tentativa / movimentação financeira operacional | `payments` |
| **Liquidação** | Confirmação econômica e reconciliação | `payment_settlements` / `financial_ledger_entries` |
| **Reembolso** | Movimentação reversora imutável | `payment_refunds` |
| **Fatura** | Documento agrupado com vencimento e itens | `payment_invoices` / `platform_invoices` |
| **Dados Pix** | Perfil de recebimento e chaves BACEN | `profiles.pix_settings` / `user_pix_profiles` |
| **Comprovante** | Documento inviolável com HMAC-SHA256 | `financial_receipts` |

---

## 4. Critérios de Aceite e Verificação
1. [ ] Migration `20270220000000_canonical_payments_operational_center.sql` criada e validada com RLS.
2. [ ] BFF `src/services/payment-operational.functions.ts` implementado com handlers puros, Zod e tratamento defensivo.
3. [ ] Rota `src/routes/_store.conta.pagamentos.tsx` completamente refatorada nas 4 abas canônicas: `[ Histórico ]`, `[ Faturas ]`, `[ Receber ]`, `[ Métodos ]`.
4. [ ] Geração dinâmica de QR Code Pix e Copia e Cola EMV com CRC16 validado contra suíte BACEN.
5. [ ] Suíte de testes automatizados `src/services/__tests__/payments-operational-end-to-end.test.ts` com 100% de aprovação no Vitest.
6. [ ] Zero violações de Design Lint P0 e P1 em todos os arquivos modificados e criados.
