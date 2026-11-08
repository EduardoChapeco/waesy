# SPEC-20261104: Remediação de Limites Gratuitos Cloudflare Pages e Supabase

## 1. Contexto e Problema
A plataforma Waesy acumulou 245.260 subpedidos para apenas 31.446 requisições (~7,8 subrequests/req) e 388 erros de tempo de CPU excedidos no Cloudflare Pages Worker (com tempos de CPU atingindo até 1.340ms, violando o teto de 10ms do plano gratuito).
Além disso, a ausência de cache em memória no runtime do servidor força cada renderização SSR a executar entre 20 e 28 Server Functions em paralelo, totalizando mais de 40 consultas SQL diretas ao Supabase REST em um único acesso à Home.

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### R1. Eliminação de Pré-renderização Silenciosa Irrestrita (Ubiquitous)
O sistema DEVE desativar o bloco de Speculation Rules de pré-renderização irrestrita (`/*` prerender) em `src/routes/__root.tsx`, delegando o prefetch ao TanStack Router sob hover intencional.

### R2. Calibração de Preload Intent no TanStack Router (Event-Driven)
QUANDO o usuário mover o cursor sobre links na interface, o sistema DEVE aguardar uma tolerância mínima de 300ms (`defaultPreloadDelay: 300`) antes de acionar o preload do loader da rota, impedindo disparos em passadas de mouse acidentais.

### R3. Micro-Cache em Memória no Worker para Metadados Canônicos (Ubiquitous)
O sistema DEVE manter em cache volátil de memória do Worker (`in-memory micro-cache` com TTL de 60 segundos) os retornos das funções de metadados:
- `getPublicBrandSettings()`
- `getThemeSettings()`
- `getPublicStoreSettings()`
- `getPublicPixels()`
Garantindo que múltiplas chamadas simultâneas compartilhem o mesmo snapshot sem onerar o Supabase.

### R4. Higienização Global do TanStack Query (State-Driven)
ENQUANTO o cliente estiver em navegação, o `QueryClient` DEVE operar com `staleTime: 60_000` (1 minuto de frescor padrão) e `refetchOnWindowFocus: false`, eliminando rajadas de refetch ao alternar entre janelas ou abas.

### R5. Limitação e Confinamento de CPU do Worker de Mineração (Event-Driven)
QUANDO o endpoint `/api/cron/mining-worker` for acionado via `pg_cron`/`pg_net`, a execução DEVE respeitar um lote máximo reduzido (batch limit <= 3 itens) com abort imediato se o processamento exceder 8ms de CPU, prevenindo erros `1101 CPU Time Limit Exceeded`.

### R6. Blindagem de Telemetria do Sentinel de Segurança (Event-Driven)
QUANDO o `security-sentinel.ts` detectar eventos de devtools ou automação, ele DEVE enviar no máximo 1 beacon por sessão e não executar loops de alta frequência no navegador que saturem a RPC `report_security_telemetry`.

### R7. Exclusão Estática Integral no `_routes.json` (Ubiquitous)
O arquivo de configuração `dist/_routes.json` gerado por `scripts/wrap-worker.js` DEVE conter regras explícitas de exclusão para todos os ativos estáticos de `public/` (`apple-touch-icon.png`, `brand-*.png`, `llms*.txt`, `offline.html`), assegurando que a CDN da Cloudflare os sirva diretamente sem invocar o Worker.

## 3. Invariantes
- Proibido remover qualquer componente visual, layout, vitrine, banner ou regra de negócio existente.
- Proibido quebrar a integridade de dados do banco ou isolamento multi-tenant.
- Zero erros de compilação TypeScript (`npm run typecheck`).
- Build de produção limpo com exit code 0 (`npm run build`).
- Design lint aprovado com não-regressão (`npm run lint:design`).

## 4. Evidências de Validação
1. Compilação TypeScript aprovada sem erros.
2. Build de produção concluído com sucesso e empacotamento do worker otimizado.
3. Testes unitários do micro-cache aprovados.
4. Redução comprovada do número de queries executadas por ciclo de SSR.
