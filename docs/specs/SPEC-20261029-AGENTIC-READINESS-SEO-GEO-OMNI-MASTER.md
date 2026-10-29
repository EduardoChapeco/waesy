# SPEC-20261029-AGENTIC-READINESS-SEO-GEO-OMNI-MASTER

## 1. Contexto e Objetivo
Elevar o índice de prontidão para agentes autônomos (**Is Agentic / Ora Readiness Score**) de `https://waesy.com.br` de **54/100 para 100/100** (resolvendo integralmente os 20 pontos de auditoria Essential e Recommended) e estabelecer a arquitetura unificada de **SEO, GEO (Generative Engine Optimization), WebMCP, Autoridade de Backlinks e Ficha Cadastral CNPJ** em todas as superfícies públicas do ecossistema Waesy (Home, Portal de Notícias, Perfis de Empresas, Lugares, Eventos, Receitas, Publicações e Sites do Omni-Builder), garantindo isolamento Zero-Trust (proibição absoluta de exposição de tabelas, schemas, colunas ou rotas privadas).

## 2. Requisitos Estruturados em Sintaxe EARS

### R1 — HTML Semântico sem JavaScript, H1 Canônico e Descoberta de Marca (Checks #1, #5, #8, #14)
- **WHEN** um crawler de busca (Googlebot) ou agente de IA requisitar a página inicial (`/`) sem executar JavaScript, **THE SYSTEM SHALL** renderizar no HTML inicial um cabeçalho semântico contendo `<h1>` explícito com a marca e proposta de valor (`Waesy — Marketplace Local, Comércio, Serviços, Notícias e Ecossistema de Agentes IA`), hierarquia sequencial de subtítulos (`<h2>`, `<h3>`), mais de 600 caracteres de conteúdo descritivo legível e links diretos para `/developers`, `/docs`, `/api/openapi.json`, `/api/webmcp.json`, `/llms.txt`, `/about`, `/contact`, `/privacy` e `/noticias`.

### R2 — Negociação de Conteúdo Markdown e 404 Amigável a Agentes (Checks #2, #4)
- **WHEN** qualquer agente requisitar uma rota pública com o cabeçalho `Accept: text/markdown`, **THE SYSTEM SHALL** responder com `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept` e corpo Markdown estruturado (com frontmatter YAML, `# H1`, resumo semântico, metadados GEO e links navegáveis).
- **WHEN** um agente requisitar `Accept: text/html`, **THE SYSTEM SHALL** responder com HTML padrão incluindo o cabeçalho `Vary: Accept`.
- **WHEN** um agente requisitar uma rota inexistente (ex.: `/__ora-404-probe-*`) com `Accept: text/markdown`, **THE SYSTEM SHALL** preservar o status HTTP `404` e retornar corpo Markdown (`Content-Type: text/markdown; charset=utf-8`, `Vary: Accept`) com explicação detalhada (> 200 caracteres) e links para `/docs`, `/developers`, `/sitemap.xml` e `/llms.txt`.
- **IF** a requisição tiver como alvo rotas privadas (`/workspace/*`, `/admin-master/*`, `/admin/*`, `/conta/*`, `/checkout/*`, `/auth/*`), **THEN THE SYSTEM SHALL** bloquear a negociação Markdown pública (`403 Forbidden` / proteção de sessão) sem jamais expor estrutura interna.

### R3 — Erros JSON Estruturados, Rate Limit Headers, Versionamento e Depreciação em `/api/*` (Checks #3, #6, #12, #13, #19, #20)
- **WHEN** qualquer endpoint sob `/api/*` for chamado ou retornar erro (`400`, `401`, `403`, `404`, `405`, `429`, `500`), **THE SYSTEM SHALL** retornar exclusivamente JSON estruturado (`Content-Type: application/json; charset=utf-8`) contendo `status`, `error.code`, `error.message`, `error.hint` e `error.docs_url`, além dos cabeçalhos RFC `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `RateLimit-Policy`, `X-API-Version`, `Deprecation` e `Sunset`.
- **WHEN** `/api/openapi.json` for consultado, **THE SYSTEM SHALL** expor 100% das operações com `operationId` único, descrição para function-calling e schemas de resposta tipados (`200`, `400`, `401`, `403`, `404`, `429`, `500`).

### R4 — Protocolo MCP Streamable HTTP Handshake (Check #15)
- **WHEN** um cliente MCP (Claude, Cursor, ChatGPT, Ora Scanner) enviar requisições JSON-RPC 2.0 (`initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`, `resources/list`, `prompts/list`) ou `GET` para `/api/mcp/v1/tools/call`, **THE SYSTEM SHALL** completar o handshake oficial do Model Context Protocol (`protocolVersion: "2024-11-05"` / `"2025-03-26"`) preservando compatibilidade integral com chamadas diretas `{ tool, arguments, storeId }`.

### R5 — Páginas de Confiança, Portal de Desenvolvedores, CLI e `llms.txt` (Checks #7, #9, #10, #11)
- **WHEN** agentes ou usuários acessarem `/about` (`/sobre`), `/contact` (`/contato`), `/privacy` (`/privacidade`), `/developers` e `/docs`, **THE SYSTEM SHALL** servir páginas públicas com mais de 1.000 caracteres de conteúdo institucional/técnico verificável, documentação da CLI (`npx @waesy/cli`), guias de autenticação e política de versionamento.
- **WHEN** `/llms.txt` ou `/.well-known/agent-instructions.md` for lido, **THE SYSTEM SHALL** apresentar a seção `## When to Use Waesy (Agent Instruction & Job-to-be-Done Guidance)` com casos de uso explícitos e instruções de invocação.

### R6 — Metadados Completos, Schema.org Organization, Perfis de Empresas com Cartão CNPJ e Squad IA de Curadoria (Checks #16, #17, #18)
- **WHEN** qualquer página pública for renderizada, **THE SYSTEM SHALL** injetar `<html lang="pt-BR">`, `<link rel="canonical">`, `<meta property="og:image">`, `<meta property="og:type">` e JSON-LD `Organization` completo com `description`, `address` (`PostalAddress`) e `contactPoint`.
- **WHEN** o perfil público de uma empresa (`/loja/$slug`, `/diretorio/$id`, `/places/$placeSlug`) for acessado, **THE SYSTEM SHALL** disponibilizar a aba/seção **"Informações da Empresa" (Ficha Cadastral & Cartão CNPJ)** exibindo e indexando via JSON-LD `LocalBusiness`: Razão Social, Nome Fantasia, CNPJ validado, Situação Cadastral, CNAE Principal/Secundários, Natureza Jurídica, Endereço Completo, Coordenadas Geográficas (`GeoCoordinates`), Horários e Backlinks Oficiais (`sameAs`), com suporte a enriquecimento automático via BrasilAPI e Squad IA de Curadoria.

### R7 — Motor Interno Is-Agentic / Ora Readiness & Omni-Builder SEO/GEO/Backlink Graph
- **WHEN** um site ou página for auditado ou publicado no Omni-Builder (`WixVisualSitemapModal` / `generateOmniPageSeo`), **THE SYSTEM SHALL** calcular a nota **Agentic & SEO/GEO Readiness (0–100)** baseada nas 20 regras Ora + GEO + Backlinks e autopreencher metadados, schemas e grafos de autoridade sem expor dados sensíveis do backend.

## 3. Invariantes e Segurança (Zero-Trust)
1. **Zero Exposição de Backend**: Nenhum endpoint público, manifesto OpenAPI/WebMCP, arquivo `llms.txt` ou resposta Markdown pode expor nomes de tabelas internas do PostgreSQL, colunas privadas, políticas RLS, chaves de API ou margens financeiras.
2. **Conformidade Visual (DL-01 a DL-32)**: Zero `!important`, zero cores hex literais em componentes, zero classes arbitrárias entre colchetes, touch targets mínimos de `h-11` (44px) e anéis `:focus-visible`.
