# Plano Mestre: Inteligência de Mapas e Agente de Navegação (pool gratuito, VPS no futuro)

Data: 2026-10-22. Decisão do usuário: usar APIs e planos gratuitos agora, via pool de chaves existente; VPS própria depois.

## 1. Princípio de arquitetura
O Worker não executa navegador. Toda automação usa um **provedor** com a mesma interface, trocável por configuração:

| Camada | Agora (grátis, sem VPS) | Futuro (VPS/Docker) |
|---|---|---|
| Lugares / Maps | Overpass e Nominatim (OSM) | gosom/google-maps-scraper (aba já pronta) |
| Leitura de páginas | `scrapeUrl`: Firecrawl (pool) -> fetch nativo -> Steel Cloud (pool) | Firecrawl self-host / Steel Browser |
| Enriquecimento de contatos | `contact-extractor` sobre `scrapeUrl` | idem |
| Agente de navegação (estilo Manus) | Ciclo observar/agir com `scrapeUrl` + LLM da pool | Steel Browser com sessão CDP |
| LLM | `executeUnifiedAiCall` (Groq, OpenRouter, Gemini) | idem |

## 2. Estado por item

| # | Item | Status | Arquivos |
|---|---|---|---|
| 1 | Spec da fonte Google Maps | Feito | `docs/specs/SPEC-GMAPS-SCRAPER-INTEGRATION.md` |
| 2 | Cliente e parser gosom | Feito, 5 testes | `src/lib/mining/gmaps-scraper-client.ts` |
| 3 | BFF de config, teste, job e coleta | Feito | `src/services/gmaps-scraper.functions.ts` |
| 4 | Aba Admin Master | Feito | `admin-master.integracoes.tsx`, `gmaps-scraper-panel.tsx` |
| 5 | Infra Docker (scraper + Caddy + token) | Feito | `infra/gmaps-scraper/` |
| 6 | Extrator de contatos (e-mail, WhatsApp, redes, anti-SSRF) | Feito, testes | `src/lib/mining/contact-extractor.ts` |
| 7 | Enriquecimento em lote via pool gratuito | Feito | `src/services/contact-enrichment.functions.ts` |
| 8 | Botão Enriquecer no painel | Feito | `gmaps-scraper-panel.tsx` |
| 9 | Spec do agente de navegação | A fazer | `docs/specs/SPEC-WEB-AGENT.md` |
| 10 | Ferramenta `web_task` (ciclo observar/agir, limite de passos, allowlist) | A fazer | `src/services/web-agent.functions.ts` |
| 11 | Integrar `web_task` e enriquecimento ao Copilot | A fazer | `autonomous-copilot-orchestrator.ts` |
| 12 | Painel de passos ao vivo e botão parar | A fazer | `copilot-background-tasks-drawer.tsx` |
| 13 | Provedor Steel Browser (CDP) na VPS | Futuro | `infra/` |
| 14 | Enriquecimento agendado (cron) | A fazer | `api.cron.mining-worker.ts` |
| 15 | Telemetria de uso do pool por ferramenta | A fazer | `recordAiTelemetry` |

## 3. Riscos e controles
- **Prompt injection em páginas:** allowlist de domínios, máximo de passos e de tempo, sem login nem compra sem aprovação (`copilot-action-approvals`).
- **SSRF:** `isPublicHttpUrl` antes de qualquer fetch de URL vinda de dados raspados.
- **Cotas gratuitas:** `markKeyError` e rotação já tratam 429; o enriquecimento é limitado a 25 por chamada.
- **LGPD:** e-mails e telefones ficam visíveis só ao admin; manter base legal e opt-out.
- **ToS do Google:** a fonte gosom é de uso interno e fica inativa até existir VPS.

## 4. Handoff
Próxima fase: itens 9 a 12. Pré-requisito: aprovar `SPEC-WEB-AGENT.md` (allowlist inicial e limites de passos).
