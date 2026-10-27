# PLANO DE FASES — FINANCEIRO AVANÇADO DE GRUPOS TERRESTRES
*Turis Agências — Especificação completa v1.0*
*Data: 17/04/2026*

---

> **Princípio central:** Cada viagem em grupo é uma **unidade financeira autônoma** com P&L próprio, integrada ao financeiro global da agência. Os clientes têm autonomia no portal do viajante, e a equipe financeira tem controle total.

---

## FASE 1 — Financeiro por Viagem (Carnê Interno + Controle Manual)

### O que é
Cada grupo terrestre terá seu próprio painel financeiro isolado:
- Receita projetada vs. recebida
- Custo de operação (fornecedores, ônibus, hotel)
- Margem de contribuição por viagem
- Lista de carnês de todos os passageiros com controle de status

### Banco de Dados

#### Tabela: `booking_payment_proofs`
Comprovantes enviados pelo cliente (foto do PIX, depósito, boleto pago):
```sql
id, booking_id, installment_id (nullable), org_id,
file_url, file_name, amount_declared, notes_client,
status: 'pending_review' | 'approved' | 'rejected',
reviewed_by (agent), reviewed_at, rejection_reason,
created_at
```

#### Tabela: `group_trip_ledger`
Razão financeiro por viagem (custos de operação):
```sql
id, group_trip_id, org_id,
type: 'income' | 'expense' | 'refund' | 'fine',
category: 'booking_payment' | 'hotel' | 'bus_rental' | 'guide' | 'other',
description, amount, currency,
reference_booking_id (nullable),
paid_at (nullable), status: 'planned' | 'paid' | 'cancelled',
created_by, created_at
```

#### Campos novos em `booking_installments`
```
notes_finance TEXT        -- observação interna do financeiro
whatsapp_sent_at          -- última notificação WPP enviada
whatsapp_attempts INT     -- contador de tentativas de cobrança
notified_at               -- data do último aviso
```

### Funcionalidades Frontend

**a. Painel Financeiro da Viagem** (`/admin/group-trips/:id/finance`)
- Cards KPI: Total Arrecadado / Total Previsto / Inadimplentes / Margem
- Lista de todos os bookings com status de pagamento (traffic light)
- Ação rápida: marcar parcela como paga / em atraso / dispensada
- Upload de comprovante pelo agente
- Exportar relatório em CSV/PDF

**b. Gestão de Carnê por Booking** (`/admin/group-trips/:id/bookings/:bid`)
- Tabela de parcelas com todas as ações
- Histórico de cobranças WhatsApp
- Botão "Cobrar via WhatsApp" (dispara bot)
- Botão "Adicionar multa/acréscimo"
- Visualizar comprovantes enviados pelo cliente
- Aceitar/rejeitar com observação

**c. Notificação WhatsApp Automática**
Edge function `notify-installment-whatsapp`:
- Chamada por cron (diária às 8h) ou manual
- Verifica parcelas vencidas há X dias (configurável por org)
- Chama Evolution API / Baileys com template de cobrança
- Registra tentativa em `booking_installments.whatsapp_attempts`
- Template: "Olá {{nome}}, sua parcela {{n}} de {{valor}} venceu em {{data}}. Pague via PIX: {{chave}}. Dúvidas: {{whatsapp_agência}}"

---

## FASE 2 — Sistema de Cancelamento com Multas e Créditos

### O que é
Controle completo de cancelamentos com política de multas automáticas, rastreio de reembolsos e créditos para próximas viagens.

### Banco de Dados

#### Tabela: `booking_cancellations`
```sql
id, booking_id, org_id, group_trip_id,
requested_by: 'client' | 'agency',
reason_code: 'client_request' | 'trip_cancelled' | 'minimum_pax_not_reached' | 'health' | 'force_majeure' | 'other',
reason_notes TEXT,
cancellation_date DATE,

-- Valores financeiros
total_paid NUMERIC,        -- quanto o cliente pagou até o cancelamento
fine_amount NUMERIC,       -- multa calculada (% do total ou fixo)
fine_percentage NUMERIC,   -- % aplicada
refund_amount NUMERIC,     -- valor a devolver (total_paid - fine)
credit_amount NUMERIC,     -- parte convertida em crédito futuro

-- Status do processo
status: 'requested' | 'approved' | 'rejected' | 'processed',
finance_resolution: 'refund' | 'credit' | 'partial_refund_partial_credit' | 'no_refund',

-- Processamento
approved_by UUID, approved_at,
refund_processed_at, refund_method TEXT,
credit_expires_at DATE,

created_at, updated_at
```

#### Tabela: `client_travel_credits`
Créditos para próximas viagens (wallet):
```sql
id, client_id (nullable), lead_email TEXT, org_id,
originating_cancellation_id,
amount NUMERIC, currency TEXT DEFAULT 'BRL',
used_amount NUMERIC DEFAULT 0,
expires_at DATE,
status: 'active' | 'used' | 'expired' | 'cancelled',
notes TEXT,
created_at
```

#### Campos na `group_trips`: política de cancelamento
```
cancellation_policy_days JSONB:
  -- Exemplo: [{"days_before":30,"fine_pct":0},{"days_before":15,"fine_pct":30},{"days_before":7,"fine_pct":50},{"days_before":0,"fine_pct":100}]
cancellation_min_pax INT  -- grupo mínimo para a viagem acontecer
```

### Funcionalidades Frontend

**a. Portal do Cliente — Cancelamento** (no traveler portal)
- Botão "Solicitar Cancelamento da Reserva"
- Formulário: motivo + observações
- Preview automático da multa calculada (baseado na política da viagem + dias)
- Opção: Receber reembolso OU Converter em crédito de viagem

**b. Painel do Financeiro — Aprovação**
- Fila de cancelamentos pendentes
- Ver política aplicada + cálculo automático
- Aprovar / Rejeitar / Negociar
- Marcar crédito como concedido ou reembolso processado

**c. Cálculo automático de multa**
```
fine_amount = total_paid × fine_percentage / 100
Se cancelamento na política "força maior" (health/force_majeure): fine = 0, requer aprovação manual
```

**d. Notificação ao cliente**
- Email/WhatsApp automático com resultado do cancelamento

---

## FASE 3 — Transferência de Booking entre Viagens

### O que é
Permite mover um passageiro de uma viagem para outra, mantendo o histórico financeiro e aplicando ou não diferença de valor.

### Banco de Dados

#### Tabela: `booking_transfers`
```sql
id, org_id,
from_booking_id, to_booking_id (nullable — criado no transfer),
from_trip_id, to_trip_id,
client_name TEXT, lead_email TEXT,
reason: 'minimum_not_reached' | 'client_request' | 'trip_merged' | 'agency_decision',
amount_difference NUMERIC,  -- positivo = cliente paga mais; negativo = crédito gerado
credit_applied NUMERIC,     -- crédito de cancelamentos anteriores usado
new_installments JSONB,     -- novo plano de parcelas gerado
processed_by UUID,
status: 'pending' | 'confirmed' | 'cancelled',
created_at
```

### Funcionalidades Frontend

**a. Ação "Transferir Passageiro"** (no painel do booking)
- Selecionar destino (lista de viagens abertas)
- Calcular diferença automática
- Opções: cobrar diferença em nova parcela / usar crédito existente / dispensar diferença
- Gerar novo booking na viagem destino
- Fechar booking original com status `transferred`
- Transferir parcelas pagas (histórico)

**b. Monitor de Grupo Mínimo**
Card no painel da viagem mostrando:
- Vagas preenchidas vs. mínimo necessário
- Alerta se estiver abaixo do mínimo com X dias para partida
- Botão "Fundir com outra viagem" (transfere todos os passageiros em lote)

---

## FASE 4 — Mapa de Ônibus Avançado (Editor Completo)

### O que é
Editor visual completo do mapa de assentos com suporte a dois andares, atribuição automática/manual/cliente e controle total de visibilidade.

### Banco de Dados

#### Campos novos em `group_trips`
```
bus_layout_id UUID FK bus_layouts,
seat_assignment_mode: 'client_choice' | 'auto_1day_before' | 'agency_manual' | 'none',
seat_map_visible_to_client BOOLEAN DEFAULT true,
bus_layout_2nd_floor_id UUID FK bus_layouts  -- para 2 andares
```

#### Campos novos em `bus_layouts`
```
floor_number INT DEFAULT 1,         -- 1 ou 2
total_seats INT GENERATED,          -- calculado do seat_map
driver_seat_row INT DEFAULT 0,      -- linha do motorista
has_bathroom BOOLEAN DEFAULT false,
bathroom_position: 'back' | 'front',
aisle_columns INT[] DEFAULT '{2}'   -- colunas que são corredor
```

#### Tabela: `bus_seat_assignments` — campos adicionais
```
floor_number INT DEFAULT 1,
assigned_by: 'client' | 'agent' | 'auto',
assigned_at TIMESTAMPTZ,
notes TEXT  -- ex: "pessoa com mobilidade reduzida"
```

### Funcionalidades Frontend

**a. Editor de Layout** (`/settings/bus-layouts/:id/edit`)
- Grid drag-and-resize para cada célula
- Toolbar: Assento normal / Corredor / Porta / WC / Espaço vazio / Duplex (frente-verso)
- Toggle "2º Andar" — adiciona layout independente
- Numeração automática de assentos (ou manual)
- Marcar assentos especiais: acessibilidade, guia, motorista extra
- Preview em tempo real

**b. Gerenciamento de Assentos por Viagem** (aba "Ônibus" na viagem)
- Mapa visual com status de cada assento (livre/reservado/bloqueado/especial)
- Click no assento → ver passageiro ou atribuir
- Arrastar passageiro de assento A → B
- Marcar assento como "Bloqueado" (avaria, manutenção)
- Toggle visibilidade para o cliente
- Botão "Auto-atribuir" — distribui aleatoriamente (preserva grupos familiares)
- Botão "Publicar mapa" — envia WhatsApp com número de assento para cada passageiro

**c. Modos de atribuição**
| Modo | Comportamento |
|---|---|
| `client_choice` | Cliente escolhe no momento da reserva |
| `auto_1day_before` | Cron gera automaticamente D-1 da viagem |
| `agency_manual` | Apenas agentes atribuem |
| `none` | Sem mapa de assentos |

**d. 2 Andares**
- Tab "1º Andar" / "2º Andar" no editor
- Cada andar tem seu próprio `bus_layout_id`
- Passageiro tem `floor_number` no assignment
- Na página pública: dropdown de andar antes de mostrar o mapa

---

## FASE 5 — Portal do Viajante (Workspace Pessoal)

### O que é
Área privada do passageiro onde ele gerencia sua reserva, envia comprovantes e acompanha o status em tempo real.

### Acesso
URL: `/minha-viagem/:public_token` (sem login — autenticado pelo token da reserva)

### Funcionalidades

**a. Dashboard do Viajante**
- Card da viagem (foto, destino, data)
- Status da reserva + assento (se atribuído)
- Progress bar de parcelas pagas
- Documentos disponíveis para download (voucher, contrato assinado)

**b. Carnê Interativo**
- Lista de todas as parcelas com status colorido
- Para cada parcela **pendente/atrasada**:
  - Upload de comprovante (foto/PDF)
  - Campo "Valor pago" + "Data do pagamento"
  - Status: Aguardando análise / Aprovado / Rejeitado
- Histórico de comprovantes enviados
- Mensagem do financeiro quando rejeitado

**c. Solicitação de Cancelamento**
- Botão "Solicitar cancelamento"
- Motivo + observações
- Preview da multa e opções (reembolso / crédito)
- Status do pedido em tempo real

**d. Mudança de Assento**
- Se `seat_map_visible_to_client = true` e modo `client_choice`
- Ver mapa e solicitar troca (sujeito à aprovação)

**e. Saldo de Crédito**
- Exibe créditos disponíveis (de cancelamentos anteriores)
- Pode usar no momento da reserva

### Backend necessário

**Edge function `verify-booking-token`**
- Recebe `public_token`
- Retorna booking + trip + installments + proofs + credits completos
- Sem auth — apenas validação do token UUID

**Edge function `submit-payment-proof`**
- Recebe: `booking_id`, `installment_id`, `file` (multipart), `amount`, `notes`
- Faz upload para Storage `payment-proofs/{booking_id}/{timestamp}.jpg`
- Cria registro em `booking_payment_proofs`
- Notifica agente via webhook/realtime

---

## RESUMO DAS FASES — Timeline Sugerida

| Fase | Entregáveis principais | Esforço estimado |
|---|---|---|
| **Fase 1** | Ledger por viagem, comprovantes, cobrança WhatsApp | 3-4 dias |
| **Fase 2** | Cancelamentos, multas automáticas, créditos | 2-3 dias |
| **Fase 3** | Transferência de passageiros/pacotes | 2 dias |
| **Fase 4** | Editor de ônibus 2 andares + gerenciamento | 3-4 dias |
| **Fase 5** | Portal do viajante (workspace pessoal) | 3-4 dias |

**Total estimado: 13-17 dias de desenvolvimento**

---

## SCHEMA SQL COMPLETO (a aplicar em migration)

```sql
-- 1. booking_payment_proofs
-- 2. group_trip_ledger  
-- 3. booking_cancellations
-- 4. client_travel_credits
-- 5. booking_transfers
-- Novos campos em: booking_installments, group_trips, bus_layouts, bus_seat_assignments
```

**Ver migration: `20260417_advanced_group_finance`**

---

## DECISÕES DE DESIGN QUE PRECISAM DE SUA CONFIRMAÇÃO

> [!IMPORTANT]
> Antes de implementar, confirme as escolhas abaixo:

1. **WhatsApp Bot**: Usar Evolution API (self-hosted) ou Twilio? Já tem instância de WPP configurada?
2. **PIX**: A chave PIX da agência vai nos templates de cobrança — é uma chave por org ou por viagem?
3. **Cancelamento**: A política de multas é configurada por operadora ou por viagem individual?
4. **Crédito de viagem**: Expira em quantos dias por padrão? (sugestão: 365 dias / 1 ano)
5. **Auto-atribuição de assento**: O cron deve rodar quando exatamente? D-1 às 6h da manhã?
6. **Mapa visível**: Por padrão oculto (agente publica quando quiser) ou visível desde o início?
7. **Mínimo de passageiros**: Cancelamento automático se não atingido até X dias antes?
