# Auditoria E2E — Onboarding, BrandKit, Chat, Compras e Agendamentos

Data: 2026-10-06
Projeto: Waesy

## Evidência executada

- TypeScript: `npm run typecheck` — aprovado.
- Testes focados: 7 arquivos, 53 testes — aprovados.
- Build Cloudflare/Nitro: `npm run build` — aprovado.
- Auditoria de controles: 6.145 controles, P0/P1/P2 = 0.
- Client leak: 494 chunks verificados, nenhum runtime server-only no boot client.
- `git diff --check`: aprovado.

## Correções aplicadas

### Onboarding e BrandKit

- A revisão de onboarding aceita `session_id`, carrega a sessão persistida e transforma `extracted_products` em itens editáveis.
- A aprovação transmite `session_id`, evitando aprovação sem vínculo explícito com a sessão.
- Removidos textos que afirmavam OCR concluído, nicho, ticket médio e acurácia sem evidência persistida.
- A rota de BrandKit passou a usar `getStoreBrandKit` e `saveStoreBrandKit`, em vez do fluxo legado `studio.functions`.
- A tela converte `fonts`/`typography` e estética para o DTO canônico.
- BrandKit agora exige identidade e `assertStoreAccess` com `targetStoreId` em leitura, gravação e extração.
- Extração por URL recebeu bloqueio de protocolos e hosts locais/privados.

### Chat

- Lista staff passou a exigir `STAFF_ROLES` e escopo da loja.
- Leitura e envio do cliente agora rejeitam thread sem usuário autenticado, sem `customer_id` ou pertencente a outro usuário.
- O botão de anexo não aparece quando não existe upload conectado.
- Removida a string falsa `[Áudio transcrito]` do ditado.

### Agendamento e RLS

- Criação rejeita horário inválido/passado.
- Recurso precisa existir, estar ativo e pertencer à mesma loja.
- Passe precisa pertencer ao cliente autenticado, à loja e ao serviço.
- Duração real do serviço é persistida no appointment.
- Criada a migration `20270109000000_e2e_booking_chat_rls_hardening.sql` para remover INSERT público de appointments e corrigir policies de tickets para `workspace_members.profile_id`.

### UI

- `QuickCheckoutButton` não exibe CTA sem callback nem valores default sintéticos.

## Limites não mascarados

A validação E2E contra banco remoto, RLS efetivo, Storage, gateway de pagamento, webhook, concorrência, parcelas e reconciliação ainda não pode ser declarada concluída nesta sessão. Os conectores Supabase estão desabilitados; a migration não foi aplicada remotamente.

Também permanecem como ondas P0/P1 seguintes, confirmadas pela auditoria:

1. RPC transacional efetivo do checkout precisa recuperar ownership por `customer_id/session_token`, preço canônico e replay side-effect-free.
2. `initiatePaymentTransaction` ainda precisa ser ligado a gateway/webhook assinado real.
3. Recorrência ainda precisa de invoices, tentativas, retry, scheduler/webhook e gestão do vendedor.
4. Booking ainda precisa de RPC único para crédito/hold/appointment/ledger e release de hold órfão.
5. Chat ainda precisa de modelo único de ticket-thread, upload real, realtime completo, callbacks de ações estruturadas e HMAC no webhook WhatsApp.
6. O motor de artefatos documentais ainda precisa ser chamado pelo onboarding e verificar objeto Storage real.

Esses itens não foram marcados como concluídos porque exigem implementação adicional e/ou acesso ao Supabase remoto.
