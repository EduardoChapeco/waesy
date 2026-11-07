# 03 — Auditoria Detalhada de Páginas e Rotas

## 1. Classificação das 406 Páginas Auditadas

O inventário individualizado está registrado no arquivo [page-audit.csv](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/audits/waesy-redesign-acceptance/page-audit.csv).

```
+----------------------------------------------------------------------+
| DISTRIBUIÇÃO DAS 406 PÁGINAS                                         |
+----------------------------------------------------------------------+
| APROVADO:                   5 páginas  ( 1.2% )                      |
| PARCIAL:                   32 páginas  ( 7.9% )                      |
| FUNCIONALMENTE VALIDADO:  257 páginas  ( 63.3% )                     |
| NÃO CONFORME:              86 páginas  ( 21.2% )                     |
| IDENTIFICADO:              26 páginas  ( 6.4% )                      |
+----------------------------------------------------------------------+
```

---

## 2. As 5 Páginas com Selo APROVADO (Conformidade Plena)

Estas 5 páginas foram completamente reconstruídas sob o padrão Belasis / Apple HIG, possuem barra de ferramentas canônica, suporte integral a modos Kanban/Tabela/Cards e passaram na suíte de testes E2E:

1. **`src/routes/workspace.pedidos.index.tsx` (Operações / Pedidos Omnichannel):**
   - Barra canônica unificada com tabs e busca.
   - Kanban full-viewport com física tátil e persistência em `order_items`.
   - Alternância fluida para visualização em tabela densa.
2. **`src/routes/workspace.turismo.index.tsx` (Turismo / Operações de Viagens):**
   - Visualização em cards de pacotes, tabela de passageiros e kanban de emissão de vouchers.
   - Drawer 360 do viajante e controle de ocupação de assentos.
3. **`src/routes/workspace.agenda.index.tsx` (Serviços / Recepção e Agendamento):**
   - Grid de horários por profissional e sala.
   - Auditoria de status de agendamento (`completed_at`, `no_show_marked_at`).
   - Modal com safe-area e touch targets de 44px.
4. **`src/routes/workspace.tarefas.tsx` (Equipe / Gestão de Tarefas Estilo Trello):**
   - Kanban polimórfico com drag-and-drop nativo.
   - Cores semânticas via variáveis de design tokens (`var(--primary)`, `var(--warning)`).
5. **`src/routes/workspace.clientes.index.tsx` (CRM / Gestão de Contatos):**
   - Tabela densa com busca preditiva e drawer lateral de visão 360 do cliente.

---

## 3. Amostra Representativa de Páginas NÃO CONFORMES (86 Rotas)

As seguintes páginas continuam consumindo o componente legado `PageHeader`, violando a Invariante B.26 e gerando empilhamento de até 120px no topo da viewport:
- `src/routes/workspace.catalogo.produtos.index.tsx`
- `src/routes/workspace.catalogo.categorias.index.tsx`
- `src/routes/workspace.financeiro.caixa.index.tsx`
- `src/routes/workspace.financeiro.contas-pagar.tsx`
- `src/routes/workspace.marketing.cupons.tsx`
- `src/routes/workspace.configuracoes.loja.tsx`
- `src/routes/admin-master.banners.tsx`
- `src/routes/admin-master.usuarios.tsx`
