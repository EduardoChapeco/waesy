# SPEC-S34: Detecção de Quebra Silenciosa e Resguardo Operacional

## 1. Contexto e Motivação
Em sistemas distribuídos e BFFs modernos, as falhas mais perigosas não são as que explodem no console, mas as **quebras silenciosas**: blocos `catch` vazios que engolem exceções, promessas rejeitadas não tratadas (`unhandledRejection`), retornos nulos inesperados que deixam a interface congelada em skeleton perpétuo, e jobs em background que falham silenciosamente sem notificar ninguém.

Esta especificação define o detector dinâmico e estático de quebras silenciosas (Fase S34 do Plano 5), fornecendo guardas de execução assíncrona, detector de promessas órfãs e ferramenta determinística de varredura estática.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-S34-01] Wrapper Seguro de Execução Assíncrona de Jobs
- **EARS (Ubíquo):** Todo job assíncrono de background (e-mail, indexação, conciliação, webhooks) deve ser executado através do wrapper `executeAsyncJobSafely(jobName, fn, options)`, que mede a duração, aplica timeout de proteção e correlaciona eventuais falhas com o `traceId`.

### [REQ-S34-02] Alerta de Retorno Nulo Inesperado
- **EARS (Condicional ao Estado):** Quando uma função de consulta ou serviço retornar nulo para uma entidade esperada (ex: loja ativa, pedido confirmado, perfil de usuário), a asserção `assertRequiredEntity(value, entityName, meta)` deve registrar um evento estruturado de quebra silenciosa no motor de telemetria antes de disparar o fallback.

### [REQ-S34-03] Scanner Estático de Catches Vazios e Promessas Órfãs
- **EARS (Guiado por Evento):** Quando o script `scripts/detect-silent-breaks.mjs` for executado, o sistema deve varrer o código fonte em busca de blocos `catch` vazios (`catch {}` ou `catch (e) {}`), `.catch(() => {})` desarmados e reportar o inventário exato de locais a serem protegidos.

---

## 3. Invariantes
1. Nenhum job assíncrono pode falhar sem registrar o erro no `errorRegistry`.
2. A asserção de entidade obrigatória não pode vazar dados de outros tenants.
3. Zero dependências externas; execução pura em TypeScript/Node.js.

---

## 4. Critérios de Aceite
- [ ] `src/lib/telemetry/silent-failure-detector.ts` implementado com wrapper de jobs e asserção de nulos.
- [ ] `scripts/detect-silent-breaks.mjs` implementado para varredura estática de catches vazios.
- [ ] Testes unitários em `src/lib/telemetry/silent-failure-detector.test.ts` com 100% de sucesso.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
