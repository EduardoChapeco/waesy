# SPEC-20261119-PHASE2-CORE-MULTINICHE-TURIS — Evolução Arquitetural End-to-End (Core Multinicho + Vertical Turis)

## 1. Objetivo
Refatorar, blindar e evoluir o ecossistema Waesy sob a arquitetura **Single Core Engine (100% agnóstico multinicho)** com **Vertical Presets / Skills nativos para Turismo (`Turis`)**, executando em 6 ondas modulares baseadas na Auditoria Forense da Fase 1.

## 2. Requisitos Normativos (Sintaxe EARS)
- **[EARS-W1-01] (Segurança DB & BFF):** QUANDO qualquer usuário autenticado invocar `deduplicate_and_link_lead_to_customer`, `saveLeadForm`, `listStoreAccountants`, `listStoreDealReviews`, `generateAiVoiceAudio`, `executeSkill` ou `api.auth.ads.callback`, o sistema DEVE validar autorização de tenant (`is_store_staff` / `assertStoreAccess`), assinatura HMAC-SHA256 de `state` OAuth e sanitização contra XSS/PostgREST injection.
- **[EARS-W1-02] (Fluxo D Transacional):** QUANDO um cliente aprovar uma proposta pública Turis (1x–36x), o sistema DEVE extrair o valor real de `pricing` JSONB, sincronizar `leads_crm`, criar contrato canônico (`contracts` + `contract_versions` + `signature_envelopes`), lançar financeiro compatível com o schema real, enfileirar confirmação na tabela ativa `whatsapp_outbox` e unificar leitura/emissão de vouchers entre `travel_vouchers` e `tourism_vouchers`.
- **[EARS-W2-01] (Motor IA WhatsApp Multinicho + Turis):** QUANDO uma mensagem de texto ou áudio chegar via Evolution API v2 ou Meta Cloud API, o sistema DEVE transcrever áudio antes do roteamento, detectar opt-out automático, verificar `handoff_mode` atomicamente, executar o Agente/Skill configurado (Core + `src/lib/presets/turis/`), suportar humanização (`sendPresence`, chunking, read receipt, reply-to, TTS via Storage) e cadência anti-vácuo com break-up message.
- **[EARS-W3-01] (Matchmaker Ativo & Prospecção CSV):** QUANDO uma cotação/proposta ou oferta for salva, o Radar DEVE cruzar demanda↔oferta incluindo catálogo/grupos e permitir disparo consultivo via IA/WhatsApp respeitando opt-out; campanhas CSV DEVEM suportar Evolution (com pacing/jitter/janela) e Meta Cloud API com injeção automática do link do App Próprio (`/app/:slug`).
- **[EARS-W4-01] (Meta Ads 360 & CAPI MQL/SQL):** O sistema DEVE sincronizar campanhas, adsets, anúncios e `effective_status` 2x/dia, marcar anúncios desativados no perfil do lead, unificar CAPI com hash de telefone sem `+`, diferenciar eventos MQL/SQL por coluna do Kanban e montar `StoreAnalyticsInjector` em `/f/$slug` e `/paginas/$slug`.
- **[EARS-W5-01] (RFV, Referral Wallet & Review Booster):** O núcleo CRM DEVE classificar clientes em 8 estados RFV sobre receitas multinicho, gerenciar carteira de créditos de indicação com alertas 30d/7d/1d e abatimento em propostas, executar gatilhos pós-venda (`D-30`, `D-2`, `D+2`, aniversário, passaporte) e operar o Review Booster (`/avaliar/$token`: `>= 8` compila depoimento + Google Meu Negócio; `< 8` alerta interno).
- **[EARS-W6-01] (Waesy MCP Externo & Vitrine B2B):** `/api/mcp/v1/tools/call` DEVE autenticar via API Keys escopadas (`store_mcp_api_keys`) com validação de escopo e `isPlatformAdmin`, expor ferramentas de OmniPage/Roteiros/Formulários/Agentes, corrigir `ai_mcp_servers.store_id` e habilitar sindicação B2B controlada no `/app/:slug`.

## 3. Critérios de Aceite
- `npm run check:schema`, `npm run check:migration-inventory`, `npm run check:bff` com Exit Code 0.
- `node scripts/design-lint.mjs --ratchet` com 0 novas violações P0/P1.
- Suítes Vitest novas e existentes com 100% de aprovação.
- `npm run typecheck` e `npm run build` com `dist/_worker.js/index.js < 25 MB` e Exit Code 0.
