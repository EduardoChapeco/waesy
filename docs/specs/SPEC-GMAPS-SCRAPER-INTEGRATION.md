# SPEC-GMAPS-SCRAPER-INTEGRATION — Integração Google Maps Scraper (VPS/Docker) no Admin Master

## 0. Metadados e Controle
- **ID da Spec:** SPEC-GMAPS-SCRAPER-INTEGRATION
- **Título:** Fonte Google Maps via scraper self-hosted (gosom / google-maps-scraper-kit)
- **Autor / Agente Responsável:** spec-writer
- **Data de Aprovação:** 2026-10-22 (autorização verbal do usuário: "vamos executar e integrar completamente")
- **Status:** EM IMPLEMENTACAO

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Permitir que o Admin Master conecte um scraper do Google Maps hospedado em VPS/Docker e alimente `directory_listings` com dados ricos (rating, reviews, horários, e-mail), com fallback para OSM.
- **Escopo Incluído:**
  - `src/lib/mining/gmaps-scraper-client.ts` (cliente HTTP + parser CSV, puro)
  - `src/services/gmaps-scraper.functions.ts` (BFF: config, teste, job, coleta)
  - `src/services/mining/places-harvester.ts` (parâmetro `prefetchedPlaces`, campos de contato)
  - `src/components/admin/gmaps-scraper-panel.tsx` e aba em `src/routes/admin-master.integracoes.tsx`
  - `infra/gmaps-scraper/` (docker-compose, Caddy, guia de VPS gratuita)
- **Não-Objetivos:** migration (usa `contact_email` e `metadata` existentes); rodar o scraper dentro do Worker; enriquecimento de redes sociais por regex (fase 2); publicação automática em vitrines.

## 2. Requisitos EARS
- **Ubíquo:** O sistema DEVE guardar o token do scraper criptografado (AES-256-GCM) e nunca devolvê-lo ao cliente.
- **Acionado por Evento:** QUANDO o admin master salvar a URL do scraper, o sistema DEVE validar protocolo http(s) e persistir em `stores.settings.integrations.gmaps_scraper` da store raiz.
- **Acionado por Evento:** QUANDO o admin master acionar "Testar conexão", o sistema DEVE consultar `GET /api/v1/jobs` e reportar latência e status reais.
- **Acionado por Evento:** QUANDO um job for iniciado, o sistema DEVE retornar `jobId`; QUANDO coletado concluído, DEVE persistir os lugares via `harvestAndPersistPlaces`.
- **Orientado a Estado:** ENQUANTO a integração estiver inativa ou sem URL, o harvester DEVE usar apenas Overpass/Nominatim.
- **Exceção:** SE o scraper estiver indisponível ou retornar 0 itens, ENTÃO o sistema DEVE exibir erro/estado vazio honesto, sem dados sintéticos (B.33).
- **Segurança:** Todas as funções DEVEM exigir `requirePlatformAdmin()`.

## 3. Matriz de Estados e Acessibilidade
- [x] Dados, carregamento (spinner em botões), vazio (sem resultados) e erro (toast + texto) no painel.
- [x] Controles `h-11`, `focus-visible:ring-2`, uma única ação primária por superfície.

## 4. Evidências
- Testes unitários: `src/lib/mining/gmaps-scraper-client.test.ts` (parser CSV, mapeamento, config).
- `npm run typecheck`, design-lint no arquivo novo.

## 5. Riscos
- ToS do Google (uso interno de prospecção); LGPD para e-mails/telefones (admin-only, opt-out).
