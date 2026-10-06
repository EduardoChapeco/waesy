

## Onda 7 — resiliência, retransmissão e circuit breaker

Foi implementado um circuit breaker persistente por `whatsapp_channel_instances.id`, e não por provider global. Isso mantém uma instância Evolution ou WaSenderAPI isolada das demais instâncias da mesma loja e impede que uma credencial ou endpoint degradado bloqueie canais saudáveis.

A tabela `whatsapp_provider_circuit_breakers` mantém estado `closed`, `open` ou `half_open`, quantidade de falhas consecutivas, limiar configurável, cooldown, próximo probe, proprietário do probe, último erro e último sucesso. As RPCs `acquire_whatsapp_provider_circuit` e `record_whatsapp_provider_circuit_result` usam lock transacional para que apenas um worker execute o probe durante `half_open`.

Quando o circuito está aberto, o worker não chama o provider. O item volta para a fila com `status = failed`, `next_attempt_at` baseado no cooldown real, locks liberados e uma tentativa `skipped` com código `CIRCUIT_OPEN`. Assim, a indisponibilidade do provider não consome uma chamada externa nem cria tempestade de retries. O resultado do worker agora registra também `circuitOpen`.

Falhas retryable de rede, timeout, HTTP 408/409/425/429 e respostas HTTP 5xx alimentam o circuito. Falhas permanentes, como credenciais ausentes, base URL inválida, payload incompatível e HTTP 4xx não transitório, seguem diretamente para o fluxo existente de falha/dead-letter e não abrem o circuito. Após uma chamada aceita, o worker registra sucesso e fecha/reset o circuito.

A migration também aplica RLS fail-closed, força RLS e publica a tabela no Supabase Realtime para permitir telemetria operacional. O backoff existente continua usando limite de 1 hora e jitter, enquanto o cooldown do circuito controla a liberação de probes e a retransmissão bloqueada.

Validação executada: ESLint dos adapters e worker aprovado; doze testes de contrato inbound/outbound aprovados; `git diff --check` aprovado; migration e referências de circuit breaker verificadas textualmente. O typecheck global continua apresentando erros preexistentes de tipagem TanStack em diversas rotas fora da Onda 7.


## Onda 8 — testes de carga, falhas, segurança e LGPD

A Onda 8 adicionou redaction recursivo de segredos e conteúdo, eliminou `raw` dos payloads persistidos pelos webhooks não oficiais e passou a sanitizar os payloads Meta antes de gravá-los em inbox/delivery. O conteúdo funcional permanece somente em `chat_messages.message`, cifrado por thread com AES-256-GCM v2. Também foi garantida a coluna `chat_conversation_keys.retired_at`, usada pelo contrato de rotação de DEKs.

Foi criado o harness `scripts/whatsapp-wave8-load-test.mjs`, com HMAC real, concorrência configurável, P95, status HTTP e amostras JSON. Ele exige autorização explícita e bloqueia alvos não locais por padrão. Não foi executado contra produção nesta sessão por não haver endpoint de staging autorizado; a execução contra produção sem janela e dados de teste seria insegura.

Validação automatizada: 26 testes aprovados, cobrindo criptografia/AAD, redaction aninhado, adapters, webhooks e injeção de HTTP 408/409/425/429/5xx versus 400/401/403/404/422. O relatório formal de segurança e LGPD está em `docs/WHATSAPP_WAVE8_SECURITY_LGPD_AUDIT_2026-10-06.md`.

O veredito técnico é reforçado/testado, mas a conformidade jurídica completa depende de decisões do controlador: base legal por finalidade, transparência, direitos do titular, prazo de retenção/eliminação, DPA e transferências com providers, encarregado, RIPD e runbook de incidentes. A ANPD e o art. 48 da LGPD devem orientar a avaliação e eventual comunicação de incidentes relevantes.
