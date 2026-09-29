# Contratos por Página — Auditoria Canônica Waesy

| Rota | Propósito | Dados Lidos | Ações | Eventos | Autorização | Loading | Vazio | Erro | Veredito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/_store/index` | Descobrir produtos e estabelecimentos locais | `products, stores, banners` | Adicionar carrinho, filtrar categoria | click, scroll, search | Publico | OK | OK | OK | **INTEGRO** |
| `/_store/produto/$slug` | Visualizar produto e configurar adicionais | `products, product_modifier_groups` | Selecionar complementos, comprar | select_modifier, add_to_cart | Publico | OK | OK | OK | **INTEGRO** |
| `/_store/checkout` | Concluir pedido com endereco e pagamento | `user_addresses, payment_methods` | Selecionar entrega, gerar pix | submit_order | Civil / Convidado | OK | OK | OK | **INTEGRO** |
| `/_store/pedidos/$id/entrega` | Rastrear entrega e chegada do motoboy | `orders, courier_arrivals` | Notificar portaria, abrir whatsapp | realtime_location | Comprador | OK | OK | OK | **INTEGRO** |
| `/_store/conta/trocas` | Solicitar devolucao com pericia visual | `rma_requests, orders` | Submeter foto, acompanhar laudo | upload_evidence | Comprador | OK | OK | OK | **INTEGRO** |
| `/workspace/pdv/` | Operar caixa e registrar vendas presenciais | `products, cash_registers, store_floor_plans` | Abrir turno, lancar mesa, checkout | f2_search, f4_checkout, select_table | Operador de Loja | OK | OK | OK | **DESALINHAMENTO** |
| `/workspace/pedidos/$id` | Gerenciar pedido, despacho e seguranca | `orders, profiles, user_reputations` | Aprovar, despachar, cancelar seguro | change_status, cancel_safely | Staff de Loja | OK | OK | OK | **INTEGRO** |
| `/workspace/pedidos/trocas` | Auditar solicitacoes de troca e laudos | `rma_requests` | Aprovar troca, recusar fraude | review_claim | Staff de Loja | OK | OK | OK | **INTEGRO** |
| `/workspace/advocacia/` | Acompanhar acervo, monitoramentos e prazos | `lawsuits, lawsuit_deadlines` | Cadastrar prazo, protocolar, filtrar | save_deadline, toggle_monitor | Advogado / Juridico | OK | OK | OK | **INTEGRO** |
| `/workspace/financeiro/caixa` | Auditar entradas, sangrias e fechar turno | `cash_registers, cash_register_entries` | Sangria, suprimento, conferencia cega | submit_entry, close_shift | Gerente Financeiro | OK | OK | OK | **INTEGRO** |
