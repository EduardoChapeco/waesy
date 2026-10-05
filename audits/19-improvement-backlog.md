# Onda 19 — Backlog Priorizado de Evolução Contínua

## Matriz de Priorização (Impacto vs. Risco vs. Esforço)

| ID | Item de Evolução | Problema Atual | Proposta Técnica | Risco | Rollout |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **EV-01** | **Indexação Contextual por Raio Geográfico (GPS)** | Filtro atual é por nome exato de cidade (`ilike 'Chapecó'`) | Introduzir PostGIS `ST_DWithin` ou distância Haversine nos BFFs | Baixo | Feature Flag por rota |
| **EV-02** | **Extração OCR Seletivo para Editais Escaneados** | Editais do PNCP em PDF escaneado não têm texto pesquisável | Pipeline de OCR seletivo apenas quando a extração nativa retornar < 50 palavras | Médio | Background worker com timeout |
| **EV-03** | **Streaming SSE no Chat Copilot** | Respostas longas do Copilot podem parecer demoradas | Habilitar Server-Sent Events (SSE) no TanStack Start para streaming de texto | Baixo | Progressivo no componente Chat |
| **EV-04** | **Validação Bidirecional de Feed Social (HTML para Imagem)** | Criação de posts usa HTML e converte no client via `html2canvas` | Adicionar validação de viewport e preview de proporção 1:1 e 4:5 antes do download | Baixo | Imediato na UI do Studio |
| **EV-05** | **Alerta Automático de Fila Excessiva via Telegram/Webhook** | Fila `crawl_queue` monitorada apenas via consulta manual ou log | Trigger no PostgreSQL via `pg_net` quando `status = 'pending' > 15.000` | Baixo | Migration segura |
