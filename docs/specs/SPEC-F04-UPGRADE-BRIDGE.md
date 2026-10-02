# SPEC-F04: Ponte Canônica de Upgrade (Classificados ➔ Workspace)

## 1. Metadados e Controle Normativo
- **Fase:** F04 (Construção da Ponte Canônica de Upgrade).
- **Plano:** Plano Mestre de Estabilização e Desentrelaçamento dos 4 Pilares.
- **Autoridade:** BigTech Executive Board & Red Team.
- **Invariantes:** M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional), M10 (Isolamento Multi-Tenant).

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F04-01] Promoção Transacional de Anúncio Avulso para Produto Pro
- **EARS (Quando acionado):** QUANDO um lojista autenticado com perfil de Workspace ativo invocar a Server Function `promoteClassifiedToWorkspaceProductFn` informando `classifiedId` e `targetStoreId`, O SISTEMA DEVE verificar a posse do anúncio e a permissão administrativa na loja (`assertStoreAccess`), clonar os dados e galeria de imagens para a tabela `products` e registrar metadados de procedência (`promoted_from_classified_id`).

### [REQ-F04-02] Preservação de Integridade de Ativos e Mídia
- **EARS (Ubíquo):** O SISTEMA DEVE preservar 100% da galeria de imagens e atributos específicos de nicho do classificado original, garantindo que o novo produto nasça pronto para o checkout do Marketplace B2C sem redigitação.

### [REQ-F04-03] Atualização Atômica de Status do Classificado
- **EARS (Ubíquo):** AO concluir a criação do produto de catálogo no Workspace, O SISTEMA DEVE atualizar o status do classificado original para `promoted`, associando `promoted_to_product_id` para impedir duplicações concorrentes no feed de classificados e no marketplace.

### [REQ-F04-04] Rastreabilidade e Auditoria Transacional
- **EARS (Ubíquo):** A transação DEVE emitir evento de domínio `classified.promoted_to_workspace` no barramento outbox com `traceId`, `tenantId`, `userId` e `classifiedId`.

---

## 3. Critérios de Aceite e Métricas
1. `src/services/listing-promotion.functions.ts` exporta `promoteClassifiedToWorkspaceProductFn` validado com Zod.
2. `src/services/listing-promotion.functions.test.ts` com testes unitários cobrindo cenários de sucesso, rejeição por falta de permissão e idempotência.
3. `npm run typecheck` Exit Code 0.
4. `node scripts/design-lint.mjs --ratchet` Exit Code 0.
