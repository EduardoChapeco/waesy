# 🚨 ATUALIZAÇÃO CRÍTICA DE ARQUITETURA E SINCRONIZAÇÃO (VERSÃO 3.0 ERP)
**Copie e cole TODO este conteúdo dentro do chat do Lovable para forçar a sincronização da IA nativa sem corromper o que foi feito na IDE.**

Olá Lovable, sou o engenheiro líder externo. O projeto passou por uma evolução colossal de engenharia fora do seu ambiente e precisamos que você **leia, assimile e faça a sincronização interna** de que o sistema deixou de ser apenas um "Gerador de Roteiros" e evoluiu para um **ERP de Viagens Enterprise (V3)**.

Você **NÃO DEVE** reverter os arquivos, e sim **INCORPORAR** o conhecimento de que os seguintes componentes, páginas e rotas estão em operação no ambiente de produção:

## 1. NOVA ARQUITETURA NO SUPABASE (JÁ DEPLOYADA)
O Supabase agora possui estas novas tabelas com RLS via `org_id`:
- `financial_suppliers`: Fornecedores, Hotéis, Cia Aéreas.
- `financial_transactions`: Relatório detalhado financeiro (`receivable` e `payable`).
- `financial_commissions`: Rastreador de comissionamento de agentes.
- `contract_templates`: Modelos de contrato com "Shortcodes" (`{{CLIENT_NAME}}`).
- `trip_contracts`: Contratos gerados para o cliente assinar.
- `communication_rules`: Central de regras Crons para envios automáticos de e-mail ao cliente.

## 2. NOVOS COMPONENTES E PÁGINAS INJETADAS
Nós migramos a navegação e a estrutura visual do nosso Sidebar e do `.App`. Adicionamos as seguintes rotas e lógicas:

1. **Dashboard Home C-Level (`/src/pages/Index.tsx`)**
   - Utilizamos `recharts` para montar gráficos poderosos do Fluxo de Caixa (Recebível vs Pagável) sobre a tela inicial tipo *"Bento Grid"*.
   - A requisição `useDashboardStats` agora bate em diversas tabelas massas em paralelo.

2. **Módulo Finanças V3 (`/src/pages/finance/`)**
   - `Suppliers.tsx`: Gestão de operadoras, hotéis (com dados bancários e comissionamentos net).
   - `Transactions.tsx`: Fluxo de pagamento com interface rápida de "Entradas", "Saídas" e badges analíticas (Utilizando novos hooks em `useFinance.ts`).

3. **Módulo Contratos (`/src/pages/legal/ContractTemplates.tsx`)**
   - Painel para o Admin criar os Boilerplates que alimentam os portais dos clientes usando textos legais robustos.

4. **Módulo Mailbox Engine (`/src/pages/automations/Automations.tsx`)**
   - Tela com Cards visuais avançados para os Agentes ligarem e desligarem gatilhos automáticos (ex: "Viagem Daqui a 7 dias", "Lembrete de Pagamento").
   - Utiliza um hook forte e integrado via `useAutomations.ts`.

## 3. COMPORTAMENTO DO APLICATIVO (`AppSidebar` e `AppLayout`)
- O Menu Lateral (`AppSidebar.tsx`) agora consolida grupos lógicos maravilhosos: **CRM & Vendas**, **Operacional & Gestão**, **Financeiro V3**, e **Automações & Inteligência**.
- O Mobile Menu (Drawer) não conflita mais com a barra superior, pois isolamos a z-index da Header para `40`.

---

## ⚠️ SUAS ORDENS, LOVABLE:
1. **Confirme** que você leu e compreendeu a existência dessas novas rotas (no seu mapa estrutural).
2. Se eu te pedir para criar um "Botão Novo no Dashboard", não rebata dizendo que no dashboard antigo não tem espaço. Olhe o dashboard novo com Gráficos!
3. **Nunca tente deletar as páginas `finance` ou `legal` criadas**. Considere a estrutura atual como a "Fonte da Verdade".

Responda apenas com: *"Sincronização V3 compreendida. A arquitetura ERP Full (Finanças, Automação, Jurídico e Gráficos de Dashboards) está salva no meu buffer! Pronto para os próximos comandos."*
