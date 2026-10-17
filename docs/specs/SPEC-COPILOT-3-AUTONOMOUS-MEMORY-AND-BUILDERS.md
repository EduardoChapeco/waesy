# SPEC-COPILOT-3-AUTONOMOUS-MEMORY-AND-BUILDERS: Ecossistema Autônomo Copilot 3.0 & Realtime Omni-Builder

## 1. Contexto e Motivação
O Waesy Copilot evolui de um assistente conversacional reativo para um **Assessor Executivo Local Autônomo (Estilo Manus AI)** conectado bidirecionalmente aos dados soberanos da plataforma e aos 5 Builders Nativos de Produtividade (Documentos, Planilhas, Apresentações, Sites e Posts Sociais).
A arquitetura atende às seguintes demandas estratégicas:
1. **Memória Semântica de Longo Prazo e Grafo de Fatos (RAG com pgvector):**
   - Transição da busca textual ingênua para embeddings vetoriais de 1536 dimensões (`copilot_semantic_memory`) e retenção contínua de fatos e preferências (`user_memory_facts`).
2. **Postura Consultiva Humana & Zero Alucinações:**
   - Erradicação de jargões robóticos e listas secas; adoção da "BigTech Persona" com acolhimento empático, contextualização de dados locais e grounding estrito via bloco `<GROUNDED_DATA>`, com recusa honesta quando não houver correspondência no banco.
3. **Ponte Unificada com os 5 Builders & Visualização Split-View:**
   - Criação e mutação em tempo real de documentos, planilhas com paginação acessível de 25 itens, apresentações em slides Apple Minimal, websites e roteiros com QR Code Pix BACEN EMV CRC-16 gerado dinamicamente, renderizados em tela dividida (Desktop) e Sheet inferior (Mobile).

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Memória Semântica e Grafo de Fatos do Usuário
- **UBIQUITOUS**: Toda interação do usuário com o Copilot DEVE permitir busca por similaridade de cosseno via função RPC `match_copilot_semantic_memory` com fallback em memória caso o cluster Postgres esteja sem o índice `ivfflat`.
- **WHEN** uma conversa revelar fatos estáveis do usuário (categoria de interesse, profissão, cidade preferida):
  - **THE SYSTEM SHALL** persistir o registro em `user_memory_facts` com `profile_id` e categoria tipada (`business`, `personal`, `travel`, `career`, `preference`).

### 2.2 Persona de Assessor Consultivo Local & Grounding Estrito
- **UBIQUITOUS**: As respostas do Copilot DEVEM adotar tom didático, acolhedor e fundamentado em dados reais de Chapecó e região, evitando qualquer suposição de empresas, telefones ou vagas inexistentes.
- **WHEN** a consulta às tabelas da plataforma (`directory_listings`, `jobs`, `classified_ads`, `news_articles`) retornar zero registros:
  - **THE SYSTEM SHALL** declarar honestamente a inexistência do registro na base oficial e sugerir alternativas próximas.

### 2.3 Bridge Bidirecional dos 5 Builders de Produtividade
- **WHEN** o usuário solicitar a criação de planilhas, documentos, apresentações, websites, posts sociais ou roteiros:
  - **THE SYSTEM SHALL** criar o registro tipado em `workspace_builder_documents` e associar o respectivo artefato em `copilot_chat_artifacts`.
  - **THE SYSTEM SHALL** estruturar o roteiro turístico com cálculo de orçamento e código Pix Copia-e-Cola BACEN com CRC-16 válido.
  - **THE SYSTEM SHALL** renderizar planilhas no frontend via `ArtifactInteractiveTable` com paginação tátil de 25 registros por página e botões de 44px (`h-11 min-h-11`).

### 2.4 Generative UI & Split-View
- **WHEN** o usuário clicar no botão "Visualizar" de qualquer card de artefato:
  - **THE SYSTEM SHALL** abrir o painel `CopilotArtifactPanel` em visualização dividida sem desviar a rota ou navegar para fora do chat.

---

## 3. Critérios de Aceite e Verificação
1. 39 testes unitários em Vitest aprovados com 100% de sucesso.
2. Compilação TypeScript com 0 erros (`npm run typecheck` Exit Code 0 em todos os 2.095 arquivos).
3. Catraca de Design Lint com Exit Code 0 e redução comprovada de débitos visuais.
4. Conformidade estrita com o piso WCAG 2.2 AA (touch targets >= 44x44px e `:focus-visible:ring-2`).
