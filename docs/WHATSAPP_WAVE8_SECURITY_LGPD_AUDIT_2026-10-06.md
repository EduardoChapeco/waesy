# Auditoria Wave 8 — segurança, testes e LGPD do WhatsApp

**Data:** 06/10/2026
**Escopo:** processamento inbound e outbound Meta Cloud API, Evolution API e WaSenderAPI; filas, webhooks, mensagens, recibos, credenciais, telemetria e isolamento multi-tenant.

## Correções aplicadas

1. **Conteúdo de conversa não é mais persistido em payloads de inbox/telemetria.** O webhook Meta agora grava apenas payload sanitizado. Os normalizadores Evolution/WaSender não incluem mais `raw: item`. O conteúdo funcional é gravado em `chat_messages.message`, cifrado por thread com AES-256-GCM v2 e AAD vinculado ao `thread_id`.
2. **Redaction recursivo.** Segredos aninhados (`access_token`, `api_key`, `apikey`, `app_secret`, `authorization`, senha e payload cifrado) são removidos. Campos de texto, caption, conversation, conteúdo e mídia são substituídos por marcadores. Identificadores técnicos necessários para idempotência e roteamento são preservados.
3. **Correção de contrato criptográfico.** A migration Wave 8 garante `chat_conversation_keys.retired_at`, coluna usada pela seleção de DEK ativa e pela rotação de chaves.
4. **RLS fail-closed.** O registro de testes Wave 8 é server-only, sem leitura ou escrita por `anon`/`authenticated`. Inbox, delivery, outbox e circuit breaker já possuíam o mesmo bloqueio.
5. **Injeção de falhas.** Foram cobertos HTTP 408, 409, 425, 429 e 5xx como retryable; HTTP 400, 401, 403, 404 e 422 como permanentes. O teste garante que o worker não classifique indisponibilidade temporária como erro permanente.

## Testes executados

- 26 testes automatizados aprovados:
  - 13 testes de redaction e classificação de falhas;
  - 1 teste de criptografia v2 e AAD entre threads;
  - 8 testes de adapters outbound;
  - 4 testes de normalização de webhooks inbound/delivery.
- `node --check` do harness de carga aprovado.
- `git diff --check` aprovado.
- ESLint sem erros nos arquivos alterados. Permanecem seis warnings `no-explicit-any` preexistentes na rota Meta, sem introdução de erro de lint.

## Teste de carga controlado

Foi criado `scripts/whatsapp-wave8-load-test.mjs`. O harness envia requests sintéticos assinados com HMAC para um endpoint de teste, mede quantidade, status, latência mínima/máxima e P95, e grava amostras em JSON.

Há três proteções obrigatórias para evitar mutação acidental:

- `WAVE8_TARGET_URL` e `WAVE8_APP_SECRET` precisam ser fornecidos;
- `WAVE8_ALLOW_MUTATION=true` precisa ser explicitamente definido;
- o alvo precisa ser `localhost`, salvo autorização explícita por `WAVE8_ALLOW_NONLOCAL=true`.

O teste de carga **não foi disparado contra produção** porque nenhum endpoint de teste foi fornecido/configurado nesta sessão. Isso é intencional: executar carga contra produção sem janela, limites, dados de teste e aprovação operacional seria um risco de disponibilidade e privacidade. O harness está pronto para execução em ambiente de staging isolado.

Exemplo seguro em staging local:

```bash
WAVE8_TARGET_URL=http://localhost:3000/api/webhooks/whatsapp \
WAVE8_APP_SECRET=segredo-do-staging \
WAVE8_ALLOW_MUTATION=true \
WAVE8_REQUESTS=500 \
WAVE8_CONCURRENCY=25 \
node scripts/whatsapp-wave8-load-test.mjs
```

## Matriz de conformidade LGPD

### Atendida tecnicamente

- **Segurança e prevenção:** envelope encryption v2 por conversa, AAD por thread, segredo de provider cifrado, HMAC para webhooks, RLS, BFF authorization, circuit breaker, retry controlado e auditoria de eventos.
- **Necessidade/minimização:** conteúdo não é duplicado no inbox, no delivery event ou nos payloads de telemetria; somente identificadores operacionais necessários são mantidos.
- **Integridade e isolamento:** `store_id`, `instance_id`, identidade canônica, thread e external message ID participam do roteamento/idempotência; confirmações são monotônicas e não atravessam lojas/instâncias.
- **Prestação de contas:** heartbeats, tentativas, delivery events, provider webhook events, circuit breaker e relatório de testes deixam trilha técnica.

### Requer configuração organizacional antes de declarar conformidade jurídica completa

- **Base legal por finalidade:** o código não deve presumir que `is_consent_lgpd` seja suficiente para todas as finalidades. A loja/controlador precisa registrar a base legal aplicável para atendimento, execução contratual, comunicações transacionais e marketing.
- **Transparência e direitos do titular:** é necessário confirmar que o canal de privacidade expõe finalidade, controlador, operador, contato do encarregado, prazos de retenção e mecanismo para acesso, correção, eliminação, oposição e portabilidade quando aplicável.
- **Retenção:** não foi localizado um prazo de retenção WhatsApp específico e aprovado pelo controlador. Não deve ser inventado pelo código. É necessário definir prazo por finalidade, legal hold e processo de eliminação/anonimização verificável para inbox, delivery, mensagens cifradas, mídias, logs e backups.
- **Operadores e transferências:** contratos/DPA e avaliação de transferência internacional precisam cobrir Meta, Evolution/WaSender, hospedagem, Supabase e armazenamento de mídia. A arquitetura técnica não substitui esses instrumentos.
- **Incidentes:** o sistema precisa ter responsável, severidade, runbook, canal e prazo de decisão. Incidentes com risco ou dano relevante devem ser avaliados para comunicação à ANPD e aos titulares pelo controlador.
- **RIPD:** recomenda-se formalizar relatório de impacto, principalmente porque conversas podem conter dados sensíveis, dados de terceiros e documentos enviados pelos usuários.

## Veredito

A implementação está **tecnicamente reforçada e testada em unidade/contrato**, com minimização de payload e isolamento efetivo. A validação end-to-end contra provider real e o teste de carga devem ocorrer em staging com credenciais, instância e endpoint de teste reais. A conformidade LGPD não deve ser marcada como “completa” apenas pelo código: base legal, transparência, retenção, contratos de operadores, encarregado, RIPD e runbook de incidentes são decisões/documentos do controlador que permanecem obrigatórios.

## Referências oficiais

[1]: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm "Lei nº 13.709/2018 — LGPD, Planalto"
[2]: https://www.gov.br/anpd/pt-br/assuntos/comunicacao-de-incidentes-de-seguranca-cis "ANPD — Comunicação de Incidente de Segurança"
[3]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/Segunda_Versao_do_Guia_de_Agentes_de_Tratamento_retificada.pdf/@@display-file/file "ANPD — Guia Orientativo para Definições dos Agentes de Tratamento e do Encarregado"
