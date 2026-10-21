# EVENT_RLS_AUDIT — Auditoria de Segurança, RLS e Criptografia de Ingressos (Invariante B.40)

## 1. Matriz de Autorização e Segurança do Domínio de Eventos

| Superfície / Operação | Regra de Acesso & RLS | Blindagem Server-Side | Status |
| :--- | :--- | :--- | :--- |
| **Leitura Pública de Eventos (`public` / `unlisted`)** | Visitantes anônimos e usuários autenticados podem visualizar eventos com `status = 'active'` / `'published'`. Eventos `unlisted` não são listados nos feeds gerais, sendo acessíveis apenas via link direto. | `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` filtra atributos sensíveis (`ai_instructions`, `max_discount_pct` nunca vazam para o cliente). | **SEGURO** |
| **Edição do Evento e Lotes** | Apenas o `author_profile_id`, membros autorizados da loja (`store_id` com role `owner`, `admin`, `manager`, `content`) ou `admin/master` podem editar o evento. | Validado no servidor em `upsertClassified` e `upsertEvent` via `getServerIdentity()` e `assertStoreAccess()`. | **SEGURO** |
| **Emissão de Ingressos & Criptografia WCTS-1 (Invariante B.40)** | Proibida inserção direta de ingressos forjados pelo cliente. | `signTicketPayload` gera assinatura HMAC-SHA256 server-side vinculada a `ticketId`, `eventId`, `lotId` e `ownerProfileId`. | **SEGURO** |
| **Exportação de Lista de Inscritos (CSV) e Respostas Individuais de Enquetes** | Dados pessoais de inscritos (`phone`, `email`) e votos identificados são restritos exclusivamente ao organizador autenticado do evento. | `exportClassifiedEventLeadsCsv` e `getClassifiedEventSurveyResults` validam autoridade estrita (`hasAuthority`) e aplicam sanitização anti-CSV-injection (`sanitizeCsvCell`). | **SEGURO** |
| **Portaria e Check-in (`verifyClassifiedTicketByCode` / `validateTicketCheckin`)** | Apenas o organizador (`isOwner`) ou equipe autorizada pode marcar o ingresso como `checked_in` / `used`. | Validação criptográfica HMAC-SHA256 e bloqueio de reuso com carimbo de data/hora. | **SEGURO** |
