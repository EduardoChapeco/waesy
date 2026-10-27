# 🏛️ Auditoria Forense do Conselho BigTech: Planejado vs. Entregue vs. Esperado

> **Data:** 21 de Setembro de 2026  
> **Escopo:** Checkout Multi-Nicho, Emissão Fiscal NFe, MotoLink & Despacho Bilateral, UI Ultra-Minimalista ("O Fim dos Ícones") e Paridade CMS ↔ View.

---

## 1. Matriz de Rastreabilidade: Planejado vs. Entregue vs. GAPs

| Área / Requisito | Status Planejado | Status Entregue | Diagnóstico & GAPs Encontrados | Ação Corretiva |
| :--- | :--- | :--- | :--- | :--- |
| **DDL de Banco (Supabase Postgres)** | Migração com colunas em `orders` (`notes`, `custom_fields`, `cpf_on_receipt`, `substitution_policy`, `receiver_info`, `checkout_niche_metadata`) e `order_items` (`notes`). | **100% Concluído** | Validado no banco de dados. RLS e colunas persistindo sem falhas. | Nenhuma ação necessária no DDL. |
| **BFF & Contratos (`checkout.functions.ts`)** | `getStoreCheckoutConfig` e `processCheckout` com Zod estrito. | **100% Concluído** | Persistência atômica de todas as preferências dinâmicas multi-nicho. | Mantido estável. |
| **UI Checkout (`_store.checkout.tsx`)** | Ultra-minimalismo: zero badges/pills com fundos sólidos, tipografia pura, links textuais ("Alterar", "Remover"). | **100% Concluído** | Fluxo limpo de identificação, substituição de mercado, recebedor, CPF na nota e talheres. | Mantido estável. |
| **Configuração de Checkout no Workspace** | Aba de checkout em `workspace.configuracoes.index.tsx`. | **100% Concluído** | Lojista ativa/desativa cada campo de acordo com o nicho da loja. | Mantido estável. |
| **Emissão Fiscal NFe (`fiscal-nfe.functions.ts` & `order.functions.ts`)** | Automatizar NFe no status `paid`/`processing` e botão 1-clique no pedido. | **100% Concluído** | Prioriza CPF do checkout (`order.cpf_on_receipt?.cpf`), sem fallback silencioso `"00000000000"`. | Mantido estável. |
| **Confirmação do Pedido (`_store.pedido.$publicToken.confirmacao.tsx`)** | Visualização ultra-minimalista das escolhas do cliente sem dados fictícios. | **GAP IDENTIFICADO (SEV-2)** | **Dados Bancários Hardcoded**: Dados estáticos de "Itaú (341)", "Waesy Tecnologia LTDA", "00.000.000/0001-00". Badges e ícones em caixinhas coloridas no rastreador e contrato. | **Substituir por dados reais de `storeSettings.payment_settings?.bank_transfer` e aplicar Ultra-Minimalismo visual.** |
| **MotoLink: Preço Dinâmico Silencioso (`shipping.functions.ts`)** | Preço dinâmico sem alarmes no cliente e frete imutável pós-compra. | **100% Concluído** | Removido `notice: "Tarifa dinâmica temporária..."`. Cliente vê preço final e prazo limpos. | Mantido e commitado. |
| **MotoLink: Painel do Entregador (`_store.entrega.$token.tsx`)** | Interface de corrida sem badges sólidos e sem caixas decorativas de ícones. | **100% Concluído** | Removida caixa `bg-primary/10` do caminhão e badge sólido. Status em texto colorido puro. | Mantido e commitado. |
| **MotoLink: Despacho 1-Clique no Pedido (`workspace.pedidos.$id.tsx`)** | O lojista deve conseguir despachar com MotoLink direto da tela do pedido. | **GAP IDENTIFICADO** | Lojista precisava ir até `/workspace/pedidos/frota`. Falta gatilho direto "Despachar com MotoLink" na página do pedido. | **Integrar Sheet/Modal direto de Despacho em `workspace.pedidos.$id.tsx`.** |
| **Higiene Visual: Badges Residuais (`channel-badge.tsx` e `workspace.pedidos.$id.tsx`)** | Regra de Ouro Ultra-Minimalista: zero badges/pills com fundos sólidos. | **GAP IDENTIFICADO** | `ChannelBadge` usa `<Badge className="bg-emerald-500/10...">` e sidebar de pedidos ainda usa `<Badge>`. | **Refatorar para texto semântico puro (`font-bold uppercase tracking-tight`).** |
| **Contratos Turísticos & Modificadores (`contratos.index.tsx` & `product-modifiers-modal.tsx`)** | Zero AI Smell e zero imports mortos. | **GAP IDENTIFICADO** | Imports de `Badge` não utilizados e ícone decorativo em caixa colorida no modal de complementos. | **Limpar imports e remover caixa de ícone no cabeçalho.** |

---

## 2. Auditoria Forense de Hardcodes & Proibição de Mocks

### 2.1 Falha Crítica Detectada em `_store.pedido.$publicToken.confirmacao.tsx`
- **Linhas 343 a 357**:
  ```tsx
  <div className="bg-muted p-4 space-y-1 font-mono text-xs">
    <p><strong>Banco:</strong> Itaú (341)</p>
    <p><strong>Agência:</strong> 0123</p>
    <p><strong>Conta Corrente:</strong> 45678-9</p>
    <p><strong>Favorecido:</strong> Waesy Tecnologia LTDA</p>
    <p><strong>CNPJ:</strong> 00.000.000/0001-00</p>
  </div>
  ```
- **Violação**: Quebra da Regra de Ouro nº 10 e nº 19 de AGENTS.md (Zero Silent Fallback / Proibição Total de Mocks).
- **Correção Imediata**: Extrair os dados da configuração da própria loja (`storeSettings.payment_settings?.bank_transfer`). Se a loja não configurou transferência bancária, renderizar instrução limpa de contato via WhatsApp com o comerciante.

### 2.2 Falha Visual no Acompanhamento de Pedido e Contrato
- Caixas de ícones coloridas (`bg-primary/10`, `bg-success/15`) e badges em pílula com fundo sólido competem com o conteúdo limpo da tela.
- A régua de status deve usar linhas tipográficas com texto colorido puro (`text-primary`, `text-emerald-600`, `text-muted-foreground`), alinhado aos padrões da Apple e Linear.

---

## 3. Próximas Etapas e Arquitetura de Entrega

1. **Etapa 1 (Execução Imediata)**:
   - Erradicar o mock bancário em `_store.pedido.$publicToken.confirmacao.tsx` e aplicar Ultra-Minimalismo no card de contrato e tracker.
   - Refatorar `src/components/commerce/channel-badge.tsx` para texto puro colorido sem fundo de pill.
   - Corrigir o badge residual na sidebar de `workspace.pedidos.$id.tsx`.
   - Limpar imports mortos de `Badge` em `workspace.turismo.contratos.index.tsx` e `product-modifiers-modal.tsx`.
2. **Etapa 2 (Integração Bilateral MotoLink)**:
   - Adicionar o botão/sheet "Despachar com MotoLink" diretamente em `workspace.pedidos.$id.tsx` para pedidos de entrega pagos/em processamento, gerando o link com PIN de 4 dígitos sem alterar o valor pago pelo cliente.
3. **Etapa 3 (Validação Rigorosa)**:
   - Compilação limpa (`npm run build`) com 0 erros.
4. **Etapa 4 (Alinhamento Estratégico via `/grill-me`)**:
   - Iniciar o processo de entrevista interativa para definir a próxima verticais de paridade total CMS ↔ View (Turismo, Imóveis ou Balcão PDV).
