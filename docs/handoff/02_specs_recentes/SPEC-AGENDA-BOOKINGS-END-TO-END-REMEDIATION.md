# SPEC-AGENDA-BOOKINGS-END-TO-END-REMEDIATION — Auditoria, Correção e Refatoração End-to-End da Agenda e Agendamentos

## 1. Contexto e Motivação
A Agenda e o sistema de Agendamentos (Bookings) do Waesy operam como hub transacional crítico entre disponibilidade de horários, serviços do catálogo, recursos/profissionais, clientes, prestadores de serviços, políticas de cancelamento, remarcações, no-show e encerramento de atendimentos.
A presente auditoria identifica e resolve:
1. Ausência de snapshots contratuais imutáveis nos agendamentos (`price_cents`, `service_title`, `cancellation_policy`, `modality`), o que permitia que alterações posteriores no serviço alterassem retroativamente o histórico contratado;
2. Ausência de fluxo canônico de reagendamento transacional atômico no BFF e UI (liberação do slot original, alocação do novo horário e vínculo histórico de remarcação);
3. Lacuna operacional de agendamentos passados (compromissos que ultrapassaram a data permaneciam esquecidos como "agendado" sem reconciliação ou fechamento de turno);
4. Ausência de modal de criação manual de agendamento na recepção/telefone/walk-in no Workspace do Prestador;
5. Ausência de dossiê completo e acionável ao clicar no card de agendamento (tanto para o cliente em `_store.conta.agendamentos.tsx` quanto no Workspace do Prestador em `workspace.agenda.index.tsx`);
6. Falta de política parametrizada de cancelamento e no-show com verificação de antecedência mínima no backend.

---

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Snapshots Históricos Imutáveis na Criação do Agendamento
- **Quando** um agendamento for criado via `createAppointment` ou `createManualAppointment`;
- **O sistema DEVE** capturar e persistir snapshots congelados dos atributos do serviço: `price_cents`, `service_title`, `duration_minutes`, `cancellation_policy` e `modality`;
- **Invariante:** Alterações de preço, título, duração ou regras no catálogo `booking_services` NÃO DEVEM alterar retroativamente bookings já contratados.

### [EARS-02] Reagendamento Atômico Bidirecional (Cliente e Prestador)
- **Quando** o cliente ou o prestador solicitar remarcação via `rescheduleAppointment`;
- **O sistema DEVE** validar a antecedência mínima e limites de reagendamento, verificar a disponibilidade do novo slot com trava anti-double booking, liberar a reserva de slot anterior em `resource_availabilities`, atualizar o registro com o novo horário, incrementar `reschedule_count` e registrar o histórico auditável;
- **Invariante:** O reagendamento deve ser atômico. Se o novo slot estiver ocupado, a operação falha e o agendamento original permanece inalterado.

### [EARS-03] Reconciliação Transacional de Agendamentos Passados
- **Quando** o horário agendado for ultrapassado no tempo (`scheduled_at + duration < NOW()`);
- **O sistema DEVE** sinalizar pendência de encerramento no cockpit do prestador e fornecer a função de reconciliação `reconcilePastAppointments` para triagem explícita (`completed`, `no_show` ou `completed_auto`), evitando que agendamentos fiquem congelados como agendados eternamente;
- **Invariante:** A passagem do tempo não cancela silenciosamente o compromisso e não apaga o registro do histórico.

### [EARS-04] Dossiê Completo ao Clicar no Agendamento (Cliente e Prestador)
- **Quando** o usuário (cliente ou prestador) clicar em qualquer card de agendamento;
- **O sistema DEVE** abrir o dossiê detalhado (`BookingDossierModal`), exibindo dados cadastrais do estabelecimento, profissional, endereço, modalidade, status financeiro, recibo de valores, política vigente, atalho direto para suporte/conversa, botões de remarcar, cancelar ou avançar status conforme permissão;
- **Invariante:** Nenhum card deve ser estático ou decorativo; todo elemento interativo deve ter ação funcional no backend.

### [EARS-05] Lançamento Manual na Recepção / Walk-in no Workspace
- **Quando** o prestador de serviços estiver no Workspace (`/workspace/agenda/`);
- **O sistema DEVE** fornecer o modal "Novo Agendamento Manual" (`CreateManualAppointmentModal`), permitindo cadastrar clientes presenciais ou por telefone com seleção de serviço, profissional/recurso, data, horário, notas e forma de pagamento presencial;
- **Invariante:** A disponibilidade é respeitada e o horário fica imediatamente indisponível na vitrine pública do cliente.

### [EARS-06] Enforce de Política de Cancelamento com Antecedência Mínima
- **Quando** o cliente solicitar cancelamento via `cancelCustomerAppointment`;
- **O sistema DEVE** checar a antecedência informada pelo serviço (ex: mínimo de 2 horas ou política cadastrada), registrar `cancelled_by = 'customer'`, `cancelled_at = NOW()`, liberar o slot em `resource_availabilities` e, se houver passe vinculado (`pass_id`), estornar o crédito para o cliente;
- **Invariante:** O cancelamento de um lado reflete de imediato na visualização operacional do prestador sem recarregar a página.

---

## 3. Matriz de Aceite e Evidências
1. Migration `20270216000000_agenda_bookings_end_to_end_hardening.sql` criada com colunas, restrições e índices de consistência.
2. Camada BFF `src/services/booking.functions.ts` enriquecida com `rescheduleAppointment`, `createManualAppointment`, `reconcilePastAppointments`, `getAppointmentDossier`.
3. Dossiê interativo `src/components/booking/booking-dossier-modal.tsx` implementado para cliente e prestador.
4. Interface do cliente `src/routes/_store.conta.agendamentos.tsx` e prestador `src/routes/workspace.agenda.index.tsx` integradas com todas as novas ações.
5. Testes automatizados passando com 100% de sucesso em `src/services/__tests__/booking-agenda-end-to-end.test.ts`.
6. `npm run typecheck` com Exit Code 0.
