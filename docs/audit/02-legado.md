# Matriz de Decisão de Reaproveitamento do Legado — Waesy

**Data:** 2026-09-30  
**Status:** Análise Concluída (Fase 2)  
**Objetivo:** Decisão fundamentada sobre cada capacidade dos repositórios legados (`ENGIOS`, `brand-builder-ai`, `classificadoswaesy`), priorizando portabilidade limpa para o stack do Waesy, orquestrador de IA e design silencioso.

---

## 1. Tabela de Decisões Arquiteturais

| Capacidade Legada | Repositório de Origem / Arquivo | Decisão | Justificativa Técnica |
|---|---|---|---|
| **Estratégia de Marca & Semiótica (Bia Brand Kit)** | `ENGIOS`<br>`app/lib/squads/agents/brand.agent.ts` | **PORTAR/ADAPTAR** | Os prompts de PhD em semiótica (Kapferer, Aaker, Brand Sprint, 12 arquétipos, vocabulário Do/Don't) são de altíssimo nível. Adaptar para o Concílio de IAs do Waesy, integrando com o esquema Zod e persistência em `public.brand_kits` e `public.brand_dna_profiles`. |
| **Inteligência de Mercado & OSINT (Sherlock)** | `ENGIOS`<br>`app/lib/squads/agents/sherlock.agent.ts` | **PORTAR/ADAPTAR** | Excelente abordagem para auditoria de redes sociais e identificação de lacunas competitivas sem alucinação de dados econômicos. Portar para o squad de Análise de Mercado do Waesy. |
| **Frameworks Estratégicos (SWOT, Storybrand, AIDA)** | `ENGIOS`<br>`app/lib/squads/core/frameworks.ts` | **PORTAR/ADAPTAR** | Metodologias canônicas prontas (SWOT, Blue Ocean, 5 Forças de Porter, Storybrand). Devem ser incorporadas diretamente na base de conhecimento dos squads para preencher `public.briefings`. |
| **Geração de DNA e Briefing LLaMA-3.3-70B** | `brand-builder-ai`<br>`supabase/functions/sw-briefing-generate` | **PORTAR/ADAPTAR** | Lógica funcional de extração de DNA, tom de voz e diferenciais a partir de fragmentos. Adaptar a saída para validação Zod e direcionar as chamadas para o orquestrador unificado (`executeUnifiedAiCall` / `executeAIGatewayCall`). |
| **Estrutura de Brand Kit (Cores & Tipografia)** | `brand-builder-ai`<br>`src/pages/BrandKitPage.tsx` | **REUSAR/ADAPTAR** | Modelo de dados harmonizado com `public.brand_kits` (primary, secondary, accent, typography). Evitar duplicidade criando adapter direto para gravação no banco. |
| **Canvas dos 7 Pecados Capitais** | `waesy`<br>`src/services/seven-sins-simlab.functions.ts` | **REUSAR COMO ESTÁ** | Já implementado nativamente no Waesy com os 7 gatilhos psicológicos e vinculado à tabela `brand_dna_profiles.seven_sins_triggers`. O onboarding apenas precisa alimentar os gatilhos no momento da criação da loja. |
| **Google Meu Negócio (API Oficial & Reviews)** | `classificadoswaesy`<br>`supabase/functions/google-business/index.ts` | **PORTAR/ADAPTAR** | A verificação de conexão em `google_business_connections` e chamada às APIs de locais e reviews (`mybusinessbusinessinformation.googleapis.com`) deve ser portado como serviço do Waesy, com fallback gracioso para não inventar dados caso o lojista não tenha conectado. |
| **Web Scraping Firecrawl + Screenshot Steel** | `waesy`<br>`src/lib/mining/firecrawl-client.ts` | **REUSAR/ADAPTAR** | Já contém a lógica de integração de API Firecrawl, bypass com Steel screenshot e rotação. Falta apenas conectar ao pipeline assíncrono do onboarding e persistir imagens em storage. |
| **Openbox / WebContainer / Electron Desktop** | `ENGIOS`<br>`app/lib/webcontainer/` e `electron/` | **DESCARTAR** | Específico para IDE no browser e desktop local; irrelevante e conflitante com o SaaS Web Cloudflare/Vite do Waesy. |
| **Mocks de Menu de Restaurante** | `waesy`<br>`src/services/multimodal-onboarding.functions.ts:200-256` | **DESCARTAR / ELIMINAR** | Violação explícita da Diretriz Zero anti-mock. Deve ser expurgado do código. |

---

## 2. Plano de Portabilidade Cirúrgica

1. **Brand Strategist & Copy Squad:** Integrar os prompts de elite de `brand.agent.ts` nos squads da Fase 4.
2. **Business Strategist & SWOT Squad:** Integrar `frameworks.ts` para estruturar SWOT e Business Model Canvas.
3. **Google Meu Negócio Adapter:** Criar rotina de consulta a contas conectadas ou raspagem pública segura sem alucinações.
4. **Erradicação de Mocks:** Limpar os itens falsos de `multimodal-onboarding.functions.ts`.
