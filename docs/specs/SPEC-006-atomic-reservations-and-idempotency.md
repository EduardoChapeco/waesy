# SPEC-006: Motor Atômico de Reservas de 15 Minutos & Idempotência Estrita ("Carimbou PAGO")

## Status
- **Estado**: APROVADO
- **Data**: 2026-11-02
- **Autor**: Antigravity & BigTech Executive Board
- **Escopo**: DB Migration, RPCs Postgres Atômicas, BFF Server Functions, Testes Unitários de Concorrência e Idempotência

---

## 1. Contexto e Motivação
Em sistemas transacionais modernos de comércio, classificados e serviços urbanos, condições de corrida ("race conditions") geradas por leituras não atômicas do tipo "ler -> decidir -> gravar" (Check-then-Act) causam vendas duplicadas de estoque finito, reservas conflitantes de horários e múltiplos débitos ou processamentos do mesmo webhook/evento.

Esta especificação estabelece duas garantias arquiteturais soberanas e universais para a plataforma Waesy:
1. **Motor Universal de Reserva Temporária de 15 Minutos (Anti-Race Condition)**: Qualquer tentativa de compra (checkout, produto físico, flash deal, agendamento de serviço ou ingresso de evento) deve reservar atomicamente a quantidade solicitada por exatamente 15 minutos com trava em nível de linha (`SELECT ... FOR UPDATE`). É matematicamente impossível sobrevender ou atingir estoque negativo.
2. **Registro Central de Idempotência ("O Carimbo da Lotérica")**: Todo evento, webhook ou mutação transacional com chave única (`event_id` ou `idempotency_key`) deve ser carimbado na tabela `processed_events`. Replays do mesmo evento jamais reexecutam a lógica de negócio nem debitam estoque/saldos novamente; retornam imediatamente o payload de resposta original arquivado no carimbo.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Motor de Reserva Atômica de 15 Minutos
- **[EARS-RES-01] Ubiquitous**: O sistema Waesy SHALL manter a tabela soberana `public.universal_reservations` com suporte aos recursos `product_variant`, `deal`, `booking_service_slot` e `ticket_lot`.
- **[EARS-RES-02] Event-driven**: WHEN uma requisição de reserva de recurso for recebida com `(resource_type, resource_id, qty, session_id, minutes)`, the system SHALL executar a RPC `reserve_resource_15min_atomic` com bloqueio pessimista `FOR UPDATE` na linha do recurso, expirar reservas vencidas e calcular o estoque líquido disponível (`total_on_hand - active_reservations`).
- **[EARS-RES-03] Unwanted Behavior**: IF a quantidade solicitada `qty` for superior ao estoque líquido disponível ou se o recurso estiver reservado/bloqueado por outra sessão ativa dentro da janela de validade (`expires_at > now()`), THEN the system SHALL abortar atomicamente a transação com exceção `RECURSO_ESGOTADO_OU_RESERVADO` sem alterar contadores.
- **[EARS-RES-04] Event-driven**: WHEN o pagamento de um pedido ou deal for confirmado com sucesso, the system SHALL executar `consume_reservation_atomic`, marcando a reserva como `'consumed'` e deduzindo definitivamente o estoque físico ou marcando o recurso como vendido.
- **[EARS-RES-05] Event-driven**: WHEN o cliente cancelar a compra ou o carrinho for limpo antes dos 15 minutos, the system SHALL executar `release_reservation_atomic`, liberando imediatamente o recurso para outros clientes.
- **[EARS-RES-06] State-driven**: WHILE uma reserva estiver com `status = 'active'` e `expires_at < now()`, the system SHALL tratá-la como expirada em qualquer verificação ou rotina de limpeza lazy.

### 2.2 Idempotência Estrita ("O Carimbo da Lotérica")
- **[EARS-IDEMP-01] Ubiquitous**: O sistema Waesy SHALL manter a tabela soberana `public.processed_events` contendo `event_id` (PK), `scope`, `status` (`'processing'`, `'completed'`, `'failed'`), `result_payload` (JSONB) e `locked_until` (TIMESTAMPTZ).
- **[EARS-IDEMP-02] Event-driven**: WHEN uma requisição transacional iniciar processamento com um `event_id`, the system SHALL chamar `idempotent_event_begin(event_id, scope)`.
- **[EARS-IDEMP-03] State-driven**: WHILE o registro do `event_id` existir com `status = 'completed'`, the system SHALL retornar imediatamente o `result_payload` persistido com flag `already_processed: true` e interromper qualquer reexecução de efeitos colaterais ("Carimbou PAGO, não paga de novo").
- **[EARS-IDEMP-04] Unwanted Behavior**: IF o registro existir com `status = 'processing'` e `locked_until > now()`, THEN the system SHALL recusar execução concorrente com status `already_processing: true` para evitar duplicidade de workers.
- **[EARS-IDEMP-05] Event-driven**: WHEN o processamento de negócio for concluído com sucesso, the system SHALL chamar `idempotent_event_complete(event_id, result)` para gravar o carimbo indelével e liberar o resultado.

---

## 3. Modelo de Dados & Migração
- Tabela `public.universal_reservations`:
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `resource_type` TEXT NOT NULL CHECK (resource_type IN ('product_variant', 'deal', 'booking_service_slot', 'ticket_lot'))
  - `resource_id` UUID NOT NULL
  - `user_id` UUID REFERENCES auth.users(id) ON DELETE SET NULL
  - `session_id` TEXT NOT NULL
  - `qty` INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0)
  - `status` TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired'))
  - `expires_at` TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
  - `metadata` JSONB DEFAULT '{}'::jsonb
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `updated_at` TIMESTAMPTZ DEFAULT now()
- Tabela `public.processed_events`:
  - `event_id` TEXT PRIMARY KEY
  - `scope` TEXT NOT NULL
  - `status` TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed'))
  - `result_payload` JSONB DEFAULT NULL
  - `actor_id` UUID REFERENCES auth.users(id) ON DELETE SET NULL
  - `error_message` TEXT DEFAULT NULL
  - `locked_until` TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes')
  - `processed_at` TIMESTAMPTZ DEFAULT now()
  - `created_at` TIMESTAMPTZ DEFAULT now()
- Invariantes de Banco:
  - `product_variants`: `CHECK (stock_on_hand >= 0)` e `CHECK (stock_reserved >= 0)`
  - `ticket_lots`: `CHECK (sold_count + reserved_count <= capacity)`

---

## 4. Evidências de Validação
1. **Schema Check**: `npm run check:schema` com 0 duplicações.
2. **BFF Check**: `npm run check:bff` com 0 tabelas não declaradas.
3. **Unit Tests**: Suíte de testes exercitando:
   - Concorrência de reserva de estoque com 2 requisições simultâneas para o mesmo item.
   - Rejeição atômica quando o estoque for insuficiente.
   - Liberação de reserva após expiração de 15 minutos.
   - Replay idempotente de evento carimbado retornando payload idêntico sem reprocessamento.
   - Prevenção de corrida em eventos em andamento (`already_processing`).
