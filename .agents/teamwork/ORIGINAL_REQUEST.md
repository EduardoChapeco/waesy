# Original User Request

## 2026-10-03T20:54:22Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Executar auditoria profunda E2E e refatoração com equipe ampla de agentes
> Requested team: Use a very large team of agents.

Use a very large team of agents.
Auditoria forense profunda de ponta a ponta (E2E), caça sistemática a quebras, erradicação de resíduos/mocks e refatoração integral do ecossistema Waesy: verificação de integridade transacional de banco de dados (tabelas, colunas, chaves, RLS, triggers e storage buckets com suporte triplo a arquivo/URL/Ctrl+V), paridade de contratos BFF (Server Functions e Zod), roteamento integral nos 15 nichos semânticos agrupados em 4 macro-arquétipos, telemetria de rede Cloudflare Pages, isolamento de contexto civil vs empresarial, e conformidade rigorosa com Apple HIG no Mobile (App Nativo Anti-Jank, touch targets >= 44px) e Bento Grid no Desktop (12 colunas, proporção áurea, sem cards conversacionais e sem títulos compostos).

Working directory: c:/Users/Eduardo Antônio Ramo/Documents/waesy
Integrity mode: development

## Requirements

### R1. Auditoria Perimetral de Persistência, RLS & Governança Tripla de Mídia (Buckets / URL / Paste)
Auditar todas as tabelas e schemas do Supabase (`jfuebqmltksyznovhlwa`), verificando constraints, chaves estrangeiras, índices e políticas RLS Deny-by-Default com isolamento multi-tenant seguro e posse civil.
Auditar e blindar os 5 buckets de storage (`avatars`, `covers`, `classified-media`, `product-media`, `brand-assets`), garantindo que todos os uploaders de mídia do sistema ofereçam a tríade obrigatória:
1. Upload direto ao bucket Supabase com feedback visual.
2. Botão/campo para inserção de URL externa válida.
3. Suporte a captura nativa de imagem colada da área de transferência (Ctrl+V / Clipboard Paste listener).
Erradicar 100% de imagens, URLs do Unsplash ou dados simulados em todo o código, substituindo por empty states honestos, silenciosos e funcionais.

### R2. Auditoria dos Contratos BFF, Server Functions e Validações Zod
Inspecionar cada arquivo em `src/services/*.functions.ts`, validando:
- Autorização estrita via sessão SSR (`getServerIdentity` ou `requireAdmin`) sem bypass de RLS.
- Higienização perimetral de inputs com esquemas Zod fechados.
- Closed Allowlist de atributos públicos: NCM, CEST, custo, margem e dados fiscais NUNCA devem trafegar em rotas ou payloads públicos de produtos e classificados.
- Persistência atômica comprovada do motor de IA do Onboarding Rápido (Firecrawl, Steel.dev, Gemini 2.5 Flash, 5 squads) em `stores`, `brand_kits` e `brand_dna_profiles`.
- Dedução automática de insumos (BOM) em ordens de serviço e ao liquidar vendas balcão no PDV.

### R3. Auditoria e Refatoração Holística dos 15 Nichos nos 4 Macro-Arquétipos
Auditar cada rota do TanStack Router (`src/routes/`), garantindo que 100% das páginas funcionem sem crash, sem links mortos, sem dependências órfãs e com o comportamento funcional correto de seu nicho:
1. **Macro-Arquétipo A (Transacional / Varejo / Gastronomia)**: Carrinho canônico com validação de estoque em tempo real, checkout híbrido, PDV balcão, cálculo dinâmico de frete/balcão e consumo de BOM.
2. **Macro-Arquétipo B (Alta Ficha Técnica / Veículos / Imóveis / Turismo)**: Ficha técnica via Closed Allowlist (marca, ano, modelo, km, quartos, metragem), agendador de diárias/estadias, canal duplo (WhatsApp + Chat In-App) e injeção de contexto no SDR IA.
3. **Macro-Arquétipo C (Serviços e RH / Profissionais / Empregos)**: Agendamento nativo de horários comerciais (slots), ordens de serviço com baixa de peças em `stock_movements`, currículo profissional (padrão executivo) e candidaturas.
4. **Macro-Arquétipo D (Social e Comunidade / Membros / Criadores / Eventos)**: Vitrine pública com cabeçalho canônico (1:1 Squircle à esquerda + 21:9 Panorâmica à direita com scroll contínuo), aba in-page de Biolinks (botões e mini-banners 16:9), alternador de identidade e feed comunitário.

### R4. Diferenciação Estrita de Plataforma: Mobile Nativo HIG vs Desktop Bento Grid
Eliminar qualquer assimetria onde a tela móvel é apenas um desktop comprimido:
- **Mobile (<640px)**: Experiência de App Nativo Anti-Jank, física suave, barras de ação flutuantes fixas no terço inferior (`fixed bottom-0 pb-safe`), inputs e botões com piso tátil mínimo de 44x44px (`h-11`), abas com scroll horizontal e snap tátil, modais em gavetas inferiores (`Sheet`/`Drawer` com `100dvh`) e listas no padrão WhatsApp/iOS Settings quando aplicável.
- **Desktop (>=1024px)**: Arquitetura em Bento Grid de 12 colunas (`grid-cols-12`) com proporção áurea nos painéis de controle, dashboards, catálogos e configurações; visual limpo, respirável, sem ruído visual.
- **Regra B.8**: Erradicar 100% dos títulos compostos (> 6 palavras ou com adjetivos prolixos) em abas, cabeçalhos e tabelas. Proibido qualquer card conversacional redundante em páginas utilitárias. Proibido emojis em código e documentação.

### R5. Telemetria de Borda Cloudflare Pages, Anti-Spam & Fingerprint
Validar a captura real de telemetria de rede nas submissões de leads e pedidos:
- Leitura dos headers Cloudflare (`cf-connecting-ip`, país, cidade, asn).
- Geração determinística de `device_fingerprint` e verificação de taxa de submissão (anti-flooding em janela de 10 min).
- Persistência estruturada em `lead_form_submissions` e `pwa_telemetry`.

### R6. Restrições Estritas de Engenharia
- **PROIBIÇÃO ABSOLUTA**: Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- **Verificação Objetiva**: Realizar inspeção semântica estrita, execução do linter visual (`node scripts/design-lint.mjs`), testes unitários focados com Vitest apenas nos arquivos modificados e análise cirúrgica de `git diff`.
- **Registro de Decisões**: Cada refatoração ou correção de gap deve ser documentada em `docs/design/DECISIONS.md`.

## Acceptance Criteria

### Infraestrutura, Dados & Storage
- [ ] 100% das tabelas do banco com RLS ativo e políticas restritas multi-tenant e civil.
- [ ] Os 5 buckets de storage autenticados e operando com suporte a Bucket + URL + Ctrl+V (área de transferência).
- [ ] 0 imagens Unsplash, mocks sintéticos ou dados fictícios no código de produção.
- [ ] 0 vazamentos de dados fiscais (NCM, CEST, custo, margem) em endpoints e visualizadores públicos.

### Lógica Transacional & Contratos BFF
- [ ] Onboarding com IA conectando scraping Firecrawl/Steel, análise Gemini 2.5 Flash e salvando no Supabase.
- [ ] Carrinho e checkout validando estoque real e calculando totais de centavos sem arredondamento flutuante.
- [ ] Venda de produtos compostos no PDV deduzindo insumos da ficha técnica (BOM) em `stock_movements`.
- [ ] Ordens de serviço concluídas gerando baixa automática de peças utilizadas no estoque.

### Navegação, Rotas & 15 Nichos
- [ ] 100% das rotas TanStack acessíveis, sem telas brancas, sem dependências órfãs e sem links mortos.
- [ ] Todos os 15 nichos exibindo suas especificações técnicas exclusivas via Closed Allowlist.
- [ ] Agendamento nativo funcional para serviços (slots comerciais) e turismo (diárias).
- [ ] Chat nativo in-app integrado aos classificados em paridade com o botão de WhatsApp.

### Design System & Ergonomia (HIG vs Bento Grid)
- [ ] Zero títulos compostos (> 6 palavras) em abas, menus ou cabeçalhos em todo o repositório.
- [ ] Zero cards conversacionais proliferando AI-smell em telas utilitárias.
- [ ] 100% dos controles interativos móveis com área de toque mínima de 44x44px (`h-11`).
- [ ] Dashboards desktop estruturados em Bento Grid de 12 colunas com proporção áurea.
- [ ] Perfis públicos e configurações de loja no padrão canônico: Foto 1:1 Squircle + Capa 21:9.
- [ ] Zero violações P0 e P1 no script `scripts/design-lint.mjs`.


## 2026-10-04T03:35:00Z

Plataforma all-in-one Waesy: auditoria profunda, evolução contínua, governança de design system (AGENTS.md, DESIGN.md), indexação urbana contextual por cidade e consolidação de motores industriais de mineração.

Working directory: C:\Users\Eduardo Antônio Ramo\Documents\waesy
Integrity mode: development

## Requirements

### R1. Governança e Integridade Visual do Design System (DESIGN.md & AGENTS.md)
Garantir que todas as páginas e componentes de UI consumam estritamente tokens semânticos (tokens.json, styles.css), respeitem a grade modular de 4px, mantenham alvos de toque mínimos de 44px (h-11) e alcancem 0 violações bloqueantes P0/P1 no scripts/design-lint.mjs.

### R2. Indexação e Filtragem Contextual por Cidade
Garantir que todos os módulos cívicos e comerciais (notícias, vagas, eventos, diretório e vitrines) filtrem conteúdos pela cidade ativa do usuário (resolveActiveCity), com paridade canônica total de campos e design para conteúdos minerados.

### R3. Resiliência do Chat Copilot e Protocolo MCP
Preservar o fluxo do chat de IA com máquina de estados determinística de 13 fases, sem travamentos por falhas em ferramentas, tratando conteúdo web externo como dado não-confiável e emitindo artefatos vivos.

### R4. Execução Contínua e Desacoplada de Motores de Mineração
Assegurar o funcionamento sem mocks das 8 verticais industriais em src/services/mining/, com circuit breakers por domínio, deduplicação Jaccard e inserção na fila assíncrona crawl_queue.

## Acceptance Criteria

### Integridade Visual e Linting
- [ ] node scripts/design-lint.mjs --changed executado com código 0 e zero violações P0/P1 adicionadas.
- [ ] Nenhum componente com cores hexadecimais literais ou classes arbitrárias -[...].
- [ ] Todas as superfícies com matriz de 4 estados completa (dados, skeleton loading, empty state, erro).

### Validação de Código e Tipagem
- [ ] Suíte de testes vitest run src/services/mining/ com 100% de testes passando.
- [ ] Typecheck verificado sem erros impeditivos nas rotas modificadas.
- [ ] Decisões arquiteturais registradas em DECISION_LOG.md e docs/design/DECISIONS.md.


## 2026-10-04T11:38:12Z

Worker M2 has completed all 11 implementation tasks (TASK-R2-01 to TASK-R2-11) for Milestone 2 (Active City Contextual Indexing).
Handoff report is written to .agents/teamwork/worker_m2/handoff.md.
Vitest mining suite passed 12/12 tests (100% green).
Design lint ratchet passed with Exit Code 0 and repository-wide debt reduced by 7 violations.
Ready for Gate 2 verification and Milestone 3 transition.

## 2026-10-04T14:00:19Z

PARENT HANDOFF (relay to orchestrator_4 verbatim). While you were down on quota (429), the parent applied M3 fixes directly. Do NOT revert them:
1. src/services/ai-conversations.functions.ts: MCP dispatch now returns terminally (it used to fall through into the heuristic search_places chain). Mining detection now runs before RUNNING. A geo domain with no city goes UNDERSTANDING->NEEDS_CLARIFICATION. Active city comes from data.city ?? resolveActiveCity(). Import switched to @/lib/ai/prompt-shield. AiCopilotContext.threadId added.
2. src/services/autonomous-copilot-orchestrator.ts: removed the fabricated "Chapecó" default. fragmentAndOptimizePrompt(prompt, {city,state}). New exports CITY_SCOPED_DOMAINS and needsCityClarification. Context accepts activeCity/activeState.
3. New src/services/copilot-pipeline-boundaries.test.ts (7 tests, real pipeline). Tautological block 5 removed from copilot-fsm-and-resilience.test.ts. 4 city tests added to autonomous-copilot.test.ts. DEC-177 added to docs/design/DECISIONS.md.
Verified: 90/90 vitest across 9 files; ratchet 15,417 PASS.
Open defects in your src/services/copilot-fsm.test.ts (2 failing as of 13:59Z):
(a) MCP_TOOL_REGISTRY actually has 41 tools, not 26. Stop reporting "26" anywhere (reports, docs, test titles). Assert >= the real count or derive it from the registry.
(b) The 'FAILED_RETRYABLE quando mineração autônoma falha' test times out at 5s. vi.spyOn on an ESM export does not intercept harvestAndPersistPlaces, so it calls the real Overpass API with 3x exponential retry. Use vi.mock('./mining/places-harvester') at module top, or reuse the pattern in copilot-pipeline-boundaries.test.ts.
Also: your periodic report said orchestrator_4 was 'healthy' while its transcript's last step (13:54Z) was ERROR_MESSAGE, and it credited copilot-pipeline-boundaries.test.ts to the team. Report only facts verified against files and transcripts.
Next scope for M4: the state "SC" default in places-harvester.ts and the orchestrator is a residual risk (wrong UF for non-SC cities). After that, audit the 8 mining verticals with real execution. Rules: never run npm run typecheck or npm run build. B.6 output schema.

## 2026-10-04T14:15:26Z

PARENT VERIFICATION of the M3 gate (independent run at 14:15Z): 10/10 test files green, so the gate is ACCEPTED. Corrections for the record:
(1) copilot-fsm.test.ts has 16 tests, not 23 as you reported. Report counts exactly as vitest prints them.
(2) The registry assertions are still toBeGreaterThanOrEqual(26), and the titles still say "26", in copilot-fsm.test.ts:194, copilot-fsm-and-resilience.test.ts:199-203 and m3-challenger-empirical.test.ts:9,234-236. The real count is 41. Low priority: fold the fix into M4, either derive the count from Object.keys(MCP_TOOL_REGISTRY) against MCP_TOOLS_MANIFEST parity, or assert 41.
(3) The 'mineração autônoma falha' test takes 2.5s because withExponentialRetry uses real sleeps (800ms + 1600ms). Optional: use vi.useFakeTimers or an injectable delay.
Proceed with M4.

## 2026-10-04T14:25:49Z

PARENT NOTES on M4 (relay to orchestrator d28f856c):
(1) Before worker_m4 creates src/lib/geo-resolver.ts, check for existing primitives so we don't add a duplicate (AGENTS.md B.8): src/lib/city-helper.ts (resolveActiveCity, normalizeActiveCity) and any IBGE or UF mapping already in src/lib/mining/regional-sources-catalog.ts or elsewhere (grep "IBGE", "uf:", "estado"). Extend what exists; a new module is acceptable only if no equivalent exists, and the decision must be recorded in DECISIONS.md.
(2) A city that cannot be resolved must yield state undefined and an honest clarification or empty result, never a guessed UF and never a Chapecó BBOX.
(3) Stop reporting "0 violações P0/P1 no design lint". The repo total is 1,728 P0 and 10,818 P1 (all legacy debt). The accurate statement is "ratchet PASS, 0 new violations; --changed files clean" and only after you have run it.
(4) Deliverables must include vitest output for src/services/mining/, src/lib/mining/ and the copilot suites.


## 2026-10-04T15:22:14Z

finazou tudo ja?

## 2026-10-04T19:11:10Z

Você é o Antigravity Principal Architect e o Squad Unificado de Engenharia e Design Ops. Sua missão é auditar profundamente, inventariar exaustivamente e remediar todas as quebras, fluxos incompletos, inconsistências de design lint (15.385 violações catalogadas DL-01 a DL-30) e falhas funcionais em todas as 372 rotas, 718 componentes e 402 funções BFF da plataforma Waesy.

Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy
Integrity mode: development

## Requirements

### R1. Inventário Forense e Varredura Completa de Defeitos (Ondas 00 a 07)
- Executar mapeamento cirúrgico de todas as 372 rotas em src/routes/ e 718 componentes em src/components/, catalogando botões inoperantes, formulários sem persistência, rotas desconectadas e discrepâncias de contratos BFF.
- Mapear a aderência ao catálogo do Supabase (432 migrações), modelos ORM/schemas Zod e ausência total de mocks, simuladores ou fallbacks sintéticos.
- Auditar a integridade de fluxos de ponta a ponta: visitantes deslogados, usuários civis, lojas parceiras, criadores e administradores master.

### R2. Erradicação de Violações de Design Lint e Conformidade Visual (Ondas 08 a 14)
- Eliminar sistematicamente violações P0 e P1 do scripts/design-lint.mjs:
  - DL-01: Proibição de cores hex/rgb hardcoded fora dos tokens de design.
  - DL-02: Erradicação de classes com colchetes arbitrários (w-[327px], h-[85vh], text-[11px]).
  - DL-03: Alinhamento rigoroso à grade modular de 4px em paddings, margens, gaps e ícones (proibidos size-3.5, p-3.5).
  - DL-04: Eliminação de !important ou modificadores de força bruta no CSS e Tailwind.
  - DL-14: Garantia mecânica de alvos de toque mínimos de 44x44px (h-11 min-h-11) em 100% dos controles táteis.
  - DL-15: Presença obrigatória de anel de foco teclado (focus-visible:ring-2 focus-visible:ring-primary) em botões e links.
  - DL-26: Teto máximo de 300ms em transições e respeito a motion-reduce:animate-none.
- Erradicar headers móveis renderizados isoladamente no desktop (md:hidden no NativeMobileHeader), implementando cabeçalhos inpage alinhados ao container em desktop (>= 768px).
- Expurgar caixas explicativas prolixas ("AI Smell", banners de boas-vindas genéricos) e emojis literais na interface.

### R3. Barreira Zero-Trust e Governança Civil com KYC Transacional (Ondas 15 a 17)
- Visitantes deslogados possuem acesso exclusivamente de leitura a vitrines, classificados e notícias; qualquer mutação aciona o ActionAuthGuardModal preservando returnUrl exato (exceto formulários de captura de lead).
- Verificação documental e facial biométrica (/conta/verificacao) auditada no Master Admin (admin-master.kyc.tsx).
- Usuários civis sem KYC aprovado são estritamente impedidos de realizar transações financeiras na plataforma e assinaturas de contratos, mantendo a permissão de negociação livre em classificados.

### R4. Bilateralidade Transacional e Sincronização em Tempo Real (Ondas 18 a 20)
- Todo agendamento criado via createAppointment persiste customer_id e store_id, visível bilateralmente na Agenda do Cliente (_store.conta.agendamentos.tsx) e no Painel do Estabelecimento (workspace.reservas.tsx).
- Pedidos de compra, encomendas e propostas de classificados sincronizados entre comprador e vendedor sem assimetria de estados.

### R5. Economia de Tokens e Calibração Comercial em kTokens (Ondas 21 a 23)
- Cota diária de 100.000 tokens para usuários civis autenticados renovada a cada 24 horas.
- Isenção absoluta (0 tokens) para buscas de estabelecimentos locais, catálogo comercial e leitura de notícias.
- Débito calibrado por ação avançada: mineração de CNPJs (25k), emissão de documentos (75k) e composição de sites (250k).

### R6. Super Omni-Builder de Páginas Estilo Wix (Ondas 24 a 32)
- Catálogo de 24+ blocos modulares canônicos com renderização fluida no OmniPageRenderer e edição no OmniEditor.
- Suporte a animações de scroll (fade, slide-up, zoom-in, stagger) em conformidade com prefers-reduced-motion e grade de 4px.
- Integração da geração por Copilot Chat aos esquemas de cores por nicho e trava de vitrine para planos Pro/Max.

### R7. Harvesters Industriais, Testes de Regressão e Resolução de Erros (Ondas 33 a 40)
- Operação contínua de mineradores (DataJud, CNPJ, PNCP, Places, Notícias) com filas assíncronas e deduplicação SHA-256.
- Eliminação de erros de compilação TypeScript (npm run typecheck Exit Code 0).
- Suíte completa de testes automatizados passando sem regressões.

## Acceptance Criteria

### Integridade Visual e Design System
- [ ] Redução progressiva de violações no scripts/design-lint.mjs com 0 violações P0 e 0 violações P1 introduzidas.
- [ ] 100% dos botões e elementos clicáveis com área tátil >= 44x44px (h-11 min-h-11).
- [ ] Zero classes arbitrárias com colchetes no código de componentes e páginas.
- [ ] Cabeçalhos de tela adaptativos divididos entre inpage no desktop e nativo no mobile.

### Funcionalidade e Bilateralidade
- [ ] Agendamentos e pedidos sincronizados bilateralmente entre cliente e prestador/lojista.
- [ ] Transações financeiras e contratos digitais bloqueados para usuários sem KYC aprovado.
- [ ] Visitantes anônimos direcionados ao login contextual em qualquer tentativa de mutação.
- [ ] Cota diária de tokens em kTokens funcionando com isenção em notícias e buscas locais.

### Robustez e Compilação
- [ ] 100% dos testes unitários em src/services/ e src/components/ passando com sucesso.
- [ ] Compilação TypeScript limpa com Exit Code 0 (npm run typecheck).
- [ ] Build de produção gerando assets e worker sem falhas.


## 2026-10-05T04:01:31Z

Plataforma unificada de auditoria forense, conciliação transacional e governança 360º end-to-end com telemetria invisível segundo a segundo, rastreamento de formulários preenchidos, telemetria de carrinhos abandonados, amarração física de ações corporativas de funcionários ao CPF civil do operador e dossiê 360º irrestrito com 7 abas operacionais no Master Admin.

Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy
Integrity mode: development

## Requirements

### R1. Camada de Dados e Migrations de Telemetria 360º (Supabase)
- Implementar migration `supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql` contendo:
  - `user_form_submissions_log`: histórico de formulários preenchidos (propostas, orçamentos, candidaturas, suporte, cadastros) com rota, payload higienizado, IP, VPN e User-Agent.
  - `user_cart_telemetry`: adições, remoções, atualizações de quantidade e carrinhos abandonados por loja e produto.
  - `employee_tenant_audit_logs`: registro estrito de ações realizadas por funcionários/operadores dentro de painéis de empresas (`user_id` físico, `store_id`, `module`, `action`, IP, timestamp).
  - `customer_store_affinity`: métricas agregadas por cliente e loja (visitas, adições ao carrinho, faturamento, tickets, nível de afinidade: lead, visitante, comprador, fã, VIP).
  - RLS Deny-by-Default com acesso total para `platform_admin` e leitura contextual para o próprio usuário e para a loja parceira.

### R2. Camada BFF e Ingestores de Telemetria (Server Functions)
- Criar `src/services/admin-360-governance.functions.ts` provendo:
  - `getUserFull360Activity`: agregador do dossiê 360º em 7 dimensões com certificação SHA-256.
  - `adminForceSetUserPassword`: redefinição forçada de senha pelo Master Admin via Supabase Auth Admin.
  - `adminTransferStoreOwnership`: transferência transacional de titularidade de empresas com recibo forense.
  - `adminToggleUserAccess`: bloqueio/desbloqueio imediato de contas com motivo registrado.
  - `recordFormSubmissionAudit`, `recordCartTelemetryEvent`, `recordStaffActionLog`.
  - `getMyActivityHistory`: histórico transparente para o cliente civil.

### R3. Centro de Controle Irrestrito do Master Admin (`admin-master.usuarios.tsx`)
- Reformular o Dossiê 360º do Master Admin em 7 abas operacionais:
  1. *Geral & Acessos:* dados cadastrais, redefinição rápida de senha, disparo de Magic Link, alteração de nível e transferência de titularidade de lojas.
  2. *Documentos & KYC:* visualização de CNH/RG e fotos biométricas com botões de aprovação/rejeição instantânea.
  3. *Formulários & Cadastros:* lista de todos os formulários submetidos com data, rota e dados preenchidos.
  4. *Telemetria & Navegação:* trilha de navegação segundo a segundo, tempo de permanência, histórico de buscas, IP e indicador de VPN.
  5. *E-Commerce & Carrinhos:* produtos vistos, carrinhos abandonados, pedidos, trocas e afinidade por loja.
  6. *Mobilidade & GPS:* viagens, entregas, fretes, rotas, tolerância de 3 min e status de calote/dívida no CPF.
  7. *Ações como Operador:* histórico corporativo de ações realizadas pelo usuário em painéis de terceiros.
- 100% de botões funcionais, área de toque >= 44px (`h-11 min-h-11`) e anéis `:focus-visible:ring-2`.

### R4. Visão do Consumidor "Minha Atividade" (`_store.conta.atividade.tsx`)
- Criar a rota civil `src/routes/_store.conta.atividade.tsx` permitindo que o cliente consulte de forma transparente tudo o que realizou (anúncios vistos, carrinhos, buscas, formulários e dispositivos conectados), no padrão de privacidade da Apple e Google My Activity.

### R5. Testes Automatizados, Design Lint e Deploy em Produção
- Suíte de testes unitários para a camada BFF (`src/services/admin-360-governance.functions.test.ts`).
- Validação mecânica da catraca de design lint (`node scripts/design-lint.mjs --ratchet`) com 0 violações P0/P1.
- Compilação limpa de produção (`npm run build`) e deploy no Cloudflare Pages (`wrangler pages deploy dist --project-name usewaesy --commit-dirty=true --no-bundle`).
- Smoke tests HTTP reais comprovando disponibilidade dos endpoints.

## Acceptance Criteria

### Governança e Dossiê 360º
- [ ] Dossiê 360º no Master Admin exibe 7 abas operacionais com dados reais persistidos.
- [ ] Master Admin possui botões funcionais para redefinir senha imediatamente, disparar Magic Link, bloquear acesso e transferir lojas.
- [ ] Ações corporativas de funcionários são registradas vinculando CPF físico e empresa operada.
- [ ] Formulários submetidos e telemetria de carrinho são auditáveis de ponta a ponta.

### Usabilidade e Design System
- [ ] 100% dos controles e botões com alvos táteis mínimos de 44x44px (`h-11 min-h-11`).
- [ ] Anéis mecânicos `:focus-visible:ring-2 focus-visible:ring-primary` em todos os elementos interativos.
- [ ] Zero dados sintéticos (`Math.random()` ou mocks) na camada de dados.

### Estabilidade e Produção
- [ ] 100% dos testes unitários aprovados com Exit Code 0.
- [ ] Catraca do design-lint aprovada sem aumento de débito técnico.
- [ ] Build de produção gerado com sucesso.
- [ ] Deploy concluído no Cloudflare Pages com HTTP 200 nas rotas `/admin-master/usuarios` e `/conta/atividade`.


## 2026-10-05T06:27:42Z

Restaurar a interatividade em toda a plataforma Waesy (produção em Cloudflare Pages). Centenas de botões, dropdowns, drawers e alternadores de contexto pararam de responder ao mesmo tempo: o alternador de perfil não expande, o avatar do topo não abre o drawer de conta, o botão "Sair" fica sobreposto a outro botão e o usuário não consegue entrar nos workspaces das lojas. Primeiro, encontrar e comprovar a causa raiz sistêmica; depois, inventariar e corrigir cada botão que continuar quebrado.

Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy
Integrity mode: development

Material de referência: AGENTS.md (contrato B.1–B.30), docs/design/DESIGN.md, docs/design/DESIGN-LINT.md, scripts/design-lint.mjs.

## Contexto (fatos observados, não soluções)

- A falha é generalizada e simultânea ("nenhum botão funciona, como se não tivesse action"). Isso indica uma causa sistêmica (por exemplo, falha de hidratação no cliente, erro de runtime no bundle ou uma camada sobreposta capturando cliques), e não centenas de handlers ausentes, até prova em contrário. Ainda não está comprovado.
- Mudanças recentes que podem estar relacionadas: reescrita de src/components/commerce/offer-card.tsx, patch por regex do avatar em src/components/shell/utility-cluster.tsx, mudanças na altura do header em src/components/shell/top-bar.tsx, patches em lote via scripts .cjs e uma remediação em massa de design lint (cerca de 15 mil violações) feita por agentes anteriores, com risco de ter removido props onClick/asChild ou quebrado o JSX.
- Produção: projeto usewaesy no Cloudflare Pages (deploy: npx wrangler pages deploy dist --project-name usewaesy --commit-dirty=true --no-bundle), Supabase jfuebqmltksyznovhlwa. Shell: Windows PowerShell; use cmd.exe /c para comandos npm/npx.
- Ainda não há conta de teste confirmada. Se não houver credenciais de teste no ambiente (.env / .dev.vars), pare e solicite ao usuário, em vez de criar contas em produção sem autorização.

## Requirements

### R1. Causa raiz sistêmica comprovada
Identificar por que a interatividade parou em todo o app, com evidência reproduzível (erros de console/hidratação, bisseção por commit ou equivalente). Corrigir na raiz, não com remendo por botão.

### R2. Fluxos de navegação de conta e contexto
O alternador de perfil/contexto expande e lista os contextos reais (civil, lojas do usuário, entregador/Waesy Go, criador). Escolher uma loja leva ao workspace correspondente. O avatar do topo abre o drawer de conta no desktop e no mobile. "Sair" e os botões vizinhos ficam alinhados, sem sobreposição, e todos podem ser clicados.

### R3. Inventário completo e remediação de botões
Produzir um inventário legível por máquina de todos os elementos interativos em src/routes/ e src/components/ (arquivo, linha, rótulo, tipo de ação, status: funcionando / inerte / placebo / rota quebrada / bloqueado por auth sem modal). Corrigir todos os itens quebrados para que cada botão navegue para uma rota existente, chame uma mutação real ou abra o modal de autenticação para visitantes. Re-varrer de forma recursiva até não restar nenhum item quebrado.

### R4. Nenhuma regressão de contrato ou design
Manter as invariantes do AGENTS.md (alvos de 44px, focus-visible:ring-2, sem colchetes arbitrários e sem cores literais introduzidas, B.20–B.30) e entregar build e deploy de produção.

## Acceptance Criteria

### Causa raiz
- [ ] Um relatório escrito cita a causa raiz com evidência (trecho de console/stack ou commit ofensor) e mostra o erro desaparecendo após a correção.
- [ ] A rota / e /conta em produção carregam com zero erros de hidratação ou runtime não tratados no console do navegador.

### Teste de interação automatizado (forcing function)
- [ ] Um teste E2E de navegador (Playwright ou equivalente), commitado no repositório, faz login com uma conta de teste e verifica: o alternador de contexto abre e lista mais de 1 contexto; escolher uma loja chega a uma URL /workspace...; clicar no avatar do topo abre o drawer de conta (desktop e viewport mobile de 390px); as caixas delimitadoras de "Sair" e dos vizinhos não se sobrepõem.
- [ ] Um crawler automatizado de cliques visita pelo menos 30 rotas principais (vitrine, marketplace, classificados, mobilidade, conta/*, workspace/*, admin-master/*), clica em cada botão/link visível e registra 0 cliques sem efeito observável (sem navegação, sem diálogo/popover aberto, sem request de rede, sem toast).
- [ ] O inventário de R3 existe em auditoria/ com contagem final de itens quebrados igual a 0.

### Build e contrato
- [ ] npm run typecheck termina com exit 0.
- [ ] Todos os testes vitest passam.
- [ ] node scripts/design-lint.mjs --ratchet passa (sem aumento de P0/P1).
- [ ] npm run build termina com exit 0, e o deploy no Cloudflare Pages (usewaesy) é concluído; os testes E2E passam contra a URL de produção.
- [ ] Entrada de handoff adicionada em docs/design/DECISIONS.md.
