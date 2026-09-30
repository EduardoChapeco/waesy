# Mapa de IA do Sistema Waesy (Prompt 01)

Este documento mapeia todas as presenças de Inteligência Artificial no repositório Waesy, detalhando provedores, modelos, canais de chaveamento e responsabilidades de execução.

## 1. Inventário Resumido por Módulo

| Módulo | Arquivo:Linha | Provedor | Modelo | Chaveamento | Lado | Telemetria Granular |
|---|---|---|---|---|---|---|
| **AI Router ServerFn** | `src/services/ai.functions.ts:10` | Gemini, OpenRouter, OpenAI, Anthropic, Groq | Dinâmico | `secret_vault` / `api_key_pools` | Servidor | Parcial (Tokens da loja) |
| **OpenRouter Client Engine** | `src/lib/ai/openrouter.ts:52` | OpenRouter | Llama 3.1 70B, Gemma 2 | Pool -> Env (`VITE_OPENROUTER_API_KEY`) | Híbrido | Nula |
| **API Orchestrator** | `src/services/api-orchestrator.functions.ts:561` | Groq, Gemini, OpenRouter, OpenAI, Anthropic | Llama 3.3, Gemini 1.5, GPT-4o-mini | `api_key_pools` / `secret_vault` | Servidor | Básica (`last_used_at`) |
| **AI SDR Lead Assistant** | `src/services/ai-sdr.functions.ts:45` | OpenRouter / Gemini | Gemini 1.5 Flash | `api_key_pools` | Servidor | Histórico de mensagens |
| **Travel AI Extractor** | `src/services/travel-ai-extractor.functions.ts:32` | Gemini (Visão) | Gemini 1.5 Flash | `api_key_pools` | Servidor | Nula |
| **Multimodal OCR & Docs** | `src/services/multimodal-ocr.functions.ts:25` | Gemini / OpenAI | Gemini 1.5 Pro | `api_key_pools` | Servidor | Nula |
| **AI Builder Generator** | `src/services/ai-builder-generator.ts:40` | OpenRouter / Gemini | Llama 3.3 / Gemini | `api_key_pools` | Servidor | Nula |
| **SimLab 7 Sins Squad** | `src/services/seven-sins-simlab.functions.ts:60` | Groq / OpenRouter | Llama 3.1 8B | `api_key_pools` | Servidor | Registro de runs |
| **Mining Squad Editorial** | `src/services/mining/editorial-squad.ts:35` | Gemini / Groq | Gemini 1.5 Flash | `api_key_pools` | Servidor | Status de post |
| **Studio & Copywriter** | `src/services/studio.functions.ts:80` | OpenRouter / Gemini | Llama 3.3 70B | `api_key_pools` | Servidor | Nula |

## 2. Padrões de Chaveamento Identificados
1. **Pool Central (`api_key_pools`):** Utilizado pelo orchestrator, mas sem controle dinâmico de circuitos abertos sob falha prolongada.
2. **Vault por Tenant (`secret_vault` / `tenant_ai_providers`):** Suporte a BYOK (Bring Your Own Key), porém desarticulado da porta principal.
3. **Variáveis de Ambiente:** Presença de resquícios de chaves diretas em variáveis locais (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`).
4. **Vazamento Potencial:** Referência a `VITE_OPENROUTER_API_KEY` que poderia expor chaves no bundle do navegador caso utilizada no client.
