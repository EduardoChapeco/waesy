# SPEC-20261108 — Unificação Sistêmica de Mesas, Comandas, Reservas & Erradicação de Neon no Dark Theme

## 1. Contexto & Diagnóstico Forense

### 1.1 Anomalia Visual: "Neon" no Tema Dark
- **Causa Raiz:** Os estados de mesa "Livre" em `src/routes/workspace.pdv.comandas.tsx` e `src/routes/workspace.reservas.tsx` utilizavam classes agressivas de destaque luminoso (`border-emerald-500/30`, `bg-emerald-500/5`, `text-emerald-400`, `dotClass: bg-emerald-500`, além de círculos verdes neon para mesas redondas).
- **Violação de Princípio:** O estado "Livre" (Available) é o **estado de repouso / neutro** de um salão. Em tema escuro, a proliferação de 12 a 24 cartões emitindo luz verde esmeralda vibrante gera fadiga visual e quebra o padrão sóbrio Apple HIG / Linear.
- **Correção:** O estado "Livre" adota a casca padrão canônica de superfície: `bg-card border-border/70 text-foreground` com badge neutro `variant="outline" text-muted-foreground`. Acentos cromáticos semânticos ficam restritos a estados ativos:
  - **Ocupada:** `border-primary/40 bg-primary/5 text-primary`
  - **Conta Solicitada:** `border-amber-500/40 bg-amber-500/10 text-amber-500`
  - **Atraso / Alerta (>40m):** `border-rose-500/40 bg-rose-500/10 text-rose-500`
  - **Reservada:** `border-indigo-500/40 bg-indigo-500/10 text-indigo-400`

### 1.2 Desconexão Estrutural: Mesas vs Comandas vs Reservas
- **Causa Raiz:** O módulo `/workspace/pdv/comandas` executava um laço numérico estático `for (let i = 1; i <= 24; i++)` em `getSalonTablesOverview()`, ignorando a tabela `store_floor_plans`. Não havia botão nem capacidade de editar ou criar mesas. Por outro lado, `/workspace/reservas` possuía o editor de planta 2D (`store_floor_plans`), permitindo mesas com nomes personalizados ("Varanda", "Mesa VIP", etc.).
- **Unificação Conceitual (SSOT):**
  - **Mesa (Table):** Entidade física no salão (capacidade de lugares, formato, localização no salão). Definida na planta do salão (`store_floor_plans` / `restaurant_tables`).
  - **Reserva (Reservation):** Agendamento prévio de uma Mesa física para data/hora e cliente específicos (`store_table_reservations`).
  - **Comanda (Order / Tab):** Sessão ativa de atendimento e consumo associada a uma Mesa física e opcionalmente a um Cliente (`orders` onde `origin_type = 'table'`).
  - **Fluxo Integrado:** Acomodar reserva ➔ Abre comanda na mesa correspondente com dados do cliente pré-preenchidos.

### 1.3 Conectividade Sistêmica End-to-End
1. **Mesa ➔ KDS (Cozinha):** Itens lançados na comanda (`addItemsToTableComanda`) gravam `order_items` e atualizam `orders.status = 'processing'` com `table_identifier`, alimentando em tempo real as estações de preparo de `workspace.pdv.cozinha.tsx`.
2. **Mesa ➔ CRM (Cliente):** `openTableComanda` passa a aceitar e registrar `customerId`, `customerName`, `customerPhone`, `customerCpf`, persistindo em `orders.customer_id` e `orders.customer_snapshot` para consulta no histórico do cliente.
3. **Mesa ➔ Caixa / PDV / DRE / Estoque:** `closePdvComanda` realiza o fechamento atômico quádruplo:
   - Baixa física de estoque em `product_variants` e registro em `stock_movements`.
   - Lançamento de pagamento em `payments` com idempotência.
   - Registro de entrada no caixa físico ativo (`cash_registers` / `cash_register_entries`) para qualquer modalidade (dinheiro, pix, cartão).
   - Lançamento contábil em `financial_transactions` (`type = 'revenue_pos_sale'`) para o DRE da loja.
   - Registro criptográfico SHA-256 no ledger imutável (`recordLedgerEntryCore`).

---

## 2. Especificação EARS (Easy Approach to Requirements Syntax)

- `[EARS-THEME-01]` **Quando** o usuário estiver no tema escuro em qualquer tela de mesas ou reservas, o sistema **deve** renderizar mesas livres com paleta neutra de superfície (`bg-card`, `border-border/70`, `text-foreground`), eliminando bordas e fundos verdes neon fluorescentes.
- `[EARS-TABLES-02]` **Quando** a rota `/workspace/pdv/comandas` carregar o resumo de salão, o sistema **deve** obter as mesas a partir da planta customizada da loja (`store_floor_plans`), refletindo exatamente os mesmos nomes, capacidades e formatos configurados no editor de salão.
- `[EARS-TABLES-03]` **Quando** o operador estiver em `/workspace/pdv/comandas`, o sistema **deve** disponibilizar o botão de ação "Editar Salão" (usando `FloorPlanEditorSheet`), permitindo criar, renomear ou remover mesas com sincronização imediata.
- `[EARS-CRM-04]` **Quando** o operador abrir atendimento em uma mesa livre, o sistema **deve** exibir um diálogo modal permitindo informar nome, telefone, CPF ou selecionar um cliente existente do CRM, associando o registro em `orders.customer_id` e `orders.customer_snapshot`.
- `[EARS-KDS-05]` **Quando** itens forem adicionados à comanda via `addItemsToTableComanda`, o sistema **deve** marcar o pedido como `processing` com `channel_origin = 'table'`, garantindo que os itens apareçam imediatamente no KDS (`/workspace/pdv/cozinha`).
- `[EARS-CLOSE-06]` **Quando** a comanda for liquidada via `closePdvComanda`, o sistema **deve** realizar baixa atômica de estoque em `product_variants`, registrar em `stock_movements`, criar lançamento em `cash_register_entries` (se houver caixa aberto), registrar em `financial_transactions` e alimentar o ledger criptográfico.

---

## 3. Matriz de Evidências & Critérios de Aceite

1. **Build Limpo:** `npm run build` gerando bundle de produção sem erros de tipagem ou resolução.
2. **Design Lint Ratchet:** `node scripts/design-lint.mjs --ratchet` aprovado sem novas violações P0/P1.
3. **Paridade Visual:** Zero classes neon em estados livres; contraste WCAG 2.2 AA preservado.
4. **Deploy Cloudflare Pages:** Publicação bem-sucedida via Wrangler com validação HTTP 200 OK.
