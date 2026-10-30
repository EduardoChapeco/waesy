# SPEC-20261030-META-CAPI-WEBHOOKS-WAVE1

## Escopo

Esta onda fecha os contratos server-side de Meta Conversions API v19.0, Google Ads/GA4 closed-loop, credenciais por tenant, webhook Lead Ads e sincronização de lead qualificado. A interface de integrações deve persistir segredos somente no BFF e o comercial deve exibir erro real quando o agendamento falhar.

## Requisitos EARS

- **Quando** um evento Meta for enviado, **o sistema deve** gerar ou receber um `event_id` estável, incluir o mesmo identificador no `event_payload.event_id` e registrar o mesmo valor na telemetria.
- **Quando** um evento vier de uma vitrine pública sem sessão, **o sistema deve** aceitar apenas telemetria não financeira de uma loja ativa; `Purchase`, `QualifiedLead` e demais eventos transacionais devem exigir tenant autenticado ou contexto server-side verificável.
- **Quando** o evento possuir e-mail ou telefone, **o sistema deve** normalizar e aplicar SHA-256 em hexadecimal minúsculo; telefone deve ser E.164 brasileiro com DDI `+55` antes do hash.
- **Quando** o request estiver disponível, **o sistema deve** derivar IP, user-agent, `_fbp`, `_fbc`/`fbclid` e URL de origem do request ou do contexto persistido do lead/pedido, sem fabricar identificadores.
- **Quando** uma configuração de loja possuir `meta_test_event_code`, **o sistema deve** transmiti-lo somente para aquela loja e somente quando não vazio.
- **Quando** uma conversão Google Ads/GA4 for enviada, **o sistema deve** exigir identificador real (`client_id`, `transaction_id` ou identificador persistido) e recusar `synthetic_*`.
- **Quando** uma credencial de integração for salva, **o sistema deve** manter metadados públicos separados do payload secreto cifrado; `META_APP_SECRET`/`META_APP_ID` globais só podem servir para OAuth e assinatura de webhook.
- **Quando** o webhook Meta receber POST, **o sistema deve** validar `x-hub-signature-256` com HMAC-SHA256 e comparação em tempo constante; ausência ou divergência deve retornar 401.
- **Quando** houver handshake válido, **o sistema deve** responder HTTP 200 com `hub.challenge` em texto simples; qualquer token inválido deve retornar 403.
- **Quando** houver evento `leadgen`, **o sistema deve** resolver a loja pelo vínculo da página/anúncio, consultar os dados do lead na Graph API com o token da loja, persistir campos completos em `custom_fields` e deduplicar por `leadgen_id`.
- **Quando** `crm_sync_qualified_lead_conversion` for chamado, **o sistema deve** validar o tenant do contexto, usar valor econômico persistido no CRM e manter idempotência por lead/estágio/evento.
- **Quando** o agendamento comercial falhar, **o sistema deve** manter o modal aberto, informar o erro e não emitir toast de sucesso.

## Invariantes

1. Nenhum token de loja ou segredo de plataforma chega ao cliente.
2. Nenhum evento de conversão é reportado como entregue quando a API externa ou a persistência falhou.
3. Nenhum campo de lead recebido da Meta é descartado por ausência de coluna dedicada; campos nativos ficam em `custom_fields`.
4. Nenhuma correção reescreve arquivo inteiro; alterações são diffs localizados.

## Evidência obrigatória

- Auditoria estática dos serviços, rota webhook, registry MCP e rota comercial.
- Testes unitários de normalização/hash, `event_id`, rejeição de credencial sintética, assinatura e handshake.
- `npm run build`, `npm run audit:buttons:test`, auditorias de ações e `node scripts/design-lint.mjs --ratchet`.
- Prova separada de schema/migration local e verificação remota Supabase/Meta somente quando credenciais e tráfego de produção estiverem disponíveis.

## Arquivos autorizados nesta onda

- `src/services/pixels.functions.ts`
- `src/services/integrations.functions.ts`
- `src/services/master.functions.ts`
- `src/routes/api.webhooks.meta-ads.ts`
- `src/registries/mcp-tool-registry.ts`
- `src/routes/workspace.comercial.tsx`
- `supabase/migrations/20261030190000_meta_capi_webhook_contracts.sql`
- testes diretamente relacionados aos contratos acima
- `docs/design/DECISIONS.md`
- `docs/audits/EVIDENCE_LEDGER_20261030_WAVE2.md`
