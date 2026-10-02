# SPEC-S35: Coletor e Registro de Web Vitals Reais

## 1. Contexto e Motivação
Em conformidade com `docs/PERFORMANCE.md` e a Fase S35 do Plano 5 (Bloco E - Telemetria Real), a plataforma Waesy requer uma infraestrutura nativa e de baixo impacto para medição, agregação e telemetria de **Core Web Vitals** reais dos usuários finais (RUM - Real User Monitoring).

Métricas cegas ou dados estáticos de laboratório não refletem a experiência em redes 3G/4G e dispositivos modestos. A solução deve capturar métricas reais com zero impacto na thread principal (overhead < 1ms), classificar conforme os patamares do W3C/Google e disponibilizar histórico em memória para diagnósticos de rota e dispositivo.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-S35-01] Coletor Nativo de Métricas RUM
- **EARS (Ubíquo):** O módulo `src/lib/telemetry/web-vitals.ts` deve monitorar nativamente `LCP`, `INP`, `CLS`, `TTFB` e `FCP` utilizando `PerformanceObserver` e `PerformanceNavigationTiming` sem bibliotecas externas pesadas.

### [REQ-S35-02] Classificação Canônica de Desempenho
- **EARS (Ubíquo):** Toda métrica capturada deve ser classificada de forma determinística em três faixas (`good`, `needs-improvement`, `poor`), baseando-se nos limites estipulados em `docs/PERFORMANCE.md`:
  - LCP: <= 2500ms (good), <= 4000ms (needs-improvement), > 4000ms (poor)
  - INP: <= 200ms (good), <= 500ms (needs-improvement), > 500ms (poor)
  - CLS: <= 0.10 (good), <= 0.25 (needs-improvement), > 0.25 (poor)
  - TTFB: <= 800ms (good), <= 1800ms (needs-improvement), > 1800ms (poor)
  - FCP: <= 1800ms (good), <= 3000ms (needs-improvement), > 3000ms (poor)

### [REQ-S35-03] Enriquecimento Contextual e Correlação
- **EARS (Quando ativo):** Quando uma métrica for gerada, o evento deve ser enriquecido com a rota atual (`routeId`), a classificação da viewport (`compact`, `medium`, `expanded`), tipo de conexão de rede (`effectiveType`) e identificador correlacionado.

### [REQ-S35-04] Despacho Resiliente com Beacon
- **EARS (Quando navegando ou saindo da página):** Ao disparar o envio das métricas, o cliente deve utilizar `navigator.sendBeacon` com fallback para `fetch(..., { keepalive: true })`, garantindo que requisições não sejam canceladas no descarregamento da página.

### [REQ-S35-05] Registro e Agregação na Telemetria
- **EARS (Ubíquo):** O sistema deve fornecer um registro em memória (`webVitalsRegistry`) com capacidade circular limitada para consultas operacionais e diagnósticos de saúde por rota.

---

## 3. Invariantes
1. O coletor não pode adicionar mais de 1ms de tempo de execução à thread principal.
2. Nenhuma informação pessoal identificável (PII) pode constar nos eventos de Web Vitals.
3. Se a API de `PerformanceObserver` não estiver disponível no ambiente (ex: SSR), o coletor deve degradar silenciosamente e com segurança sem disparar exceções.

---

## 4. Critérios de Aceite
- [ ] `src/lib/telemetry/web-vitals.ts` implementado com coletor nativo, enums de métricas e registro.
- [ ] Testes unitários cobrindo classificação, agregação e registro em `src/lib/telemetry/web-vitals.test.ts`.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
