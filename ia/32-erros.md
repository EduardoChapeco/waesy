# ia/32-erros.md — Dossiê Forense de Erros, Telemetria e Causa Raiz (Prompt 32)

> Data de Emissão: `2026-10-01T00:58:00.000Z`  
> Referência Normativa: AGENTS.md (B.5, B.8, B.10), PROMPT 32 (Fase C)  
> Fontes Inspecionadas: `src/lib/logger.ts`, `system_error_logs`, `src/lib/error-capture.ts`, `src/lib/loader-observability.ts`

---

## 1. Mapa de Fontes de Telemetria e Captura

| Fonte de Observabilidade | Arquivo SSOT | Mecânica de Registro | Destino de Telemetria |
| :--- | :--- | :--- | :--- |
| **Logger Central do Sistema** | `src/lib/logger.ts` | Assíncrono com derivação de tabela/coluna Postgres | Tabela `public.system_error_logs` |
| **Captura Out-of-Band SSR** | `src/lib/error-capture.ts` | Eventos globais `error` e `unhandledrejection` com TTL 5s | Nitro / H3 Server Stack Tracer |
| **Observabilidade de Loaders** | `src/lib/loader-observability.ts` | Log estruturado com `route`, `action`, `tableOrEntity` | Console e Telemetria Cloudflare |
| **Rede & GeoIP Anti-Proxy** | `src/lib/network-telemetry.server.ts` | Resolução de `CF-Connecting-IP`, `X-Forwarded-For` | Tabela `public.network_telemetry_logs` |
| **Auditoria Forense Imutável** | `src/services/admin-logs.functions.ts` | Trilha imutável com ator, snapshot e hash SHA-256 | Tabela `public.forensic_audit_events` |

---

## 2. Matriz Forense de Incidentes e Causas Raizes Catalogadas

| ID | Sintoma & Operação | Frequência Potencial | Causa Raiz (arquivo:linha) | Severidade | Resolução Aplicada / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ERR-01** | `/_store/mural` 404 em redirecionamento de publicação | Alta (todo novo post) | `src/routes/workspace.mural.novo.tsx:78` usando ID interno `_store` | **P0 (Crítico)** | **Corrigido**: Alterado para rota canônica `/mural`. |
| **ERR-02** | Links `/admin/*` legados gerando 404 em cliques | Média (acesso lojista) | `src/components/admin/admin-shell.tsx:23-50` com prefixo `/admin` | **P1 (Alto)** | **Corrigido**: Substituído por rotas `/workspace/*` canônicas. |
| **ERR-03** | Rota `/workspace/vagas` 404 ao clicar em 'Publicar Vaga' | Média (área de empregos) | `src/lib/navigation-registry.ts:410` apontando para `/workspace/vagas` | **P1 (Alto)** | **Corrigido**: Corrigido para rota física `/workspace/empregos/novo`. |
| **ERR-04** | Link `/workspace/financeiro/carnes` 404 no modal de ferramentas | Baixa/Média (ferramentas) | `src/components/workspace/workspace-all-tools-dialog.tsx:290` | **P1 (Alto)** | **Corrigido**: Atualizado para rota `/workspace/financeiro/recebiveis`. |
| **ERR-05** | Link `/cardapio` sem rota física direta no template gastronômico | Baixa (novo site) | `src/components/builder/templates.ts:158` com `href: "/cardapio"` | **P2 (Médio)** | **Corrigido**: Convertido para âncora direta de seção `#cardapio`. |
| **ERR-06** | Falha de RLS em leitura multi-tenant de lojas | Alta se não sanitizado | `src/lib/server-access.ts:40-80` `assertStoreAccess` | **P0 (Crítico)** | **Blindado**: Verificação estrita de membership e identity server-side. |
| **ERR-07** | FOUC e tela branca em loaders com falha de dados externos | Média (instabilidade de rede) | `src/lib/loader-observability.ts:9-36` captura e emite log | **P1 (Alto)** | **Mitigado**: `logLoaderError` fornece fallback seguro sem mascarar no log. |
| **ERR-08** | Injeção de cardápio fake (Mock) em falha de OCR | Baixa/Média (onboarding) | `src/services/multimodal-onboarding.functions.ts:193-256` | **P0 (Crítico)** | **Erradicado**: Erro explícito e orientativo sem produtos simulados. |

---

## 3. Diretriz de Integridade Anti-Silenciamento (C4)
1. **Proibido Catch Vazio**: Nenhuma Server Function pode capturar erro com bloco `catch {}` vazio sem registrar no `logger.ts` ou relançar.
2. **Diagnóstico Concreto**: Todo log em `system_error_logs` contém `route`, `contract_name`, `error_message` e `stack_trace`.
3. **Telemetria de Produção**: Os erros são agrupados no painel de administração (`/admin-master/logs`) com filtro por severidade (`critical`, `error`, `warn`).
