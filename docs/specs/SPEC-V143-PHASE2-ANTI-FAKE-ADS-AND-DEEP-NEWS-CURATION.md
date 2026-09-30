# SPEC-V143-PHASE2 — Purga de Anúncios Falsos & Refatoração Profunda do Motor de Notícias e Curadoria IA

## 1. Escopo e Contexto
Auditoria forense no banco de produção (`jfuebqmltksyznovhlwa`) e nos motores de mineração identificou:
1. **Anúncios e Vagas Sintéticas**:
   - `public.classifieds`: 13 anúncios sintéticos inseridos por `scripts/seed_public_showcases.cjs` com imagens do `images.unsplash.com` e telefones fictícios (`49999123456` etc.), coexistindo com 5 anúncios reais de clientes (`post-media/classifieds/...`).
   - `public.jobs`: 10 vagas sintéticas inseridas por `scripts/execute_e2e_indexing.cjs` (`contact_whatsapp LIKE '499990100%'`).
   - `public.mined_tenders`: 8 editais sintéticos inseridos por `scripts/seed_public_showcases.cjs` e `scripts/test-sync-tenders.cjs`.
2. **Notícias Rasas, Repetitivas e com Imagens Quebradas/Stock (`public.news_articles`)**:
   - Os 41 artigos em `public.news_articles` foram gerados a partir do resumo de 1 frase do RSS (`item.description`), repetindo a mesma frase no `subtitle` e no `content_sections[0].content`, adicionando um parágrafo genérico fixo (`"Esta matéria foi apurada originalmente pela equipe de jornalismo..."`), usando imagens genéricas do Unsplash quando `item.image_url` era nulo, permitindo links de programação ao vivo (`"AO VIVO: assista à programação da NSC TV"`) e duplicando títulos.
   - Em `src/services/mining/mechanical-extractor.ts`, `extractFromJsonLd` ignorava `@graph` (Yoast/WordPress) e retornava precocemente quando `lead.length > 150` mesmo com `articleBody` vazio; `extractByDomainSelectors` usava regex `<div class="entry-content">[\s\S]*?<p>` que capturava apenas o primeiro parágrafo `<p>`.

## 2. Requisitos em Sintaxe EARS
- **REQ-01 (Ubiquitous)**: O banco de produção (`public.classifieds`, `public.jobs`, `public.mined_tenders`, `public.news_articles`) DEVE conter exclusivamente registros reais, sem sementes sintéticas ou fotos genéricas do `images.unsplash.com`.
- **REQ-02 (Event-Driven)**: QUANDO o extrator mecânico (`extractContentMechanically`) processar uma URL de notícia, o sistema DEVE decodificar entidades HTML numéricas/hexadecimais (`cleanHtmlText`), desdobrar grafos JSON-LD (`@graph`) e extrair todos os parágrafos `<p>` do corpo da matéria (`>= 3` parágrafos e `>= 400` caracteres) além da imagem original do veículo (`og:image` / `twitter:image`).
- **REQ-03 (Unwanted Behavior)**: SE uma pauta de RSS for transmissão ao vivo (`"AO VIVO"`, `"assista à programação"`, `"VÍDEOS:"`), não possuir imagem editorial real (`!isHealthyImageUrl` ou `images.unsplash.com`), possuir menos de 3 parágrafos reais ou duplicar `source_url`/`title_hash` existente, ENTÃO o Gate de Integridade (`validateMechanicalCompleteness`) e a Curadoria IA (`curateWithEditorialSquad`) DEVEM rejeitar a publicação.
- **REQ-04 (State-Driven)**: ENQUANTO uma matéria é estruturada pelo Squad Editorial (`curateWithEditorialSquad`), o `subtitle` (lead) DEVE sintetizar o fato principal sem repetir o `title` ou o primeiro parágrafo de `content_sections`, e `content_sections` DEVE conter múltiplos parágrafos jornalísticos reais sem textos de preenchimento artificial.

## 3. Invariantes e Evidências de Aceite
- `public.classifieds`: 0 registros com `images.unsplash.com`; 5 registros reais preservados intactos.
- `public.jobs`: 0 registros sintéticos (`499990100%`).
- `public.mined_tenders`: 0 registros sintéticos de seed.
- `public.news_articles`: 100% das matérias publicadas com `cover_media_url` real do veículo de imprensa, `>= 3` parágrafos reais em `content_sections`, `subtitle` distinto de `content_sections[0].content`, `ai_summary` preenchido e 0 títulos ou `source_url` duplicados.
