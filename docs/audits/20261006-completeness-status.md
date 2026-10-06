# Diagnóstico de completude — Waesy

**Data:** 2026-10-06  
**Branch auditada:** `feat/waesy-canonical-travel-evolution`  
**Commit atual:** `2f021e7e5a33c822c22888020f323f9b84197418`

## Conclusão executiva

Não é correto afirmar que o Waesy está 100% completo, integrado e comprovado em produção. As Ondas 0 a 5 entregaram uma base relevante e os módulos novos passam nos testes funcionais disponíveis, mas ainda existem bloqueios objetivos para declarar completude máxima: o typecheck global falha com 136 erros, os tipos gerados do Supabase continuam como `Database = any`, as migrations não foram aplicadas/verificadas em um banco real nesta sessão, há policies históricas permissivas e a suíte chamada E2E é um contract harness em memória, não um fluxo real com Postgres, Storage, IA, navegador e operadoras.

## O que está comprovado

| Área                            | Evidência                                                                                                       | Estado                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Branch e commits das ondas      | Commits das Ondas 0–5 presentes                                                                                 | Comprovado                                             |
| Unicidade de migrations         | `npm run check:schema`: 445 migrations, versão única                                                            | Comprovado estaticamente                               |
| Inventário lexical              | 568 tabelas declaradas e 177 funções encontradas pelo script                                                    | Comprovado estaticamente; não prova aplicação no banco |
| Pipeline puro de normalização   | Testes de operador e normalizador aprovados                                                                     | Comprovado                                             |
| Resolver documental v2          | 7/7 testes                                                                                                      | Comprovado em memória                                  |
| E2E contratual                  | 12/12 testes                                                                                                    | Comprovado em memória                                  |
| Regressão turística selecionada | 43/43 testes                                                                                                    | Comprovado no código testado                           |
| Build                           | Build de produção passou e client-leak verificou 484 chunks                                                     | Comprovado                                             |
| Rotas novas                     | Route tree contém `/workspace/turismo/documentos-ocr`, `/workspace/turismo/comissoes` e demais rotas de turismo | Comprovado estaticamente                               |
| Vinculação BFF/UI               | Cotação usa pipeline canônico; tela OCR usa ingestão, análise, resolução e aplicação                            | Comprovado por imports e referências                   |

## O que não está comprovado

### Banco, schemas, colunas e migrations

Os arquivos SQL existem e o gate detecta nomes e colisões, mas não houve execução integral das 445 migrations em um Postgres/Supabase efêmero ou projeto conectado. Portanto não há prova de que:

- todas as migrations aplicam em sequência em um banco vazio;
- todas as tabelas, colunas, constraints, triggers e funções SQL realmente compilam juntas;
- migrations históricas idempotentes funcionam depois de múltiplas reaplicações;
- os nomes usados pelos BFFs correspondem às colunas existentes no banco instalado;
- os tipos gerados refletem o schema real.

O próprio gate registra que `src/integrations/supabase/types.ts` ainda declara `Database = any`. Isso elimina boa parte da verificação estática de tabelas, schemas e colunas.

### E2E real

A suíte `travel-pipeline-e2e.test.ts` é um contract harness determinístico. Ela usa schemas e normalizadores reais, mas o repositório, estados, comissão e hash do ledger são observados em memória. Ela não comprova, sozinha:

- OCR real de PDF/print com o provedor de IA configurado;
- upload/download real no Supabase Storage;
- execução das RPCs em Postgres;
- RLS real para `anon`, `authenticated` e `service_role`;
- renderização e interação real das rotas no navegador;
- integração com uma operadora externa;
- geração efetiva de proposta, contrato e voucher via HTML/CMS/PDF;
- transação real de comissão e ledger.

### Typecheck e rotas

`npx tsc --noEmit` termina com código 2 e 136 erros. A maior parte está em rotas de nichos e endpoints de API existentes, incluindo parâmetros implicitamente `any` e a opção `server` não reconhecida em várias rotas API. Mesmo que esses erros sejam baseline anterior às ondas de turismo, o repositório como um todo não satisfaz o Definition of Done de typecheck zero.

O route tree está gerado e inclui as rotas de turismo, mas não foi realizada uma navegação autenticada real por navegador para provar loaders, redirecionamentos, roles, empty/loading/error states e permissões por perfil.

## Achados de segurança e RLS

As migrations novas melhoraram o isolamento de partes críticas, mas a auditoria ainda encontra policies permissivas em migrations históricas, incluindo:

| Objeto                                  | Problema observado                                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `travel_suppliers`                      | `FOR ALL TO authenticated USING (true) WITH CHECK (true)`                                                                                                      |
| `travel_visas`                          | `FOR ALL TO authenticated USING (true) WITH CHECK (true)`                                                                                                      |
| `travel_vouchers`                       | `FOR ALL TO authenticated USING (true) WITH CHECK (true)`                                                                                                      |
| `travel_departures_kanban`              | `FOR ALL TO authenticated USING (true) WITH CHECK (true)`                                                                                                      |
| `traveler_forms`                        | acesso amplo, inclusive policy pública histórica                                                                                                               |
| `travel_proposals` e `travel_contracts` | policies históricas de leitura pública por `USING (true)`; algumas foram removidas em onda posterior, mas a eficácia precisa ser verificada no banco instalado |
| `trips` e `vouchers`                    | policies históricas permissivas em migration de núcleo turístico                                                                                               |

Também existem grants de execução a `anon`/`authenticated` em funções de aceite/conversão/OCR que precisam ser validados contra o contrato público desejado. A existência de uma policy posterior não é prova suficiente sem executar o conjunto completo de migrations e inspecionar `pg_policies`, `information_schema.role_routine_grants` e testes com tokens de cada role.

## Integração UI/BFF ainda incompleta

A tela OCR está conectada a análise e resolução unitária. O BFF também expõe `resolveTravelDocumentConflictsBatch` e `getTravelDocumentReconciliation`, mas esses comandos avançados não estão conectados à tela encontrada. Falta uma bancada visual completa para:

- carregar uma reconciliação inteira;
- mostrar valores reconciliados por campo;
- resolver em lote;
- mostrar provenance e versão do resolver;
- revisar a projeção antes de aplicá-la na viagem;
- visualizar a cadeia de eventos e o ledger relacionado.

## Backlog obrigatório para declarar completude

### P0 — bloquear declaração de produção

1. Subir Postgres/Supabase efêmero e aplicar as 445 migrations do zero.
2. Reaplicar migrations em um banco já populado para testar idempotência e drift.
3. Gerar `src/integrations/supabase/types.ts` a partir do schema aplicado e remover `Database = any`.
4. Corrigir os 136 erros do typecheck e exigir `npm run typecheck` com exit code 0.
5. Substituir policies `USING (true)`/`WITH CHECK (true)` das tabelas turísticas por guards tenant-scoped.
6. Testar RLS com matriz `anon`, `authenticated`, staff de outra loja, staff da loja, owner e service role.
7. Validar grants reais das RPCs públicas, financeiras e de mutação.

### P1 — comprovar o fluxo operacional

1. Criar testes de integração contra Postgres real para ingestão, reconciliação, aceite, conversão, voucher, comissão e ledger.
2. Criar testes de Storage para PDF/print, hash, MIME, limite, caminho tenant-scoped e URL assinada.
3. Criar testes de OCR com fixtures reais anonimizadas: cotação, confirmação, contrato, recibo, voucher e print.
4. Testar aplicação das RPCs e constraints contra o banco instalado.
5. Executar smoke tests de navegador nas rotas de cotação, OCR, propostas, viagens, embarques, vouchers e comissões.
6. Conectar a reconciliação em lote e a projeção canônica à UI.
7. Verificar geração real de HTML, PDF, contrato e voucher pelos builders/CMS.
8. Validar eventos/timeline e auditoria após cada transição.

### P2 — completude de produto

1. Confirmar todos os botões com auditoria de ações e efeitos persistidos.
2. Mapear todos os módulos, forms, kanbans e CMS contra seus BFFs e tabelas.
3. Eliminar duplicidade de entidades (`trips`/`tourism_trips`, `vouchers`/`tourism_vouchers` e famílias equivalentes) ou documentar um adaptador canônico.
4. Fechar tipos e contratos BFF sem `any` nos módulos de turismo.
5. Adicionar observabilidade, métricas, tracing e alertas de falha do pipeline.

## Veredito

**A evolução das Ondas 0–5 está implementada como base de código e passa nos testes determinísticos selecionados. Não está comprovado que o sistema inteiro funcione end-to-end em produção, nem que todas as tabelas, colunas, migrations, RLS, roles, rotas, OCR, builders e integrações estejam completos.** O próximo passo correto não é criar mais funcionalidades cegamente: é executar a Onda de validação de ambiente real, começando por banco efêmero, tipos Supabase, RLS matrix e testes de integração.
