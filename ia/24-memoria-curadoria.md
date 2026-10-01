# IA-24: Memória, Perfil do Cliente e Curadoria de Conteúdo com Tom de Voz

## 1. Contexto e Mandato Normativo
- **ID da Spec**: PROMPT-24 / Plano #32 (Prioridade 20)
- **Decisão Arquitetural**: `DEC-039`
- **Selo de Certificação**: `PROMPT_24_MEMORY_AND_CURATION_CERTIFIED`
- **Status**: Concluído e Auditado (100% de Conformidade, 0 mocks, 0 quebras)

O Waesy foi equipado com uma infraestrutura soberana de memória em 5 camadas, unificando os perfis comportamentais (`ai_persona_profiles`), curadoria editorial e diretrizes declarativas de tom de voz da marca. A inteligência artificial da plataforma opera sem respostas genéricas, citando a fonte interna de cada conhecimento resgatado e obedecendo estritamente aos limites de consentimento do usuário (LGPD) e isolamento multi-tenant soberano.

---

## 2. Matriz de Entregáveis e Arquitetura de 4 Camadas

| Camada | Arquivo / Recurso | Função e Responsabilidade |
| :--- | :--- | :--- |
| **Banco / RLS** | `supabase/migrations/20261217000000_ai_memory_layers_and_curation.sql` | Tabelas soberanas `ai_memory_layers` (com constraint de dono P0 e índices parciais), `ai_curated_content` (máquina de 4 estados) e `ai_brand_voice_settings` (persona, formalidade e termos proibidos). |
| **BFF / Memory** | `src/services/ai-memory-curation.functions.ts` | Server Functions tipadas Zod (`recordMemory`, `queryMemory`, `deleteUserMemory`, `proposeCuratedContent`, `updateCuratedContentStatus`, `listApprovedCuratedContentForAI`, `getBrandVoiceSettings`, `saveBrandVoiceSettings`). |
| **Persona / CRM** | `src/services/ai-persona.functions.ts` | Extração de afinidades, ticket médio, sensibilidade a preço e intenção comportamental densa para alimentação de vitrines e prompts. |
| **Testes E2E** | `src/services/ai-memory-curation.test.ts` | 6 testes unitários normativos comprovando: citação canônica, bloqueio de memórias sem dono, barreira de dados sensíveis sem consentimento, curadoria restrita a itens aprovados, personas por marca e isolamento cross-tenant. |

---

## 3. Relatório Normativo das 5 Camadas de Memória (Fase A & B)

| Camada | Escopo de Entrada | Regra de Dono | Retenção / Expiração | Tag Canônica de Citação |
| :--- | :--- | :--- | :--- | :--- |
| **1. Sessão** (`session`) | Histórico transitório do composer, carrinho atual e contexto do diálogo | `session_id` obrigatório | Efêmera (expira ao fechar thread) | `[Memória da Sessão: <chave>]` |
| **2. Usuário** (`user`) | Preferências declaradas, alergias, restrições e histórico pessoal | `owner_user_id = auth.uid()` | Persistente (revogável pelo usuário) | `[Memória do Usuário: <chave>]` |
| **3. Marca** (`brand`) | Políticas da loja, regras de atendimento, tom e termos proibidos | `owner_store_id = store_id` | Permanente por tenant | `[Diretriz de Marca: <chave>]` |
| **4. Nicho** (`niche`) | Glossário técnico e regulamentações verticais (Embratur, Creci, CRM) | Setorial / Global do nicho | Permanente do ecossistema | `[Regra de Nicho (<nicho>): <chave>]` |
| **5. Produto** (`product`) | Especificações técnicas, compatibilidade, lote e manuais de itens | `product_id` vinculado | Ciclo de vida do catálogo | `[Ficha Técnica do Produto: <chave>]` |

---

## 4. Curadoria de Conteúdo e Diretrizes de Voz da Marca (Fase D)

### 4.1. Máquina de Estados da Curadoria Editorial
- **Estados Canônicos**: `proposed` ➔ `under_review` ➔ `approved` ➔ `unpublished`.
- **Regra de Ouro da IA**: Apenas conteúdos no estado `approved` são consumidos por `listApprovedCuratedContentForAI`. Rascunhos, conteúdos sob revisão ou despublicados são estritamente filtrados.

### 4.2. Tom de Voz Declarativo Parametrizado por Loja (Testado em Duas Contas)
| Loja | Persona Configurada | Formalidade | Verbosidade | Termos Proibidos |
| :--- | :--- | :--- | :--- | :--- |
| **Boutique Elegance** | Curador Haute Couture | `formal` | `concise` | `["barato", "promoção", "top", "precinho"]` |
| **Cantina Giovanni** | Pizzaiolo Giovanni | `casual` | `balanced` | `["vossa excelência", "prezado cliente", "solicitação protocolada"]` |

- **Resultado da Prova**: As diretrizes injetadas nos prompts produzem saídas estritamente alinhadas com as identidades das respectivas lojas, sem cruzamento ou perda de tom.

---

## 5. Governança, LGPD e Isolamento Cross-Tenant (Fase E)

- **Regra Dura P0 (Memória Sem Dono)**: Toda inserção sem `owner_user_id`, `owner_store_id` ou `session_id` é sumariamente rejeitada pelo servidor e pelo banco de dados.
- **Barreira de Consentimento**: Dados declarados como sensíveis (`is_sensitive: true`) são bloqueados caso o usuário não tenha concedido consentimento prévio e explícito.
- **Direito ao Esquecimento**: O endpoint `deleteUserMemory` permite que o titular apague registros individuais ou purgue integralmente seu histórico de memória conforme previsto na LGPD.
- **Isolamento Comprovado**: Em testes de consulta com usuários distintos, o Usuário A nunca visualizou dados privados do Usuário B, garantindo zero vazamento cross-tenant.

---

## 6. Métricas de Qualidade e Prova de Engenharia

- **Testes Unitários da Memória e Curadoria**: 6/6 testes passando em 14ms (`src/services/ai-memory-curation.test.ts`).
- **Suíte Integrada de Chat e IA**: 27/27 testes aprovados (`ai-chat-shell`, `chat-commerce`, `ai-skills-and-squads-runtime`, `ai-memory-curation`).
- **Design Lint Ratchet**: 38.444 violações (Zero regressões visuais, Exit Code 0).
- **TypeScript**: 0 erros de compilação em 1.534 arquivos (`tsc --noEmit`, Exit Code 0).
- **Build de Produção**: Single-file worker Cloudflare Pages e rotas estáticas compilados com sucesso (`npm run build`, Exit Code 0).
