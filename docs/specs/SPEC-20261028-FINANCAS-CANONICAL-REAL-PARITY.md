# SPEC-20261028-FINANCAS-CANONICAL-REAL-PARITY
## Especificação Técnica: Reestruturação Canônica da Tela de Finanças, Banco Digital e Extrato Real

### 1. Metadados & Contexto
- **Data:** 28 de Outubro de 2026
- **Status:** APROVADO
- **Autoridade:** Antigravity Architect & BigTech Board
- **Conformidade:** AGENTS.md B.4, B.5, B.7, B.8, B.9, B.22, B.25, B.26, B.27, B.31, B.33
- **Alvo:** Tela de Finanças (`/_store/conta/financas`), Carteira Digital, Barramento de Extrato e Subfluxos

---

### 2. Declaração do Problema & Diagnóstico
1. **Dados Falsos e Mocks Silenciosos:**
   - O cabeçalho exibia nome hardcoded "João Pedro" e saldo de R$ 20.000,00 como fallback de dados nulos.
   - A lista de atividades recentes continha "Shopping Iguatemi -R$ 281,00" fixo no código.
   - O widget do cartão de crédito exibia valores fixos de R$ 2.458,00 e limite de R$ 10.000,00 sem existir registro de cartão para o usuário.
2. **Inexistência de Lógica Real de Rendimento (CDI):**
   - A interface exibia uma pílula "120%/CDI ↑" decorativa sem que o usuário houvesse ativado rendimento e sem motor de cálculo no backend.
3. **Desalinhamento com Design das Imagens de Referência:**
   - O verde vibrante não ocupava o topo completamente (havia cabeçalho mobile redundante e paddings laterais cortando o bloco).
   - Ausência de conexão com os subfluxos da Imagem 1: Área Pix com chaves reais e limites, Tela de Sucesso com comprovante HMAC oficial, Fatura de Cartão com meses reais e Pagamento, e Ajustes do Cartão com bloqueio e limite real.
4. **Desconexão com Gestão Financeira Pessoal:**
   - Usuário possui sistema de lançamentos manuais (`personal_financial_entries`) que não aparecia organicamente unificado no extrato e nos saldos.

---

### 3. Requisitos em Sintaxe EARS

#### 3.1 Ubíquos (Sempre Ativos)
- **EARS-UBI-01:** O sistema DEVE utilizar exclusivamente dados reais do usuário autenticado (`profiles.full_name`, `profiles.avatar_url`, `profiles.cpf`), nunca exibindo dados fictícios ou avatares artificiais.
- **EARS-UBI-02:** O sistema DEVE estender a superfície verde-limão vibrante por toda a largura do topo da viewport (`w-full`), cobrindo a safe-area e notch do aparelho sem cortes laterais ou cabeçalhos redundantes cinzas.
- **EARS-UBI-03:** Todas as mutações financeiras (transferências, depósitos, pagamentos de fatura, cadastros de chaves e ativação de cartão) DEVEM transacionar no backend através de Server Functions atômicas com tratamento Zod, segurança Zero-Trust e hash-chain contábil.

#### 3.2 Orientados a Evento (Quando...)
- **EARS-EVT-01:** QUANDO o usuário autenticado acessar a tela de finanças, O sistema DEVE carregar o saldo real da carteira em `financial_ledger_accounts` (se 0, exibir R$ 0,00 de forma honesta).
- **EARS-EVT-02:** QUANDO o rendimento da carteira estiver desativado (`is_yield_enabled = false`), O sistema NÃO DEVE exibir taxa de rendimento fixa como se estivesse rendendo, exibindo botão/status para ativação da Conta Remunerada.
- **EARS-EVT-03:** QUANDO o usuário ativar o rendimento CDI da conta, O backend DEVE calcular diariamente o rendimento com base na taxa CDI pró-rata, registrando o crédito no ledger com evento correspondente no extrato.
- **EARS-EVT-04:** QUANDO o usuário não possuir cartão de crédito emitido, O widget de cartão DEVE exibir o estado honesto de convite/ativação de cartão virtual gratuito, sem simular faturas inexistentes.
- **EARS-EVT-05:** QUANDO o usuário clicar em "Ativar Cartão Virtual", O sistema DEVE provisionar um cartão real com número virtual, data de validade, limite inicial no banco `user_credit_cards` e fatura aberta do mês atual em `card_invoices`.
- **EARS-EVT-06:** QUANDO o usuário realizar uma transferência Pix, O sistema DEVE exibir a "Tela de Sucesso" com checkmark, valor, destinatário, instituição e comprovante com assinatura criptográfica HMAC-SHA256.
- **EARS-EVT-07:** QUANDO o usuário cadastrar uma nova chave Pix, O sistema DEVE persistir a chave em `user_pix_keys` e exibi-la imediatamente na lista de "Minhas chaves" da Área Pix.
- **EARS-EVT-08:** QUANDO o usuário alterar o limite ou bloquear temporariamente o cartão na tela de "Ajustes do cartão", O sistema DEVE sincronizar imediatamente o estado no banco de dados.

#### 3.3 Baseados em Estado (Enquanto...)
- **EARS-STA-01:** ENQUANTO o saldo estiver em modo oculto pelo usuário (toggle do olho), O sistema DEVE exibir máscara de caracteres (`••••••••`) e persistir a preferência no armazenamento local.
- **EARS-STA-02:** ENQUANTO houver lançamentos manuais do livro caixa pessoal (`personal_financial_entries`), O extrato DEVE listá-los com indicação da categoria real e valor, integrados ao fluxo do extrato unificado.

---

### 4. Modelo de Dados & Migração SQL
Criar migração `supabase/migrations/20270308000000_user_cards_pix_keys_and_cdi_yield_canonical.sql`:
1. `public.user_credit_cards`: Gestão de cartões reais de usuários.
2. `public.card_invoices`: Faturas mensais reais.
3. `public.card_invoice_items`: Lançamentos das faturas.
4. `public.user_pix_keys`: Chaves Pix registradas pelo usuário.
5. `public.user_wallet_yield_settings`: Configurações de rendimento CDI da conta.
6. Políticas RLS Deny-by-Default com acesso restrito a `profile_id = auth.uid()`.

---

### 5. Contratos de Server Functions (BFF)
1. `getUserFinancialOverview`: Carrega dados reais de perfil, saldo da carteira, status do rendimento CDI, cartão ativo (ou null) e fatura do mês.
2. `getWalletYieldStatus` / `toggleWalletYieldSettings`: Gerencia a mecânica de rendimento CDI server-side.
3. `getUserCreditCardDetails` / `requestVirtualCard` / `updateCardSettings`: Ciclo de vida real do cartão de crédito do usuário.
4. `getCardInvoice` / `payCardInvoice`: Visualização e quitação real de fatura com débito em carteira ou emissão de Pix.
5. `listUserPixKeys` / `registerPixKey` / `deletePixKey`: Gestão real de chaves Pix do usuário.
6. `generatePixChargeQrCode`: Geração de cobrança real Pix Copia e Cola / QR Code EMV.

---

### 6. Matriz de Componentes & Vistas (Design Parity Exato)
- `FinancialHeroCard.tsx`: Topo verde limão ponta a ponta, avatar real com foto/iniciais, saudação real, botões de ação e link "Ver extrato >".
- `FinancialActionGrid.tsx`: Carrossel de botões em squircles brancos com Pix em primeiro destaque.
- `CreditCardHomeWidget.tsx`: Widget de cartão que reflete existência e valores reais do cartão do usuário (ou estado de ativação).
- `PixHubDrawer.tsx`: Área Pix idêntica à Imagem 1 (Grid 3x2, Minhas chaves com CPF real/cadastradas, Cadastrar Chave, Gerenciar Chaves).
- `PaymentSuccessReceipt.tsx`: Tela de Sucesso idêntica à Imagem 1 (Checkmark verde, valor, destinatário, instituição, Ver comprovante e Compartilhar).
- `CreditCardInvoiceView.tsx`: Fatura do cartão idêntica à Imagem 1 (Régua de meses JUL/AGO/SET/OUT dinâmicos, fatura aberta, limite disponível/total, Pagar Fatura e lista de compras).
- `CardSettingsDrawer.tsx`: Ajustes do cartão idêntico à Imagem 1 (Cartão verde nevo/waesy com nome do usuário, switch de bloqueio temporário, cartão virtual e ajuste de limite).

---

### 7. Critérios de Aceite & Evidências
1. Zero dados mockados ("João Pedro", saldo falso de 20.000, "Shopping Iguatemi" falso, fatura fixa de 2.458) eliminados 100%.
2. Mecânica de CDI funcional server-side com tabela no banco e botão de ativar/desativar rendimento.
3. Cartão de crédito conectado a banco real, suportando ativação de cartão virtual e pagamentos.
4. Área Pix com chaves reais cadastradas e comprovante de sucesso HMAC.
5. `npm run typecheck` com Exit Code 0.
6. Lint visual e catraca do repositório aprovados.
