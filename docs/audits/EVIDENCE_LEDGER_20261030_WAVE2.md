# Evidence Ledger — Onda Forense 2 — 2026-10-30

| Campo | Evidência |
|---|---|
| Branch/base | `production-candidate` / `origin/main` |
| SHA de entrada | `9b001449e3b5fd67ca1f2ec5e6de1c3be3ab54b1` |
| Worktree | Sujo; alterações anteriores preservadas |
| Escopo | crédito, parcelas, Social Studio, comunidade, notícias, subpainel, estoque, signers públicos e criptografia |
| Testes focados | `18/18` aprovados |
| Auditoria de ações | `8.277` controles; `P0=0`, `P1=0`, `P2=0` |
| Deep action audit | `0` no-op em rotas; `0` handlers suspeitos; `671` Server Functions sem consumidor frontend detectado |
| Ciclos | `0` |
| Tipos duplicados | `0` |
| ESLint focado | `0` erros; avisos históricos/any permanecem |
| Design lint global | bloqueado: `9 P0`, `3279 P1`, `485 P2`, `301 P3`; regressões ratchet DL-03 +3, DL-25 +4, DL-28 +1 |
| Typecheck | inconclusivo: processo sem saída após janela estendida, encerrado sem aprovação |
| Vitest focado pós-ajustes | `22/22` em ads-provenance, MCP server e CRM; suíte global não concluída nesta janela e exibiu falhas x em arquivos fora do escopo |
| Build Cloudflare Pages | aprovado; worker, rotas e client-leak gerados com exit `0` |
| Supabase remoto | não aplicado nem verificado; não havia credencial remota disponível |
| Deploy/produção | não declarado |

## Onda adicional — Meta/CAPI e performance de verificação

| Campo | Evidência |
|---|---|
| Spec | `docs/specs/SPEC-20261030-META-CAPI-WEBHOOKS-WAVE1.md` e `docs/specs/SPEC-20261030-TYPESCRIPT-BUILD-PERFORMANCE-WAVE1.md` |
| CAPI | `event_id` obrigatório/estável, SHA-256 lowercase, telefone `+55`, contexto request-first, Graph v19 e test code por tenant |
| Secrets | tokens Meta/Google movidos para payload cifrado de `integration_credentials`; DTO não retorna token |
| Webhook | assinatura HMAC fail-closed, handshake determinístico, Graph hydration de leadgen, custom fields e RPC idempotente |
| MCP/CRM | tenant obrigatório, valor persistido no servidor, falha de entrega não retorna sincronização falsa, rollback de reunião em falha de atividade |
| Build | `npm run build` aprovado; Cloudflare Pages worker/rotas/client-leak com exit `0` |
| Roteador | warnings de `*.test.*`/`__tests__` como rotas eliminados; permanecem apenas exports auxiliares de módulos de rota |
| TypeScript | typecheck sequencial ainda sem saída após janela estendida; encerrado sem aprovação. Gargalo confirmado na tipagem global do route tree, não em testes concorrentes |
| Design ratchet | não aprovado nesta onda; débito global histórico permanece no ledger anterior |

## Pendências específicas desta onda

- Aplicar e verificar a migration Meta/Supabase em ambiente remoto autorizado.
- Exercitar handshake, HMAC, Graph API, CAPI e GA4 com tráfego real ou fixtures assinadas; nenhuma prova de produção foi declarada.
- Decompor a árvore TanStack em fronteiras de projeto/rotas para reduzir o typecheck sem perder validação de paths.

## Correções verificadas localmente

1. Social Studio agora recebe `product` e exporta PNG real somente após gerar o arquivo.
2. Notícias e comunidade não fabricam conteúdo; falhas de notícias têm estado de erro explícito.
3. Solicitação de crédito é persistida como `pending_review`; não promete contratação, Pix ou cronograma.
4. Estoque usa RPC atômica baseada em `stock_on_hand`, com lock e idempotência por documento.
5. Token público de assinatura não concede mais leitura/escrita direta; o BFF filtra campos e atualiza apenas `pending`.
6. Fallbacks criptográficos previsíveis foram removidos de tickets e comprovantes financeiros.

## Pendências bloqueadoras

- Aplicar e testar migrations em banco descartável/homologação antes de produção.
- Corrigir a cadeia histórica de migrations que ainda referencia `stock_reserved`.
- Implementar oferta server-side de crédito, aprovação, contrato, parcelas e antecipação real.
- Validar assinatura do provedor na liquidação PIX e migrar o PIN/HMAC do banco para segredo gerenciado.
- Resolver o débito visual global e repetir `typecheck` com ambiente que conclua.

## Onda 3 e 4 — Sanidade Criptográfica (AES-256-GCM), Scanner Físico EAN e Code-Splitting do Builder

| Campo | Evidência |
|---|---|
| Criptografia AES-256-GCM | `src/lib/crypto-vault.server.ts` com validação de auth tag 128-bit (`TAG_LENGTH = 16`), inicialização explícita `{ authTagLength: 16 }` e eliminação de base64 legado em `api-orchestrator.functions.ts`, `mining.functions.ts` e `news.functions.ts` |
| Testes unitários do cofre | `src/lib/crypto-vault.server.test.ts` com `6/6` aprovados (AES-256-GCM, IV aleatório, fail-closed por adulteração de tag e compatibilidade retroativa) |
| Barcode scanner de supermercado | `SupermarketBarcodeScannerModal.tsx` com `BarcodeDetector` nativo (EAN-13, EAN-8, UPC, Code-128) e fallback manual tátil, em conformidade com WCAG 2.2 AA |
| Code-splitting do Omni-Builder | `OmniEditor.tsx` e `workspace.builder.$documentId.editor.tsx` modularizados com `React.lazy` sob `<React.Suspense fallback={null}>` |
| Hardening RLS Ingestão Pública | Migration `20261030203000_harden_public_ingestion_and_telemetry_rls.sql` para 6 tabelas com inserção pública: `mobility_requests`, `ad_telemetry_events`, `classified_analytics_events`, `creator_showcase_clicks`, `travel_quote_requests`, `leads_crm` |
| Catraca Design Lint (`--ratchet`) | **Aprovado com Exit Code 0**. 2.561 arquivos inspecionados, 0 regressões, débito reduzido de 3.896 para **3.869 violações líquidas** |
| Testes focados vitest | `33/33` aprovados (pricing, cloud, cash ledger, supermarket, news, finance, crypto-vault) |
| Contratos arquiteturais | 0 ciclos, 0 tabelas BFF órfãs, 570 migrations com version uniqueness OK, 0 tipos duplicados, 0 dead code, 0 segredos desautorizados |

