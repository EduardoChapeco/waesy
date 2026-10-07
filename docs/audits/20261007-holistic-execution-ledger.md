

### Onda antifalsidade — continuação e gates finais — 2026-10-07
- **Superfície pública:** o perfil canônico não injeta mais seções/cards padrão; catálogo, posts, avaliações e vagas só ganham aba quando existem registros persistidos. O renderer de experiências não fabrica `Nossa Loja` quando não há binding de loja.
- **Studio e propostas:** o Studio exige sessão/tenant real, não usa perfil de marca Waesy implícito, não usa logo de cobertura fictício e falha se a persistência não retornar ID. A proposta visual inicia sem Cancún, México, datas futuras, companhia aérea, hotel, tags, preços, Pix ou parcelamento inventados; dados só entram por lead, usuário, OCR ou tabela real.
- **Turismo e vouchers:** UUID zero, agência genérica, plantão fictício, destino genérico, cliente/documento de exemplo, observações automáticas e seguradora/central inventadas foram removidos dos caminhos tocados. Token inválido de formulário de viajante agora falha, em vez de retornar contexto genérico com `success: true`.
- **Contratos de ausência:** parcelas de OCR são tratadas como lista vazia quando ausentes; parser de voucher lança erro explícito quando o provider não retorna JSON estruturado; nenhuma dessas condições produz sucesso ou registro sintético.
- **Rotas de tenant:** aéreas e reacomodação não usam UUID sentinela e bloqueiam criação sem loja configurada. Reservas mantêm estado vazio honesto quando a planta não possui mesas persistidas.
- **Gates:** `npm run typecheck` PASS; suíte direcionada final PASS com 4 arquivos e 15 testes; `git diff --check` PASS. Garante compilação e contratos locais, mas não prova provider externo, Postgres/RLS, Storage, browser E2E, deploy ou produção.
- **Estado honesto:** a onda está corrigida e validada localmente nos caminhos tocados. Permanecem para varredura posterior alguns textos genéricos de apresentação e módulos legados fora do escopo desta micro-onda; eles não devem ser interpretados como dados reais nem como integração concluída.


### Auditoria real de RLS, Storage e pagamentos — 2026-10-07
- **Storage confirmado no banco:** `classified-media` estava público e incluído na policy pública de leitura. Migration `storage_tenant_boundary_hardening` aplicada no projeto Supabase real; o bucket agora está privado e a policy `media_public_read` não o inclui.
- **Upload tenant-safe:** a policy genérica de INSERT foi substituída por regra que exige ownership, UID no caminho, store pertencente ao workspace ou role administrativa.
- **Pagamentos:** `initiatePaymentTransaction` deixou de fabricar `pending_ext_*` e de retornar sucesso sem provider. Métodos não manuais chamam `createGatewayPayment` e persistem somente a referência retornada pelo gateway. Método manual fica `pending`, aguardando comprovante.
- **Faturas:** removidos chave Pix, beneficiário e payload hardcoded; sem `PLATFORM_PIX_KEY` e `PLATFORM_PIX_BENEFICIARY_NAME`, a função falha explicitamente.
- **Marketplace/carrinho:** removido o endpoint `simulateMarketplaceOrder` e o fallback que escolhia arbitrariamente a primeira loja do banco. A documentação foi alinhada.
- **Gates:** `npm run typecheck` PASS; testes direcionados PASS (7 testes); `git diff --check` PASS. Verificação pós-migration confirmou `classified-media.public = false` e exclusão da policy pública.
- **Limite honesto:** provider externo, pagamento real, webhook real e deploy não foram simulados nem declarados como concluídos; permanecem dependentes de configuração e execução reais.

### Onda RPC/identidade — 2026-10-07
- **Finding confirmado:** o banco real mantinha `auth.on_auth_user_created` ativo, `public.handle_new_user()` com promoção heurística e criação de organização/loja/membership, além de overloads e grants públicos em RPCs `SECURITY DEFINER`.
- **Correção aplicada no código:** `signUpWithPassword` agora faz upsert explícito do perfil com role `customer` e falha se o provisionamento não persistir; não cria tenant, organização, loja ou membership.
- **Migration aplicada no banco real:** `rpc_grants_and_explicit_profile_provisioning` registrada pelo Supabase como versão `20261007142914`. O trigger e a função foram removidos; o overload UUID de `get_public_lead_by_token` foi removido; o magic link não injeta nome de agência quando ausente.
- **Grants verificados:** `add_to_cart_atomic_v6`, `process_checkout_atomic`, `process_checkout_transaction_v2`, `get_public_lead_by_token(text)` e `reconcile_behavioral_telemetry_identity` retornam `anon_exec=false`, `auth_exec=false`, `service_exec=true` no banco real.
- **Gates:** 12 testes direcionados PASS; `npm run typecheck` PASS; suíte completa PASS; `npm run build` PASS; client-leak guard PASS; `npm run lint -- --quiet` PASS; `git diff --check` PASS.
- **Limites:** a migration foi aplicada no Supabase real, mas deploy Cloudflare e smoke test público ainda não foram confirmados. O merge em `main` depende dos checks do GitHub no SHA publicado.
