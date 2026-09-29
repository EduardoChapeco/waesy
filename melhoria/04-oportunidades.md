# 04-OPORTUNIDADES.md — Mapeamento de Valor Coletado e Não Devolvido

**Fundamentação Teórica:** Conforme a Seção 1 da SPEC-001, uma melhoria é legítima quando "o valor já coletado passa a ser devolvido em forma de decisão ou retorno". Dados persistidos sem visualização ou inteligência representam custo de armazenamento e desperdício de oportunidade para o negócio local.

---

## 1. Síntese do Inventário de Dados Unidirecionais
- **Total de tabelas com gravação ativa:** 217
- **Tabelas com ciclo completo (leitura e escrita ativas):** 99 (45.6%)
- **Tabelas de gravação unidirecional (apenas escrita identificada):** 118 (54.4%)
- **Volume potencial de retorno retido:** Alto impacto em conversão, retenção, auditoria contábil e despacho.

---

## 2. Os 6 Clusters Estratégicos de Devolução de Valor

### Cluster 1: Recuperação de Receita & Carrinhos Abandonados
Tabelas gravadas sem tela de recuperação:
- `abandoned_carts` (Gravada em `src/services/checkout.functions.ts`)
- `coupons` (Gravada em `src/services/checkout.functions.ts` e `src/services/admin-catalog.functions.ts`)
- `promotion_products` (Gravada em `src/services/admin-catalog.functions.ts`)

| Oportunidade | Dado Coletado | Retorno Não Devolvido | Alavancagem |
| --- | --- | --- | --- |
| **OP-01: Disparador de Recuperação de Carrinho** | Itens, valor total, e-mail/telefone e timestamp do abandono | Lista de carrinhos abandonados com botão de envio direto de cupom de desconto via WhatsApp | Aumento imediato de 12% a 18% na conversão do checkout de lojas locais |
| **OP-02: Gestão Ativa de Cupons no PDV/Loja** | Cupons criados e regras de uso mínimo gravadas | Relatório de cupons ativos com taxa de conversão e margem consumida | Controle de margem em tempo real para o lojista |

---

### Cluster 2: Movimentação de Estoque & Histórico Kardex
Tabelas gravadas sem tela de rastreamento:
- `stock_movements` (Gravada em `src/services/inventory.functions.ts`)
- `product_location_inventories` (Gravada em `src/services/inventory.functions.ts`)

| Oportunidade | Dado Coletado | Retorno Não Devolvido | Alavancagem |
| --- | --- | --- | --- |
| **OP-03: Extrato Kardex por Produto** | Entrada, saída, motivo de quebra, perdas e usuário responsável | Aba "Extrato de Movimentações" no modal de edição de produto em `workspace.estoque.tsx` | Prevenção de desvios, furtos internos e conciliação de inventário físico com digital |
| **OP-04: Estoque Multilocalidade** | Quantidade por prateleira/depósito gravada em `product_location_inventories` | Visão unificada de múltiplos estoques por filial/depósito | Permite transferências entre estoques sem digitação manual |

---

### Cluster 3: Gestão de Caixa & Auditoria de Turnos PDV
Tabelas gravadas sem visualização gerencial:
- `cash_register_entries` (Gravada em `src/services/pos.functions.ts`)
- `employee_pin_audit_logs` (Gravada em `src/services/pos.functions.ts`)
- `employee_financial_records` (Gravada em `src/services/pos.functions.ts`)

| Oportunidade | Dado Coletado | Retorno Não Devolvido | Alavancagem |
| --- | --- | --- | --- |
| **OP-05: Fechamento Cego de Caixa** | Entradas de suprimento, sangria, dinheiro, cartão e PIX gravadas por operador | Relatório de fechamento de turno confrontando valor cego declarado vs saldo esperado | Eliminação de erros de conferência e segurança contábil para o gerente |
| **OP-06: Log de Acessos Críticos por PIN** | Troca de operador, concessão de descontos e estornos autenticados por PIN | Timeline de auditoria de operações sensíveis no PDV | Rastreabilidade contra fraudes em cancelamentos de comandas |

---

### Cluster 4: Telemetria de Engajamento de Criadores & Anúncios
Tabelas gravadas sem relatórios visuais:
- `ad_ledger` (Gravada em `src/services/ads.functions.ts`)
- `affiliate_clicks` (Gravada em `src/services/affiliates.functions.ts`)
- `creator_showcase_clicks` (Gravada em `src/services/affiliates.functions.ts`)
- `story_analytics_events` (Gravada em `src/services/stories.functions.ts`)
- `builder_analytics_events` (Gravada em `src/services/builder.functions.ts`)

| Oportunidade | Dado Coletado | Retorno Não Devolvido | Alavancagem |
| --- | --- | --- | --- |
| **OP-07: Dashboard de Atribuição de Afiliados** | Clicks com UTM, código de afiliado e conversão em venda | Gráfico diário de cliques, comissões pendentes e saldo a pagar | Retenção de criadores de conteúdo e expansão de canal orgânico |
| **OP-08: Métricas de Visualização de Stories Locais** | Visualizações, tempo de retenção e cliques em call-to-action de stories | Card analítico com total de visualizações únicas por story | Fornece feedback aos comerciantes sobre o engajamento de seus stories |

---

### Cluster 5: Inbox Unificado de Leads e Mensageria Multicanal
Tabelas gravadas sem visualização operacional:
- `whatsapp_leads` (Gravada em `src/routes/api.webhooks.whatsapp.ts`)
- `leads_crm` (Gravada em `src/services/crm.functions.ts`)
- `lead_activities` (Gravada em `src/services/crm.functions.ts`)

| Oportunidade | Dado Coletado | Retorno Não Devolvido | Alavancagem |
| --- | --- | --- | --- |
| **OP-09: Inbox de Novos Leads do WhatsApp** | Mensagens de clientes entrantes capturadas pelo webhook do WhatsApp | Fila de atendimento "Novos Contatos" no topo do CRM com botão "Assumir Conversa" | Redução do tempo de resposta de horas para minutos no comércio local |
| **OP-10: Timeline Unificada de Atividades do Lead** | Ligações, anotações de visitas e propostas salvas no banco | Feed cronológico de interações na lateral da tela de detalhes do lead | Evita abordagens repetitivas de vendedores diferentes |

---

### Cluster 6: Rastreabilidade Logística & Despacho
Tabelas gravadas sem tela de monitoramento:
- `delivery_runs` (Gravada em `src/services/dispatch.functions.ts`)
- `delivery_events` (Gravada em `src/services/dispatch.functions.ts`)
- `shipping_quotes` (Gravada em `src/services/shipping.functions.ts`)

| Oportunidade | Dado Coletado | Retorno Não Devolvido | Alavancagem |
| --- | --- | --- | --- |
| **OP-11: Radar de Despacho & Performance MotoLink** | Tempo de espera, tempo em trânsito e aceites de corridas | Painel de despacho com tempo médio de entrega e indicador de gargalos | Aumenta eficiência das corridas e reduz reclamações de atraso |
| **OP-12: Análise de Cotações de Frete Perdidas** | Cotações geradas no checkout e valores recusados | Indicador de abandono de frete por CEP/região urbana | Permite calibrar regras de frete grátis ou raio de cobertura |

---

## 3. Matriz de Priorização das Oportunidades

| ID | Oportunidade | Cluster | Complexidade | Retorno Financeiro | Score de Alavancagem |
| --- | --- | --- | --- | --- | --- |
| OP-01 | Disparador de Carrinho Abandonado | Receita | Baixa (1 dia) | Imediato | 18 |
| OP-05 | Fechamento Cego de Caixa PDV | Operação | Baixa (1 dia) | Alto | 17 |
| OP-03 | Extrato Kardex por Produto | Estoque | Baixa (1 dia) | Alto | 16 |
| OP-09 | Inbox de Leads WhatsApp | Vendas | Média (2 dias) | Muito Alto | 16 |
| OP-07 | Dashboard de Afiliados | Marketing | Média (2 dias) | Médio | 14 |
| OP-11 | Radar de Despacho MotoLink | Logística | Média (2 dias) | Alto | 14 |
| OP-06 | Log de Auditoria PIN no PDV | Compliance | Baixa (1 dia) | Médio | 13 |
| OP-08 | Métricas de Stories Locais | Marketing | Baixa (1 dia) | Médio | 12 |
| OP-10 | Timeline de Atividades CRM | Vendas | Média (2 dias) | Médio | 12 |
| OP-02 | Gestão Ativa de Cupons | Receita | Média (2 dias) | Médio | 11 |
| OP-04 | Estoque Multilocalidade | Estoque | Alta (3 dias) | Alto | 11 |
| OP-12 | Cotações de Frete Perdidas | Logística | Média (2 dias) | Médio | 10 |
