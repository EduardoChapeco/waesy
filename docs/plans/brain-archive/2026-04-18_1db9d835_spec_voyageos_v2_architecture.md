# Documentação Arquitetural V2 - Turis Agências (Spec-Driven Development)

## 1. Visão Geral da Atualização e Escopo (SDD)
Esta especificação define o roteiro técnico e estrutural para a evolução da plataforma Turis Agências, priorizando o uso intensivo de *Agentes Autônomos de IA (Squads)*, fluxos operacionais refinados (Paridade Trello/Pipefy) e design funcional focado no usuário, removendo barreiras como falta de cadastros rápidos e métricas irrelevantes.

---

## 2. Renovação do Dashboard (Home / Início)
O design atual com títulos demasiadamente "exclamativos" (ex: Cofre de inteligência) será substituído por métricas reais, acionáveis e silenciosamente eficientes.

### 2.1 Visão Funcional (O que muda no UI)
- **Painel de Operações Diárias:** Substitui os widgets genéricos por painéis focados.
   - *Embarques Hoje:* Lista de viajantes embarcando.
   - *Check-ins Liberados / Pendentes*
   - *Vouchers Enviados vs Pendentes*
- **Live Travel Map (`<LiveTravelMap />`):** 
   - Um grande mapa (estilo flightradar simplificado) ocupando uma seção inteira estilo "Bento Block".
   - Pins distribuídos geograficamente indicando onde estão os viajantes *hoje*, permitindo clique para abrir o perfil da viagem ou enviar uma mensagem rápida via Z-API/WhatsApp.

### 2.2 Estrutura de Componentes
- `src/pages/Dashboard.tsx` (Refatorada)
- `src/components/dashboard/LiveTravelMap.tsx` (Nova integração via Mapbox ou Leaflet + Supabase PostGIS)
- `src/components/dashboard/DailyMetricsBento.tsx`

---

## 3. Portal de Notícias AI-Driven & Blog Bento Grid
Um sistema autônomo e corporativo para consumo e re-distribuição de informações de turismo, focado em nutrir uma base de conhecimento para a agência ou compartilhar com clientes finais.

### 3.1 Times/Squads de Agentes Criados (Arquitetura de Swarm)
O sistema contará com Agentes Independentes rodando em Edge Functions via crons diárias:
- **Agente 1: RSS Harvester (Cron)**
  Bate em Jornais e Agências (Panrotas, Brasilturis, Folha, etc.), filtra palavras-chave (Turismo, Aviação, Vistos) e salva em `raw_news_entries`.
- **Agente 2: Curation & Validation Squad**
  Lê os artigos, verifica veracidade, cruza fatos com fontes governamentais e elimina clickbait.
- **Agente 3: Tone & Rewrite Squad**
  Define o *Tone of Voice* (Institucional, Urgente, Lazer) com base no destino e perfil. Reescreve o texto tirando jargão técnico (se for para cliente) ou sumarizando impactos financeiros (se foco for para o gestor).
- **Agente 4: Publisher Squad**
  Aplica formatação Markdown limpa, encontra/gera imagens com ferramentas associadas e agenda a publicação.

### 3.2 Design e Front-End do Blog
- **Estilo Padrão da Plataforma (System Design):** Layout Bento Grid (Tetris-like), cantos perfeitamente arredondados (radius elevado), sem linhas pretas sólidas nos contornos, focado em grids que se encaixam dinamicamente.
- Componentes modulares permitirão arrastar-e-soltar widgets: *Anúncios*, *Download de Materiais (eBooks)*, *Notícias Populares*.
- URLs contarão com Schema Markup dinâmico (`application/ld+json`) lido nativamente pelo Google. Múltiplos RSS Outbounds serão gerados dinamicamente baseados na categoria.

### 3.3 Novas Tabelas e Funções Necessárias
- Tabela `news_articles`: `id, title, content (markdown), original_url, rewritten_by_ai (bool), tone_category, seo_metadata (jsonb)`.
- Edge Function: `cron-rss-orchestrator.ts` (Dispara o harvester).
- Edge Function: `ai-news-squad.ts` (Processa lotes de 10 notícias usando gpt-4o-mini ou claude 3.5 haiku).
- Rota de UI: `src/pages/NewsPortal/NewsDashboard.tsx`
- Rota de UI: `src/pages/BlogBuilder/BlogLayoutConfig.tsx` (Customização do blog).

---

## 4. Evolução do Z-API, Extensão WhatsApp e Módulo CRM
Conectar o Z-API, extensões do Chrome e o Kanban de forma a unificar totalmente o fluxo sem fricção.

### 4.1 Handoff Inteligente Via Z-API/Extensão
- Ao identificar um novo número via extensão do WhatsApp, o sistema deve registrar nome/telefone automaticamente (cadastro super-rápido invísivel).
- **IA Ativada (Profile BuilderAgent):** Um agente em background analisa as transcrições das conversas ou notas cruas colocadas no card para deduzir preferências (ex: "tem 2 filhos", "quer ir pra europa") e preenche JSON dinâmico no `clients.profile_insights`.

### 4.2 Arquitetura Kanban Nível "Pipefy/Trello"
Reparar todas as lentidões e fluxos que não escalam (ex: Selects lentos, Checklists "0/0", falta de vínculos complexos).
- **SLA e Workflow Engines:**
   Tags terão SLAs atreladas. Colunas terão limites. Automação *when card moves to X, do Y*.
- **Quick Create (Cadastro Rápido Multi-Nível):**
   Dentro do Kanban / CRM, qualquer Select (Viagem, Cliente, Agente) terá um botão silencioso "Criar Pressionando Enter" que usa Mutate direto sem sair da tela e recarrega os dados.
- **Micro-Módulo de Checklist e Operações Múltiplas:**
   Novas tabelas de "Checklist Templates" para pré-carregar checklists com 1 clique (ex: Template "Emissão ZUP" insere 15 tarefas prontas, parando o bug do 0/0).

### 4.3 Como os agentes cometeram erros (Bugs Anteriores)
As interconexões complexas (metadata JSON versus flat tables) geraram *silent bugs*: o banco não alertou sobre o erro do `<Select>` por causa do Type Casting liberal no TypeScript, e o UX de checklists (0/0) ocorreu porque a criação salva uma checklist nula em vez de abrir modal para template. Processos foram aprimorados para evitar "type hacking".

---

## 5. Próximos Passos (Execução Guiada pelo Agente)
1. **Semana 1: Fixes e Refinamento do CRM (Em Andamento)**
   Implementação do "Adicionar rápido" no Select Cliente e inserção de Responsáveis.
2. **Semana 2: Nova Dashboard UI e Live Map**
   Prototipar visual do Mapbox.
3. **Semana 3: Edge Functions de IA e RSS Feed (Blog)**
   Criação das crons AI-Swarm.
4. **Semana 4: Builder Bento Grid**
   Polimento final do Layout drag and drop.
