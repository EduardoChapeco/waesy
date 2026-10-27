# Plano de Implementação — Master Prompt V10: Multi-Niche Checkout, BFF Contracts & Ultra-Minimalist UI

Este plano estabelece a arquitetura e execução completa para a reformulação do ecossistema de Checkout da Waesy, cobrindo as 5 Fases solicitadas pelo Conselho de Arquitetura:
1. **Modelagem de Dados & Migrations (Supabase Postgres)**
2. **Contratos BFF & Server Functions Dinâmicas**
3. **Refatoração UI Ultra-Minimalista (Zero Badges / Zero Ícones Decorativos)**
4. **Editor de Checkout no Workspace Pro**
5. **Auditoria Forense, Regressão & Validação E2E**

---

## 🏛️ Diretrizes do Conselho Executivo (BigTech Architecture)

- **Regra de Ouro (Ultra-Minimalismo)**: Proibição total de badges/pills com fundos sólidos (`bg-emerald-500`, etc.) e ícones decorativos redundantes. A hierarquia visual passa a ser 100% ditada por tipografia (`font-medium`, `font-bold`), espaçamento (`whitespace`), divisores ultra-finos e texto colorido funcional (`text-primary`, `text-emerald-600`, `text-destructive`).
- **Ações Textuais Limpas**: Botão de exclusão é texto sutil `"Remover"` (sem lixeirinha); ações de edição são textos como `"Alterar"` em verde interativo alinhados à direita; descontos são texto simples `"10% OFF"` sem caixa em volta.
- **Multi-Nicho Nativo**: O checkout adapta-se automaticamente:
  - *Mercado / Supermercado*: Regras de substituição ("Similar", "WhatsApp", "Cancelar"), quem recebe as compras ("Eu mesmo" / "Outra pessoa"), ponto de maturação.
  - *Gastronomia / Food*: Envio de talheres ("Enviar talheres descartáveis"), observações específicas por prato.
  - *Varejo & Serviços*: CPF na nota fiscal, agendamento e instruções de entrega.
- **Completude Séptupla**: Nenhuma opção será mockada. Tudo persiste em colunas dedicadas de `orders` e `order_items`.

---

## 📋 Decomposição dos Requisitos [REQ-1] a [REQ-10]

- `[REQ-1]`: **Database DDL**: Adicionar colunas em `orders` (`notes`, `custom_fields`, `cpf_on_receipt`, `substitution_policy`, `receiver_info`, `checkout_niche_metadata`) e em `order_items` (`notes`).
- `[REQ-2]`: **Configuração de Checkout na Loja**: Estruturar `stores.settings.checkout_config` para armazenar flags de ativação de cada funcionalidade contextual.
- `[REQ-3]`: **BFF getStoreCheckoutConfig**: Server Function que inspeciona a loja e os itens do carrinho e retorna o contrato exato das opções disponíveis, eliminando suposições no frontend.
- `[REQ-4]`: **BFF processCheckout Payload Expansion**: Expandir o schema Zod e o handler de `processCheckout` para receber e persistir atomicamente todas as preferências dinâmicas no banco de dados.
- `[REQ-5]`: **BFF updateStoreCheckoutConfig**: Server Function com RBAC para os gestores salvarem as preferências de checkout no Workspace.
- `[REQ-6]`: **UI Ultra-Minimalista do Checkout (`_store.checkout.tsx`)**: Refatoração completa das etapas de Identificação, Entrega, Pagamento e Resumo do Pedido aplicando o paradigma "Zero Badges / Zero Ícones Decorativos".
- `[REQ-7]`: **Seções Contextuais de Checkout**:
  - Preferências de Substituição (Mercado/Alimentos).
  - Identificação de Recebedor (Logística).
  - CPF na Nota Fiscal (Fiscal/Tributário).
  - Observações por Item e Gerais.
  - Talheres/Descartáveis (Gastronomia).
- `[REQ-8]`: **Editor de Checkout no Workspace (`workspace.configuracoes.checkout.tsx` ou aba em `configuracoes`)**: Interface limpa e ergonômica para o lojista configurar os fluxos de onboarding de compra e regras do checkout.
- `[REQ-9]`: **Página de Confirmação do Pedido (`_store.pedido.$publicToken.confirmacao.tsx`)**: Atualizar a visualização do pedido para exibir com clareza as escolhas feitas (CPF informado, política de substituição escolhida, recebedor cadastrado e notas dos itens).
- `[REQ-10]`: **Validação & Compilação**: 0 erros no TypeScript (`npm run build`), testes de regressão e garantia de dados no Postgres.

---

## 🛠️ Plano Detalhado por Fase

### Fase 1: Arquitetura de Dados & Migrations (PostgreSQL)
1. **Migration SQL**:
   ```sql
   ALTER TABLE public.orders 
     ADD COLUMN IF NOT EXISTS notes TEXT,
     ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
     ADD COLUMN IF NOT EXISTS cpf_on_receipt JSONB DEFAULT '{"requested": false}'::jsonb,
     ADD COLUMN IF NOT EXISTS substitution_policy TEXT DEFAULT 'similar',
     ADD COLUMN IF NOT EXISTS receiver_info JSONB DEFAULT '{"mode": "self"}'::jsonb,
     ADD COLUMN IF NOT EXISTS checkout_niche_metadata JSONB DEFAULT '{}'::jsonb;

   ALTER TABLE public.order_items
     ADD COLUMN IF NOT EXISTS notes TEXT;
   ```
2. Executar via `execute_sql` no Supabase e registrar o arquivo de migration canônico em `supabase/migrations/`.

### Fase 2: Contratos BFF e Actions (Backend For Frontend)
1. **Arquivo**: [`src/services/checkout.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/checkout.functions.ts)
   - Definir interfaces TypeScript para `CheckoutNicheConfig`, `CpfOnReceiptPayload`, `ReceiverInfoPayload`, `SubstitutionPolicy`.
   - Implementar `getStoreCheckoutConfig` (`createServerFn`):
     - Deriva se a loja é Mercado, Food, Varejo ou Serviços.
     - Lê `store.settings.checkout_config` com defaults inteligentes para cada nicho.
     - Retorna as regras ativas para o checkout.
   - Atualizar `processCheckout`:
     - Atualizar `CheckoutSchema` com validações Zod.
     - No handler pós-RPC, atualizar as colunas `notes`, `custom_fields`, `cpf_on_receipt`, `substitution_policy`, `receiver_info`, `checkout_niche_metadata` de `orders`.
     - Atualizar `order_items.notes` caso o cliente tenha enviado observações por item.
   - Implementar `updateStoreCheckoutConfig` (`createServerFn`):
     - Permite que o operador da loja atualize `checkout_config` em `stores.settings`.

### Fase 3: Ultra-Minimalist UI Refactor (O Fim dos Ícones)
1. **Arquivo**: [`src/routes/_store.checkout.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.checkout.tsx)
   - Remover badges sólidos (`bg-emerald-500 text-white`, etc.) e ícones decorativos de seções.
   - Manter apenas tipografia austera, números limpos e contrastes de texto (`text-foreground`, `text-muted-foreground`, `text-primary`, `text-emerald-600`).
   - Botão de alterar informações: texto puro `"Alterar"` alinhado à direita, verde interativo.
   - Botão de exclusão/remover: texto puro `"Remover"` em tom vermelho suave/muted.
   - Adicionar os blocos contextuais limpos:
     - **Fiscal**: Checkbox/toggle minimalista "Incluir CPF na Nota Fiscal" com input para o documento.
     - **Substituição (Supermercados)**: Opções limpas em texto ("Trocar por similar", "Confirmar via WhatsApp", "Cancelar item").
     - **Logística & Recebimento**: Seletor textual ("Eu mesmo irei receber" vs "Outra pessoa irá receber" + nome e telefone).
     - **Gastronomia**: Toggle textual "Enviar talheres e guardanapos descartáveis?".
     - **Observações por Item**: Link textual "Adicionar observação" que abre input direto no item.

### Fase 4: Workspace Pro — Editor Avançado de Checkout
1. **Arquivo**: [`src/routes/workspace.configuracoes.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.configuracoes.index.tsx)
   - Adicionar a aba **"Checkout & Compra"** no painel de configurações.
   - Permitir configurar:
     - Exigência de CPF (Opcional, Obrigatório ou Desativado).
     - Habilitação da Política de Substituição (Mercado/Hortifrúti).
     - Habilitação do Módulo de Recebedor da Compra.
     - Habilitação de Talheres / Descartáveis (Gastronomia).
     - Habilitação de Observações por Item.
     - Perguntas personalizadas de checkout.

### Fase 5: Auditoria & Verificação End-to-End
1. **Confirmação do Pedido**:
   - Atualizar [`_store.pedido.$publicToken.confirmacao.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.pedido.$publicToken.confirmacao.tsx) para exibir as novas informações com o mesmo design ultra-minimalista.
2. **Build TypeScript**:
   - `npm.cmd run build` com 0 erros.
3. **Teste no Navegador**:
   - Simular compra com as opções ativas e verificar integridade visual e funcional.

---

## 🔒 Confirmação do Usuário

Você aprova este plano para iniciarmos imediatamente a **FASE 1 (Modelagem de Dados & Migrations)** seguida pelas Fases 2, 3, 4 e 5?
