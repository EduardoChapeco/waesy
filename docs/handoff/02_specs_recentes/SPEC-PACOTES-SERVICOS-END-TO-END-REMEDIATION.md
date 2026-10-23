# SPEC-PACOTES-SERVICOS-END-TO-END-REMEDIATION — Auditoria, Correção e Refatoração End-to-End de Pacotes de Aulas e Serviços

## 1. Contexto e Motivação
A tela de Pacotes (`/_store/conta/pacotes`) carrega a promessa explícita:
> *"Adquira pacotes de aulas de pilates, natação, treinos, estética ou barbearia com descontos exclusivos e agende quando quiser."*

Um pacote não é um simples contador numérico (`remaining = 7`); ele representa um **direito de uso e consumo financeiro e operacional auditável** (entitlement). Cada unidade possui proveniência, reserva temporária, consumo definitivo, devolução por cancelamento tempestivo, penalidade por no-show ou expiração cronológica.

A auditoria identificou os seguintes gaps críticos a serem sanados:
1. **Ausência de Vínculo com Pedidos Comerciais:** Compras diretas de pacotes não criavam registro na tabela `orders`, impedindo a conciliação no histórico geral de pedidos do cliente (`_store.conta.pedidos`);
2. **Falta de Snapshot Imutável de Condições:** Passes de clientes referenciavam apenas `package_id`. Caso a loja reajustasse o preço ou alterasse a validade do pacote, as condições contratuais do cliente sofriam risco de drift;
3. **Falta de Diferenciação entre Reservado e Consumido:** A interface e o cálculo simplificavam o saldo entre total e restante, omitindo quantas sessões já foram de fato realizadas (check-in) versus quantas estão apenas agendadas (reservadas para datas futuras);
4. **Impossibilidade de Gerenciar Sessões Agendadas pelo Pacote:** Na tela do pacote, o cliente não conseguia visualizar suas próximas aulas vinculadas nem acionar cancelamento com devolução atômica do crédito;
5. **Workspace Incompleto do Lojista:** O painel `workspace.pacotes` continha apenas o cadastro de pacotes, sem visão dos passes ativos vendidos aos clientes, sem histórico de movimentações (ledger) e sem suporte a ajustes manuais com justificativa;
6. **Ergonomia e Bifurcação de Design:** Faltava bifurcação estrita entre Mobile Native App (< 600px) e Desktop System App (>= 840px), gerando riscos de efeito sanfona, cortes de texto e alvos de toque abaixo de 44px.

---

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Vínculo Comercial Transacional e Snapshot Imutável
- **Quando** o cliente adquirir um pacote de aulas/serviços (`buyServicePackageDirect`);
- **O sistema DEVE** criar um pedido oficial em `orders` com status `paid`, registrar o passe em `customer_service_passes` vinculado a `order_id`, congelar um snapshot imutável (`package_snapshot`) com título, serviço, preço e validade da data da compra, e emitir o primeiro lançamento de concessão no `service_pass_ledger`;
- **Invariante:** Alterações posteriores no preço ou catálogo da loja NUNCA devem modificar os direitos e valores congelados no passe do cliente.

### [EARS-02] Ledger Imutável e Deconflito Reservado vs Consumido
- **Quando** o cliente consultar seus passes (`getMyCustomerPasses`);
- **O sistema DEVE** inspecionar o passe e seus agendamentos vinculados (`booking_appointments`), calculando discriminadamente: `total_credits`, `remaining_credits` (disponíveis para novo agendamento), `reserved_credits` (aulas agendadas no futuro sem check-in) e `completed_credits` (aulas realizadas com check-in confirmado);
- **Invariante:** A soma `remaining_credits + reserved_credits + completed_credits` deve reconciliar perfeitamente com os lançamentos de débito e crédito no `service_pass_ledger`. Saldo negativo é terminantemente proibido.

### [EARS-03] Reserva Concorrente Zero-Trust e Prevenção de Double-Spend
- **Quando** o cliente solicitar agendamento de uma sessão utilizando crédito do passe (`bookAppointmentWithPass`);
- **O sistema DEVE** executar a procedure `redeem_service_pass_credit` com bloqueio pessimista (`FOR UPDATE`), validar que o passe pertence ao usuário, está ativo, não expirou e possui saldo >= 1, criar o agendamento vinculado a `pass_id` e registrar o débito unitário no ledger;
- **Invariante:** Tentativas simultâneas em múltiplos dispositivos consumindo o último crédito devem aceitar estritamente uma única reserva, rejeitando a concorrente com erro determinístico.

### [EARS-04] Cancelamento Tempestivo com Estorno Atômico de Crédito
- **Quando** o cliente ou prestador cancelar um agendamento com passe antes do horário (`cancelAppointmentAndRefundPass`);
- **O sistema DEVE** executar `refund_service_pass_credit`, atualizar o status do agendamento para `cancelled`, incrementar `remaining_credits` em +1, reativar o passe caso estivesse `exhausted`, e registrar o estorno com motivo em `service_pass_ledger`;
- **Invariante:** Cancelamentos não podem gerar créditos adicionais além do total originalmente contratado nem duplicar estornos em retries.

### [EARS-05] Gestão e Auditoria Operacional no Workspace do Prestador
- **Quando** o prestador acessar o painel de pacotes (`workspace.pacotes`);
- **O sistema DEVE** fornecer 3 abas operacionais completas: (1) `Pacotes Cadastrados` (CRUD de catálogo); (2) `Passes dos Clientes` (lista de clientes com passes, saldo restante, data de validade e histórico de agendamentos); (3) `Extrato de Auditoria (Ledger)` (trilha de auditoria de todos os créditos concedidos, agendados, realizados e estornados na loja);
- **Invariante:** Ajustes manuais de saldo só podem ser executados por roles autorizadas (`owner`, `admin`, `manager`) mediante justificativa obrigatória auditada no ledger.

### [EARS-06] Suporte Contextualizado e Cartão Digital 9:16
- **Quando** o cliente estiver visualizando seu pacote;
- **O sistema DEVE** disponibilizar ação direta de contato com a loja (`/u/suporte` com transporte automático de `pass_id`, `package_title` e `store_id`) e visualização do cartão digital 9:16 para WhatsApp (`DigitalCompanionCard`) com resumo de créditos e QR code;
- **Invariante:** O transporte de parâmetros de suporte deve ser direto, eliminando digitação manual do UUID.

### [EARS-07] Bifurcação Canônica Mobile Native App vs Desktop System App
- **Quando** a rota `/_store/conta/pacotes` for renderizada;
- **O sistema DEVE** bifurcar estritamente via `useWindowSizeClass`:
  - No mobile (< 600px): Renderização com `NativeMobileHeader` sticky com fallback para `/conta`, cards de passes verticais com alvos táteis mínimos de 44px (`min-h-11 h-11`), badges legíveis e quebra natural de texto (`break-words text-wrap leading-tight`);
  - No desktop (>= 840px): Layout Desktop System App (`max-w-5xl mx-auto`) com 4 tiles de KPI (Passes Ativos, Créditos Livres, Aulas Agendadas, Aulas Concluídas), filtros em segmented control e cards horizontais em formato squircle (`rounded-xl`).
- **Invariante:** É proibido truncar títulos ou dados com `truncate` (B.38) ou utilizar valores de espaçamento fora da grade modular de 4px (DL-03).

---

## 3. Matriz de Aceite e Evidências
1. Migration `supabase/migrations/20270221000000_service_packages_and_passes_hardening.sql` criada com campos de snapshot, RPC de ajuste manual de saldo e RPC de marcação de no-show.
2. BFF `src/services/service-packages.functions.ts` refatorado com integração a `orders`, cálculo exato de sessões reservadas vs realizadas e funções do Workspace (`listWorkspaceCustomerPasses`, `adjustCustomerPassCredits`, `listWorkspacePassLedger`).
3. Interface do cliente `src/routes/_store.conta.pacotes.tsx` bifurcada com KPIs, lista de próximas aulas com cancelamento direto, suporte contextual e companion card 9:16.
4. Painel do prestador `src/routes/workspace.pacotes.index.tsx` enriquecido com abas de Passes dos Clientes e Extrato Ledger com modal de ajuste manual.
5. Suíte de testes automatizados `src/services/__tests__/service-packages-and-passes-end-to-end.test.ts` com 100% de aprovação.
6. Design lint executado com zero regressões visuais e catraca validada.
