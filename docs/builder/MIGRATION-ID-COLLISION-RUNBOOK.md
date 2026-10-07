# Runbook: colisões de IDs de migrations

**Estado da análise:** leitura estática do repositório; não foi consultado nem alterado nenhum banco remoto. Antes de mudar migrations históricas, é obrigatório reconciliar cada ambiente (local, preview/staging e produção) com seu ledger e schema real.

## O que foi encontrado na `main`

O verificador `scripts/check-schema-consolidation.mjs` agrupa arquivos pelo prefixo numérico antes de `_` e encerra com erro se encontrar duas migrations locais com a mesma versão. Ele não consulta o banco, não determina qual arquivo já foi aplicado e não avalia equivalência SQL.

| Versão duplicada | Migration A | Migration B | Efeitos que precisam ser reconciliados |
|---|---|---|---|
| `20270106000000` | `campaign_scheduling_and_auto_archive.sql` | `live_p0_security_hardening.sql` | A adiciona timestamps de campanhas a `hotpages` e `marketplace_sections` e índices condicionais. B altera comentário e constraint de `ai_skills`, corrige ícones em dados existentes e torna privados determinados buckets do Storage. |
| `20270107000000` | `cms_locality_and_banner_auto_archive.sql` | `document_artifacts_ocr_provenance.sql` | A adiciona `city_filter`, `auto_archive_at` e índices em CMS. B cria tabelas de artefatos e vínculos, índices, RLS/policies, grants, função/trigger e comentários, dentro de transação. |
| `20270109000000` | `e2e_booking_chat_rls_hardening.sql` | `wave6_tourism_rls_final_hardening.sql` | A substitui policies de agendamentos e tickets. B ativa RLS, revoga acesso anônimo e recria policies tenant-scoped em tabelas de turismo/viagem. |

A aplicação física de cada arquivo não pode ser inferida apenas pelo repositório. A primeira migration de cada par contém operações principalmente idempotentes (`IF NOT EXISTS`/`DROP POLICY IF EXISTS`), mas isso **não** prova que a segunda tenha sido aplicada nem torna seguro reutilizar a versão duplicada. A migration de hardening de 06 também modifica dados e a privacidade de buckets; o par de 09 altera políticas de acesso. Esses efeitos exigem verificação explícita.

## Como o Supabase rastreia e o que `migration repair` faz

Segundo a documentação oficial, o Supabase mantém o histórico em `supabase_migrations.schema_migrations`; o `db push` compara os timestamps das migrations locais com o histórico remoto, aplica migrations pendentes em ordem e registra uma versão única após a aplicação. A documentação também diz que `supabase migration list` compara timestamps local/remoto.

`supabase migration repair --status applied|reverted <versão>` **muda somente o registro de histórico**: não executa nem desfaz o SQL. Portanto, repair nunca deve ser usado para “fazer a migration acontecer”; só se usa depois de comprovar que o schema real já corresponde ao estado que se quer registrar.

Fontes oficiais consultadas:

- [Supabase — Database Migrations / diagnóstico e sincronização](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI — migration repair, migration list e db push](https://supabase.com/docs/reference/cli/supabase-migration-repair)

## Procedimento seguro por ambiente

1. **Pausar o deploy automático de migrations** para `main` até a reconciliação. Não executar `db push`, reset ou repair contra produção nesta investigação.
2. **Criar backup/snapshot** e registrar data, projeto e ambiente. Conferir as credenciais e o target do CLI antes de qualquer comando remoto.
3. Rodar `supabase migration list` para cada ambiente, sem aplicar mudanças, e guardar a saída. Como os arquivos de cada par compartilham timestamp, o ledger sozinho pode não distinguir qual conteúdo histórico foi executado; complementar a análise com o histórico de deploy, scripts de CI e inspeção do schema.
4. Para cada par, verificar a presença dos efeitos específicos — colunas/índices, tabelas, policies, funções/triggers, constraints, grants e estado dos buckets — e comparar com o SQL de **ambos** os arquivos. Confirmar também que não há drift e que as policies finais são as pretendidas.
5. **Se nenhum dos dois conteúdos foi aplicado em qualquer ambiente:** retimestampar localmente um dos arquivos para uma versão única, posterior e ordenada, revisar dependências, executar reset apenas em banco local descartável e validar em staging.
6. **Se um conteúdo já foi aplicado:** não renomear nem editar o arquivo já liberado sem plano de reconciliação. Preservar evidências; atribuir uma versão única ao conteúdo ainda pendente e criar uma migration forward-only que aplique apenas efeitos comprovadamente ausentes. Não repetir `UPDATE`, alteração de acesso ou política sem avaliar o estado atual.
7. **Se o schema contém ambos os efeitos, mas o histórico não os representa corretamente:** primeiro confirmar o estado físico e os registros remotos. Só então usar `migration repair` para alinhar o ledger; documentar exatamente qual versão foi marcada e por quê. Repair não corrige schema nem reconstrói a proveniência do arquivo aplicado.
8. Validar o plano em **staging** com backup, `supabase migration list`, `supabase db push --dry-run` e testes de schema/RLS; conferir novamente o ledger e os efeitos depois. Produção só deve ser migrada pelo fluxo operacional autorizado, com um único operador e janela/rollback definidos.
9. Após resolução, cada prefixo deve ser único; executar `npm run check:schema` e incluir evidência dos estados local/staging/produção na mudança de main. Não enfraquecer o checker para ocultar colisões.

## Estado das migrations do Waesy Studio

As migrations desta PR usam versões únicas e ordenadas: `20270114000000_studio_template_library.sql`, `20270114010000_unsplash_studio_selection_ledger.sql` e `20270114020000_studio_upload_asset_rights_ledger.sql`. A migration nova é incremental sobre `media_assets`; não renumera nem altera as três colisões históricas. A checagem estática continua apontando somente essas três colisões históricas, que não foram renumeradas nesta branch porque não há evidência de quais versões/conteúdos já foram aplicados nos ambientes remotos.
