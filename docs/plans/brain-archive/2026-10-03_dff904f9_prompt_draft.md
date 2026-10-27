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
