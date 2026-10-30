# Auditoria de segurança, RLS e integridade financeira

**Data:** 2026-10-30
**Branch:** `production-candidate`
**SHA:** `9b001449e3b5fd67ca1f2ec5e6de1c3be3ab54b1`
**Tipo:** diagnóstico inicial read-only, atualizado com a primeira implementação local; nenhuma migration ou policy foi aplicada remotamente.

## Evidência remota

| Verificação | Resultado | Interpretação |
|---|---:|---|
| Tabelas `public` sem RLS | 0 de 768 | O RLS está habilitado nas tabelas observadas. Isso não prova que as policies estejam corretas. |
| Policies de escrita visíveis no catálogo | 465 | O papel `public` é amplo; cada policy precisa ser classificada por intenção e predicado. |
| Policies anon/public com `WITH CHECK (true)` ou `USING (true)` | 23 | Candidatos P0/P1; alguns podem ser ingestão pública intencional, mas exigem validação, rate limit e limites de payload. |
| Tabelas sensíveis com RLS | 7 observadas | `orders`, `profiles`, wallets, ledger de tokens, certificados e logs têm RLS ativo. |
| Migration/BFF local | 0 tabelas BFF sem declaração | Contrato local presente; não prova grants, policies ou schema remoto completo. |

## Findings confirmados ou que exigem prova

| ID | Severidade | Evidência | Risco | Próxima prova |
|---|---|---|---|---|
| SEC-001 | P0 candidato | `ad_telemetry_events`, `classified_analytics_events`, `creator_showcase_clicks`, `leads_crm`, `mobility_requests`, `travel_quote_requests`, `user_behavior_events` e outros aceitam inserção pública com `WITH CHECK (true)` | Spam, injeção de payload, custo e poluição de telemetria/CRM | Revisar schema, rate limit, tamanho, origem, retenção e uso de cada tabela |
| SEC-002 | P0 candidato | Policies de serviço com `USING(true)` são numerosas e o scanner as mistura com policies de cliente | Falso positivo de auditoria ou exposição caso role/grant esteja incorreto | Separar `service_role` de `anon/authenticated`, revisar grants e testar JWTs |
| SEC-003 | P0 candidato | `src/lib/crypto-vault.server.ts` usa AES-256-GCM, mas `decryptSecret` aceita base64 legado | Segredo antigo pode permanecer sem autenticação criptográfica | Inventariar registros, migrar para AES, bloquear novos writes legados e validar readback |
| SEC-004 | P0 candidato — implementação local pronta | A baseline permitia INSERT/DELETE direto e engolia falha de sincronização | Divergência entre caixa de excursão e caixa central | Aplicar `20261030122933_group_tour_cash_atomic_ledger.sql` e executar readback remoto |
| SEC-005 | P1 | O scanner detecta 9 serviços financeiros sem referência textual direta a `recordLedgerEntryCore` | Pode haver ledger indireto por RPC ou ausência real de certificação | Rastrear cada mutation até RPC, tabela, ledger, idempotência e telemetria |
| SEC-006 | P1 | 20 serviços críticos não contêm referência textual a `forensic_audit_events` | Telemetria pode estar indireta, incompleta ou ausente | Auditar helper comum, triggers, outbox e readback de eventos |

## Limites da prova

- `public` em `pg_policies.roles` não significa automaticamente acesso anônimo sem predicado; a classificação exige ler policy, grants e testar roles.
- `WITH CHECK(true)` pode ser intencional para ingestão pública, mas nunca deve ser aceito sem validação de payload, rate limit, anti-replay e isolamento de dados.
- O scanner quíntuplo é heurístico: base64 usado para imagens, Basic Auth, fingerprints ou transporte não é automaticamente criptografia de segredo.
- A integridade efetiva do banco exige testes com sessões `anon`, `authenticated` e `service_role`, além de advisors e readback após migration.

## Decisão operacional

Nenhuma exclusão de legado, alteração de RLS, migration financeira ou remoção do fallback criptográfico deve ocorrer antes da aprovação da spec `SPEC-20261030-SECURITY-RLS-LEDGER-HARDENING-WAVE1.md` e do ledger de evidências correspondente.

## Atualização da onda 1

| Evidência local | Resultado |
|---|---|
| BFF de criação/estorno | RPC server-side, tenant validado, idempotência obrigatória e falhas propagadas |
| Persistência financeira | Ledger imutável e evento forense na mesma transação; estorno compensatório, sem DELETE |
| Caixa central | Entrada de compensação criada quando o lançamento original foi sincronizado |
| Testes focados | 2 arquivos, 8 testes aprovados |
| Checks estruturais | BFF-table contract aprovado, 0 ciclos, client leak aprovado |
| Limite atual | `supabase db lint --local` não executou porque não há Postgres local em `127.0.0.1:54322`; produção ainda não foi aplicada |
