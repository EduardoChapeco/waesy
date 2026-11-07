# 14 — Matriz de Interdependências e Descontinuidades Operacionais

## 1. Classificação Rigorosa dos Relacionamentos entre Módulos
Não foram consideradas integrações legítimas meros imports de helpers utilitários ou consultas a tabelas globais. A tabela abaixo classifica as relações pela sua natureza real de acoplamento:

| Módulo Origem | Módulo Destino | Tipo de Relação | Natureza do Efeito | Status no Código |
| :--- | :--- | :--- | :--- | :--- |
| **Vendas / Pedidos** | **Estoque & WMS** | Transacional Síncrono | Baixa automática de estoque na aprovação; devolução automática via `cancel_order`. | **100% Integrado** |
| **Vendas / Pedidos** | **Financeiro / Caixa** | Transacional Síncrono | Lançamento em `financial_ledger` com cálculo de split (`settleOrderPayout`). | **100% Integrado** |
| **Vendas / Pedidos** | **Fiscal / NF-e** | Assíncrono com Fila | Disparo em background de `emitOrderNFeAutomated` ao mudar para `paid` ou `processing`. | **Integrado com Lacuna** |
| **Vendas / Pedidos** | **Logística / Waesy Go** | Orientado a Eventos | Criação de registro em `dispatch_orders` e atribuição de motorista parceiro. | **100% Integrado** |
| **Vitrines Públicas** | **Builder Omni** | Leitura Bilateral | Leitura de `settings.omni_page_published` via `resolveSurfacePageExperienceDocument`. | **100% Integrado** |
| **Turismo / Propostas**| **Turismo / Viagens** | Transacional Síncrono | Função `convertProposalToTrip` transforma cotação em reserva e gera bloqueios. | **100% Integrado** |
| **Turismo / Viagens** | **Turismo / Vouchers** | Composição de Dados | Leitura de agregados de reserva para preencher templates de voucher (A4/Story). | **100% Integrado** |
| **Turismo / Viagens** | **Financeiro** | Transacional Síncrono | Função `saveTripFinancialDetails` gera contas a pagar para operadores e a receber de clientes. | **100% Integrado** |
| **Comercial / Leads** | **WhatsApp / CRM** | Integração Direta | Formulário do builder salva lead em `lead_forms` e abre conversa parametrizada. | **100% Integrado** |
| **PDV / Gastronomia** | **Cozinha (KDS)** | WebSocket / Polling | Pedidos lançados em comandas aparecem nas estações de cozinha (`updateKdsOrderStatus`). | **100% Integrado** |

---

## 2. Descontinuidades e Lacunas Comprovadas (Gaps Operacionais)

As investigações forenses comprovaram as seguintes descontinuidades onde um processo termina sem handoff automatizado:

1. **Lacuna Fiscal SEFAZ sem Token:**
   - *Comportamento:* Quando um pedido é pago, o sistema dispara a emissão de NF-e em segundo plano. Se a loja não possui o token da Focus NFe configurado em seus parâmetros fiscais, a função captura o erro, registra no console e silencia a falha.
   - *Impacto:* Não há criação de tarefa de contingência pendente no painel de tarefas (`workspace.tarefas`) alertando o operador que o pedido foi despachado sem nota fiscal.
2. **Conclusão de Serviços sem Geração de Cobrança Automática:**
   - *Comportamento:* Na agenda de serviços (`workspace.agenda`), marcar um atendimento como concluído atualiza o status para `completed` na tabela `appointments`, mas não gera automaticamente o título de contas a receber no módulo financeiro a menos que o botão "Cobrar Agora" seja manualmente acionado.
   - *Impacto:* Profissionais liberais que apenas dão baixa na agenda correm risco de esquecer de lançar o recebimento no caixa.
3. **Abandono de Checkout de Destaques em Classificados:**
   - *Comportamento:* Quando um anunciante solicita "Destacar Anúncio", um registro com status `pending_payment` é criado. Se o pagamento via Pix expirar sem conclusão, o registro permanece pendente por tempo indeterminado sem um cron job de cancelamento por timeout.
4. **SimLab Focus Group Desconectado de Mutação de Conteúdo:**
   - *Comportamento:* A ferramenta SimLab gera simulações estatísticas de engajamento da persona de clientes, mas opera como uma visualização exclusivamente consultiva. Não há fluxo de "Aplicar Recomendações" que injete os textos sugeridos no Brand Kit ou no Catálogo.
