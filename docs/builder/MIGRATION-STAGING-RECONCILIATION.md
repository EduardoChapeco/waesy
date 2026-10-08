# Reconciliação de migrations renumeradas em staging

## Objetivo e limite

Este runbook orienta a equipe a reconciliar em **staging** as três migrations cujo ID original era compartilhado por dois arquivos. É um procedimento para quem opera o ambiente; nenhum comando deste documento foi executado nesta tarefa.

A PR #18 normalizou os nomes no branch, preservando o SQL:

| Versão original em `main` | Arquivo mantido | Arquivo renumerado no branch |
|---|---|---|
| `20270106000000` | `20270106000000_campaign_scheduling_and_auto_archive.sql` | `20270106000001_live_p0_security_hardening.sql` |
| `20270107000000` | `20270107000000_cms_locality_and_banner_auto_archive.sql` | `20270107000001_document_artifacts_ocr_provenance.sql` |
| `20270109000000` | `20270109000000_e2e_booking_chat_rls_hardening.sql` | `20270109000001_wave6_tourism_rls_final_hardening.sql` |

**Risco conhecido:** `supabase_migrations.schema_migrations` registra versões, não um hash do conteúdo SQL aplicado. Se a versão antiga de um par estiver registrada, o ledger sozinho não identifica qual dos dois arquivos foi executado. A renumeração no GitHub não prova o estado de staging/produção e não é autorização para aplicar migrations em produção.

## 1. Fixar branch, projeto e operador

1. Escolha um operador de staging e suspenda temporariamente outros deploys de migrations para esse ambiente.
2. Faça checkout do commit exato aprovado para o ensaio (o head atualizado da PR #18) e confirme-o:

   ```bash
   git fetch origin
   git checkout feat/waesy-niche-template-factory
   git rev-parse HEAD
   git status --short --branch
   npm run check:schema
   ```

   O working tree deve estar limpo e a checagem deve informar versões únicas.
3. Confirme o **project ref de staging** por um canal confiável, separadamente do ref de produção. Use credenciais já armazenadas no gerenciador de segredos; não imprima tokens, senhas ou URLs de conexão nos logs.
4. Gere/valide um backup restaurável de staging e anote ref, horário UTC, commit e operador. Se os dados não puderem ser compartilhados, armazene o backup de forma restrita e criptografada.

> Nunca use `supabase db reset --linked` ou `--db-url` contra staging/produção. `db reset` deve ficar limitado ao banco local descartável.

## 2. Testar o replay em banco local descartável

Com Docker disponível e nenhum projeto remoto vinculado para comandos locais:

```bash
supabase start
supabase db reset --local
npm run check:schema
```

O reset local deve reconstruir o schema do zero usando os arquivos presentes em `supabase/migrations`. Se o replay falhar, pare e corrija a migration antes de continuar. Não tente contornar o erro com `migration repair`.

## 3. Vincular explicitamente ao staging e capturar o ledger

Use o CLI instalado/validado pelo projeto e vincule o diretório ao ref de staging conhecido:

```bash
supabase login
supabase link --project-ref "$STAGING_PROJECT_REF"
supabase migration list --linked
```

A autenticação deve usar o token armazenado de forma segura. Confirme visualmente o ref antes de qualquer comando de escrita. Guarde a saída de `migration list` junto com o registro da mudança.

Leia também as três versões originais no histórico remoto, sem editar o banco:

```sql
BEGIN READ ONLY;
SELECT version
FROM supabase_migrations.schema_migrations
WHERE version IN ('20270106000000', '20270107000000', '20270109000000',
                  '20270106000001', '20270107000001', '20270109000001')
ORDER BY version;
ROLLBACK;
```

O resultado mostra somente presença/ausência de versões; ele **não** prova qual dos dois SQLs com timestamp antigo foi executado.

## 4. Comparar o schema físico com os efeitos de cada arquivo

Execute estas verificações como leitura, em uma sessão read-only (ou no SQL Editor configurado para consulta). Registre os resultados e compare com os arquivos da migration. Não corrija drift manualmente pelo Dashboard.

### 4.1 Campanhas e hardening (`20270106…`)

- `hotpages`: `starts_at`, `ends_at`, `auto_archive_at`; índice `idx_hotpages_campaign_schedule`.
- `marketplace_sections`: `starts_at`, `ends_at`, `auto_archive_at`; índice `idx_marketplace_sections_campaign_schedule`.
- `ai_skills`: comentário/default de `icon`, constraint `ai_skills_icon_no_sparkles` e ausência de ícones proibidos nos dados.
- `hotpages` e `squad_templates`: valores de ícone corrigidos quando necessário.
- `storage.buckets`: os buckets `classifieds`, `classified-media`, `legal-documents`, `receipts`, `identity-vault`, `payment-proofs` e `rma-proofs` devem ter `public = false` conforme a migration.

### 4.2 Localidade CMS e artefatos (`20270107…`)

- `hotpages.city_filter`, `idx_hotpages_city_filter`, `banners.auto_archive_at` e `idx_banners_scheduling`.
- Tabelas `document_artifacts` e `document_artifact_links`; constraints, índices e RLS.
- Policies `store staff manages document artifacts` e `store staff manages document artifact links`.
- Função `touch_document_artifact()` e trigger `document_artifacts_touch`.
- Grants: `anon`/`PUBLIC` não devem ter acesso implícito às tabelas; `service_role` tem os grants previstos no SQL.

### 4.3 Booking/chat e hardening de turismo (`20270109…`)

- `booking_appointments`: policies `Customers read own appointments`, `Customers create own appointments` e `Booking staff manage store appointments`.
- `support_tickets`: policies próprias de customer/workspace com escopo por loja e perfil.
- Tabelas de turismo/viagem listadas em `wave6_tourism_rls_final_hardening.sql`: RLS habilitada, acesso `anon` revogado e policies finais tenant-scoped presentes.
- Verifique também grants anônimos efetivos; a existência de uma policy, por si só, não substitui a verificação dos privilégios.

Consultas úteis para inventário (ajuste filtros conforme a versão do Postgres/Supabase do ambiente):

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name IN ('hotpages', 'marketplace_sections', 'banners',
                      'document_artifacts', 'document_artifact_links')
       OR (table_name = 'ai_skills' AND column_name = 'icon'))
ORDER BY table_name, ordinal_position;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_hotpages_campaign_schedule',
                    'idx_marketplace_sections_campaign_schedule',
                    'idx_hotpages_city_filter', 'idx_banners_scheduling',
                    'idx_document_artifacts_store_status',
                    'idx_document_artifacts_sha256', 'idx_document_links_entity');

SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('booking_appointments', 'support_tickets',
                     'document_artifacts', 'document_artifact_links',
                     'travel_suppliers', 'travel_visas', 'travel_vouchers',
                     'travel_departures_kanban', 'traveler_forms', 'agencies',
                     'clients', 'proposals', 'proposal_items', 'trips',
                     'trip_passengers', 'vouchers', 'group_tours',
                     'group_tour_enrollments', 'group_tour_costs',
                     'bus_layouts', 'bus_seat_assignments')
ORDER BY tablename, policyname;
```

### 4.4 Migrations Studio desta PR

- `studio_template_library`: tabela, unique `(store_id, template_id, template_version)`, RLS habilitada e grants apenas para o backend.
- `unsplash_studio_selections`: constraints de URL/licença/slot, unique por loja/foto/slot, RLS e grants server-only.
- `media_assets`: novas colunas de slot/attestation, constraint `media_assets_studio_attestation_complete_check`, índice parcial e policies tenant-scoped; `anon` e `authenticated` não podem inserir ledger diretamente.

## 5. Decidir a reconciliação de cada par

Crie uma matriz por par com: versão antiga no ledger, versão nova no ledger, efeitos físicos encontrados, SQL que pode executar, decisão, aprovador e evidência.

- **Nenhuma versão antiga está registrada:** revise todas as migrations pendentes e o dry-run. Se a cadeia local não tiver lacunas, a equipe de staging pode aprovar a aplicação completa.
- **A versão antiga está registrada e os efeitos dos dois arquivos estão presentes:** o nome antigo é tratado como aplicado, mas o novo ID pode aparecer pendente. Avalie a reexecução do arquivo renumerado em um clone descartável primeiro. Como o conteúdo de origem não pode ser inferido do ledger, não marque o novo ID como aplicado apenas pela presença da versão antiga.
- **A versão antiga está registrada, mas só parte dos efeitos está presente ou a origem continua ambígua:** não execute `db push` às cegas. Crie uma migration **forward-only** com apenas os efeitos comprovadamente ausentes; teste replay/idempotência no banco descartável e repita a avaliação em staging.
- **O SQL do arquivo renumerado já foi comprovadamente aplicado e só falta a linha do novo ID:** um operador autorizado pode considerar `supabase migration repair <versão> --status applied --linked`, uma versão por vez, depois de aprovação e registro da evidência. `repair` altera apenas o ledger; **não** executa SQL. Não use `--status reverted` como rollback de schema.

Qualquer dúvida sobre o conteúdo executado para uma versão antiga deve ser tratada como drift pendente, não como autorização para marcar IDs ou executar SQL.

## 6. Simular, aplicar em staging e validar

Após resolver cada par e obter aprovação do responsável pelo ambiente:

```bash
supabase migration list --linked
supabase db push --dry-run --linked
```

Revise a lista completa de versões que seriam aplicadas. Pare se aparecer uma migration inesperada, se faltar uma migration necessária, se o project ref não for staging ou se os efeitos físicos ainda não estiverem reconciliados.

Somente após aprovação explícita do operador de staging e backup restaurável:

```bash
supabase db push --linked
supabase migration list --linked
```

Depois da aplicação, confirme:

1. Todas as versões locais esperadas aparecem alinhadas com o remoto.
2. As consultas de inventário da seção 4 confirmam as colunas, constraints, grants, índices e policies.
3. Testes de RLS cobrem `anon`, usuário de outra loja, membro autorizado e backend `service_role`.
4. Fluxos críticos funcionam: leitura/escrita de artefatos por tenant, agendamento/tickets e validação do ledger de assets Studio.
5. CI, `npm run check:schema`, typecheck e testes relevantes passam contra o commit exato avaliado.
6. A evidência pós-migração, backup, logs, aprovadores e plano de rollback/mitigação ficam registrados.

Não promova a produção automaticamente após o staging. A produção requer uma verificação separada do seu próprio histórico/schema, backup e janela operacional.

## Referências oficiais

- [Supabase — Database migrations: histórico, `migration list`, `db push` e `repair`](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
- [Supabase — Managing environments](https://supabase.com/docs/guides/deployment/managing-environments)
