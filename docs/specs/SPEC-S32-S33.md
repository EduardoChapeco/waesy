# SPEC-S32-S33: Telemetria Real, Correlação de Erros e Extinção do Buffer de 5s

## 1. Contexto e Motivação
O repositório Waesy utilizava em `src/lib/error-capture.ts` uma variável global em memória com TTL de 5.000ms (`const TTL_MS = 5_000`) para tentar recuperar erros engolidos pelo runtime do h3/Nitro. Esse mecanismo é frágil, não correlaciona erros com requisições concorrentes no Cloudflare Worker, perde erros sob concorrência e mascara falhas silenciosas sem metadados de tenant, rota, versão ou usuário.

Esta especificação define o subsistema canônico de telemetria e correlação de erros (Fases S32 e S33 do Plano 5), extinguindo o buffer cego de 5 segundos e introduzindo correlação determinística por `requestId` (`traceId`), `tenantId`, rota e release.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-S32-01] Correlação Determinística de Erros por Request ID
- **EARS (Ubíquo):** O sistema deve correlacionar todo erro capturado no cliente, no SSR ou no Cloudflare Worker com um identificador único de requisição (`requestId` / `traceId`), extraído dos headers HTTP (`cf-ray`, `x-request-id`) ou gerado como UUID v4.

### [REQ-S32-02] Envelope Estruturado de Telemetria de Erro
- **EARS (Condicional ao Estado):** Quando um erro for capturado, o sistema deve encapsular o evento em um payload estruturado contendo: `traceId`, `tenantId`, `userId`, `routeId`, `source` (`"client"` | `"worker"` | `"ssr"`), `release`, `timestamp`, `error` (`name`, `message`, `stack`) e `context` operacional.

### [REQ-S32-03] Sanitização e Redação de Dados Pessoais (Zero PII)
- **EARS (Ubíquo):** O correlator de telemetria deve higienizar preventivamente todas as mensagens, URLs e stacks de erro, redigindo chaves de API, senhas, tokens JWT, números de cartão e CPFs antes de qualquer persistência ou registro em log.

### [REQ-S33-01] Extinção Definitiva do Buffer Cego de 5 Segundos
- **EARS (Condicional ao Estado):** O arquivo `src/lib/error-capture.ts` deve ser refatorado para eliminar completamente a variável `TTL_MS = 5_000` e o singleton global cego, substituindo-o pelo mapa correlacionado por `requestId` do motor de telemetria.

### [REQ-S33-02] Recuperação de Erros SSR no `server.ts`
- **EARS (Guiado por Evento):** Quando o `server.ts` interceptar uma resposta 500 do h3/Nitro com corpo de erro engolido, ele deve recuperar o erro original indexado pelo `requestId` daquela requisição específica e registrar os metadados correlacionados.

---

## 3. Invariantes
1. Proibido qualquer vazamento de PII (dados pessoais ou sensíveis) em telemetria.
2. Proibido bloqueio síncrono ou atraso na resposta ao usuário final (tratamento não-bloqueante).
3. Zero dependências externas pesadas (sem SDKs de monitoramento proprietários inchando o bundle do worker).
4. Suíte de testes com 100% de aprovação e zero regressão no design lint.

---

## 4. Critérios de Aceite
- [ ] Módulo `src/lib/telemetry/error-correlator.ts` implementado com redação de PII e mapa correlacionado por request.
- [ ] `src/lib/error-capture.ts` refatorado sem buffer cego de 5 segundos.
- [ ] `src/server.ts` atualizado para extrair `requestId` e consultar o erro correlacionado exato.
- [ ] Testes unitários em `src/lib/telemetry/error-correlator.test.ts` com 100% de sucesso.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
- [ ] `npm run build` Exit Code 0 gerando `dist/_worker.js`.
