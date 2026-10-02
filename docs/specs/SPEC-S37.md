# SPEC-S37: Orçamento de Erro, Alertas Operacionais e Página de Status (/status)

## 1. Contexto e Motivação
A Fase S37 do Plano 5 conclui o **Bloco E (Telemetria Real)** estabelecendo a governança de confiabilidade (SRE) da plataforma Waesy. Em vez de suposições, a plataforma deve quantificar o **Error Budget** sob um SLO (Service Level Objective) de 99.9% de disponibilidade, monitorar o consumo desse orçamento em tempo real e fornecer transparência pública aos cidadãos e lojistas através da rota `/status`.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-S37-01] Motor de Orçamento de Erro (Error Budget) e SLI/SLO
- **EARS (Ubíquo):** O módulo `src/lib/telemetry/status-engine.ts` deve calcular o status do Error Budget com base no SLO padrão de 99.9% (Three Nines), classificando a saúde operacional em `HEALTHY` (consumo <= 70%), `WARNING` (consumo 71% a 100%) e `BREACHED` (consumo > 100%).

### [REQ-S37-02] Monitoramento de Saúde por Subsistema
- **EARS (Ubíquo):** O sistema deve agregar o status de 5 subsistemas vitais:
  1. Edge Worker & SSR
  2. Banco de Dados & Pooler
  3. Pagamentos & Checkout
  4. Comunicação & Webhooks
  5. Experiência de Interface (Web Vitals)
  - Cada subsistema deve reportar: `operational`, `degraded` ou `outage`.

### [REQ-S37-03] Rota Pública de Status (/status)
- **EARS (Quando rota acessada):** Ao acessar `/status`, o sistema deve renderizar o painel de status do ecossistema, o uptime atual, o consumo do Error Budget e o catálogo de subsistemas utilizando as primitivas canônicas de Design System.

### [REQ-S37-04] Matriz Completa de 4 Estados e Acessibilidade
- **EARS (Ubíquo):** A página `/status` deve implementar a matriz completa de 4 estados (dados, skeleton de carregamento, vazio para histórico de incidentes e banner de erro em falha de conexão), touch targets >= 44px (`h-11`), foco explícito `:focus-visible` e zero violações de Design Lint.

---

## 3. Invariantes
1. A página de status pública não pode vazar credenciais internas, nomes de servidores ou IPs.
2. Zero classes arbitrárias com colchetes e zero cores literais hardcoded.
3. Rota TanStack Router com caminho estrito em string literal (`/status`).

---

## 4. Critérios de Aceite
- [ ] `src/lib/telemetry/status-engine.ts` implementado com cálculo de Error Budget e agregação de subsistemas.
- [ ] `src/lib/telemetry/status-engine.test.ts` com 100% de testes vitest verdes.
- [ ] `src/routes/status.tsx` criada e homologada com o TanStack Router.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
