# BRANCH & PULL REQUEST AUDIT DOSSIER (WAESY 2026)
**Autoridade:** Conselho Executivo de Arquitetura, Produto & Red Team  
**Data da Auditoria:** 2026-10-14  
**Repositório:** `waesy`  

---

## 1. Visão Geral das Branches e PRs Catalogados

Este documento compila minuciosamente todas as frentes de trabalho distribuídas em branches locais, branches remotas e Pull Requests históricos e recentes, mapeando o que foi feito, o que foi homologado e o que resta pendente de execução recursiva.

---

## 2. Mapa Detalhado de Branches & Pull Requests

### 2.1 PRs Recentes Integrados na Baseline `main` (`d98faf9a`)

| PR # | Branch de Origem | Escopo & Descrição | Relatórios Associados | Status & Evidência |
| --- | --- | --- | --- | --- |
| **#34** | `audit/supabase-authorized-evidence-20261013` | Registro de evidências autorizadas do Supabase para conciliação de banco e policies RLS | `docs/audits/SUPABASE_AUTHORIZED_EVIDENCE_20261013.md` | Integrado no `main`. 18 testes de regressão de segurança passando. |
| **#33** | `fix/supply-chain-secret-scan` | Varredura de supply-chain e erradicação de segredos e chaves expostas no código fonte | `docs/audits/W15-SECRET-SCAN-20261013.md` | Integrado no `main`. Zero credenciais hardcoded. |
| **#32** | `fix/resilient-client-abort-backoff` | Resiliência de requisições com AbortController, timeout defensivo e exponential backoff | `docs/audits/RESILIENT-CLIENT-ABORT-20261013.md` | Integrado no `main`. Proteção contra memory leak e conexões presas. |
| **#31** | `fix/ai-gateway-fingerprint-isolation` | Isolamento estrito de fingerprint e quota em chamadas ao AI Gateway no Copilot | `docs/audits/AI-GATEWAY-ISOLATION-20261013.md` | Integrado no `main`. Prevenção de cross-tenant cache bleed. |
| **#30** | `fix/chat-commerce-tenant-context` | Blindagem multi-tenant no contexto de conversas de chat comercial e pedidos | `docs/audits/W2-CHAT-COMMERCE-TENANT-FIX-20261013.md` | Integrado no `main`. IDOR prevenido em conversas civis e lojistas. |
| **#28** | `docs/dec-196` | Registro formal das decisões arquiteturais DEC-196 e diretrizes de integridade transacional | `docs/design/DECISIONS.md` | Integrado no `main`. SSOT de governança atualizada. |

---

### 2.2 Frentes de Branches Ativas e Remotas

| Branch | Domínio | O Que Foi Feito | O Que Ficou Planejado / Pendente |
| --- | --- | --- | --- |
| `feat/system-merge-improvements-and-classifieds-copilot` | Copilot & Classificados | Reconciliação dos cards táteis de 44px, busca estruturada e purge de fallbacks sintéticos. | Migrar telas legadas de classificados para consumir `src/design-system/patterns/` e `ProductCard`. |
| `feat/waesy-canonical-travel-evolution` | Turismo & Hotelaria | Especificação canônica da esteira de turismo, vouchers e cotações aéreas. | Conexão dos adaptadores reais de GDS/companhias aéreas com isolamento sandbox (Onda W12). |
| `feat/waesy-niche-template-factory` | Temas de Nicho | 10 temas canônicos (Saúde, Luxo, Criador, Gastronomia) com CSS variables camaleônicas. | Validar alternância em tempo real no builder sem recarregamento de página. |
| `feat/waesy-studio-omni-audit` | Studio & Mídia | Omni AST, validação de schema de blocos e remoção de CSS inline nos componentes visuais. | Teste de upload em lote para storage com isolamento de tenant em bucket S3. |
| `feat/whatsapp-wave1-8-complete-release` | WhatsApp & Notificações | Fila de outbox transacional, templates HSM e webhooks de status de entrega. | Homologação ponta a ponta com cluster Postgres ativo e chaves de produção. |
| `fix/commercial-ui-purification-and-copilot-search` | Vitrines Comerciais | Erradicação do AI-smell, botões sem foco e classes com valores mágicos. DEC-198 a DEC-208. | Consolidado nas regras normativas do Waesy Design System 4.0. |
| `fix/profile-save-skills-biolink-covers` | Perfil Civil & BioLinks | Salvamento robusto de perfil civil, bio links customizados e capa com crop defensivo. | Monitorar performance de renderização de avatar em dispositivos compactos. |
| `perf/login-latency-and-route-caching` | Performance & Cache | Prefetch inteligente de rotas TanStack Router e otimização de TTFB no login civil. | Manter Core Web Vitals monitorados conforme `docs/PERFORMANCE.md`. |
| `audit/recursive-p0-remediation` | Auditoria de Segurança | Lockdown de 304 Server Functions, RLS deny-by-default e barreira Zero-Trust. | Executar suíte de testes de concorrência com pg_prove após liberação para deploy. |
| `audit/full-remediation-20261007` | Auditoria Holística | Levantamento exaustivo dos 109 achados arquiteturais, de segurança e de UX. | Acompanhar fechamento ordenado das ondas W0 a W17. |

---

## 3. Diretriz para Próximas Ondas Recursivas

1. **Prioridade W10 (UI & Design System 4.0):** As fundações do DS 4.0 estão prontas em `src/design-system/`. As rotas legadas devem ser migradas progressivamente sem quebrar funcionalidade existente.
2. **Prioridade W2 & W8 (Segurança & Multi-Tenant):** Garantir que qualquer chamada BFF passe por validação Zod e derivação estrita de tenant via JWT do servidor.
3. **Prioridade W17 (Deploy & Produção):** `npm run build`, `npm run lint`, `tsc` e testes globais permanecem travados até instrução explícita de "DEPLOY" ou "COMMIT".
