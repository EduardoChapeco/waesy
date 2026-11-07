# Handoff Report — Survey Explorer 1: Master Inventory, Routes & Static Component Mapper

## 1. Observation

### 1.1 Inventário Quantitativo e Comparativo com `auditoria/00-inventario.json`
- **Arquivo baseline:** `auditoria/00-inventario.json` (gerado em `2026-09-29T17:23:06.585Z`, commit `beb0b7e`), contendo originalmente 380 rotas e 573 componentes.
- **Estado atual em `src/routes/`:** 446 arquivos de rota válidos (.tsx / .ts) identificados via scan direto em `src/routes/`:
  - 378 rotas mapeadas no inventário inicial continuam ativas no repositório.
  - 68 novas rotas foram criadas e integradas desde o snapshot de setembro de 2026.
  - 2 rotas do snapshot original sofreram reorganização canônica.
- **Distribuição por Grandes Módulos do Sistema:**
  | Módulo / Camada | Quantidade de Rotas | Submódulos Ativos | Propósito Primário |
  | :--- | :---: | :---: | :--- |
  | **Workspace (ERP / SaaS Operacional)** | 189 | 64 | Gestão diária de estabelecimentos, agendamento, PDV, estoque, financeiro, turismo, advocacia, pedidos e CRM. |
  | **Vitrines & Consumidor (`_store.*`)** | 165 | 102 | Superfícies públicas de descoberta, catálogo, checkout, conta civil, classificados, gastronomia e mobilidade. |
  | **Admin-Master (Governança & Superadmin)** | 38 | 35 | Painel de controle soberano, algoritmos, banners, curadoria, denúncias, auditoria e motor de anúncios. |
  | **API & Webhooks (`api.*`)** | 26 | 9 | Endpoints server-side, stream de IA, callbacks de OAuth de anúncios, rotas de webhooks e workers cron. |
  | **Público / Raiz / Civil (`home`, `painel`, etc.)** | 28 | 15 | Portais de entrada, status institucional, sitemaps XML dinâmicos e resolutores de domínio. |
  | **Total da Plataforma** | **446** | **225** | **Ecossistema Completo Waesy** |

### 1.2 Auditoria de Telas Estáticas, Mocks e Gaps de Persistência (Requisito R3)
A inspeção profunda de arquivos revelou **34 telas e componentes com dados hardcoded, arrays estáticos ou ausência de sincronização BFF**:
1. `src/routes/_store.destaques.$slug.tsx:38-60`: Declaração de `HOTPAGE_THEMES` com pills contendo emojis e estrelas arbitrárias (`"⭐ nota 4.8+"`, `"⏱️ em até 20 min"`), em violação direta das Regras B.8 e B.20 (proibição de emojis e dados sintéticos arbitrários sem espelho no Admin Master).
2. `src/routes/workspace.agenda.recursos.tsx:21`: Array `DAYS` estático e dependência de mutations locais parciais para profissionais sem sincronização multi-calendário em tempo real.
3. `src/routes/workspace.automacoes.tsx:95`: Array estático `WORKFLOW_PREVIEW_NODES` (`id: "1"`, `Zap`, `GitBranch`) utilizado para preview de nós em vez de carregar schemas declarativos persistidos na tabela `workflow_definitions`.
4. `src/routes/workspace.b2b.index.tsx:59`: Categorias `B2B_CATEGORIES` declaradas em array estático no cliente em vez de consumir taxonomias ativas via `getMarketplaceCategories` do banco de dados.
5. `src/routes/workspace.cms.paginas.index.tsx:32`: Array `TEMPLATE_OPTIONS` (`blank`, `landing`, `bio`) com opções de modelos de página estáticas em vez de consultar a tabela de templates dinâmicos.
6. `src/routes/workspace.comercial.tsx:42` e `src/routes/workspace.turismo.index.tsx:38`: `POPULAR_TAGS` e `DEFAULT_CHECKLIST_TEMPLATE` hardcoded no arquivo de rota.
7. `src/routes/workspace.financeiro.caixa.lancamentos.tsx:34`: Array `COMMON_PRESETS` com justificativas e valores de sangria pré-fixados.
8. `src/routes/workspace.marketing.anuncios.novo.tsx:45`: Arrays `AD_FORMATS` e `AD_OBJECTIVES` estáticos no cliente.
9. `src/routes/workspace.simulacao.tsx:73`: Lista de nichos `NICHES` estática sem reflexo do catálogo central `niche-manifest.ts`.
10. `src/routes/workspace.turismo.cotacoes.tsx:49`: `TRIP_TYPE_OPTIONS` hardcoded.
11. `src/routes/workspace.turismo.embarques.tsx:145` e `src/routes/_store.conta.pedidos.$id.tsx:210`: Arrays `rules` e `emergencyContacts` definidos inline com dados de contingência.
12. `src/routes/workspace.turismo.oportunidades.tsx:52`: Estágios de pipeline (`stages`) hardcoded sem suporte à tabela de customização de estágios `kanban_stages`.
13. `src/routes/_store.about.tsx`, `src/routes/_store.sobre.tsx`, `src/routes/_store.contact.tsx`, `src/routes/_store.developers.tsx`, `src/routes/_store.docs.tsx`, `src/routes/_store.privacy.tsx`: Telas puramente textuais sem vínculo com o Admin Master (`marketplace_surfaces` ou `cms_institutional_pages`), impedindo edição descentralizada.
14. `src/routes/_store.conta.classificados.novo.tsx:64`: Objeto `DESAPEGO_TAXONOMY` estático para categorias de desapego.
15. `src/routes/_store.conta.lojas.nova.tsx:41`: `BUSINESS_SEGMENTS` hardcoded na rota de abertura de empresa.
16. `src/routes/_store.explorar.tsx:39-93`: Arrays `CANONICAL_PILLARS` e `DISCOVERY_CATEGORIES` declarados inline no topo da rota.
17. `src/routes/_store.ofertas.tsx:31`: Array estático `NICHE_CHIPS` (`todos`, `gastronomia`, `mercado`, etc.).
18. `src/routes/admin-master.marca.tsx:38`: `ACCENT_PRESETS` com paletas de cores hardcoded.

### 1.3 Auditoria de Fluxos Operacionais e Modalidades de Visualização (Requisito R2)
Dos **69 fluxos operacionais mapeados** no Workspace e Admin-Master (agendamentos, clientes, pedidos, tarefas, ordens de serviço, finanças, contratos e turismo):
- **Apenas 8 telas** possuem hoje algum seletor ou toggle de modo de visualização implementado (`workspace.orcamentos.index`, `workspace.tarefas`, `workspace.pedidos.index`, `workspace.agenda.index`, `workspace.marketing.anuncios`, `workspace.rh.ponto`, `workspace.turismo.corporativo`, `workspace.turismo.propostas.index`).
- **36 telas de gestão operacional não possuem modo Kanban**, mesmo operando com entidades de ciclo de vida e status definidos.
- **29 telas não possuem modo Tabela denso**, operando exclusivamente com listas de cards inflados.
- **Vício Estrutural Observado em 61 telas:** A aplicação impõe bifurcação rígida não-opcional no CSS:
  - Mobile (<600px): Renderiza forçadamente uma lista de cards verticais (`sm:hidden`).
  - Desktop (>=600px): Renderiza forçadamente uma tabela corporativa fixa (`hidden sm:block`).
  - **Efeito:** O usuário não tem autonomia para escolher entre Kanban, Tabela e Cards em nenhuma das viewports, contrariando o Requisito R2 e as referências de mercado (Belasis, Avec e Trello).

### 1.4 Primitivos Canônicos Existentes Prontos para Reutilização (Requisito R4)
- **Barra Canônica:** `src/components/workspace/workspace-canonical-toolbar.tsx` possui suporte nativo completo às propriedades `tabs`, `viewModes`, `activeViewMode`, `onViewModeChange` e contadores numéricos.
- **Kanban Universal:** `src/components/workspace/kanban/full-viewport-kanban.tsx` fornece componente desacoplado `FullViewportKanban<T>` com colunas coloridas, contadores e suporte a renderização livre.
- **Kanban por Nicho:** `src/components/workspace/kanban/niche-kanban-board.tsx` integra o Kanban com as máquinas de estado estritas (`src/lib/state-machines.ts`) e o manifesto de nichos (`src/lib/niche-manifest.ts`).

---

## 2. Logic Chain

1. **Premissa 1 (Inventário e Crescimento):** A auditoria baseline catalogava 380 rotas; a exploração verificou que o repositório agora possui 446 rotas ativas (68 novas rotas). Todas as 446 rotas devem ser preservadas integralmente conforme o Requisito R3 e B.9.
2. **Premissa 2 (Persistência e SSOT):** O Requisito R3 exige que componentes estáticos ou com dados hardcoded recebam contratos BFF e persistência real no banco de dados. Os 34 pontos identificados contêm fallbacks sintéticos, emojis ou arrays inline que violam as regras B.8, B.20 e R3.
3. **Premissa 3 (Ergonomia e Flexibilidade R2):** A rotina operacional de gestão (agendamentos de salão/clínica, carteira de clientes, pipeline de orçamentos, despacho de pedidos e ordens de serviço) necessita de visualizações adaptadas ao objetivo da tarefa:
   - *Modo Tabela:* Indicado para auditoria em lote, conciliação e exportação.
   - *Modo Kanban:* Indicado para fluxo visual de passagem de bastão por status (padrão Trello/Belasis).
   - *Modo Cards / Grid:* Indicado para escaneamento rápido e visualização resumida com foco em ações imediatas.
4. **Premissa 4 (Não-Duplicação e Mutação Cirúrgica):** O repositório já contém primitivos canônicos de alto padrão (`WorkspaceCanonicalToolbar`, `FullViewportKanban`, `NicheKanbanBoard`). Não se deve criar novos componentes concorrentes; deve-se orquestrar esses primitivos canônicos nas telas operacionais auditadas.
5. **Conclusão Lógica:** O plano de modernização deve manter as 446 rotas, eliminar as 34 ocorrências de dados estáticos/hardcoded através de serviços BFF conectados ao Supabase, e injetar o trio de visualização (Tabela, Kanban, Cards) nas 69 rotas operacionais do Workspace via `WorkspaceCanonicalToolbar`.

---

## 3. Caveats

- **Áreas não investigadas em profundidade:** O conteúdo interno de endpoints privados de terceiros (ex: webhooks legados da Evolution API ou instâncias Wasender sob `src/routes/api.webhooks.*`) foi verificado quanto a imports e loaders, mas não submetido a tráfego de rede ativo devido ao escopo estritamente read-only.
- **Premissas adotadas:** Presumiu-se que a presença de `useQuery` com funções de `@/services/*` constitui integração BFF real ativa, mesmo que a rota não adote o `loader` nativo do TanStack Router. Foi documentada a recomendação de unificar o pré-carregamento no `loader` para evitar Layout Shift (CLS).
- **Interpretações alternativas consideradas:** Avaliou-se se telas institucionais (`about`, `privacy`, `contact`) deveriam permanecer puramente estáticas em código. Concluiu-se que, para conformidade estrita com a Regra B.20 e R3, seus textos e configurações devem ser carregados dinamicamente de `marketplace_surfaces` ou tabela de configurações institucionais.

---

## 4. Conclusion

1. **Estado do Repositório:** O repositório é robusto e possui 446 rotas de UI e API, 64 submódulos de gestão no Workspace e 102 submódulos em vitrines.
2. **Plano de Remediação R3 (Backend & Persistência):** 34 arquivos de rotas/componentes necessitam de conexões cirúrgicas para substituir arrays fixos e presets por tabelas reais (`kanban_stages`, `marketplace_surfaces`, `catalog_categories`, `store_presets`).
3. **Plano de Implementação R2 (Visualizações Flexíveis):** As 69 telas operacionais de gestão devem receber o switch de visualização trifurcado:
   - **Tabela:** Visão corporativa de alta densidade com paginação e ordenação de colunas.
   - **Kanban:** Quadro de colunas estruturado via `FullViewportKanban` / `NicheKanbanBoard`, sincronizado com `kanban_stages` e máquinas de estado.
   - **Cards:** Grade limpa ultraminimalista sem sobreposição de contêineres (anti-containeritis DL-31).
4. **Alinhamento às Referências:** A arquitetura resultante atende rigorosamente aos padrões Belasis/Avec (agendamento com alternância imediata entre tabela, colunas de status e cards de cliente) e Trello (kanban expansivo e fluido).

---

## 5. Verification Method

Para verificar independentemente todos os achados deste inventário, execute os seguintes comandos no terminal:

```bash
# 1. Verificar contagem de rotas atuais vs snapshot
node -e "const fs = require('fs'); const cur = fs.readdirSync('src/routes').filter(f => f.endsWith('.tsx') || f.endsWith('.ts')); const snap = JSON.parse(fs.readFileSync('auditoria/00-inventario.json', 'utf8')).rotas; console.log('Atuais:', cur.length, 'Snapshot:', snap.length);"

# 2. Verificar arquivos com padrões mock ou arrays estáticos identificados
node .agents/teamwork/explorer_survey_1/scripts/scan_potential_static.cjs

# 3. Executar o design-lint canônico com a catraca mecânica de CI
node scripts/design-lint.mjs --ratchet

# 4. Executar checagem de tipos estrita
npm run typecheck
```

**Condições de Invalidação:**
- Se o número de arquivos em `src/routes/` for diferente de 446.
- Se `WorkspaceCanonicalToolbar` não possuir as props `viewModes` ou `tabs`.
- Se as rotas operacionais já dispuserem de alternância nativa completa para o usuário entre Kanban, Tabela e Cards (verificado: apenas 8 possuem toggle parcial).
