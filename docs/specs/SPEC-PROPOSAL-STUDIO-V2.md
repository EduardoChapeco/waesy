# SPEC-PROPOSAL-STUDIO-V2 — Editor de Propostas, Extração IA e Página Web Editorial

Status: CONCLUÍDA (Fases F0–F6 implementadas e verificadas end-to-end).

## 1. Diagnóstico (causas-raiz confirmadas no código)

| # | Sintoma | Causa-raiz | Local |
|---|---------|-----------|-------|
| D1 | 3 hotéis viram 3 "Opções/pacotes" no topo da página web | OCR mapeia `hotelsList` para `bundleOptions` (1 opção por hotel). Hotel é componente do pacote, não alternativa de cotação | `unified-proposal-workspace.tsx` ~1163-1173, ~2664; `_store.proposta.$token.tsx` ~446-470 |
| D2 | Hotéis aparecem repetidos no canvas (Hotel Diogo x2) e datas divergentes | Mesma causa D1 + merge de `hotels` sem dedupe por nome+checkin | idem |
| D3 | Transfers: 4 cards "in_out", orçamento marca 1, nomes ausentes | `type:"in_out"` fixo; `route_name`/nome do passeio não persistidos como título; editor usa só `proposalTransfers[0]` | workspace ~1300, ~1505, ~3569-3605, ~4218; `proposal-editorial-mapper.ts` ~319 |
| D4 | Passeio "City Tour" listado em "Serviços inclusos" mas não vira item estruturado | Extração só gera texto de inclusões; não há entidade `tours/activities` no DTO | `travel-proposal.functions.ts` DTOs |
| D5 | Upload de várias fotos mostra apenas 1 | Render usa `photos[0]`; sem componente de galeria; crop fixo 16:9 | templates + `proposal-editorial-mapper.ts` ~150 |
| D6 | "Gerar Roteiro" falha ("Nenhum passeio pré-cadastrado") | Gerador depende de catálogo por destino; não usa roteiro/OCR enviado nem tours extraídos | workspace (Sugerir Dias) |
| D7 | Editorial/webview ruim | Template editorial consome mapper com dados incorretos (D1-D5); sem blocos de mídia/vídeo editáveis | `TemplateEditorialFlat.tsx`, `ProposalEditorialAgency.tsx`, `_store.proposta.$token.tsx` |
| D8 | Sem "criar página web" a partir do editor | Web view é derivada, não entidade editável | novo |

## 2. Requisitos (EARS)

### R1 Modelo de dados
- O sistema SHALL separar `options` (alternativas de cotação = pacotes distintos) de `components` (voos, hotéis, transfers, passeios) dentro de uma opção.
- WHEN a extração encontrar N hotéis, o sistema SHALL criar 1 opção com N hospedagens, e SHALL criar N opções somente se o documento tiver N preços totais alternativos.
- O DTO SHALL incluir `tours[]` (nome, data, duração, inclui, fotos) e `transfers[]` com `name`, `kind` (arrival|departure|inter-city|round-trip), `route`, `date`, `private`, `vehicle`, `price_cents`.
- Cada hotel/hospedagem/passeio/transfer SHALL ter `media[]` (imagem|vídeo, `crop` por item, `caption`, `order`).

### R2 Extração IA/OCR
- WHEN o usuário enviar PDF ou imagem, o sistema SHALL executar OCR + extração estruturada por schema Zod com `confidence` por campo e `source_span`.
- O sistema SHALL extrair todos os transfers listados (um registro por trecho), todos os passeios, N hotéis, regime, bagagem, noites, ocupação.
- IF a confiança de um campo < 0.6, THEN o campo SHALL ser marcado "revisar" no editor, não preenchido silenciosamente.
- O sistema SHALL ter suíte de regressão com o corpus `Downloads/orçamento` (28 prints + 1 PDF) e gabarito JSON por arquivo.

### R3 Editor
- O editor SHALL exibir, em cada seção (hotel, passeio, transfer, voo), upload múltiplo com reordenação, crop por proporção (16:9, 4:3, 1:1, livre), legenda e remoção.
- O orçamento SHALL somar todos os transfers/passeios marcados como cobrados; seleção SHALL ser por item, não por `[0]`.
- O botão "Gerar Roteiro" SHALL montar dias a partir de (1) roteiro/OCR enviado, (2) tours extraídos, (3) catálogo/PassHub; IF nenhuma fonte, SHALL oferecer dias vazios editáveis sem erro.
- Rótulos de campos SHALL ser revisados (títulos ≤ 6 palavras).

### R4 Proposta PDF
- O PDF SHALL renderizar galeria (grade 2-4 fotos) abaixo das informações de cada hotel, transfers e passeios com nome real.

### R5 Página Web editorial (entidade editável)
- O editor SHALL ter ação "Criar página web" gerando `proposal_web_pages` (blocos ordenados: hero, galeria, hospedagem, voos, roteiro por dia, passeios, inclusos, condições, vídeo, CTA).
- O usuário SHALL editar blocos, subir imagens/vídeos, reordenar, ocultar; preview em tempo real mobile/desktop.
- WHEN existir mais de uma opção real, a página SHALL exibir tabs no header para alternar; WHEN existir 1, SHALL NOT exibir tabs de opção.
- O hotel SHALL aparecer na seção Hospedagem com galeria própria (carrossel + lightbox), nunca como pacote.
- Mídia ausente SHALL ser omitida (sem fallback sintético, regra B.33).

### R6 Invariantes
- Server functions com Zod, desestruturação completa, testes presença/ausência (B.25).
- Tokens, grade 4px, alvos 44px, estados loading/empty/error, sem `!important`, sem cor literal.
- Migrations com RLS; mídia em bucket com políticas de escrita/exclusão.

## 3. Fases (um item por vez, build+typecheck+lint+testes por fase)

| Fase | Entrega | Arquivos principais |
|------|---------|---------------------|
| F0 | Corpus de teste + gabaritos; reproduzir D1-D6 em testes que falham | `src/lib/tourism/__tests__/quote-corpus-fixtures.ts`, testes novos |
| F1 | Modelo de dados R1 + migration + DTO + mapper (corrige D1, D2, D3, D4) | `travel-proposal.functions.ts`, `proposal-editorial-mapper.ts`, migration |
| F2 | Extração IA R2 (schema, OCR, confiança, dedupe) | `travel-proposal-enrichment.server.ts`, workspace (apply) |
| F3 | Editor R3: mídia múltipla/crop/galeria, transfers/passeios multi-item, orçamento, gerar roteiro | workspace (extrair em módulos), componente `MediaGalleryField` |
| F4 | Templates PDF R4 com galerias | `templates/*`, `blocks/UI.tsx` |
| F5 | Página web editável R5 + tabs de opções + rota pública | `_store.proposta.$token.tsx`, novo editor de blocos, migration |
| F6 | Revisão end-to-end, design-lint ratchet, registro DEC em `docs/design/DECISIONS.md` | — |

## 4. Decisões Arquiteturais Adotadas (Execução Autônoma E2E)

1. **Persistência de Página Web Editorial:** Tabela dedicada `public.proposal_web_pages` (FK `proposal_id` CASCADE, `UNIQUE(proposal_id)`, RLS `is_store_staff(store_id)` com leitura pública estrita via BFF sanitizado `getPublicTravelProposalByToken`), garantindo SSR em 1 query sem vazar PII.
2. **Mídia Rica (Imagens & Vídeos):** Upload direto ao bucket `cms-media` via `getSignedUploadUrl` (suporta até 100 MB por arquivo incluindo `video/mp4`, `video/webm`, `video/quicktime` e `image/*`, sem limite de payload do Worker) + suporte a URL externa (YouTube/Vimeo/MP4) + recorte flexível destravado (`16:9`, `4:3`, `1:1`, `4:5`, `9:16`, `Livre`) e ponto focal por item (`ProposalMediaItem[]`).
3. **Motor OCR / Extração IA:** Pipeline híbrido em `processOperatorQuoteOcr`: extração multimodal direta (PDF multipágina `Orcamento.pdf` + screenshots PNG/JPG via `executeUnifiedAiCall` vision cascade) + pós-processador determinístico (`quote-ocr-normalizer.ts`) para correção de centavos, separação de transfers combinados (`+ Passeio City Tour`), preservação de múltiplos hotéis, escalas aéreas, bagagens, transfers nomeados/precificados e passeios com data, marcando campos de baixa confiança com `"Revisar"`.
4. **Auto-cura de Propostas Legadas (D1/D2):** Normalizador canônico `proposal-normalization.ts` aplicado em `rowToProposalDTO`, `toPublicTravelProposalDTO`, canvas e web view: colapsa `options[]` clonadas erroneamente de hotéis do mesmo pacote com preço idêntico e sem `source_proposal_id`, preservando integralmente cotações comparativas reais com pacotes/preços distintos ou vinculadas via `bundleTravelProposalsIntoSingleLink`.

## 5. Escopo de Fases Entregues
- **F0:** Corpus real (`src/lib/tourism/__tests__/quote-corpus-fixtures.ts`) e testes de regressão reproduzindo D1–D6.
- **F1:** Migration `20270523000000_proposal_media_transfers_and_web_pages.sql`, DTOs enriquecidos (`ProposalMediaItem`, `TransferDTO`, `TourOptionDTO`, `ProposalWebPageDTO`), normalizador canônico e whitelist pública completa.
- **F2:** Motor OCR V2 + pós-processador determinístico + Gerador de Roteiro IA/determinístico (`generateProposalItineraryAI`).
- **F3:** Componente `MediaGalleryField`, refatoração do `UnifiedProposalWorkspace` (multi-hotel vs opções comparativas, multi-transfer precificado, multi-tour, "Criar Página Web também") e `StudioSidebarEditor` (aba Página Web, uploads múltiplos com crop flexível, todos os transfers/passeios, Gerar Roteiro funcional, títulos ≤ 6 palavras).
- **F4:** Templates PDF (`blocks/UI.tsx` + 7 templates) com galerias de fotos abaixo de cada hospedagem e transfers nomeados reais.
- **F5:** `ProposalWebShowcase` + `ProposalWebPageBuilder` + `_store.proposta.$token.tsx` + `ProposalQuickPreviewSheet.tsx` com tabs exclusivas para opções reais, seções completas, vídeos jogáveis e zero chrome quebrado de classificados.
- **F6:** Auditoria final, `typecheck`, `vitest`, `design-lint --ratchet`, `check:bff`, `check:schema`, `check:types-ssot`, `build` e registro DEC em `docs/design/DECISIONS.md`.
