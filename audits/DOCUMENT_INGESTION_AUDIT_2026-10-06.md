# Auditoria de ingestão documental e OCR — 2026-10-06

## Resultado

- `npm run typecheck`: **passou**.
- Testes focados de onboarding/OCR/Copilot/SSE: **18/18 passaram**.
- `npm run build`: **passou**.
- `npm run audit:buttons`: **0 P0, 0 P1, 0 P2** em 6.145 controles.
- `check-client-server-leak.mjs`: **OK**, 494 chunks de boot sem runtime de servidor.
- Busca por `Sparkle`/`Sparkles` em `src`: **sem ocorrências**.
- `git diff --check`: **passou**.

## Correções executadas

### 1. OCR multimodal sem dados fabricados

O fallback anterior retornava valores fictícios quando a extração falhava, incluindo nome da plataforma, participante genérico e telefone de suporte. Agora:

- entidade não identificada permanece `Não identificado`;
- participantes permanecem vazios;
- código do documento permanece ausente;
- contatos de emergência permanecem vazios;
- o resultado informa revisão manual e confiança baixa;
- nenhum telefone, titular, empresa ou valor comercial é inventado.

### 2. Onboarding de cardápio/catálogo

- preço ausente não vira mais `R$ 10,00` implícito;
- ticket médio ausente não vira valor estimado arbitrário;
- nicho e moeda só são persistidos quando retornados pela extração;
- descrição de item de catálogo mestre ausente permanece nula;
- preço de catálogo mestre ausente permanece nulo.

### 3. Camada documental canônica

Criada a migração `20270107000000_document_artifacts_ocr_provenance.sql`, com:

- `document_artifacts`: arquivo original, bucket/path, hash SHA-256, MIME, tamanho, status de extração, engine, versão, texto, dados estruturados, confiança, proveniência, erro e revisão humana;
- `document_artifact_links`: vínculo auditável com entidades reais por `entity_type`, `entity_id` e relação;
- índices por loja/status/hash/entidade;
- RLS por `is_store_staff(store_id)` e administradores;
- trigger de `updated_at`;
- bucket/path como fonte canônica, sem depender de URL pública.

Criado o BFF `src/services/document-artifacts.functions.ts` com operações reais para:

- registrar ou idempotentemente reutilizar um arquivo;
- salvar resultado de extração/OCR;
- vincular arquivo a comprovante, produto, sessão de onboarding, brand kit, pedido ou outra entidade da loja.

## Limitações explicitamente preservadas

1. A migração foi criada e validada estaticamente, mas não foi aplicada remotamente ao Supabase nesta etapa. Aplicar DDL/RLS em produção requer execução do pipeline de migrações do ambiente do projeto.
2. O projeto não possui engine OCR mecânica instalada como dependência Node. `pdftotext` existe no sandbox, mas não deve ser assumido no worker Cloudflare. O contrato documental já suporta engines externas/versionadas sem gravar resultado como se fosse confirmado.
3. A IA continua sendo chamada exclusivamente pelo gateway existente; nenhum provider foi chamado diretamente nesta alteração.

## Warnings não bloqueantes do build

- avisos do bundler sobre diretivas `use client` de dependências Radix;
- arquivos de testes em `src/routes/__tests__` detectados pelo gerador de rotas, sem export de Route;
- exports nomeados em alguns route files que reduzem code-splitting;
- warning de configuração `pages_build_output_dir` do Wrangler;
- aviso de `sideEffects: false` para imports SSR no worker;
- warning de `duplicate-case` dentro do bundle de `html2canvas`.

Esses warnings não foram introduzidos pela camada documental e não impediram o build.
