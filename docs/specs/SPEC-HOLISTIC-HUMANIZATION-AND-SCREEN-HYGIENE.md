# SPEC-HOLISTIC-HUMANIZATION-AND-SCREEN-HYGIENE: Humanização Holística, Higienização de Telas & Tom Comercial BigTech

## 1. Contexto e Motivação
A plataforma Waesy consolidou sua infraestrutura autônoma militar, roteamento multi-provedor de IA e conexão aos builders de produtividade. No entanto, a exposição de termos técnicos de engenharia ("prompt", "tokens", "LLM", "RAG", "crawler", "scraper", "AST", "payload", "rate limit", "requirements") na superfície visível quebra a ilusão de simplicidade e gera atrito cognitivo em cidadãos e lojistas.

Esta especificação define os padrões de humanização e higienização estrita de telas, eliminando todo o "AI-smell" e substituindo mensagens robóticas ou em inglês cru por uma **linguagem consultiva, humana, acolhedora e comercial de alto nível (padrão Apple HIG, Linear e Manus AI)**.

---

## 2. Dicionário Canônico de Higienização de Interface

| Termo Técnico / Máquina (Proibido na UI) | Tradução Humana & Consultiva (Adotado) |
| :--- | :--- |
| *Prompt, Token, LLM, Embedding, RAG, AST, Payload* | **Consulta, Memória de Atendimento, Estrutura do Documento, Informações Organizadas** |
| *Crawler, Scraper, Spider, Mining, Ingestão* | **Central de Descoberta, Oportunidades Locais, Atualização de Registros Oficiais** |
| *HTTP 429, Rate Limit, Cooldown, Quota Exceeded* | **"Aguardando um instante para consultar a base com calma", "Atualizando em instantes"** |
| *Prompt Shield, Injeção, Sanitizer* | **Proteção Ativa de Dados, Verificação Rápida de Segurança** |
| *Requirements [], Benefits [] (Vagas de Emprego)* | **"O que a empresa busca", "O que ela oferece para você"** |
| *BACEN EMV Payload, CRC16* | **Código Pix para Copiar, Comprovante Verificado** |
| *Copilot Geral / Operacional* | **Assessor Local, Assessor de Negócios** |
| *Network Error, Status 500, Failed to fetch* | **"Tivemos uma oscilação rápida ao buscar esses dados. Já estou tentando novamente para você."** |

---

## 3. Requisitos em Sintaxe EARS

### 3.1 Higienização das Superfícies de Diálogo e Chat
- **UBIQUITOUS**: Toda superfície pública e corporativa do Copilot (`ai-chat-shell`, `copilot-artifact-panel`, `waesy-copilot-drawer`, `copilot-message-renderer`, `structured-message-view`) DEVE exibir rótulos, botões, tooltips e placeholders em linguagem humana e comercial, sem menção a tokens, prompts ou terminologias de engenharia.
- **WHEN** o usuário interagir com o chat ou drawer:
  - **THE SYSTEM SHALL** apresentar a persona de "Assessor Local" ou "Assessor de Negócios", com saudações acolhedoras e orientações didáticas.

### 3.2 Higienização de Mensagens de Erro, Circuit Breakers e Proteção
- **WHEN** o gateway de IA atingir cota de taxa (HTTP 429) ou cooldown:
  - **THE SYSTEM SHALL** exibir mensagem calmante e transparente ("Aguardando um instante para consultar a base com calma...") sem expor códigos HTTP, stacks ou menções a quotas técnicas.
- **WHEN** o filtro de segurança (Prompt Shield) bloquear uma requisição:
  - **THE SYSTEM SHALL** notificar o usuário de forma amigável sobre proteção ativa de dados sem termos hostis ou acusações de injeção.

### 3.3 Apresentação de Vagas de Emprego e Oportunidades
- **UBIQUITOUS**: As telas de detalhes e cards de vagas (`job-detail-desktop.tsx`, `job-detail-mobile.tsx`) DEVEM substituir seções de "Requirements" e "Benefits" por "O que a empresa busca" e "O que ela oferece para você", respectivamente.

### 3.4 Construtores Visuais e Artefatos Comerciais
- **WHEN** o usuário visualizar ou editar propostas, planilhas ou itinerários no split-view:
  - **THE SYSTEM SHALL** identificar os artefatos com terminologias comerciais claras ("Planilha Comercial", "Proposta", "Estrutura do seu Documento", "Dossiê de Viagem").

---

## 4. Critérios de Aceite e Verificação
1. **Compilação TypeScript:** `npm run typecheck` finalizado com Exit Code 0 em 100% dos arquivos do repositório.
2. **Suíte de Testes Automatizada:** Suíte de testes do Copilot e Chat 100% verde no Vitest, assegurando integridade funcional e regressão zero.
3. **Catraca de Design Lint:** `node scripts/design-lint.mjs --ratchet` aprovado com 0 violações P0 e 0 regressões P1.
4. **Acessibilidade e Ergonomia:** Todos os alvos interativos preservam altura canônica de 44px (`h-11 min-h-11`) com anel de foco `:focus-visible:ring-2`.
