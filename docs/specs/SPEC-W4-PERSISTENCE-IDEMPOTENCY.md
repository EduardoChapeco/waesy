# SPEC-W4 — Persistência e idempotência do Copilot

## Escopo

Fechar o finding CHAT-F01 do masterplan: retries do mesmo envio não podem gerar uma segunda mensagem de utilizador, uma segunda execução de IA ou uma segunda cobrança.

## Requisitos EARS

- **Quando** o cliente reenviar uma mensagem existente, **o sistema deve** reutilizar o mesmo `clientMessageId`.
- **Quando** existir uma mensagem com a combinação `(thread_id, client_message_id)`, **o BFF deve** devolver a resposta AI persistida quando disponível, sem executar o pipeline novamente.
- **Quando** duas requisições iguais chegarem concorrentemente, **a constraint única deve** impedir duplicação e o BFF deve devolver erro recuperável em vez de declarar estado inconsistente.
- **Quando** uma mensagem falhar sem resposta persistida, **o retry deve** reabrir o mesmo registo, mantendo o histórico e a chave de deduplicação.

## Invariantes

1. A chave idempotente é estável durante o ciclo completo da mensagem.
2. O lookup é limitado à mesma thread e identidade do remetente.
3. A resposta persistida leva `clientMessageId` e `userMessageId` no payload.
4. O fluxo guest não é alterado nesta microfase.

## Critérios de aceite

- Typecheck, testes, build e CI passam.
- O retry de uma mensagem falhada não chama `crypto.randomUUID()` para gerar uma nova chave.
- O BFF contém caminho explícito de replay antes do pipeline.
- A migration existente `20270112000000_chat_message_idempotency.sql` permanece a fonte da constraint única.
