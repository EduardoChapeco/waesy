# Plano de Implementação — Dashboard de Tarefas Inteligente & Alinhamento Visual Global

Este plano detalha a reestruturação e enriquecimento do dashboard de tarefas ("Meu Dia"), a padronização de espaçamentos (paddings) nos módulos de CRM/Clientes e Viagens, e o cronograma de auditoria sistemática das regras de segurança (RLS), performance e tipagem.

---

## Proposta de Alterações

### 1. Novo Dashboard Inteligente de Tarefas (`MyDayView.tsx`)
O dashboard atual ("Meu Dia") exibe apenas cartões de KPIs e listas de tarefas simples. Vamos transformá-lo em uma central de inteligência e acompanhamento operacional integrada com o restante do sistema.

#### Elementos a Adicionar:
* **Módulo de Métricas e Produtividade**:
  - Inclusão de um mini-gráfico de linha/barra semanal usando `recharts` mostrando o progresso da equipe (Tarefas Criadas vs. Concluídas nos últimos 7 dias).
* **Painel de Pendências Críticas Inter-Módulos**:
  - **Cotações Quentes (CRM)**: Alerta com atalho de cotações que foram visualizadas pelo cliente nas últimas 24h e necessitam de follow-up (tabela `proposals` com `status = 'sent'`).
  - **Contratos Pendentes (Vendas)**: Listagem de viagens com contratos enviados que ainda não foram assinados e cujo embarque se aproxima (tabela `contracts` e `trips`).
  - **Embarques Próximos (Operações)**: Lista de voos/viagens programadas para as próximas 48h sem voucher emitido ou sem mensagem de pré-embarque enviada.
* **Alternador de Carga de Trabalho**:
  - Seletor rápido de agente/consultor no topo (visível apenas para admins) para analisar o dashboard de Meu Dia de qualquer membro da equipe, facilitando a redistribuição de tarefas.

---

### 2. Alinhamento Visual Global de Páginas (Padding & Margins)
Para estender a melhoria feita no Kanban e manter a consistência visual em todo o TravelOS, vamos remover as folgas excessivas de topo em outras telas principais de visualização:
- **Módulo de Clientes**:
  - **[agency.$slug.clients.index.tsx](file:///C:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.clients.index.tsx)** e **[agency.$slug.clients.$id.tsx](file:///C:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.clients.$id.tsx)**: Remover paddings exagerados de topo nas áreas de conteúdo.
- **Módulo de Viagens**:
  - **[agency.$slug.trips.index.tsx](file:///C:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.trips.index.tsx)** e sub-rotas de detalhes: Ajustar o topo das abas operacionais para colar no cabeçalho mantendo a identidade visual do Kanban.

---

### 3. Checklist de Auditoria Sistemática (Regras Pétreas & Agentes)
Antes de implantar as novas queries no banco para o dashboard, rodaremos o sweep completo:
- **REDTEAM**: Confirmar que a query do dashboard em `MyDayView.tsx` filtra estritamente por `agency_id` obtido do context de segurança (prevenindo falhas de IDOR/multitenancy).
- **PERFORMANCE**: Garantir que as contagens de cotações e contratos usem joins indexados ou agregados de banco de dados rápidos, sem loops `N+1` no React Query.
- **DBMASTER**: Validar se as novas visualizações integradas respeitam a estrutura de chaves do types do Supabase atualizado (392 KB).

---

## Plano de Verificação

### Testes Manuais
1. Validar no painel "Meu Dia" o carregamento correto dos cards com as cotações pendentes e contratos.
2. Confirmar se a alternância de agentes no topo recarrega os dados do dashboard de forma instantânea.
3. Testar a remoção de espaços em branco nos módulos de CRM (Clientes) e Viagens.

### Testes Automatizados
- Rodar `npm run typecheck` e `npm run build` para garantir que o bundle final e as novas queries estão tipados.
