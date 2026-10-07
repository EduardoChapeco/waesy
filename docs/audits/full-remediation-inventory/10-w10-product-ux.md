# W10 — Catálogo, rotas, UX, acessibilidade e design

**Data da auditoria:** 2026-10-07 (-03)  
**Repositório:** `EduardoChapeco/waesy`  
**Branch:** `audit/full-remediation-20261007`  
**HEAD:** `fc8f9fc3` (`audit: make voucher document apply atomic`)  
**Base comparada:** `origin/main` em `919c8688`; a branch está 2 commits à frente e 0 atrás (`git rev-list --left-right --count origin/main...HEAD` = `0 2`).  
**Escopo:** inventário W10 do masterplan (route tree, registry, menus, guards/loaders/SSR), com atenção adicional ao catálogo e ao piso de UX/acessibilidade/design exigido pela spec de execução completa.  
**Modo:** somente leitura de código/testes/comandos; nenhum arquivo de código foi editado, commitado, pushed, merged ou deployed. O único artefato novo desta frente é este relatório.

## 1. Contrato e critério de classificação

O cartão W10 do masterplan exige: (W10.1) comparar arquivos físicos, `routeTree.gen`, router/server e registry; (W10.2) reconciliar menus, sidebars, CTAs e deep links; (W10.3) exercitar anon/civil/staff/owner/admin/tenant externo; (W10.4) verificar SSR, streaming, cache, split server/client e contratos de params. A spec `SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:12-19,21-43` exige baseline, teste negativo, estados de carregamento/vazio/erro, foco, alvo tátil e reload; não permite promover teste estático, typecheck ou build a browser, integração ou produção.

A auditoria separa explicitamente:

- **Confirmado no SHA atual:** observado no código atual e/ou reproduzido por comando/teste atual.
- **Histórico:** afirmação transcrita do snapshot/masterplan anterior, não revalidada como defeito atual.
- **Hipótese:** risco plausível que requer reprodução adicional.
- **Não verificado:** faltou browser, sessão, banco/RLS, provider, deploy ou ambiente representativo.

## 2. Snapshot, diffs e dependências

### 2.1 Estado do worktree

No preflight havia alterações não rastreadas preexistentes fora do código desta frente: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/` e `docs/specs/SPEC-20261007-FULL-REMEDIATION.md`. Foram preservadas. O relatório foi criado dentro do diretório solicitado; não foi usado `git add -A`.

A comparação contra `origin/main` mostra que os dois commits locais são da frente P0 de turismo/documentos (`fe0417ae`, `fc8f9fc3`) e não alteram o route registry, navegação canônica, cards de catálogo ou rotas de catálogo. Portanto não há evidência de que os commits locais tenham fechado W10; o risco de misturar branches remotas permanece.

Branches remotas relevantes presentes: `origin/audit/recursive-p0-remediation`, `origin/chore/recover-waesy-task-2026-10-06`, `origin/feat/waesy-canonical-travel-evolution`, `origin/feat/waesy-studio-omni-audit`, `origin/feat/waesy-niche-template-factory`, `origin/feat/whatsapp-wave1-8-complete-release`. Nenhuma foi cherry-picked. Qualquer incorporação futura deve comparar paths/ownership/commits antes de aplicar.

### 2.2 Evidência executada

| Comando | Resultado atual | O que prova / não prova |
|---|---:|---|
| `node scripts/audit-route-parity.mjs` | exit 0; 177 registros, 179 arquivos físicos, “0 sem registro” | Prova apenas o algoritmo do script para seu recorte; não prova todos os links, permissões ou browser. Há discrepância de contadores que requer investigação. |
| `node scripts/check-unmapped-routes.mjs` | exit 0; 179 feature routes, 150 mapped, 0 unmapped | O script ignora `$`/novo/editar e usa `includes` em cinco fontes; não prova que cada item aparece no menu correto nem que permissões/links funcionam. |
| `node scripts/design-lint.mjs --ratchet` | exit 0, mas relatório determinístico: P0 1.524, P1 9.585, P2 1.295, P3 1.339; 13.743 total/858 arquivos | Confirma dívida de design reportada pelo scanner; exit 0 em modo ratchet não significa zero violações nem DoD de W10. |
| `npx vitest run src/routes/__tests__/store-route-loaders.test.ts --reporter=dot` | 1 arquivo, 3 testes, pass | Prova somente propagação de cidade nos loaders de vitrine; não prova route tree/menu/browser/SSR. |
| `npm run typecheck` | exit 0 | Prova compilação TypeScript no SHA atual; não prova navegação, acessibilidade visual, persistência, RLS, SSR real ou produção. |
| `git diff --check` | exit 0 | Prova ausência de whitespace error no diff observado; não prova funcionalidade. |

## 3. Findings

### W10-R01 — Gate de paridade declara sucesso com contadores incompatíveis e normalização incompleta

**Estado: confirmado no código/teste atual. Severidade sugerida: P1 de governança de rota; impacto de produto ainda não quantificado.**

**Evidência:** `scripts/audit-route-parity.mjs:6-22,25-39` coleta 177 paths do registry e 179 arquivos `workspace*.tsx`, mas termina com 0 arquivos sem registro. O registry usa convenção TanStack/documentação com `:param` (ex.: `src/lib/routes.ts:1492,1609` contém `/workspace/builder/:documentId/editor` e `/workspace/catalogo/produtos/:id`), enquanto o nome físico é derivado com `$param` (`workspace.catalogo.produtos.$id.tsx`) e convertido para `:param` somente na comparação. A diferença de cardinalidade permanece sem diagnóstico. O script não reconcilia route tree, `src/router.tsx`, `src/server.ts`, `src/lib/navigation-registry.ts`, CTAs ou permissões.

Uma checagem independente de normalização encontrou 179 arquivos físicos contra 177 entradas registradas e 18 rotas dinâmicas/auxiliares sem correspondência literal quando o arquivo é comparado com o registro sem normalizar os dois formatos; exemplos incluem `/workspace/catalogo/produtos/$id`, `/workspace/builder/$documentId/editor`, `/workspace/turismo/propostas/$id` e `/workspace_/pedidos/$id/recibo`. Parte pode ser intencional (detalhe/novo/editar), mas o gate não classifica isso nem produz allowlist explícita. Isso é uma lacuna confirmada do mecanismo de auditoria, não prova isolada de 404.

**Risco:** a mensagem `[OK R53] 100%` pode mascarar drift entre arquivo físico, registry e árvore gerada. A regra do masterplan W10.1 exige listar órfãs e paths sem arquivo; o script atual não produz essa matriz.

**Microfase proposta:** W10.1a — normalizar ambos os formatos (`$id`/`:id`), separar layout/novo/editar/dinâmicas com allowlist versionada, comparar `src/routes`, `src/routeTree.gen.ts`, `src/lib/routes.ts`, `src/lib/navigation-registry.ts`, `src/lib/workspace-navigation.ts` e manifests; gate deve falhar em cardinalidade não explicada. Gate: cada exceção tem motivo e teste; zero órfãos não justificados.

### W10-R02 — Findings históricos ROUTE-F01 não podem ser promovidos como defeito atual

**Estado: histórico / não confirmado como defeito atual.**

O masterplan:2140-2161 transcreve `ROUTE-F01`, alegando cinco rotas workspace invisíveis (`design-system`, `financeiro`, `turismo/comissoes`, `turismo/documentos-ocr`, `whatsapp/automacoes`). No SHA atual, os paths são encontrados em `src/lib/routes.ts` (por exemplo `/workspace/financeiro` em torno de 3043 e os três módulos de turismo/WhatsApp em 3053-3073), em `src/lib/workspace-navigation.ts:63,255-256,308,540-553` e no `src/routeTree.gen.ts` (comissões/documentos/automação, por exemplo, linhas 2865-2876 e 7402-7482). Os scripts oficiais atuais retornam 0 unmapped e exit 0.

Assim, o achado pode ter sido corrigido antes deste SHA ou o snapshot observou outro estado. Não há teste browser atual comprovando sidebar → pathname final para owner/admin, nem prova de permissões por módulo; portanto não deve ser marcado “corrigido/verificado”. O shim financeiro (`src/routes/workspace.financeiro.index.tsx:3-7`, conforme masterplan) ainda exige decisão se `/workspace/financeiro` deve ser URL pública do workspace ou só redirect canônico.

**Gate:** browser autenticado com owner/admin e módulos habilitados, clicar cada item, afirmar pathname final, ausência de 404/ciclo e intended URL; repetir para módulo desabilitado e role sem acesso. Só então classificar como browser/integration.

### W10-R03 — Inventário atual de UI do catálogo tem cobertura de estado parcial e não tem prova de jornada browser

**Estado: confirmado como lacuna de prova; hipótese de gaps de runtime. Severidade: P1 até fechar a matriz.**

`src/routes/workspace.catalogo.produtos.index.tsx:34-45` possui loader e tratamento de erro no loader; `:549-567` possui empty state e CTA “Criar”; `:598-615` e `:718-730` renderizam mídia/links; há versões mobile e desktop (`:676-695`). Isso é evidência positiva de estrutura, mas a função usa `Route.useLoaderData?.() as any` (`:205-210`), mantém uma cópia local dos produtos e faz mutações otimistas (`:221-239`). Não há teste de componente/browser que prove loader failure, skeleton, rehidratação após reload, erro de mutação, concorrência, ou que o CTA do item alcança uma rota existente com autorização correta.

`src/routes/_store.ofertas.tsx:14,62-84` importa `PageSkeleton`, declara `pendingComponent` e trata erro de loader; a listagem possui filtro e empty state em torno de `:150-210,281-290`, mas a auditoria atual não verificou cada coleção/estado em browser. A suíte executada contém apenas três asserts estáticos sobre propagação de cidade (`src/routes/__tests__/store-route-loaders.test.ts`), não catálogo visual.

**Risco/hipótese:** “estado presente no JSX” pode não significar estado atingível quando o loader retorna erro, coleção vazia, mídia inválida ou sessão/tenant diferente. O uso de `as any` reduz a detecção de drift DTO→UI.

**Microfase:** W10.2a — matriz de estado por rota/catálogo (loading, vazio, erro+retry, sucesso, mídia inválida, reload) com fixtures reais de contrato e browser desktop/mobile. Gate: cada rota tem prova de clique/URL, status visual e reload; nenhum sucesso de toast sem resposta/efeito verificado.

### W10-R04 — `StoreCard` declara affordance de botão sem semântica de controle independente

**Estado: confirmado no código atual; browser/teclado não verificados. Severidade sugerida: P1 (WCAG/affordance).**

`src/components/commerce/store-card.tsx:25-31,102-110` envolve o card inteiro em um `<Link>` e renderiza “Ver Empresa” como `<div>` (`:104`), embora `AGENTS.md:120-121` exija botão explícito e foco para `StoreCard`. A classe `focus-visible:*` está no `<div>`, que não é focável por padrão; não há `tabIndex`, `role=button` nem controle separado. O link pai pode ser operável por teclado, mas o CTA visual não é um alvo semântico independente e não há teste a11y/teclado provando o contrato. Isso também torna a regra DL-15 difícil de auditar por classe em vez de semântica.

Além disso, `StoreCard` usa `shadow-2xs`, gradientes (`bg-linear-to-*`) e cores literais/utilitários `text-white`/`bg-black` em `:29,34,42,46,53-55`, em tensão com `AGENTS.md:57-63`, `DESIGN.md:28-31,58-61,87-93,156-158` e DL-01/DL-07/DL-08/DL-18. O scanner global já reporta 1.524 P0 e 9.585 P1; não foi isolado neste passe o subconjunto somente desse arquivo. O finding visual deve ser corrigido atomicamente sem relaxar baseline.

**Microfase:** W13.1a/W10.2b — tornar o CTA um `<Link>`/`Button` sem nesting inválido, garantir foco 2px e 44px, fallback de imagem com `onError`, substituir literais/gradientes por tokens canônicos; teste axe/teclado/contraste em ambos breakpoints. Gate: CTA anuncia nome, recebe foco, navega para `/diretorio/$id`, fallback não exibe imagem quebrada.

### W10-R05 — `OfferCard` está melhor alinhado ao piso, mas contém violações de token/design e prova insuficiente de erro de imagem

**Estado: confirmado no código atual para conformidade parcial; não verificado em browser.**

Pontos positivos: `src/components/commerce/offer-card.tsx:190-205` e `:298-315` fornecem CTA com `h-11 min-h-11`, `focus-visible:ring-2`, texto “Ver Oferta” e estado de loading; o link usa `/produto/$slug` (`:126-129,219-223`); animações têm `motion-reduce` (`:141,194,235,304`).

Gaps confirmados no código: o fallback `cover_image || "/banner-placeholder.png"` (`:133,139,227,233`) cobre string vazia, mas não erro HTTP/URL inválida; não há `onError`. O componente usa classes proibidas pelo contrato visual, incluindo `border-white/20` e `shadow-xs` (`:146,242,251`, entre outras) e classe arbitrária `aspect-[4/3]` (`:225`), diretamente em conflito com DL-02/DL-07/DL-18 e o piso de tokens de `AGENTS.md:57-63`. O link/card não tem teste de rota real ou reload; `addToCart` atualiza estado e exibe toast após a resposta, mas esta auditoria não validou linha persistida, tenant, rede real ou idempotência.

**Microfase:** W13.1b — token/fallback/semântica do OfferCard; depois W16.1 — browser `Ver Oferta` e `Adicionar`, erro de imagem, estoque indisponível, erro de BFF e reload do carrinho. Gate: prova positiva/negativa e resposta/linha/cart read-back, sem declarar sucesso por toast.

### W10-R06 — Dívida de design lint global impede declarar DoD visual de W10

**Estado: confirmado no SHA atual pelo scanner; não verificado como impacto visual por tela.**

`node scripts/design-lint.mjs --ratchet` executou com exit 0, porém imprimiu 13.743 violações em 858 de 1.935 arquivos: P0 1.524, P1 9.585, P2 1.295, P3 1.339. O modo ratchet permite exit 0 quando o débito reduz, portanto o resultado não satisfaz `AGENTS.md:71-80` (zero P0/P1) nem a spec FR4/FR5. Não atualizar baseline para esconder o débito; o comando gerou artefatos e eles foram restaurados para preservar o worktree.

**Dependência:** antes de fechar W13/W10 visual, separar baseline histórico de novas violações e rodar lint por paths do catálogo/rotas; revisar falsos positivos do script sem relaxar thresholds. O relatório de lint global não prova sozinho que cada P0 afeta a jornada W10, mas prova que o gate global requerido não está verde.

### W10-R07 — Guards, role matrix, SSR/cache e links declarados permanecem não verificados

**Estado: não verificado; hipóteses de risco, não findings de produção.**

Foram lidos o escopo indicado no masterplan (`src/router.tsx`, `src/server.ts`, `src/lib/auth-guards.server.ts`, `src/lib/server-access`, `src/lib/return-path`, route tree e registries), mas nesta sessão não houve browser autenticado nem banco/RLS real. `npm run typecheck` passou e os loaders de vitrine passaram em 3 testes; isso não prova anon/civil/staff/owner/admin/tenant externo. Também não houve smoke HTTP SSR, inspeção de `Cache-Control` com sessão, streaming, worker build/deploy ou crawler que clique todos os links.

**Microfase:** W10.3a — matriz de autorização e intended URL por role/tenant (anon, civil, staff, owner, admin, tenant externo); W10.4a — build worker + requests SSR autenticados/anônimos, headers/cache/cookies e params inválidos. Gates: status/redirect esperado documentado por caso; nenhum cache público de resposta dependente de sessão; browser reload mantém somente estado autorizado.

## 4. Dependências, riscos e mistura de branches

1. **Registry vs route tree:** TanStack usa nomes de arquivo `$param`, registry usa `:param`; qualquer correção deve centralizar normalização e regenerar `routeTree.gen.ts` somente pelo gerador oficial.
2. **Múltiplas fontes de menu:** `src/lib/routes.ts`, `src/lib/navigation-registry.ts`, `src/lib/workspace-navigation.ts`, `workspace-all-tools-dialog.tsx`, shell/flyout e links embutidos podem divergir. Não corrigir uma fonte isoladamente sem teste de paridade.
3. **Catálogo/BFF/DTO:** as rotas de catálogo chamam services e projetam dados em DTOs; revisar `src/services/marketplace.functions.ts`, `src/services/admin-catalog.functions.ts`, tipos e migrations/RLS antes de afirmar isolamento ou persistência.
4. **Design:** W13 é dependência direta para tokens, foco, contraste, targets e estados. Não usar `lint:update-baseline` como correção.
5. **Branches remotas:** não cherry-pickar branches de recuperação, builder, turismo ou WhatsApp sem diff por path e ownership. Os dois commits locais atuais são turismo e não evidenciam fechamento desta frente.
6. **Ambiente:** faltam sessão fixture, Postgres/Supabase representativo, browser/Chromium configurado, logs de deploy/Cloudflare e autorização de deploy. Essas ausências bloqueiam claims de integração/browser/produção.

## 5. Microfases atômicas e gates

| Microfase | Escopo mínimo | Gate de saída |
|---|---|---|
| W10.1a | Normalização e matriz route file ↔ routeTree ↔ registry ↔ manifest | 100% das rotas classificadas; órfãs/aliases/param routes com allowlist e teste que falha no drift |
| W10.1b | Eliminar fontes duplicadas de metadata ou gerar menu do registry | Cada rota aparece uma vez no catálogo canônico; labels/roles/phase consistentes |
| W10.2a | Menus, sidebar, tools dialog, CTAs e deep links de catálogo/workspace | Browser owner/admin/role sem permissão: pathname/status/redirect/intended URL sem 404/ciclo |
| W10.2b | `OfferCard`/`StoreCard`: semântica CTA, foco, fallback, tokens e 44px | axe/teclado/mobile; contraste >=4.5:1 texto e >=3:1 controle; erro de imagem não produz broken image |
| W10.2c | Catálogo público/admin: loading, empty, error/retry, mutation error e reload | Fixtures de coleção vazia/múltiplas páginas/erro; read-back após mutação; nenhum toast sem efeito |
| W10.3a | Guards/loaders por role e tenant | Matriz anon/civil/staff/owner/admin/tenant externo com testes positivos e negativos |
| W10.4a | SSR/worker/cache/header/param contracts | build worker + smoke SSR; respostas autenticadas não têm cache público; params inválidos controlados |
| W13.1a | Scanner/lint por escopo e correções P0/P1 sem baseline relaxation | zero P0/P1 no escopo W10/catalog; relatório global ainda classifica saldo fora do escopo |
| W16.1 | E2E integrado catalog → detail → CTA → carrinho/conta, desktop/mobile/reload | Playwright com sessão e dados de teste; integração real ou bloqueio explicitamente registrado |

Cada microfase deve repetir o preflight da skill, registrar baseline/reprodução no ledger, preservar o worktree e anexar teste negativo, evidência de reload e revisão adversarial. Findings acima não estão “corrigidos”: no máximo há evidência parcial de código atual.

## 6. Veredito

**W10 permanece aberto e em remediação.** Há uma lacuna confirmada no próprio gate de paridade (contadores 177/179 com sucesso), dívida visual global confirmada pelo scanner e violações de semântica/tokens nos cards canônicos. O ROUTE-F01 do masterplan é histórico e não deve ser repetido sem replay: as cinco rotas citadas estão atualmente presentes no registry/navegação/árvore, embora ainda sem prova browser. Guards, SSR/cache, catálogo completo, RLS/tenant, acessibilidade operacional e jornadas de reload permanecem não verificados. `typecheck`, três testes de loaders, scripts estáticos e exit 0 do ratchet não autorizam declarar W10 fechado, integração verde, deploy ou produção.
