# Federação Multi-Supabase & Bootstrap em Novo Computador

Este documento registra a topologia oficial dos projetos Supabase, todas as variáveis de ambiente exigidas pelo Cloudflare Pages (`usewaesy`) e o procedimento seguro para restaurar o ambiente completo em qualquer máquina sem expor segredos no Git.

---

## 1. Topologia Oficial dos 3 Projetos Supabase

| Papel | Project Ref | URL Pública | Função no Ecossistema |
| :--- | :--- | :--- | :--- |
| **PRIMARY** (Principal) | `wlxapubsesiwtxzbuygt` | `https://wlxapubsesiwtxzbuygt.supabase.co` | Auth, multi-tenant (`stores`, `profiles`), transações financeiras, CRM, catálogo, propostas e Storage. |
| **OFFLOAD** (Apoio/Ingestão) | `vnmqummmgvgyazglnoav` | `https://vnmqummmgvgyazglnoav.supabase.co` | Ingestão pesada, mineração, telemetria e filas auxiliares para proteger o disco do nó Primary. |
| **ARCHIVE** (Legado/Backup) | `jfuebqmltksyznovhlwa` | `https://jfuebqmltksyznovhlwa.supabase.co` | Nó histórico de apoio/arquivo fora do caminho crítico de leitura/escrita. |

### Alternância de Topologia (Dual -> Single / Self-Hosted)
O roteamento é governado exclusivamente em runtime server-side por [src/lib/supabase-federation.ts](../../src/lib/supabase-federation.ts) e [src/lib/supabase.ts](../../src/lib/supabase.ts):
- **`SUPABASE_TOPOLOGY_MODE=auto`** (ou **`dual`**) + **`SUPABASE_ROUTE_MINING=0`**: modo padrão seguro em produção; direciona as 24 tabelas append-only de `OFFLOAD_TABLES_LIST` e 4 RPCs de telemetria para o nó `OFFLOAD` (`vnmqummmgvgyazglnoav`), mantendo as tabelas de mineração com joins no `PRIMARY` (`0` embeds cruzando nós).
- **`SUPABASE_TOPOLOGY_MODE=single`**: consolida todo o tráfego em um único projeto Supabase (cloud ou instância Supabase Open-Source self-hosted), bastando apontar `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Inventário Completo de Variáveis (22 Segredos no Cloudflare Pages `usewaesy`)

Todos os segredos abaixo estão encriptados no ambiente `production` do projeto `usewaesy` no Cloudflare Pages:

| Categoria | Variáveis |
| :--- | :--- |
| **Frontend / Públicas (`VITE_*`)** | `VITE_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Primary (Server-Side)** | `PROJECT_REF`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`, `DATABASE_URL` |
| **Federação & Offload** | `SUPABASE_TOPOLOGY_MODE`, `SUPABASE_ROUTE_MINING`, `SUPABASE_OFFLOAD_URL`, `SUPABASE_OFFLOAD_SERVICE_ROLE_KEY` |
| **Segurança & Cofre** | `JWT_SECRET`, `VAULT_MASTER_KEY` |
| **Canais / Evolution API** | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` |

> **Regra de Segurança (Zero-Trust):** Chaves `service_role`, tokens pessoais (`sbp_*`), senhas de Postgres, `JWT_SECRET` e `VAULT_MASTER_KEY` **nunca** são versionados em arquivos do repositório. Arquivos locais (`.env`, `.env.local`, `.env.secrets`, `wrangler.toml`) permanecem bloqueados pelo `.gitignore`.

---

## 3. Como Configurar Outro Computador em 3 Passos

1. **Clonar e instalar dependências:**
   ```bash
   git clone https://github.com/EduardoChapeco/waesy.git
   cd waesy
   npm install
   cp .env.example .env
   cp wrangler.example.toml wrangler.toml
   ```
2. **Hidratar automaticamente todas as chaves dos 3 projetos Supabase em `.env.secrets` e `.env`:**
   Defina os tokens PAT (`sbp_*`) e a senha do banco no shell atual (sem salvar em disco versionado) e execute o sincronizador:
   ```powershell
   $env:TOK_PRIMARY="<PAT_CONTA_PRIMARY>"
   $env:TOK_OFFLOAD="<PAT_CONTA_OFFLOAD>"
   $env:TOK_ARCHIVE="<PAT_CONTA_ARCHIVE>"
   $env:DB_PASSWORD="<SENHA_POSTGRES>"
   node scripts/ops/sync-topology-secrets.mjs --set-primary-runtime
   ```
3. **Autenticar no Cloudflare Wrangler e validar/publicar:**
   ```bash
   npx wrangler login
   npx wrangler pages secret list --project-name usewaesy
   npm run build
   npx wrangler pages deploy dist --project-name usewaesy --branch main --no-bundle --commit-dirty=true
   ```

Para atualizar segredos no Cloudflare Pages a partir do `.env.secrets`, utilize [scripts/ops/push-cloudflare-secrets.mjs](../../scripts/ops/push-cloudflare-secrets.mjs) e [scripts/ops/set-cloudflare-offload-secrets.mjs](../../scripts/ops/set-cloudflare-offload-secrets.mjs).

---

## 4. Validação, Typecheck e Deploy End-to-End

- **Diagnóstico de `npm run typecheck`:** O projeto possui `6.780` arquivos TypeScript resolvidos e `src/routeTree.gen.ts` com `10.465` linhas (480+ rotas TanStack Router), tornando o `tsc --noEmit` global lento em máquinas locais. Caso `tsc` trave por cache incremental, limpe `tsconfig.tsbuildinfo` / `.tsbuildinfo-check` ou valide via `npm run build` + `npx vitest run` + gates estáticos (`check:schema`, `check:bff`, `check:types-ssot`, `check:cycles`, `lint:design`).
- **Supabase Primary (`wlxapubsesiwtxzbuygt`):** Todas as `667` migrações SQL (até `20270623000000`) e a Edge Function `infotravel-connector` devem estar sincronizadas via Management API / `npx supabase functions deploy --project-ref wlxapubsesiwtxzbuygt --use-api --yes`.
- **Cloudflare Pages (`usewaesy`):** Executar `node scripts/ops/push-cloudflare-secrets.mjs` para garantir os `17` segredos de federação em produção e publicar `dist/` com `npx wrangler pages deploy dist --project-name usewaesy --branch main --no-bundle --commit-dirty=true`.
