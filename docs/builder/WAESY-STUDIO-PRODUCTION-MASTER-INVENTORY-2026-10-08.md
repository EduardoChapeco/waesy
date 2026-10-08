# Waesy Studio — inventário mestre e plano de produção

**Snapshot documental:** 2026-10-08, 09:21 BRT
**Repositório:** `EduardoChapeco/waesy`
**Branch/PR:** `feat/waesy-niche-template-factory` / [PR #18](https://github.com/EduardoChapeco/waesy/pull/18)
**Head observado:** `9a8def2b8a199c5d51c77a671e2756c29b56daab`
**Natureza desta mudança:** documentação e organização de evidências; nenhuma implementação de runtime, operação Supabase, merge ou deploy.

> **Resumo de estado:** o código da continuação está publicado na PR #18 e os dois checks observados no head — `5 Quality Gates` e `Cloudflare Pages` — estão verdes. A PR continua aberta, mergeável e sem decisão de revisão registrada. O check Cloudflare da PR não comprova deploy de produção. O catálogo do Studio tem 12 entradas, mas o último relatório disponível indica **0 PASS, 3 WARN e 9 FAIL**; portanto, nenhum template deve ser anunciado como aprovado para produção.

## 1. Escopo e regra de leitura

Este documento reúne as decisões do usuário, o trabalho registrado na branch, os relatórios e planos já existentes, a fotografia mais recente da PR e o plano de entrega. Ele **não** substitui nem reescreve os documentos históricos: aponta para eles e distingue evidência atual de snapshots antigos.

A auditoria existente usada aqui é `docs/builder/template-audit-report.json`, gerada em **2026-10-08 12:06:15 UTC (09:06:15 BRT)**, antes da instrução de parar novas auditorias recebida às 09:18 BRT. Ela foi preservada como snapshot. Depois dessa instrução, a auditoria paralela foi interrompida; não há uma nova execução, implementação, teste ou operação externa incluída neste documento.

Limites mantidos:

- **GitHub/repositório:** escopo de trabalho autorizado para a PR e para a documentação.
- **Supabase:** nenhum acesso ou alteração nesta consolidação; nenhuma migration foi aplicada por esta etapa. O estado remoto não deve ser inferido do SQL versionado.
- **Produção:** nenhum merge ou deploy foi feito. Este documento descreve os passos e os bloqueios, não declara release.
- **Conteúdo do negócio:** não inventar telefone, URL de checkout/agendamento/pedido, preço, depoimento, credencial, disponibilidade ou alegação comercial para fazer um template passar.

## 2. Histórico das decisões e do objetivo

O objetivo original foi evoluir o Waesy para um studio profissional e modular, inspirado em padrões públicos de plataformas como Manus, Enter/Converge, Wix Studio, Webflow e Framer — sem copiar runtimes proprietários. Os pedidos registrados incluem:

1. Uma biblioteca editável e reutilizável de templates, seções, módulos, assets e presets, organizada por nicho, tipo de site, objetivo e metodologia de copy/vendas.
2. Recursos com e sem IA: agentes/factory de templates, geração de imagem/mídia, blocos visuais, presets de motion e animações de scroll, layouts/grids, apresentações e ferramentas futuras.
3. Unificação gradual entre Experience Renderer e Omni AST, sem regressão nos consumidores legados.
4. Auditoria automática de licenças/provenance, acessibilidade e performance, com bloqueio de publicação quando houver erro determinístico.
5. Integração Unsplash oficial e upload local com proveniência verificável; nenhum asset ou dado de cliente deve ser inventado.
6. Os três pilotos selecionados continuam sendo Gastronomia, Bem-estar/Agendamento e Criadores/Curso.
7. A estratégia de publicação escolhida foi PR para revisão, em vez de merge cego. O usuário autorizou a normalização dos IDs de migration **no branch**, aceitando que o histórico de produção não havia sido verificado.
8. Foi definido explicitamente que esta frente deveria trabalhar via GitHub e arquivos de migration/runbooks, sem operar o Supabase.
9. Na solicitação mais recente, o escopo foi reduzido a inventariar e documentar tudo, parar novas auditorias e não continuar implementando recursos nesta etapa.

A pesquisa técnica já registrada em `research-2026-10-06-manus-enter-builders.md` conclui que a referência transferível é a separação entre orquestrador, Agent, Skills, Knowledge, Tools/conectores, AST/registry, CMS/bindings, assets e runtime de motion. Os detalhes internos do Manus/Enter não são públicos e não devem ser presumidos.

## 3. Estado do GitHub e da PR

| Item | Estado observado em 2026-10-08 |
|---|---|
| PR #18 | Aberta contra `main`; `mergeable=true`, `mergeStateStatus=CLEAN` |
| Head | `9a8def2b8a199c5d51c77a671e2756c29b56daab` |
| `5 Quality Gates` | `SUCCESS` no head observado |
| `Cloudflare Pages` | `SUCCESS` no check da PR; isso não substitui evidência do deployment de produção |
| Revisão humana | `reviewDecision` vazio na consulta; ainda não há decisão registrada |
| Merge/produção | Não realizados |
| Working tree no snapshot | Relatório JSON atualizado para preservar o snapshot; `pnpm-lock.yaml` estava não rastreado e foi mantido fora do escopo desta documentação |

O status anterior no roadmap de 2026-10-07 que dizia que a atualização ainda dependia de reautenticação foi superado: a credencial foi renovada, o commit `9a8def2b` foi enviado e a descrição da PR foi atualizada em 2026-10-08. O roadmap original continua sendo um snapshot datado; esta tabela é a referência atual para o estado da PR.

## 4. O que foi implementado e publicado no branch da PR #18

As entregas abaixo pertencem à branch/PR aberta; **não significam que estejam em produção**.

| Área | Entrega registrada | Limite que permanece |
|---|---|---|
| Experience Renderer / Omni | Adapter para renderizar documentos Omni AST mantendo a compatibilidade gradual com a entrada legada `nodes`; identidade, ordem e referências de assets são preservadas no caminho descrito pela documentação do Studio. | Paridade completa de editor, preview, SSR e página pública ainda aparece como trabalho futuro no roadmap. |
| Templates/IA | Manifesto TypeScript/Zod versionado; factory autenticada; geração de drafts; biblioteca privada por loja; os drafts AI ficam `review_required` e não podem autoaprovar/publicar a própria saída. | Receipt/provenance imutável da geração e aprovação humana persistida server-side continuam como incrementos planejados. |
| Quality gates | Auditoria estática de placeholders, links/anchors, alt, proveniência/licença, tamanho/contagem e alguns contrastes; o gate server-side bloqueia findings de erro. | Não mede navegador, Lighthouse, Core Web Vitals nem prova licença jurídica; não substitui revisão humana. |
| Unsplash | API oficial server-side, busca por escolha humana, tracking de download, hotlink, crédito e ledger por loja/foto/slot; a publicação compara a referência ao registro verificado. | `UNSPLASH_ACCESS_KEY`, habilitação/revisão comercial e validação operacional no ambiente de deploy ainda dependem da equipe. Unsplash Source está descontinuado e não deve ser reintroduzido. |
| Upload Studio | Attestation explícita de direitos, validação de assinatura/MIME suportado, asset durável, registro no ledger `media_assets` e retorno de `assetRef`; o Omni Editor associa a proveniência aos slots e alt text. | A migration ainda precisa ser reconciliada/aplicada pelo fluxo autorizado do ambiente; nenhum teste de Storage/RLS remoto é declarado aqui. |
| Links/segurança de renderização | Helper de href seguro compartilhado; o auditor rejeita esquemas perigosos e mídia inline `data:`/`blob:`; renderizadores conhecidos protegem documentos legados. | A allowlist/política de hosts externos e a validação union completa de config por tipo continuam no roadmap. |
| Veracidade e conversão | FAQ/depoimentos vazios não ganham fatos fictícios; formulário WhatsApp não afirma que o lead foi entregue; pricing não inventa desconto e não usa rota financeira genérica quando falta CTA. | Formulário atual é WhatsApp-oriented; entrega por e-mail/CRM, consentimento, retenção e comprovação de recebimento ainda precisam de decisão e integração real. |
| Testes/compilação | `*.test.tsx` foi incluído na descoberta Vitest; correções de tipagem em rotas TanStack/WhatsApp foram registradas. Os resultados locais e remotos estão na descrição da PR e no roadmap. | Os checks da PR não provam integração real com banco/Storage, navegador, provider, licenças nem production smoke. |
| Migrations/documentação | Três colisões históricas foram renumeradas no branch; três migrations incrementais Studio e runbooks foram adicionados. | Não se consultou o ledger remoto; IDs renumerados não provam compatibilidade com staging/produção. |

### Migrations no branch

**IDs históricos normalizados, SQL preservado:**

| ID duplicado na base histórica | Arquivo mantido com o ID original | Arquivo secundário renumerado no branch |
|---|---|---|
| `20270106000000` | `20270106000000_campaign_scheduling_and_auto_archive.sql` | `20270106000001_live_p0_security_hardening.sql` |
| `20270107000000` | `20270107000000_cms_locality_and_banner_auto_archive.sql` | `20270107000001_document_artifacts_ocr_provenance.sql` |
| `20270109000000` | `20270109000000_e2e_booking_chat_rls_hardening.sql` | `20270109000001_wave6_tourism_rls_final_hardening.sql` |

**Migrations Studio adicionadas:**

- `20270114000000_studio_template_library.sql` — biblioteca privada/versionada por loja.
- `20270114010000_unsplash_studio_selection_ledger.sql` — ledger server-side das escolhas oficiais Unsplash.
- `20270114020000_studio_upload_asset_rights_ledger.sql` — attestation/provenance de uploads Studio e políticas tenant-scoped.

A distinção entre versão local e versão aplicada só pode ser fechada pelo ledger e pelo schema reais do ambiente. Os passos estão em [MIGRATION-ID-COLLISION-RUNBOOK.md](MIGRATION-ID-COLLISION-RUNBOOK.md) e [MIGRATION-STAGING-RECONCILIATION.md](MIGRATION-STAGING-RECONCILIATION.md). Os runbooks são instruções; nenhum comando Supabase foi executado por esta documentação.

## 5. Templates: snapshot existente e plano de resolução

O relatório mais recente disponível contém **12 entradas: 0 PASS, 3 WARN, 9 FAIL; revisão humana exigida para as 12; `publishableFailed=0`**. Esse último campo significa somente que nenhum template já marcado `ready` foi encontrado falhando; não significa que exista template aprovado. Os nove `FAIL` são drafts ainda bloqueados, não nove falhas em templates já promovidos.

### Nove templates em `FAIL`

| ID e nome | Arquivo de definição | Achado exato do relatório | Plano para resolver sem inventar dados |
|---|---|---|---|
| `template_tourism` — Turismo & Viagens | `src/lib/builder/omni-templates.ts` | 3 `CONTENT_PRICING_CTA_MISSING`: `blocks[2].config.tiers[0..2].ctaHref`; há também aviso de revisão de preço/condições. | Associar cada plano a uma rota real de cotação/reserva/contato definida pelo negócio. Se a rota não existir, manter o plano não publicável e documentar a dependência de produto. |
| `template_creators` — Criadores & Cursos | `src/lib/builder/omni-templates.ts` | 2 CTAs faltando em `blocks[2].config.tiers[0..1].ctaHref`; aviso de revisão de preço/condições. | Fornecer checkout/inscrição real para cada plano e os preços/termos confirmados; sem isso, manter CTAs bloqueados. |
| `template_real_estate` — Imóveis & Temporada | `src/lib/builder/omni-templates.ts` | `CONTENT_FORM_DESTINATION_MISSING` em `blocks[3].config.whatsappNumber`. | O negócio fornece e confirma o número/destino de atendimento; alternativamente, implementar e configurar um endpoint real de lead antes de promover. |
| `template_services_wellness` — Estética & Saúde | `src/lib/builder/omni-templates.ts` | WhatsApp faltando em `blocks[4].config.whatsappNumber`; aviso em `blocks[2].config.testimonials` para verificar autenticidade/consentimento. | Configurar destino real; fornecer evidência/consentimento dos depoimentos ou removê-los. Alegações clínicas/credenciais exigem revisão do responsável. |
| `template_creator_biolink` — Link na Bio - Creator Pro | `src/lib/builder/omni-templates.ts` | WhatsApp faltando em `blocks[3].config.whatsappNumber`. | Configurar canal real do creator ou remover/desativar o formulário; não preencher com telefone de exemplo. |
| `template_dark_kitchen` — Catálogo - Dark Kitchen Express | `src/lib/builder/omni-templates.ts` | 3 CTAs faltando em `blocks[2].config.tiers[0..2].ctaHref`; aviso de revisão de preço/condições. | Ligar cada plano ao menu/pedido real e confirmar preço, disponibilidade, entrega e condições. Não usar rota genérica do workspace. |
| `pilot_gastronomy_orders` — Gastronomia: Cardápio, pedido e reserva | `src/lib/builder/studio-pilot-templates.ts` | 16 erros: 15 placeholders em `blocks[0].config.title/subtitle`, `blocks[1].config.cells[0..2].title/description`, `blocks[2].config.items[0..1].title/caption`, `blocks[3].config.items[0..2].answer`; mais `blocks[4].config.whatsappNumber` ausente. | Coletar nome, proposta, menu/preços/disponibilidade reais, regras de pedido/reserva, respostas aprovadas e destino de contato; selecionar assets com licença/provenance e alt corretos. |
| `pilot_wellness_booking` — Bem-estar: Serviços e agendamento | `src/lib/builder/studio-pilot-templates.ts` | 16 erros: 15 placeholders em `blocks[0].config.title/subtitle`, `blocks[1].config.cells[0..2].title/description`, `blocks[2].config.items[0..1].title/caption`, `blocks[3].config.items[0..2].answer`; mais `blocks[4].config.whatsappNumber` ausente. | Coletar serviços, preços/condições, disponibilidade, processo de agendamento e informações factuais autorizadas; revisar alegações de saúde, dados pessoais, consentimento e destino real. |
| `pilot_creator_course_enrollment` — Criadores: Curso, mentoria e inscrição | `src/lib/builder/studio-pilot-templates.ts` | 12 erros: 11 placeholders em `blocks[0].config.title/subtitle`, `blocks[1].config.cells[0..2].title/description`, `blocks[2].config.items[0..2].answer`; mais `blocks[3].config.whatsappNumber` ausente. | Coletar conteúdo/currículo, instrutor e credenciais confirmadas, preço, termos/reembolso, destino de inscrição e suporte; depoimentos só com consentimento. |

Os achados completos, scores, métricas e caminhos estão em [template-audit-report.json](template-audit-report.json). Para os três WARN: `template_legal_jus`, `template_gastronomy` e `template_clinic_premium` têm cada um aviso de revisão de depoimentos/prova social. Eles não são aprovados automaticamente por não terem erro.

### Sequência recomendada de candidatos — não é autorização de publicação

1. **Gastronomia** (`pilot_gastronomy_orders`), por ser o piloto de cardápio/pedido/reserva já previsto: somente após fatos do estabelecimento, menu, CTA e assets reais.
2. **Bem-estar/Agendamento** (`pilot_wellness_booking`): somente após fatos/serviços, destino e revisão das alegações/consentimento.
3. **Criadores/Curso** (`pilot_creator_course_enrollment`): somente após currículo, oferta, preço/termos, inscrição e suporte reais.
4. Em paralelo, resolver os seis templates legados bloqueados pela matriz acima; nenhum deles pode ser promovido sem a rota/número/preço real correspondente.

A ordem é uma sequência de trabalho para organizar a coleta e revisão; o status atual é **nenhum aprovado**. Depois dos pilotos, expandir o catálogo por `nicho × objetivo × canal × dependências`, adicionando versões só quando houver uso distinto e cobertura comprovada, não gerando milhares de variantes repetitivas.

## 6. Inventário de capacidades e evolução solicitada

O Waesy mantém dois contextos históricos: o builder/registry de Experience e o Studio Omni AST. Os documentos antigos descrevem 27 blocos no registry legado e vários componentes interativos; o prompt atual da Factory limita a geração Omni a um conjunto registrado de 10 tipos. Isso não autoriza concluir que todo bloco legado já pode ser criado/editado/publicado pelo Studio. A próxima inventariação deve mapear registry, inspector, schema, renderers e testes numa única matriz, antes de duplicar ou anunciar recursos.

| Área pedida | Estado registrado | Próximo incremento planejado |
|---|---|---|
| Seções e blocos | Há catálogos de Experience e Omni; presets e templates são editáveis e possuem contratos diferentes. | Consolidar catálogo/nichos e versões; documentar cada bloco com schema, inspector, renderer, dependências e estados vazios. |
| Grids/layouts | Existem mosaicos/Bento e grades em documentos de catálogo; a cobertura responsiva do Omni precisa de contrato por breakpoint. | Controles Desktop/Tablet/Mobile com overrides persistidos e renderer equivalente; validar em 390/768/1440 px. |
| Botões/CTA | Hrefs seguros, âncoras e CTA de pricing são validados; destino inexistente não ganha fallback genérico. | Inspector de CTA com destino local/externo governado, estado acessível e teste de navegação; decidir allowlist de HTTPS externo. |
| Galerias/assets | `gallery_grid`/`media_gallery_mosaic`, Unsplash por escolha humana, créditos e ledger de upload existem na documentação/PR. | Unificar seleção/crop/alt/slot/provenance no Omni, revisar lightbox/teclado e validar URL durável; criar integração real antes de promover assets. |
| Players | O catálogo legado documenta `video_section` (YouTube/Vimeo/MP4) com restrições básicas. Não há evidência neste snapshot de um player áudio/editorial completo no Omni. | Definir suporte por provider, controles/captions/poster, autoplay seguro, host policy, consentimento e budgets; não afirmar player pronto até paridade e teste. |
| Formulários/leads | `ContactFormDirect` é um caminho honesto de WhatsApp; não se declara entrega por e-mail/CRM. | Escolher integração de lead, consentimento/retention, validação server-side, idempotência, sucesso somente após confirmação e teste de erro/retry. |
| Motion/scroll | Sistema declarativo e `prefers-reduced-motion` estão na base; o roadmap registra dois dialetos/paridade incompleta entre editor, preview e público. | Escolher contrato único trigger/target/duração/easing/breakpoint/fallback reduzido; presets com `IntersectionObserver` compartilhado e conteúdo visível sem JS. |
| IA e presets | Factory gera drafts por nicho; a saída é validada, revisável e não publica sozinha. | Operações por patch/diff, receipt de geração e aprovação server-side; telemetria sem persistir brief bruto; catálogo curado/versionado. |
| Apresentações e mídia generativa | Faziam parte da visão original, mas esta PR e este inventário focam o Builder web. | Tratar como programa separado com contratos de artefatos, custo, direitos, edição e exportação; não presumir integração direta com ferramentas proprietárias. |

O roadmap técnico que já detalha esses critérios é [AI-BUILDER-ROADMAP-2026-10-07.md](AI-BUILDER-ROADMAP-2026-10-07.md), especialmente NOW-1..NOW-8, NEXT-1..NEXT-8 e LATER-1..LATER-5. Este documento organiza a execução; não declara esses itens resolvidos.

## 7. Próximas fases e inventários requeridos

| Fase | Trabalho futuro | Saída/versionamento requerido | Bloqueio para avançar |
|---|---|---|---|
| F0 — Preservar o handoff | Manter este índice, master inventory e snapshot de auditoria juntos na PR; continuar separando snapshots antigos do estado atual. | Link no README do Builder e na descrição da PR; status com data/SHA. | Revisão humana do documento. |
| F1 — Inventário único do Builder | Cruzar Experience registry, Omni registry, inspector, schemas, renderers, motion e testes. Marcar `exists / partial / missing / legacy / unsupported`. | Matriz `block × schema × editor × preview × public × tests × owner`. | Evitar duplicar blocos e não prometer paridade sem evidência. |
| F2 — Inputs dos nove templates | Para cada CTA/número/claim/asset, registrar fonte, proprietário, consentimento, data de confirmação e destino. | Brief de negócio por template; campos ausentes explicitamente marcados. | Não inventar dado para obter PASS. |
| F3 — Aprovação dos três pilots | Preencher copy factual, links, assets e alt; revisão comercial/editorial por nicho; aprovação persistida no servidor. | Manifesto versionado + reviewer + timestamp + diff + relatório. | Placeholders, links ou conteúdo sem consentimento mantêm o estado não publicável. |
| F4 — Integridade operacional do Studio | Completar receipt de geração/aprovação, membership/RLS, conflito de versão, limite distribuído e contrato de configuração por bloco. | Testes server-side e evidência de isolamento; mudanças de schema separadas e revisadas. | Nenhuma autoridade confiada ao browser. |
| F5 — Editor visual profissional | Fechar paridade responsiva, hierarquia/camadas acessíveis, grids, CTA, galerias, players e estados de formulário; motion configurável com reduced motion. | Componentes tipados, operações reversíveis, preview/canvas/público equivalentes. | Especificação de UX, licença, link policy e destino real. |
| F6 — Prova de qualidade real | Browser E2E, axe/teclado, screenshot diff, Lighthouse/CWV, upload → ledger → AST → publicação e dois tenants. | Artefatos no CI por SHA/template, com budgets versionados. | Fixtures/ambiente aprovado; auditoria estática isolada não basta. |
| F7 — Staging e migrations | Reconciliar as seis versões envolvidas (três pares antigos e três migrations Studio) com o ledger/schema do staging, backup e dry-run. | Evidências e decisão por migration no runbook. | Operador e autorização do ambiente; fora desta sessão. |
| F8 — Release | Revisão do PR, checks do SHA exato, aprovação, merge e deploy Cloudflare de produção, seguidos de smoke test. | URL/build ID, logs, smoke test e plano de rollback. | PR #18 ainda não revisada/mergeada; staging e chaves ainda não confirmados. |
| F9 — Escala de biblioteca | Adicionar nichos/objetivos com dados de adoção, custo, qualidade, dependências e conversão agregada. | Catálogo governado por owner, semver, indicadores e política de descontinuação. | Não criar lotes massivos sem avaliação e revisão de direitos. |

### Mapa com o masterplan do produto

O documento [WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md](../audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md) é o arquivo completo de **18 ondas e 81 microfases**, com o ledger de findings e o inventário de paths dos PRs #1–#6. Seu snapshot é de 2026-10-06 e contém estados de branches/PRs daquele momento; deve permanecer como histórico, não como leitura do estado atual da PR #18. O crosswalk é:

- W0 baseline/escopo; W1 governança de merge; W2 identidade/multi-tenant; W3 schema/migrations; W4 persistência/FSM.
- W5 Copilot/chat; W6 gateway de IA/chaves; W7 tabelas/catálogo; W8 builders/Studio; W9 imagens/mídia.
- W10 rotas/navegação; W11 WhatsApp; W12 turismo; W13 design system; W14 testes; W15 observabilidade.
- W16 jornadas integradas; W17 candidato de release/deploy.

A PR #18 trata partes de W3/W8/W9/W13/W14/W17, mas **não fecha o masterplan inteiro**. Ondas antigas marcadas como concluídas em relatórios são evidência do SHA/ambiente que cada relatório cita; não extrapolar para o head ou para produção.

## 8. Plano de promoção para produção

Este é um roteiro para a equipe executar depois de rever este documento. Nenhum passo de banco ou deploy foi executado nesta etapa.

1. **Revisar o candidato:** confirmar PR #18, branch, diff e head; solicitar review humana e verificar regras obrigatórias de `main`. O estado observado agora é `CLEAN`/mergeável e os dois checks estão verdes, mas `reviewDecision` está vazio.
2. **Fixar os gates do SHA exato:** manter `5 Quality Gates` e `Cloudflare Pages` verdes; verificar que relatório, build, testes e typecheck referem-se ao mesmo commit. O check Cloudflare da PR pode ser preview, não sinalizar production success.
3. **Resolver os templates para promoção:** coletar os dados reais da seção 5, executar o fluxo editorial autorizado e manter cada entrada como draft/review-required até ter aprovação persistida. Nenhum dos 12 está PASS neste snapshot.
4. **Reconciliar migrations em staging antes de aplicar:** usar `MIGRATION-STAGING-RECONCILIATION.md`, backup restaurável, confirmação do project ref, `migration list`, comparação do schema e dry-run. Para cada par antigo, descobrir os efeitos físicos; não inferir qual arquivo foi executado pelo timestamp. `migration repair` só pode alterar o histórico após comprovação do schema, nunca substitui SQL.
5. **Validar dependências externas:** configurar a chave Unsplash apenas como secret server-side, confirmar a elegibilidade comercial do aplicativo e testar busca, seleção/tracking, atribuição e ledger em ambiente autorizado. Provisionar os bindings/secrets Cloudflare a partir do dono do ambiente; nunca gravar valores no GitHub.
6. **Executar o ensaio do Studio em staging:** login de tenant autorizado; geração de draft; revisão; seleção/upload; ledger; AST; publish gate; renderer; expiração/URL; navegação mobile; reduced motion; falhas de provider. Validar papéis/isolamento em dois tenants.
7. **Promover o código:** somente depois de aprovação humana, migrações reconciliadas no staging e gates requeridos, mesclar a PR #18 segundo a política do repositório; aguardar o deployment de produção do Pages para `main` e conferir o status no mesmo SHA/build.
8. **Smoke test público:** verificar `waesy.com.br` e `usewaesy.pages.dev`, health/status, login administrativo, editor/preview/página pública, assets/créditos, formulários com destino real, console/worker e ausência de erros de runtime. Evidência de preview não substitui esta etapa.
9. **Rollback/mitigação:** para código, reverter pelo fluxo GitHub/Pages ao deployment estável anterior; para banco, não presumir rollback destrutivo. Usar migration forward-only de reparo quando o schema já avançou e registrar owner, backup, decisão e impacto.
10. **Fechar a trilha de evidências:** anexar SHA, PR/review, workflows, build/deployment ID, resultados smoke, matriz de templates, versões de migrations e registro de operação sem dados sensíveis.

Referências operacionais: [Cloudflare Pages release](../audits/CLOUDFLARE_PAGES_RELEASE.md), [reconciliação staging](MIGRATION-STAGING-RECONCILIATION.md), [colisões de migrations](MIGRATION-ID-COLLISION-RUNBOOK.md), [operações da Factory](STUDIO-AI-FACTORY-OPERATIONS.md) e [integração Unsplash](UNSPLASH-API-INTEGRATION.md).

## 9. Mapa de documentos e evidências preservados

`docs/builder/README.md` é o índice navegável. Os documentos abaixo são fontes complementares; muitos são snapshots de 2026-07 a 2026-10 e não devem ser silenciosamente tratados como estado atual.

### Produto, arquitetura, prompts e Builder

- [SPEC-WAESY-STUDIO-LIBRARY.md](SPEC-WAESY-STUDIO-LIBRARY.md) — missão, arquitetura, requisitos e aceite do Studio.
- [AI-BUILDER-ROADMAP-2026-10-07.md](AI-BUILDER-ROADMAP-2026-10-07.md) — fases NOW/NEXT/LATER e critérios técnicos detalhados.
- [STUDIO-AI-FACTORY-OPERATIONS.md](STUDIO-AI-FACTORY-OPERATIONS.md) — fluxo de geração, revisão, armazenamento e operação.
- [Prompt operacional da Template Factory](../prompts/WAESY-STUDIO-TEMPLATE-FACTORY.md) — entradas, política anti-invenção e formato JSON.
- [research-2026-10-06-manus-enter-builders.md](research-2026-10-06-manus-enter-builders.md) — comparação pública e princípios adotados.
- [adr/0001-template-preset-architecture.md](adr/0001-template-preset-architecture.md) e [adr/0002-canonical-sections-schema-versioning.md](adr/0002-canonical-sections-schema-versioning.md) — decisões aprovadas de arquitetura.
- [current-state-inventory.md](current-state-inventory.md), [feature-gap-matrix.md](feature-gap-matrix.md), [component-registry.md](component-registry.md), [data-contract-map.md](data-contract-map.md) e [delta-01-audit-inventory.md](delta-01-audit-inventory.md) — inventários históricos do Experience/Builder (jul/2026); a matriz de julho precisa ser lida junto das correções posteriores.

### Qualidade, assets e migrations

- [STUDIO-TEMPLATE-AUDIT.md](STUDIO-TEMPLATE-AUDIT.md) e [template-audit-report.json](template-audit-report.json) — política/limitações e último snapshot de findings disponível.
- [UNSPLASH-API-INTEGRATION.md](UNSPLASH-API-INTEGRATION.md) — requisitos oficiais, implementação e checklist.
- [MIGRATION-ID-COLLISION-RUNBOOK.md](MIGRATION-ID-COLLISION-RUNBOOK.md) e [MIGRATION-STAGING-RECONCILIATION.md](MIGRATION-STAGING-RECONCILIATION.md) — estado e procedimento, sem execução em ambiente remoto nesta etapa.

### Auditorias mais amplas do repositório

- [WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md](../audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md) — 18 ondas, 81 microfases, 109 findings e inventory de paths dos PRs #1–#6; fotografia histórica.
- [20261007-holistic-execution-ledger.md](../audits/20261007-holistic-execution-ledger.md), [20261007-antifake-inventory.md](../audits/20261007-antifake-inventory.md), [20261007-rpc-identity-wave.md](../audits/20261007-rpc-identity-wave.md), [20261007-security-storage-payment-audit.md](../audits/20261007-security-storage-payment-audit.md), [20261007-storage-payments-ui-wave.md](../audits/20261007-storage-payments-ui-wave.md) e [20261007-w14-evidence-matrix.md](../audits/20261007-w14-evidence-matrix.md) — evidências/limites de ondas anteriores.
- [W3_SCHEMA_DRIFT.md](../audits/W3_SCHEMA_DRIFT.md), [CLOUDFLARE_PAGES_RELEASE.md](../audits/CLOUDFLARE_PAGES_RELEASE.md), [PRODUCTION_READINESS_2026-10-06.md](../audits/PRODUCTION_READINESS_2026-10-06.md), [20261006-completeness-status.md](../audits/20261006-completeness-status.md), [20261006-design-system-audit.md](../audits/20261006-design-system-audit.md) e [20261006-wave6-no-cost-validation.md](../audits/20261006-wave6-no-cost-validation.md) — prontidão, design, Cloudflare e dependências históricas.
- `BFF_CONTRACT_CLOSURE_WAVE2_2026-10-06.md` e `BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md` — contratos de BFF/tabelas preservados no repositório.

## 10. Critério para declarar a iniciativa concluída

Não declarar “completo” ou “em produção” até que, no mesmo candidato de release:

- a PR esteja revisada e mesclada sob os gates/proteções do repositório;
- migrations estejam reconciliadas e validadas em staging e depois no fluxo autorizado de produção;
- os templates promovidos não tenham placeholders ou findings bloqueantes e tenham revisão humana documentada;
- o fluxo editor → preview → publish → renderer tenha prova de integração, isolamento de tenants, upload/ledger e rollback;
- acessibilidade e performance tenham evidência de navegador, não apenas score estático;
- secrets/integrações tenham sido configurados pelo owner e testados em ambiente adequado;
- deployment público e smoke tests estejam observados e associados ao SHA/build exatos.

Até então, o estado correto é: **base de produto implementada na branch da PR #18; checks remotos verdes; PR aberta; templates em revisão; staging/produção e migrations remotas não comprovados por esta etapa**.
