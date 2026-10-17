# SPEC-JOB-POSTING-MINING-AND-CURATION-REMEDIATION: Remediação Arquitetural e Curadoria Contínua do Subsistema de Vagas (Jobs)

## 1. Contexto e Diagnóstico Forense
A auditoria no subsistema de extração de vagas (`job-opportunity-extractor.ts`) identificou 4 falhas arquiteturais críticas:
1. **Confusão de Catálogo vs. Vaga Individual:** Páginas de busca de portais (como `vagas.com.br/vagas-em-chapeco-sc`, `catho.com.br/vagas/...`, `indeed.com/empregos-em-...`) eram processadas como uma vaga singular em vez de serem spideradas para extrair os links individuais de cada vaga filha.
2. **Títulos Corrompidos:** Títulos de listagem agregada ("1 vaga de emprego para chapeco sc", "Vagas de emprego em Chapecó") eram persistidos diretamente como nomes de cargos.
3. **Salários Corrompidos:** Texto de links de acessibilidade ("Pular para o conteúdo Vagas.com Menu Cad") era capturado como salário por fallbacks agressivos de fatiamento de string.
4. **Descrições Poluídas:** Dump cru do HTML de navegadores e avisos de cookies da página inteira no campo `description`, enquanto `requirements` e `benefits` permaneciam como arrays vazios (`[]`).

## 2. Requisitos em Sintaxe EARS

### 2.1 Detecção de Catálogo e Spidering de Links Filhos (Anti-Aggregation Trap)
- **WHEN** uma URL ou conteúdo HTML de vaga for submetido à extração:
  - **THE SYSTEM SHALL** extrair as tags `<title>` e `<h1>` limpas antes de qualquer avaliação heurística.
  - **THE SYSTEM SHALL** classificar a página como catálogo de vagas (`isJobListingPage === true`) se:
    1. A URL corresponder a rotas de listagem (`/vagas-em-`, `/empregos-em-`, `/buscar`, `/search`, `/vagas?`).
    2. O título contiver padrões agregadores (`/\b\d+\s+vagas?\b/i`, `/\bvagas?\s+de\s+emprego\b/i`, `/\bbusca\b/i`, `/\bencontramos\b/i`).
    3. O DOM contiver 3 ou mais links para vagas filhas individuais.
  - **WHEN** uma página de catálogo for detectada:
    - **THE SYSTEM SHALL** extrair recursivamente todos os links de vagas individuais (`extractJobLinksFromListing`) suportando Vagas.com.br, Indeed, Catho, Gupy, InfoJobs, Trabalha Brasil e portais regionais.
    - **THE SYSTEM SHALL** enfileirar as vagas individuais na `crawl_queue` com prioridade alta (`priority: 9`), `entity_type: "job"` e `discovered_via: "jobs_portal_spider"`.
    - **THE SYSTEM SHALL** bloquear terminantemente a inserção da página de busca na tabela `jobs`.

### 2.2 Sanitização e Normalização Estrita de Títulos de Cargo
- **WHEN** uma vaga individual for extraída:
  - **THE SYSTEM SHALL** remover sufixos e branding de portais (" - Vagas.com.br", " \| Indeed", " - Catho", " \| Gupy", etc.).
  - **THE SYSTEM SHALL** validar que o título é uma função comercial ou técnica real (mínimo de 4 caracteres, sem frases genéricas de busca).
  - **IF** o título contiver padrões residuais de busca, **THEN THE SYSTEM SHALL** rejeitar a extração e marcar a fila com status de erro legível.

### 2.3 Sanitização Segura de Salário (Zero Text Slicing)
- **WHEN** o salário for extraído do Schema.org ou do corpo da vaga:
  - **THE SYSTEM SHALL** aceitar exclusivamente valores monetários em formato BRL (`R$ X.XXX,XX`) compreendidos entre R$ 500,00 e R$ 100.000,00.
  - **IF** nenhum padrão monetário válido for encontrado, **THEN THE SYSTEM SHALL** padronizar o campo `salary_display` para `"A combinar"`.
  - **THE SYSTEM SHALL** proibir qualquer fatiamento arbitrário de texto cru ou inclusão de termos como "pular", "conteúdo", "cadastrar", "login".

### 2.4 Purificação de Conteúdo, Requisitos e Benefícios
- **WHEN** a descrição for processada:
  - **THE SYSTEM SHALL** isolar o nó principal de descrição da vaga (`article`, `main`, `[class*="job-description"]`, `[itemprop="description"]`), descartando tags de `<nav>`, `<header>`, `<footer>`, `<aside>`, `<script>`, `<style>` e banners de cookies.
  - **THE SYSTEM SHALL** identificar e extrair listas de Requisitos (`requirements: string[]`) a partir de seções "Requisitos", "Exigências", "Qualificações", "Pré-requisitos".
  - **THE SYSTEM SHALL** identificar e extrair listas de Benefícios (`benefits: string[]`) a partir de seções "Benefícios", "O que oferecemos", "Vantagens".
  - **THE SYSTEM SHALL** formatar a descrição final em Markdown limpo e conciso, livre de menus e disclaimers legais de portais.

### 2.5 Curadoria Contínua e Purga Automática no Banco
- **WHEN** o motor de saneamento periódico for executado:
  - **THE SYSTEM SHALL** purgar da tabela `jobs` qualquer registro cujo título ou salário contenha indicadores de busca agregada ou links de acessibilidade.
  - **THE SYSTEM SHALL** re-estruturar vagas ativas que possuam arrays de requisitos ou benefícios vazios via síntese com IA (`curateMinedJobWithAi`).

## 3. Critérios de Aceite
1. Zero vagas de busca ("1 vaga de emprego para chapeco sc") inseridas na tabela `jobs`.
2. 100% dos salários no formato `"R$ ..."` ou rigorosamente `"A combinar"`.
3. 100% das descrições livres de avisos de cookies e cabeçalhos de navegação de portais.
4. Suíte de testes unitários `job-opportunity-extractor.test.ts` 100% aprovada.
5. Catraca de Design Lint com Exit Code 0 e Typecheck sem erros.
6. Registro formal da decisão DEC-216 em `docs/design/DECISIONS.md`.
