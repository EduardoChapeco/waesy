# Plano Diretor de Mineração Multidomínio, Esteira de Dados e Copiloto Autônomo

> **Documento:** `docs/mining/MINING_AND_COPILOT_MASTER_PLAN.md`  
> **Versão:** 1.0.0 (Canônica)  
> **Status:** Ativo e Aprovado  
> **Governança:** AGENTS.md, Invariante M01 (Zero Mocks), Invariante M08 (Integridade Transacional), WCAG 2.2 AA e Apple HIG  

---

## 1. Visão Executiva e Arquitetura do Ecossistema

O Waesy opera como um ecossistema integrado de dados urbanos, inteligência comercial e curadoria editorial. A infraestrutura de ingestão e copiloto autônomo é dividida em **cinco camadas estritas**:

```
+-----------------------------------------------------------------------------------+
| 1. Interface de Chat & Copiloto Visual (AIChatShell & Omni-Builder)              |
|    - Cards Interativos de Artefatos (Planilhas, Fichas Técnicas, Páginas Base44) |
|    - Trilha de Atividade em Tempo Real (AIActivityTrail: Thought, Tool, Action)   |
|    - Ações Nativas de 1-Clique: "Abrir no Builder", "Exportar CSV", "Imprimir PDF"|
+---------------------------------------------------------+-------------------------+
                                                          |
                                                          v
+-----------------------------------------------------------------------------------+
| 2. Orquestrador de Agentes Autônomos (autonomous-copilot-orchestrator.ts)         |
|    - Fragmentador Heurístico de Prompts (Sintaxe EARS & MECE, Zero Custo de IA)   |
|    - Token Cache em Banco (SHA-256 no scraper_audit_log com TTL de 24h)           |
|    - Despachante de Workers Especialistas por Domínio                             |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
                    v                    v                    v
+-----------------------+ +--------------------+ +-------------------+ +--------------+
| 3. Harvesters Urbanos | | 4. Motores Legais  | | 5. Extratores     | | 6. Editorial |
|    - Overpass / OSM   | |    & Cadastrais    | |    Estruturados   | |    Squad     |
|      (Places, Hoteis) | |    - BrasilAPI/RFB | |    - Schema.org   | |    - Lead 6W |
|    - Nominatim Geo    | |      (CNPJ, QSA)   | |      (Jobs, Hotel)| |    - Pirâmide|
|    - PNCP Licitações  | |    - CNJ DataJud   | |    - BOM Recipes  | |    - Anti-AI |
+-----------------------+ +--------------------+ +-------------------+ +--------------+
                    |                    |                    |                    |
                    +--------------------+--------------------+--------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 7. Persistência Canônica no Supabase (jfuebqmltksyznovhlwa)                       |
|    - Tabelas: jobs, events, products, news_articles, experience_documents         |
|    - Auditoria e Caching: scraper_audit_log (tokens_saved, sha-256 hash)          |
|    - RLS Deny-by-Default com Isolamento Multi-Tenant e Posse Civil                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Matriz de Domínios de Mineração & Metodologias Open-Source

A esteira de mineração implementa as melhores práticas de projetos consolidados no ecossistema open-source mundial:

| Domínio de Mineração | Fontes Primárias & Protocolos | Referência Open-Source / Metodologia | Tratamento & Persistência Local |
| :--- | :--- | :--- | :--- |
| **Empresas & CNPJ** | Dados Abertos RFB, BrasilAPI, MinhaReceita | `caiopizzol/cnpj-data-pipeline`, `rictom/rede-cnpj` | Validação de dígito verificador, higienização de QSA, mapeamento de CNAE principal/secundário, gravação em cache SHA-256. |
| **Processos Judiciais** | API Pública CNJ DataJud, Diários Oficiais (DOU/DOE) | `abjur/datajudScraper`, `ulisses-jurisdev/datajud-process-scraper` | Extração por número único CNJ, parsing de movimentos, classes e assuntos CNJ, anonimização de segredo de justiça. |
| **Estabelecimentos & Leads** | OpenStreetMap (Overpass API), Nominatim | OSM Overpass QL, geocodificação reversa | Busca espacial por raio/bounding-box municipal, extração de endereço, telefone, categoria e inserção com vínculo de autor. |
| **Hotéis, Resorts & Turismo** | OpenStreetMap (`tourism=*`), JSON-LD `LodgingBusiness` | Schema.org Lodging, Overpass Tourism Tags | Extração de estrelas, comodidades (amenities), fotos oficiais, regras de cancelamento e precificação. |
| **Vagas de Emprego** | Schema.org `JobPosting` em JSON-LD, RSS de Vagas | `recipe-scrapers` port, Schema.org parsers | Extração de cargo, empresa contratante, regime (CLT/PJ), faixa salarial e persistência em `public.jobs` ativo. |
| **Agenda & Eventos** | Schema.org `Event`, portais municipais | JSON-LD Event parser mecânico | Extração de data de início/fim, local/venue, faixa de ingressos, persistência em `public.events` com ordenação temporal. |
| **Gastronomia & Receitas** | Schema.org `Recipe`, Microdata HTML | `hhursev/recipe-scrapers` (padrão ouro) | Extração mecânica de ingredientes, porções e tempo; vinculação determinística ao inventário da loja (BOM). |
| **Notícias & Jornalismo** | JSON-LD `NewsArticle`, Feeds RSS, Text Density | Algoritmo de Densidade Textual + Trafilatura/Readability | Deduplicação por URL SHA-256, lead das 6 perguntas, pirâmide invertida e persistência em `public.news_articles`. |

---

## 3. O Copiloto Autônomo & Geração de Artefatos

O Copiloto (`autonomous-copilot-orchestrator.ts`) não é um chat conversacional comum. Ele atua como um motor autônomo que transforma solicitações livres do usuário em artefatos executáveis:

### 3.1. Pipeline de 5 Elos
1. **Fragmentação de Prompt (Sintaxe EARS):**  
   O analisador heurístico identifica expressões regulares para CNPJ, Processos CNJ, cidades e termos-chave de domínio (leads, hotéis, vagas, eventos, receitas, builders), sem gastar tokens de IA nessa triagem preliminar.
2. **Cache Determinístico no Banco (`scraper_audit_log`):**  
   Gera um hash SHA-256 normalizado (`domain:query:city:state`). Se consultado nas últimas 24 horas, devolve imediatamente o artefato pronto com economia comprovada de tokens (`isCacheHit: true`).
3. **Execução Especializada Zero-Mock:**  
   Consulta dados factuais nos endpoints públicos ou nas tabelas canônicas do banco (`jobs`, `events`, `products`, `news_articles`). Proibido inventar dados sintéticos.
4. **Composição de Artefatos Vivos:**  
   - **Planilha Interativa (`spreadsheet`):** Tabela estruturada com ordenação e exportação CSV direta.
   - **Documento Técnico (`document`):** Ficha cadastral ou resumo processual formatado para visualização e impressão.
   - **Página Nativizada Omni-Builder (`landing_page`):** Composição de blocos canônicos Base44 persistidos em `public.experience_documents`, gerando link direto de edição (`/workspace/builder?doc=:id`).
5. **Trilha de Telemetria (`AIActivityStep[]`):**  
   Registra os passos de pensamento, chamada de ferramenta e conclusão com timestamps e status em tempo real.

---

## 4. Esteira Editorial & Padrão Jornalístico Profissional

As notícias curadas pelo ecossistema (`_store.noticias.$slug.tsx` e `editorial-squad.ts`) seguem estritamente as diretrizes da Associação Brasileira de Normas Técnicas e do jornalismo profissional (Associated Press / Folha de S.Paulo):

1. **A Pirâmide Invertida:** O primeiro parágrafo contém a informação mais crítica, seguido por desdobramentos de contexto e detalhes complementares no fechamento.
2. **O Lead das 6 Perguntas:** Respostas objetivas para: *O que aconteceu? Quem está envolvido? Quando ocorreu? Onde foi? Por que aconteceu? Como ocorreu?*
3. **Proibição de AI-Smell:** Bloqueio absoluto de expressões artificiais como "Em um mundo em constante evolução", "Vale ressaltar", "Diante deste cenário", "Em suma".
4. **Erradicação de Rótulos Internos:** Filtro estrito (`isForbiddenHeader`) impedindo termos operacionais ("Síntese", "Resumo", "Desenrolar", "Introdução", "Conclusão", "Contexto") de aparecerem como títulos na interface pública.
5. **Hierarquia Visual Canônica:**
   - Chapéu / Editoria em caixa alta (`text-primary font-bold tracking-wider`).
   - Headline limpa e objetiva (24px a 36px).
   - Linha Fina (Dek) em `text-muted-foreground` sem duplicar o Lead.
   - Linha única de metadados: Autor real, data formatada, tempo de leitura e link para fonte verificada.
   - Capa contida na proporção 16:9 com legenda e atribuição fotográfica.

---

## 5. Governança e Automação de Borda (Cloudflare Cron Triggers)

A execução periódica das rotinas de colheita ocorre de forma desacoplada na borda via Cloudflare Pages & Workers:

- **Configuração no `wrangler.toml`:**
  ```toml
  [triggers]
  crons = ["0 */2 * * *"] # Executa a cada 2 horas
  ```
- **Endpoint Canônico:** `/api/mining/worker`
- **Modos Suportados:**
  - `mode=news` ou `mode=harvest`: Dispara `executeAutomatedNewsHarvest` com deduplicação SHA-256 e curadoria editorial.
  - `mode=places`: Dispara `harvestAndPersistPlaces` para atualização de comércio e pontos de interesse via Overpass.
  - `mode=datajud`: Monitora movimentações de processos judiciais cadastrados.
  - `mode=all`: Executa a varredura completa da fila de rastreamento e notícias.
- **Autenticação:** Proteção por `Bearer ${MINING_WORKER_SECRET}` ou query parameter `token`.

---

## 6. Checklist de Verificação e Definição de Pronto (DoD)

Para fechamento de qualquer ciclo de mineração ou funcionalidade do copiloto:
- [x] Nenhuma nomenclatura comercial de terceiros ("Manus") no código, schemas, testes ou interfaces.
- [x] Zero mocks sintéticos ou produtos fictícios em produção (Invariante M01).
- [x] Deduplicação SHA-256 ativa no banco com registro de tokens economizados.
- [x] Artefatos de landing page e documentos perfeitamente integrados à tabela `experience_documents`.
- [x] Botão "Abrir no Builder" direcionando com 1-clique para o editor visual.
- [x] Suíte de testes automatizados com 100% de cobertura nos componentes de mineração e copiloto.
- [x] Zero violações P0 e zero violações P1 no linter visual (`scripts/design-lint.mjs`).
- [x] Registro formal de decisão de arquitetura documentado em `docs/design/DECISIONS.md`.
