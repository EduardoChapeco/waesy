# AI Builder Waesy — Roadmap de Produto e Arquitetura

**Data:** 2026-10-07
**Papel:** revisão principal de produto/arquitetura
**Escopo:** síntese dos achados estruturados das seis áreas auditadas, sem reabrir pesquisas por área.

> **Decisão executiva:** o AI Builder tem bons fundamentos de contratos, isolamento por loja, provenance oficial de uploads/Unsplash e persistência transacional, mas ainda não está pronto para promoção ampla. O follow-up desta revisão fechou o bypass mais urgente de href executável/data-blob no quality gate e em anchors dos blocos Omni conhecidos, removeu fallbacks factuais de FAQ/prova social, corrigiu a confirmação falsa do formulário e removeu desconto anual inventado. Continuam abertos aprovação humana server-side, validação union de config no publish, allowlist de hosts externos, proveniência de geração, membership/RLS efetiva, revisão de depoimentos e evidência browser/E2E/performance. Portanto, a sequência continua sendo segurança e integridade primeiro; operação observável e escalável depois; consolidação de catálogos, renderers, motion, responsividade e experiência por último.

## 1. Resumo executivo

A rota efetiva de geração é, em linhas gerais:

`StudioTemplateFactory` → geração server-side → manifesto Studio/Zod → save/list da biblioteca → materialização no Omni AST → auditoria → snapshot/publish → renderer público.

A base é sólida em pontos importantes:

- a geração exige contexto administrativo e loja ativa;
- a biblioteca grava/lista pelo `identity.store_id`, não por `store_id` fornecido pelo browser;
- drafts AI são marcados como `review_required`, `humanReviewed=false` e `canPublishAsGenerated=false`;
- manifestos têm versão, política de copy, slots de assets, âncoras e contratos por tipo de bloco;
- o caminho oficial Unsplash usa chave apenas no servidor, host/redirect controlados, tracking e ledger por loja;
- o upload Studio calcula attestation, namespace, SHA-256 e dimensões, e a publicação verifica ledger antes da RPC;
- a persistência de snapshots usa `SECURITY DEFINER` com `search_path` fixo, lock, versionamento e idempotência para drafts iguais;
- a publicação já bloqueia findings estáticos de erro e há uma boa base de auditoria para alt, anchors, placeholders, provenance e budgets;
- a auditoria foi honesta sobre suas limitações: não alegou medir CWV, renderização real ou validade jurídica onde não há evidência.

A prontidão, contudo, é limitada por quatro grupos de risco:

1. **Segurança e integridade do publish:** o `OmniPageDocument` continua aceitando config livre e o publish ainda não reaplica uma union completa por tipo. O follow-up agora reprova hrefs executáveis e imagens `data:`/`blob:` no auditor e sanitiza anchors de Hero, Carousel e Pricing no runtime; allowlist externa, providers `stock/generated/unknown`, validação de todo metadata de asset e aprovação humana continuam abertos.
2. **Consistência e tenant:** há fallbacks que aplicam Gastronomia/Jurídico a qualquer tenant, erros de loader que viram documento vazio editável, blocos desconhecidos que podem publicar e desaparecer no público, divergência entre membership e `profiles.store_id`, e fontes duplicadas para draft/publicado/legacy.
3. **Veracidade e operação:** FAQ e prova social já não fabricam conteúdo quando vazios; formulário sem WhatsApp válido não publica, e a resposta agora diz apenas que o usuário deve revisar/enviar no WhatsApp; pricing não anuncia mais `-20%` sem base. Conteúdo real de depoimento ainda requer aprovação/evidência server-side; os pilots continuam bloqueados por placeholders; quotas seguem process-local e geração sem idempotency receipt.
4. **Qualidade demonstrável:** o typecheck foi corrigido e os testes `.test.tsx` agora entram na suíte; porém CI ainda não foi atualizado para executar auditoria/lint como gates. Não há E2E/browser, axe, Lighthouse, screenshot diff nem integração real com Supabase/Storage/RLS. Motion segue com dois dialetos e o editor principal ainda não consome o mesmo pipeline do preview/público.

### Estado observado na auditoria inicial

- **Catálogo auditado:** 12 templates; 2 `PASS`, 7 `WARN`, 3 `FAIL`; `reviewRequired=12`; `publishableFailed=0`. Os três pilots falham por placeholders intencionais, e nenhum dos 12 está comprovadamente pronto para promoção.
- **Testes direcionados:** várias execuções focadas passaram — 17 testes de contratos/auditoria da Factory; 23 testes da área Omni; 42 testes de assets/Unsplash/storage/Omni; 35 testes de auditoria/contratos; 33 testes de auditoria/contratos/Omni, conforme as coberturas declaradas. Esses números não equivalem a uma suíte de runtime integrada.
- **Typecheck:** uma tentativa global terminou por OOM; outra com heap de 6 GB encontrou 11 erros em quatro rotas WhatsApp. Não há evidência de typecheck verde.
- **Lint:** ESLint global terminou com 0 errors e 7.839 warnings; os arquivos da feature emitiram 83 warnings na execução relatada. O design-lint versionado registra débito significativo, incluindo 42 violações P0 e 58 P1 em `components/builder`.
- **Evidência ausente:** não houve acesso a projeto, banco ou Storage Supabase, credenciais de providers, RLS efetivo, concorrência real, browser E2E ou métricas reais de performance.

### Atualização de implementação — 2026-10-07

- `safe-href.ts` passou a ser o contrato compartilhado do manifesto e do auditor. Hrefs executáveis, URLs protocol-relative, `http:`, credenciais e caracteres de controle são rejeitados; o audit gate também bloqueia imagens `data:`/`blob:`. Hero e Carousel renderizam `#` se receberem href inseguro legado. Pricing não aceita destino inseguro ou ausente: o botão fica desabilitado e o audit gate reprova o tier.
- FAQ e depoimentos vazios renderizam estado honesto; o quality gate reprova esses blocos vazios. `verified` passou a default `false`; depoimentos preenchidos ainda geram finding de revisão, pois não existe ledger server-side de consentimento/autenticidade.
- `ContactFormDirect` não afirma receber leads: exige WhatsApp válido, trata popup bloqueado, abre a conversa e orienta a pessoa a revisar e enviar; labels estão conectadas aos controles. O gate bloqueia o formulário sem destino WhatsApp.
- `PricingTablesClean` não exibe mais desconto `-20% OFF`; o toggle anual só aparece quando todos os planos têm `priceAnnualCents`. O catálogo existente usa esse campo como preço mensal equivalente no ciclo anual, então a UI preserva `/mês` e explicita `(ciclo anual)`. Sem CTA seguro o botão fica desabilitado, sem redirecionar para `/workspace/financeiro/faturas`; o quality gate exige um destino por plano.
- A configuração Vitest agora descobre `*.test.tsx`. Execução completa: **241 arquivos, 1.598 testes aprovados**. Typecheck completo: **verde**, após tipar as quatro rotas WhatsApp que tinham 11 erros; build local Cloudflare: **verde**, com a checagem client/server reportando 491 chunks sem runtime de servidor no client. `check:schema`: 475 migrations e versões únicas. Design-lint passou a catraca e reportou redução de 537 violações do baseline. O build ainda emite warnings de imports bare removidos por `sideEffects: false`; o impacto precisa de revisão independente.
- Auditoria atual do catálogo: **12 templates, 0 PASS, 3 WARN, 9 FAIL; 12 requerem revisão humana; 0 falhas em templates marcados `ready`**. O aumento de FAIL em relação à baseline é deliberado: o auditor agora exige conteúdo real em FAQ/prova social, destino de contato e destino CTA por plano de pricing.
- Essas validações são locais. Nenhum banco/Storage Supabase foi consultado ou alterado; a atualização do GitHub ainda depende de credencial válida.

## 2. Ordem de decisão e critérios de pronto

A ordem de prioridade abaixo não é apenas uma lista de bugs. Ela protege três propriedades que não podem ser negociadas:

1. **Não publicar algo que o backend não consegue provar que é seguro, autorizado e revisado.**
2. **Não apagar, substituir ou reinterpretar conteúdo de um tenant sem erro explícito e reversível.**
3. **Não declarar qualidade, entrega de lead, provenance ou cobertura de nicho sem evidência operacional correspondente.**

### Definições usadas

- **NOW:** trabalho para as primeiras 0–30 dias. Bloqueia segurança, integridade, tenant, veracidade ou release gate. Não deve ser compensado por revisão manual informal.
- **NEXT:** 31–60 dias. Torna o sistema operável em escala, observável, testável e coerente após os bloqueios imediatos.
- **LATER:** 61–90 dias ou fase posterior. Consolida arquitetura, experiência, catálogo, performance e governança sem reabrir os riscos críticos.
- **Aceite objetivo:** condição verificável em teste, migration, CI, fixture ou ambiente de preview; “parece correto” não é critério suficiente.

## 3. Bloqueios que exigem tratamento separado

### 3.1 Bloqueios que exigem dados reais do tenant

Estes itens não podem ser resolvidos apenas inventando defaults de teste:

- **Copy, claims e prova social:** nome, empresa, cargo, rating, `verified`, percentual de economia, prazo de entrega, credenciais, promoções, conteúdo legal e FAQ precisam vir de fatos fornecidos e revisados pelo tenant. Sem esses dados, o resultado deve permanecer placeholder explícito/review-required ou estado vazio honesto.
- **Destino real de leads:** é preciso decidir se `ContactFormDirect` será WhatsApp, e-mail/CRM ou ambos; fornecer número, `emailReceiver`, consentimento, política de retenção e comportamento para popup bloqueado/erro. Até lá, não se deve afirmar “Mensagem Recebida!”.
- **Assets e subject policy:** imagem de produto, pessoa, imóvel, equipe ou localização exige seleção real, slot correto, alt, origem/licença aplicável e, quando a política disser `must-match-real-subject`, validação humana do assunto.
- **Pricing:** moeda, período, preço anual/mensal, percentual e validade da promoção precisam ser dados do plano. O renderer não pode derivar ou fixar “-20%” sem fonte.
- **Cobertura de nicho:** o tenant precisa ter `NicheId` canônico e objetivo suportado. Se não houver template aprovado para o nicho/objetivo/canal, a UX deve expor “sem cobertura” e não escolher Gastronomia, Jurídico ou o primeiro item da matriz.
- **Responsive e motion:** breakpoints, propriedades que podem variar, acessibilidade e intenção de parallax/stagger devem ser decisões de produto/design, não inferidas silenciosamente pelo modelo.

### 3.2 Bloqueios que exigem credenciais, ambiente ou dados de infraestrutura

- **Supabase/Postgres/Storage de teste:** para confirmar migrations, policies, grants, FK, RLS, `SECURITY DEFINER`, signed URLs, concorrência, locks e dois tenants. A leitura estática demonstrou uma migration final que pode reabrir INSERT de Storage sem isolamento; isso precisa ser reproduzido em fixture local/CI antes da promoção.
- **Provider AI real:** para obter tokens, custo, latência, fallback, comportamento de JSON malformado, limites, idioma e diferenças entre modelos. A Factory hoje não persiste telemetria específica nem receipt server-side.
- **Unsplash real:** para confirmar quota global, tracking, respostas 429, seleção e ledger em múltiplas instâncias. A chave deve permanecer server-side; nenhum teste deve registrar segredo.
- **Browser/preview determinístico:** Chromium/Playwright ou equivalente para axe, teclado, foco, `prefers-reduced-motion`, hydration, screenshot diff, LCP/INP/CLS/TTFB, expiração de signed URL e paridade editor/preview/público.
- **CI com capacidade adequada:** para separar o OOM da tipagem dos 11 erros reais, executar `audit:studio-templates`, lint, `.test.tsx`, build e jobs de promotion com artefatos versionados.

### 3.3 Bloqueios que exigem revisão humana explícita

A automação deve sinalizar, nunca substituir, revisão de:

- fatos do negócio, claims comerciais/jurídicos/clínicos, preços, descontos, prazos e prova social;
- consentimento, direito de imagem, licença, atribuição e autenticidade de depoimentos;
- correspondência de imagens com o sujeito real quando a política do slot exigir;
- idioma, tom, adequação cultural e segurança editorial por nicho;
- aprovação do manifesto AI antes da publicação, com reviewer, timestamp, versão e diff;
- decisão sobre links externos, providers `stock/generated`, dados sensíveis enviados ao provider e retenção de briefs;
- aprovação de cobertura do catálogo e promoção de um template de `review_required` para `ready`.

A revisão humana não deve ser usada para “aprovar” `javascript:`, perda de dados, tenant incorreto, bloco desconhecido, policy de Storage aberta ou qualquer erro técnico determinístico. Esses casos devem falhar no servidor.

## 4. Roadmap NOW — 0 a 30 dias

### NOW-1 — Fechar o boundary de publicação contra XSS e contratos inválidos

**Prioridade:** P0/P1.
**Escopo:** substituir `config: z.record(z.any())` no boundary de publicação por union/registry com schema de config por tipo; aplicar `StudioTemplateHrefSchema` (ou um contrato compartilhado equivalente) a todo `href` renderizável; bloquear `javascript:`, `data:`, `blob:`, URLs relativas não autorizadas e hosts externos não permitidos. Rejeitar `unknown_type`, config inválida e IDs/tenant cruzados antes de chamar a RPC. Renderers devem usar placeholder explícito para bloco ausente, nunca o primeiro bloco do registry.

**Dependências:** decisão explícita sobre links externos; fonte única `SITE_BUILDER_BLOCKS` + schemas de config; plano para snapshots legados.
**Aceite:** fixtures de `javascript:`, `data:`, external HTTPS não permitido, `unknown_type`, config inválida e `id/store_id` cruzados retornam 4xx/finding bloqueante e não chamam `persist_omni_document_snapshot`; fixture aprovada usa exatamente o schema e renderiza o mesmo placeholder/erro em editor e público.

### NOW-2 — Tornar aprovação humana e provenance AI server-side

**Prioridade:** P1.
**Escopo:** criar receipt/`generation_run` tenant-scoped com `runId` opaco, actor, store, hash do brief normalizado, `promptVersion`, hash do manifesto e resultado. O save deve aceitar apenas receipt + manifesto cujo hash corresponda; alternativa equivalente é persistir o manifesto gerado server-side e aceitar do browser apenas um ID. A publicação deve consultar uma aprovação persistida com `template_id/version`, `humanReviewed=true`, reviewer, `reviewedAt`, diff/versão e origem.

Isso corrige a proveniência hoje autoafirmada pelo cliente e impede que um draft AI seja transformado em publish apenas removendo placeholders no browser.

**Dependências:** tabela/KV e retenção; política para brief sensível; modelo de papéis de reviewer.
**Aceite:** manifesto forjado, receipt ausente, alterado, de outro usuário/tenant ou de outra versão retorna 4xx; save/publish de AI sem aprovação não chama RPC; fluxo gerado→salvo→publicado conserva hashes, identidade, versão e reviewer.

### NOW-3 — Restaurar fail-closed no loader, save/publish e seleção de template

**Prioridade:** P1.
**Escopo:** loader que falha deve produzir estado de erro/readonly; não deve criar documento vazio. Documento legacy sem `settings.omni_page` deve exigir migração explícita, não aplicar automaticamente Gastronomia. Remover fallback `template_gastronomy`, `template_legal_jus` e `NICHE_TEMPLATE_MATRIX[0]`; resolver por `NicheId` canônico do documento/loja e retornar `unsupported` quando não houver cobertura. Handlers devem relançar erro para o editor e centralizar um único toast de sucesso somente após Promise resolvida.

**Dependências:** fonte confiável do nicho; decisão de migração legacy; contrato de estados TanStack.
**Aceite:** rejeição do loader/save/publish deixa a tela não editável, não mostra sucesso, não muda URL e não cria snapshot; nenhum tenant de automotivo, saúde, varejo, eventos ou serviço recebe Gastronomia/Jurídico por default; teste de dois tenants confirma que nicho e `source_template_id` permanecem compatíveis.

### NOW-4 — Corrigir autorização multi-tenant da RPC e preservar integridade de snapshot

**Prioridade:** P1.
**Escopo:** alinhar `requireAdmin/getServerIdentity` e RPC para autorizar por membership ativa em `workspace_members`, mesma matriz de roles, em vez de depender isoladamente de `profiles.store_id`. Validar `document.id`, `store_id`, actor e lock no mesmo fluxo. Adotar `expected_version/base_version` para impedir last-writer-wins silencioso, ou definir explicitamente a política antes de qualquer edição destrutiva.

**Dependências:** roles canônicos, política de auditoria, fixture SQL com dois tenants, UX de conflito.
**Aceite:** admin membro de loja secundária com `profiles.store_id` nulo ou divergente consegue salvar/publicar a loja correta; não-membro é rejeitado; dois clientes na mesma versão fazem o segundo receber conflito sem criar snapshot; nenhum fallback pode substituir documento existente.

### NOW-5 — Fechar assets, Storage e URLs duráveis no caminho publicável

**Prioridade:** P0/P1.
**Escopo:**

- provider deve ser discriminated union; até haver ledger/artifact server-side, remover `stock/generated/unknown` do conjunto publicável ou exigir `provenance_id` verificável;
- rejeitar imagens inline `data:`/`blob:`/relativas no audit/publish e exigir `assetRef`, alt e metadata autoritativa;
- tornar o ledger a fonte de `sha256`, bytes, MIME, width e height; ignorar `byte_size` fornecido pelo cliente;
- aplicar migration corretiva que remova policies legadas de INSERT de Storage e deixe uma policy canônica com bucket + owner/prefixo/membership, revisando UPDATE/DELETE;
- centralizar validação de magic bytes, MIME, tamanho, extensão e base64 em todos os handlers legados;
- `MediaUploader` deve persistir `publicUrl/path` para bucket público; signed URL deve ser apenas preview/download privado e reemitida por path;
- derivar `usage_slot` de `block.id + field/item`, sem reutilizar o primeiro slot decorativo.

**Dependências:** decisão de providers suportados, migration ordenada, fixture local de Storage/Postgres, tratamento de URLs já persistidas.
**Aceite:** dois tenants demonstram INSERT próprio permitido e prefixo alheio negado; alteração de bytes/hash/dimensões/MIME metadata bloqueia publicação mesmo com ID/path legítimos; `data:`/`blob:` e provider forjado falham; URL de `cms-media` permanece utilizável após 3600 s sem token persistido; dois blocos geram slots distintos.

### NOW-6 — Remover claims e sinais falsos de entrega

**Prioridade:** P1.
**Escopo:** eliminar fallback nomeado de `TestimonialsSocialProof` e FAQ factual; sem dados reais, usar estado vazio/slot pendente e finding bloqueante para publicação. Remover `verified=true`, nomes, empresas, ratings, CRM/SP, promessas de entrega, validade jurídica, descontos e outros claims não fornecidos. Implementar endpoint de lead ou declarar o bloco “somente WhatsApp”; usar `emailReceiver` server-side, tratar erro/popup e só mostrar sucesso após confirmação.

**Dependências:** destino oficial de lead, consentimento/retenção, revisão de copy por vertical.
**Aceite:** fixture sem facts não contém pessoas/empresas/claims e não publica; endpoint 4xx/5xx nunca mostra sucesso; sucesso só aparece após confirmação; formulário sem destino bloqueia publicação ou exibe estado honesto.

### NOW-7 — Restaurar gates de release e transformar auditoria em controle operacional

**Prioridade:** P1.
**Escopo:** corrigir os 11 erros de TypeScript nas quatro rotas WhatsApp e repetir com heap controlado; incluir `src/**/*.{test,spec}.{ts,tsx}` no Vitest; fazer CI executar audit de templates, lint e testes de runtime; definir se drafts `review_required` falham job de promotion, sem necessariamente falhar todo CI de desenvolvimento. Corrigir ou arquivar os três pilots FAIL por placeholders; não anunciar `FULLY_VALIDATED` sem evidência no relatório.

**Dependências:** compatibilidade TanStack/Node/lockfile, decisão de política CI, revisão de catálogo.
**Aceite:** typecheck termina sem erros; teste TSX do Experience Renderer é descoberto; PR com href inseguro, placeholder de template pronto, teste TSX quebrado ou warning acima do budget falha; relatório CI contém lista única de `ready/review_required` e coincide com o catálogo executado.

### NOW-8 — Unificar o contrato mínimo de motion e a paridade de editor

**Prioridade:** P1.
**Escopo:** escolher `durationMs` ou `speed` como fonte canônica; nó sem configuração deve aparecer como “Nenhuma/Estático”, não Fade Up. Fazer `OmniEditor`, `OmniPageRenderer`, `ExperienceRenderer` e preview consumirem o mesmo `MotionRendererAdapter`. Até implementar parallax/stagger reais, renomear os controles para a semântica implementada ou removê-los. Aplicar explicitamente `motion-safe` e `motion-reduce:transition-none/transform-none` conforme o design system.

**Dependências:** decisão entre Omni AST e ExperienceNode, breakpoints/Tailwind disponíveis, definição de feedback essencial.
**Aceite:** selecionar cada velocidade altera o runtime real; configuração inválida falha; o mesmo fixture produz classes/estado equivalentes no canvas, preview e página pública; em `prefers-reduced-motion: reduce`, conteúdo fica imediatamente visível e transforms espaciais não persistem.

## 5. Roadmap NEXT — 31 a 60 dias

### NEXT-1 — Quota distribuída, idempotência e telemetria de geração

Trocar `Map` process-local da Factory e do Unsplash por KV/RPC atômico por store/actor/feature/provider. Implementar `idempotencyKey`, reservation de quota, tokens/custo, `Retry-After` e resultado repetível em retry. Persistir sem brief bruto: store, user, feature, taskType, promptVersion, provider/model, tier/key class, start/end, duração, tokens/custo, outcome, input/output hash e `runId`; redigir PII.

**Dependências:** infraestrutura compartilhada, métricas de adapters, política de retenção.
**Aceite:** dois workers permitem no máximo a quota global; quinta chamada retorna 429; retry com mesma chave não cobra segunda geração; sucesso, fallback e falha deixam exatamente um evento correlacionável, sem facts/PII em claro.

### NEXT-2 — Enforcear invariantes do manifesto e unificar nichos

Transformar em schema/auditor as regras que hoje estão apenas no prompt: 5–10 blocos, `sectionKey` presente e única, CTA final para âncora definida, política explícita de HTTPS externo e compatibilidade de `promptVersion`. Criar `NicheIdSchema` compartilhado, aliases explícitos (`creator/creators`, e decisões para `legal`, `clinica`, `wellness`), separando `custom_niche` de nicho governado. Alinhar limite UI/server e informar erro antes do request.

**Dependências:** decisão sobre links e aliases; migração de drafts existentes; política SemVer.
**Aceite:** fixtures de 1 bloco, section duplicada/ausente, CTA ausente/órfão, HTTPS externo, slug desconhecido e 81–96 caracteres falham deterministicamente; todos os nichos canônicos têm resultado explícito e nenhum template fica sem classificação/roteamento.

### NEXT-3 — Endurecer AST, estilos e responsiveOverrides

Adicionar schema por breakpoint para desktop/tablet/mobile; expor os três viewports e fazer runtime resolver overrides reais. Usar `structuredClone`/clone tipado em add/update para eliminar aliasing profundo. Mapear ou remover campos persistíveis sem consumidor (`accentColor`, `maxWidth`, `border`, `shadow`, `full radius`, `animationDelay`).

**Dependências:** design system, decisão de propriedades responsivas, compatibilidade com snapshots legados.
**Aceite:** round-trip muda mobile sem alterar desktop; mutation de `slides/cells/tiers/testimonials` não altera defaults/outro bloco; cada campo do schema tem consumidor de renderização ou é rejeitado; viewport 390/768/1440 tem cobertura visual.

### NEXT-4 — Teste de integração da cadeia upload → publish → renderer

Criar fixture local de Supabase/Postgres/Storage e fakes de identidade para executar handlers reais, policies, locks, signed URL, ledger e dois tenants. Adicionar browser harness para save/list/generate/publish, erro de rede, reload, créditos e expiração. Substituir assertions de `fs.readFileSync` como prova principal por contratos de runtime e mutation tests.

**Dependências:** Supabase local/CI, Playwright ou DOM harness, dados seed não sensíveis.
**Aceite:** pipeline falha se só houver inspeção textual; jornada completa prova isolamento, publicação autorizada, rejeição de asset forjado, aprovação humana, idempotência e crédito acessível.

### NEXT-5 — Resolver acessibilidade e experiência de edição estrutural

Trocar divs clicáveis por `button`/`link` ou aplicar role, tabIndex, Enter/Space, foco e `aria-pressed`; associar labels via `htmlFor`; criar seleção de camadas acessível. Corrigir galeria/lightbox, FAQ, formulário e carousel com dialog/foco/Escape, alt real, `aria-expanded`, pausa por foco/teclado e reduced motion. Adicionar `aria-live`, `aria-busy`, `aria-describedby` e foco gerenciado na Factory.

**Dependências:** primitivos do design system, decisão de UX do canvas, browser/axe.
**Aceite:** operação de adicionar/selecionar/mover/remover funciona só com teclado; axe não encontra violações críticas; loading/result/error é anunciado; galeria usa `imageAlt`; carousel pausa em foco e reduced motion; labels têm nome acessível.

### NEXT-6 — Paridade de renderização e política de fonte única

Escolher o pipeline canônico: editor preview, `OmniPageRenderer`, `ExperienceRenderer`, SSR público e armazenamento publicado devem consumir o mesmo snapshot/materializador. Definir se `settings.omni_page`, `experience_versions.document_snapshot` ou outra representação é a fonte publicada; migrar/remover bifurcações; fazer `publish` atualizar/revogar draft conforme política, com rollback por `version_id`.

**Dependências:** migração legacy, cache/CDN, política de rollback.
**Aceite:** o mesmo snapshot gera HTML/semântica equivalente em editor, SSR e público; reload após publish devolve a versão definida; rollback altera apenas a versão ativa e não depende de JSON duplicado.

### NEXT-7 — Matriz de cobertura canônica e preview de todos os templates

Criar registro tipado `NicheId × goal × channel × template × version × status × dependencies × demo`, reconciliando NICHE_MANIFEST, matriz legacy, pilots, home templates, sections e presentation presets. Fazer `LiveTemplatePreviewModal` aceitar manifesto Studio e percorrer todos os IDs ativos em desktop/mobile, keyboard, forms, anchors, alt, unknown blocks, reduced motion e console errors.

**Dependências:** owner de catálogo, aliases, harness de browser, migração de consumidores legacy.
**Aceite:** paridade entre registry e catálogo falha CI quando há nicho sem decisão; nenhuma demo aplica template de outra vertical; cada entrada tem screenshot/axe/Lighthouse ou status explícito de revisão; não há preset/documentação órfã.

### NEXT-8 — Performance real e budgets acionáveis

Adicionar Lighthouse/Playwright em redes e viewports definidos, LCP/INP/CLS/TTFB, tamanho de CSS/JS/imagens, dimensões/fetch priority de hero e lazy/decoding. Para motion, usar observer compartilhado, não listener por bloco; limitar parallax e entrada de 24+ blocos.

**Dependências:** preview determinístico, budgets por canal/dispositivo, baseline de um piloto e um legado.
**Aceite:** CI grava métricas por template/nicho e bloqueia regressão acima do budget; perfil mobile não mostra long task atribuída ao reveal; redução de imagem/asset é contabilizada pelo renderer real, não pelo metadata do cliente.

## 6. Roadmap LATER — 61 a 90 dias e evolução

### LATER-1 — Histórico, undo/redo e proteção de operação destrutiva

Adicionar dirty state, beforeunload, confirmação contextual ao aplicar template, undo/redo baseado em snapshots/operações e preservação/clonagem explícita de `assetRefs`. Aplicar template não deve substituir silenciosamente blocos editados.

**Aceite:** cancelar preserva AST byte-a-byte; aplicar com dirty exige confirmação; undo restaura blocks, anchors, motion e assets; conflito de versão permanece explícito.

### LATER-2 — Providers e provenance completos

Se o produto mantiver stock/generated, criar ledger/artifact server-side, contrato de licença/credit por provider, job/artifact ID, créditos no renderer e policy por slot/subject. Caso contrário, manter esses providers fora do caminho publicável. Criar reconciliação de `media_assets`, objetos, ledgers e URLs externas legadas, com retention/limpeza de abandonados.

**Aceite:** nenhum provider publicável depende de metadata forjada; relatório lista cada objeto sem ledger, ledger sem objeto, crédito ausente e URL externa não catalogada; reconciliação é tenant-scoped.

### LATER-3 — Versionar contrato de motion, renderer e manifesto

Persistir `motionContractVersion`, renderer alvo, política reduced-motion, schema/prompt version, reviewer e diff no snapshot materializado. Incluir migration determinística entre `scrollAnimation` e `trigger`, e rollback reproduzível.

**Aceite:** mudança de runtime não reinterpreta silenciosamente página existente; rollback recompõe a mesma classe/semântica; log explica template, versão, provider e renderer sem expor conteúdo privado.

### LATER-4 — Governança de catálogo e analytics sem conteúdo privado

Consolidar catálogo único com owner, semver, nicho, objetivo, canal, blocos, preset, dependências, demo, origem e status. Instrumentar geração, aplicação, edição, abandono, aprovação, publicação e conversão por ID/version/nicho/objetivo usando eventos agregados e consentidos, sem brief/facts, nomes ou depoimentos.

**Aceite:** documentação é derivada do registro; não há `FULLY_VALIDATED` sem relatório; dashboard mostra adoção/conversão e taxa de falha por versão sem misturar tenants ou armazenar conteúdo privado.

### LATER-5 — Otimizar manutenção e escala de interação

Adicionar lint que bloqueie classes/durações/triggers fora do vocabulário canônico; remover duplicação CSS; consolidar observers; validar `content-visibility` sem quebrar foco; estabelecer budgets de design-lint e warnings para não deixar o ratchet ocultar débito.

**Aceite:** novos templates não introduzem dialeto local; warning budget é parte do CI; 24 blocos em mobile não multiplicam listeners nem degradam foco/scroll; o custo de CSS/JS permanece dentro da baseline.

## 7. Riscos transversais e mitigação

| Risco | Impacto | Mitigação e sinal de alerta |
|---|---|---|
| Brief contém telefone, e-mail ou facts sensíveis e é enviado ao provider/armazenado em `copyPolicy.requiredFacts` | Privacidade, contrato e custo | Redaction/consentimento, hash e retenção; evento sem brief bruto; revisão de DPA antes de escala |
| `service_role` ignora RLS | Um handler novo pode vazar ou gravar em outro tenant | Guards server-side centralizados, testes dois-tenants, auditoria de cada handler e nenhum `store_id` do cliente como autoridade |
| Policy de Storage final permissiva | Mídia de uma loja pode ser inserida no prefixo de outra | Migration corretiva, `pg_policies` assertion em CI, teste real de owner/membership |
| Provider/model fallback muda idioma, JSON, estilo e custo | Qualidade e conversão variáveis | Telemetria por run/provider, schema retry limitado, quotas e avaliação por nicho |
| Auditoria estática passa sem renderização | Acessibilidade, performance e HTML podem regredir | Browser/axe/Lighthouse/screenshot e fixture por template |
| Pilots falham intencionalmente por placeholders | Tokens, copy vazia ou claims podem chegar ao público | `review_required` como estado não publicável e CI de promotion bloqueante |
| Fallback de FAQ/prova social/pricing | Claims fictícios, risco legal e reputacional | Estado vazio/placeholder bloqueante, facts reais e reviewer por vertical |
| Catálogos paralelos | Correções e status não chegam ao catálogo executado | Registro único derivado, owner, semver e relatório automatizado |
| Dois dialetos de motion e múltiplos renderers | Editor aprovado difere do público | Adapter único, contract version, paridade de classes/HTML e Playwright |
| Last-writer-wins e apply template destrutivo | Perda silenciosa de trabalho e assets | `expected_version`, dirty guard, confirmação e histórico |
| Rate limit process-local | Custo/429/abuso em múltiplos workers | KV/RPC atômico, idempotência, `Retry-After` e dashboards |
| URLs signed persistidas | Conteúdo quebra após expiração | Persistir path/public URL conforme bucket e reemitir download privado |

## 8. O que preservar

1. **Admin + tenant scoping:** manter `requireAdmin`, identidade server-side e uso de `identity.store_id`; nunca aceitar tenant informado pelo browser como autoridade.
2. **Bloqueio editorial atual:** preservar `review_required`, `humanReviewed=false`, `requiresHumanReview=true` e `canPublishAsGenerated=false` até que aprovação server-side seja implementada.
3. **Manifesto estrito onde já existe:** manter versão, schema por tipo, política de copy, anchors, asset slots e materialização com clone; endurecer o Omni AST sem duplicar regras incompatíveis.
4. **Gate de publicação:** manter a ordem “validar → auditar → verificar ledgers → persistir”; nenhum finding bloqueante deve ser relaxado para fazer um piloto passar.
5. **Provenance oficial Unsplash/upload:** preservar chave no servidor, host validation, referral/download tracking, namespace, attestation, ledger e créditos; ampliar para providers adicionais apenas com contrato equivalente.
6. **Persistência transacional:** manter `SECURITY DEFINER` com `search_path` fixo, lock, versionamento, idempotência e arquivamento; adicionar membership e conflito, não substituir por last-writer-wins.
7. **Honestidade da auditoria:** preservar a distinção entre auditoria estática, evidência de execução e revisão jurídica/humana. Não transformar PASS estrutural em garantia de CWV, licença ou conversão.
8. **Fallback estático seguro de motion:** manter conteúdo renderizável sem JavaScript e `motion-safe`; reforçar `motion-reduce` em vez de remover movimento acessível sem decisão.

## 9. O que não fazer

- **Não** liberar publicação por confiar em `humanReviewed`/`origin` enviados pelo cliente.
- **Não** tratar a remoção de placeholders no browser como aprovação editorial.
- **Não** permitir `config` arbitrária ou `href` sem schema apenas porque o manifesto anterior era estrito.
- **Não** “corrigir” o P0 aceitando somente HTTPS: HTTPS pode ser externo, não autorizado, executável por redirecionamento ou incompatível com a política editorial.
- **Não** manter `stock/generated/unknown` publicáveis com metadata declarada pelo cliente sem ledger/artifact server-side.
- **Não** contar `data:`/`blob:` como decorativos para fazê-los desaparecer da auditoria; são estados que precisam ser rejeitados ou tratados explicitamente.
- **Não** restaurar uma policy de Storage “temporária” baseada apenas no bucket.
- **Não** persistir signed URL de curta duração como conteúdo durável.
- **Não** usar o primeiro template da matriz, Gastronomia ou Jurídico como fallback universal.
- **Não** transformar erro de loader/save/publish em documento vazio ou toast de sucesso.
- **Não** aceitar bloco desconhecido publicável, nem fazê-lo virar o primeiro bloco no editor.
- **Não** declarar um formulário entregue, um lead recebido, um depoimento verificado ou um desconto calculado sem confirmação e evidência.
- **Não** anunciar templates `ready/FULLY_VALIDATED` enquanto o relatório diz `review_required` ou `FAIL`.
- **Não** adicionar mais aliases locais de motion, nicho, catálogo ou renderer para mascarar a divergência.
- **Não** usar testes que reimplementam a lógica de produção como substituto de teste do módulo real.
- **Não** considerar ESLint com zero errors, auditoria estática ou 17/23/35/42 testes focados como prova de publicação segura, runtime acessível ou typecheck verde.
- **Não** resolver perda de dados com confirmação genérica sem `expected_version`, dirty state e rollback.
- **Não** medir performance usando apenas `byte_size` do AST quando o ledger tem os bytes reais.

## 10. Perguntas não resolvidas que exigem decisão

1. Links HTTPS externos serão permitidos no Studio? Se sim, qual allowlist, finalidade, tracking, rel/target e provenance; se não, quais rotas/âncoras locais são válidas?
2. Quais providers são realmente suportados em produção: apenas Unsplash/upload, ou também stock/generated? Qual ledger, licença, crédito e artifact para cada um?
3. Qual é a fonte canônica do nicho: `NICHE_MANIFEST_REGISTRY`, `NICHE_TAXONOMY_REGISTRY` ou um registro novo? Quais aliases serão preservados?
4. De onde vem o nicho confiável do documento/tenant, e como se comporta uma loja sem nicho ou com nicho customizado?
5. Qual é o modelo de aprovação: qualquer admin, reviewer designado, dois níveis para claims sensíveis, validade da aprovação e reaprovação após mudança de prompt/asset?
6. Brief/facts podem conter PII? Qual consentimento, redaction, retenção, DPA e política de não armazenamento no provider?
7. O formulário será realmente integrado a WhatsApp, e-mail, CRM ou múltiplos destinos? Quais são consentimento, deduplicação, spam protection e SLA de entrega?
8. Quais facts são obrigatórios por nicho/objetivo para pricing, FAQ, testimonials, claims regulatórios, credenciais e promoções?
9. `OmniPageDocument/settings.omni_page`, `experience_versions.document_snapshot` ou outro formato será a fonte publicada única?
10. Como será a migração de nodes legacy, drafts antigos, URLs signed, assets órfãos e templates com IDs fora da taxonomia?
11. Quais propriedades terão overrides por desktop/tablet/mobile e quais são os breakpoints oficiais?
12. O produto quer parallax/stagger reais ou somente efeitos leves de entrada/hover? Qual limite de performance e política para reduced motion?
13. O limite de geração/Unsplash será por tenant, usuário, workspace, provider ou combinação; qual budget de custo/token e janela de retenção?
14. Templates `review_required` com `FAIL` devem falhar CI de desenvolvimento, apenas promotion, ou ser removidos do catálogo executável até correção?
15. Quais budgets reais de LCP/INP/CLS/TTFB, CSS/JS, bytes remotos e número de blocos serão adotados por dispositivo/canal?
16. Qual é a política de retenção/limpeza para uploads cancelados, objetos sem ledger, ledgers sem objeto e URLs externas legadas?
17. Que eventos de adoção/conversão podem ser medidos com consentimento sem armazenar conteúdo privado ou facts do tenant?

## 11. Sequência de entrega incremental

### Fase 0 — Dias 0–10: contenção e decisão

- colocar publish AI e providers não verificáveis sob bloqueio explícito;
- corrigir validação de `href`, unknown block, inline media e aprovação server-side;
- suspender defaults de Gastronomia/Jurídico, prova social/FAQ fictícios e “sucesso” de formulário;
- registrar decisões de links, providers, reviewer, nichos e source of truth;
- abrir/validar fixture de dois tenants, Postgres/Storage e browser preview.

**Saída:** nenhum novo P0/P1 de segurança ou veracidade é introduzido por merge; caminho de publish inseguro falha fechado.

### Fase 1 — Dias 11–30: integridade de release e tenant

- migration corretiva de Storage e hardening de handlers;
- membership correta na RPC, `expected_version`, loader fail-closed e toasts confiáveis;
- typecheck sem erros, `.test.tsx` no CI, audit/lint no workflow;
- catálogo marcado corretamente, pilots FAIL fora de ready;
- motion com contrato único mínimo e paridade editor/público.

**Saída:** uma loja consegue editar/publicar somente o que está autorizado, aprovado e validado; uma falha não parece sucesso nem apaga documento.

### Fase 2 — Dias 31–60: escala, observabilidade e cobertura

- receipt/generation_run, hash, idempotência, quotas compartilhadas e telemetria redigida;
- invariantes do prompt em Zod/auditor; `NicheIdSchema` e matriz nicho×objetivo;
- ledger autoritativo de bytes/hash/dimensões e slots determinísticos;
- integração real upload→ledger→draft→publish→renderer;
- browser/axe para acessibilidade, formulários, galeria, carousel e motion;
- preview de todos os manifestos Studio, mobile/tablet/desktop e performance budget inicial.

**Saída:** cada decisão de qualidade tem evidência reproduzível por run, tenant, template e versão.

### Fase 3 — Dias 61–90: consolidação e evolução

- fonte única de snapshot/render/storage, migração legacy e rollback;
- responsiveOverrides reais, histórico/undo/redo e dirty guard;
- providers adicionais apenas se ledger/licença/crédito estiverem fechados;
- catálogo único, documentação derivada, lifecycle de assets e analytics agregado;
- observers/motion/performance otimizados e lint de vocabulário canônico.

**Saída:** a plataforma pode aumentar nichos e templates sem multiplicar dialetos, fontes de verdade, riscos editoriais ou custos não observados.

## 12. Critério de promoção para produção

Promover somente quando todos os itens abaixo forem verdadeiros:

- nenhum finding P0 aberto no publish, Storage ou renderer;
- P1 de aprovação humana, tenant, fallback de loader, unknown block, assets e claims fechado com teste de runtime;
- typecheck verde e CI executando testes TS/TSX, lint, auditoria e promotion gate;
- pelo menos um fluxo completo com dois tenants em fixture realista de Postgres/Storage;
- nenhum template marcado `ready` com `FAIL`, placeholder, asset sem ledger, claim sem evidence ou nicho não resolvido;
- reviewer humano identificável para cada template/promotional claim aprovado;
- preview editor/público/SSR equivalente para a mesma versão do snapshot;
- axe/teclado/reduced-motion e budgets mínimos executados em cada template promovido;
- telemetria de geração, publish, provider, custo/latência e falha disponível sem brief/facts em claro;
- rollback de snapshot e limpeza/reconciliação de assets testados.

Até esse ponto, o produto pode continuar em **piloto controlado**, com drafts editáveis e revisão humana obrigatória, mas não deve apresentar os 12 itens auditados como uma biblioteca de templates prontos.

## 13. Base de evidência e limitações

A síntese foi feita somente a partir dos resultados estruturados fornecidos das áreas: Factory IA e geração por nicho; Omni AST e experiência de edição; assets/Unsplash/provenance; auditoria e quality gates; motion/presets/interações; catálogo/cobertura de templates.

As conclusões distinguem:

- **defeito demonstrado:** incompatibilidade observável em código, schema, migration, teste ou fluxo descrito;
- **lacuna de evidência:** algo que não foi exercitado — especialmente Supabase/Storage/RLS real, providers, browser, concorrência, multi-tenant, E2E e performance;
- **risco de produto:** consequência possível que precisa de dados reais ou decisão humana para ser confirmada.

Não houve acesso, consulta ou alteração de projeto/banco Supabase, Storage ou GitHub durante as auditorias; nenhum resultado deve ser interpretado como validação jurídica de licença, direito de imagem, consentimento ou claims.
