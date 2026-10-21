# SPEC-005 — Plataforma Multimodal Waesy Go: Mobilidade, Entregas, Fretes, Mudanças, Caronas e Pós-Venda

## 0. Metadados e Controle
- **ID da Spec:** SPEC-005
- **Título:** Plataforma Multimodal Waesy Go End-to-End: Desacoplamento de Corridas, Agendamentos, Entregas, Fretes, Mudanças, Caronas, Governança, Pós-Venda e Recibos
- **Autor / Agente Responsável:** spec-writer / Antigravity Agent
- **Data de Aprovação:** 2026-10-20
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Transformar o módulo Waesy Go de uma tela mono-modal de "chamar motorista" em uma plataforma completa, comercial e transacional de mobilidade, entregas, fretes, mudanças e caronas compartilhadas, com trifurcação temporal (Agora, Agendados, Histórico), ciclo de vida pós-venda auditável (recibo, avaliação, gorjeta real, suporte contextual e item perdido), cancelamento seguro em múltiplas fases e reconciliação bilateral de dados.
- **Escopo Incluído:**
  - `src/routes/_store.mobilidade.tsx` (interface pública de solicitação de mobilidade, entregas, fretes e mudanças)
  - `src/routes/_store.conta.mobilidade.tsx` (painel de controle do consumidor: Agora, Agendados, Histórico, recibo, gorjeta, avaliação e suporte)
  - `src/components/mobility/` (modais de pós-serviço: recibo, gorjeta, cancelamento, remarcação, detalhes da viagem, seletor comercial multimodal)
  - `src/services/mobility.functions.ts` (BFF de mobilidade, reconciliação `mobility_requests` <-> `orders`, cancelamento, gorjeta, remarcação, recibos e telemetria)
  - `src/services/carona.functions.ts` (integração de caronas intermunicipais no ecossistema Waesy Go)
  - `supabase/migrations/20270217000000_waesy_go_end_to_end_multimodal_platform.sql` (extensão de colunas, tip_cents, waypoints, agendamentos e RLS)
- **Não-Objetivos:**
  - Não substituir o motor de carona multi-trecho (`carona-graph-engine.ts`), mas integrá-lo de forma coesa na experiência do usuário.
  - Não alterar a taxa fixa canônica de R$ 0,99 do condutor (Invariante B.23 preservada).
  - Não remover a barreira Zero-Trust de 3 minutos no CPF (`customer_debt_ledger`, Invariante B.24 preservada).

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

- **Ubíquo (UB-01):** O sistema DEVE tratar toda operação no Waesy Go como uma transação auditável com origem, destino, tipo de serviço (`ride_car`, `ride_moto`, `delivery_express`, `freight_van`, `moving_truck` ou `carona`), preço calculado no backend, status sincronizado entre cliente e parceiro, telemetria e rastro financeiro.
- **Ubíquo (UB-02):** O sistema DEVE expor linguagem 100% comercial na experiência do consumidor, banindo termos operacionais como "Novo Chamado" ou "Nenhuma corrida solicitada", adotando ações como "Pedir agora", "Nova viagem", "Enviar algo", "Agendar frete" ou "Encontrar carona".
- **Acionado por Evento (EV-01):** QUANDO o usuário solicitar um agendamento com data/hora futura (`scheduled_for`), o sistema DEVE registrar a operação com status `scheduled`, exibir o card na aba "Agendados" com data/hora proeminente e permitir remarcação ou cancelamento sem penalidade prévia.
- **Acionado por Evento (EV-02):** QUANDO o cliente ou motorista cancelar uma solicitação, o sistema DEVE validar a fase da corrida (antes do aceite vs motorista a caminho vs corrida iniciada), atualizar atomicamente tanto `mobility_requests` quanto `orders` e notificar a outra ponta via Realtime.
- **Acionado por Evento (EV-03):** QUANDO uma corrida ou entrega for concluída com sucesso, o sistema DEVE preservar a operação no Histórico e disponibilizar as ações de pós-venda: (1) Visualizar Recibo Detalhado; (2) Avaliação Bilateral com Notas e Tags; (3) Enviar Gorjeta Real ao Motorista; (4) Reportar Item Perdido ou Reclamação Contextual; (5) Repetir Trajeto com 1 clique.
- **Orientado a Estado (ST-01):** ENQUANTO uma corrida ou entrega estiver ativa (`searching`, `accepted`, `in_progress`), o sistema DEVE renderizar o status ao vivo na aba "Agora" com dados reais do veículo, foto, placa mascarada, PIN de segurança e telemetria de posição do condutor.
- **Exceção (EX-01):** SE o usuário tentar acessar a localização em tempo real do condutor após a conclusão ou cancelamento da corrida, ENTÃO o backend DEVE recusar a transmissão e a interface deve ocultar o tracking ao vivo para resguardar a privacidade.
- **Exceção (EX-02):** SE o usuário possuir pendência financeira por não-comparecimento em `customer_debt_ledger`, ENTÃO o sistema DEVE bloquear novas solicitações e exibir a barreira Zero-Trust com botão de quitação imediata.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] **Estado de Dados (Data):** Cards informativos para Corridas, Entregas, Fretes e Caronas divididos em Agora, Agendados e Histórico.
- [x] **Estado de Carregamento (Loading):** Skeletons proporcionais com `aria-busy="true"` e sem CLS.
- [x] **Estado Vazio (Empty):** Estado comercial "Para onde vamos?" com ações contextuais para cada modalidade ("Pedir corrida", "Enviar algo", "Frete ou mudança", "Encontrar carona").
- [x] **Estado de Erro (Error):** Card de erro amigável com botão de reintento ("Tentar novamente") e atalho para suporte.
- [x] **Touch Targets:** Todos os controles, botões e tabs com altura mínima $\ge 44$px (`h-11 min-h-11`).
- [x] **Contraste:** Relação $\ge 4.5:1$ em textos e $\ge 3:1$ em controles.
- [x] **Anel de Foco:** `:focus-visible:ring-2 :focus-visible:ring-primary` em todos os elementos interativos.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação | Justificativa Técnica |
| --- | --- | --- |
| `supabase/migrations/20270217000000_waesy_go_end_to_end_multimodal_platform.sql` | Criar | Extensão da tabela `mobility_requests` com tip_cents, waypoints, status 'scheduled', drops e RLS |
| `src/services/mobility.functions.ts` | Modificar | Sincronização estrita `mobility_requests` <-> `orders`, novas funções: `cancelMobilityRequest`, `rescheduleMobilityRequest`, `sendMobilityTip`, `getMobilityReceipt` |
| `src/routes/_store.conta.mobilidade.tsx` | Modificar | Arquitetura comercial trifurcada (Agora, Agendados, Histórico), cards detalhados por modalidade, modais de pós-serviço |
| `src/routes/_store.mobilidade.tsx` | Modificar | Seletor comercial inicial ("O que você precisa?"), suporte a agendamento, cancelamento em tempo real e prevenção de estados fantasmas |
| `src/components/mobility/mobility-receipt-modal.tsx` | Criar | Modal de recibo fiscal e demonstrativo financeiro detalhado |
| `src/components/mobility/mobility-tip-modal.tsx` | Criar | Modal de envio de gorjeta real ao motorista com valores sugeridos |
| `src/components/mobility/mobility-cancel-modal.tsx` | Criar | Modal contextual de cancelamento com regras transparentes |
| `src/components/mobility/mobility-reschedule-modal.tsx` | Criar | Modal de remarcação de data/hora para agendamentos futuros |
| `src/components/mobility/mobility-incident-modal.tsx` | Criar | Modal de Central de Ajuda, Item Perdido e Reclamação com rastro contextual |
| `src/services/__tests__/waesy-go-multimodal.test.ts` | Criar | Suíte de testes unitários automatizados cobrindo o ciclo de vida completo |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. `npm run typecheck` com Exit Code 0.
2. `npm run build` com Exit Code 0.
3. `node scripts/design-lint.mjs --changed` com 0 violações P0 e 0 violações P1.
4. Testes unitários em `src/services/__tests__/waesy-go-multimodal.test.ts` executando com 100% de aprovação.
5. Registro de decisão em `docs/design/DECISIONS.md` (DEC-275).
