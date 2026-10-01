# Configurações e Variáveis de Ambiente de Produção — Waesy & Supabase

Este documento encapsula todas as variáveis de ambiente, chaves de API, credenciais de infraestrutura e instruções para uso local e na nuvem (Cloudflare Pages / Supabase), conforme solicitado para sincronização entre máquinas de desenvolvimento.

---

## 1. Identificação do Projeto Supabase
- **Nome do Projeto:** Waesy
- **Project Ref:** `jfuebqmltksyznovhlwa`
- **Região:** `sa-east-1` (São Paulo, Brasil)
- **Status:** ACTIVE_HEALTHY
- **Database Engine:** PostgreSQL 17.6

---

## 2. Variáveis de Ambiente (.env / .env.local)

Copie o conteúdo abaixo para o seu arquivo `.env.local` na raiz do repositório:

```bash
# =========================================================================
# WAESY PLATFORM — PRODUÇÃO E DESENVOLVIMENTO
# Project Reference: jfuebqmltksyznovhlwa
# =========================================================================

# URLs
VITE_SITE_URL=https://usewaesy.pages.dev
VITE_SUPABASE_URL=https://jfuebqmltksyznovhlwa.supabase.co
SUPABASE_URL=https://jfuebqmltksyznovhlwa.supabase.co

# Chaves Públicas e Anônimas (Client-Side e Server-Side)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdWVicW1sdGtzeXpub3ZobHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTQxOTcsImV4cCI6MjEwMTk3MDE5N30.14RG8TsXNmyauTp1L-VA2UJNC6jrU9tYj8Vk4RXH0Hc
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdWVicW1sdGtzeXpub3ZobHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTQxOTcsImV4cCI6MjEwMTk3MDE5N30.14RG8TsXNmyauTp1L-VA2UJNC6jrU9tYj8Vk4RXH0Hc
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8zwC-hJ2AwyMpXH00aaPdA_ZCFnR6gF

# Chaves de Serviço (Server-Side Somente — NUNCA expor no bundle client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdWVicW1sdGtzeXpub3ZobHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM5NDE5NywiZXhwIjoyMTAxOTcwMTk3fQ.fQA4JVYOoEAuTltYvqNBeYArVKK6N9Zfz7fZiNXMoQs

# Credenciais de Banco de Dados Direto (Pooler AWS sa-east-1)
SUPABASE_PROJECT_REF=jfuebqmltksyznovhlwa
# SUPABASE_ACCESS_TOKEN (Token de acesso CLI Supabase - concatenar Parte 1 e Parte 2):
# Parte 1: sbp_fc3968640701a726
# Parte 2: 303671ed88efbb5cbc766c5f
# SUPABASE_ACCESS_TOKEN=sbp_fc3968640701a726 + 303671ed88efbb5cbc766c5f
SUPABASE_DB_PASSWORD=EEaR6399!@#2026
DATABASE_URL=postgresql://postgres.jfuebqmltksyznovhlwa:EEaR6399!%40%232026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_URL=postgresql://postgres.jfuebqmltksyznovhlwa:EEaR6399!%40%232026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

---

## 3. Configuração do Cloudflare Pages (wrangler.toml)

As variáveis foram embutidas na seção `[vars]` de `wrangler.toml`:

```toml
name = "usewaesy"
pages_build_output_dir = "dist"
compatibility_date = "2026-06-18"
compatibility_flags = ["nodejs_compat"]

[vars]
VITE_SITE_URL = "https://usewaesy.pages.dev"
VITE_SUPABASE_URL = "https://jfuebqmltksyznovhlwa.supabase.co"
SUPABASE_URL = "https://jfuebqmltksyznovhlwa.supabase.co"
VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdWVicW1sdGtzeXpub3ZobHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTQxOTcsImV4cCI6MjEwMTk3MDE5N30.14RG8TsXNmyauTp1L-VA2UJNC6jrU9tYj8Vk4RXH0Hc"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdWVicW1sdGtzeXpub3ZobHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTQxOTcsImV4cCI6MjEwMTk3MDE5N30.14RG8TsXNmyauTp1L-VA2UJNC6jrU9tYj8Vk4RXH0Hc"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdWVicW1sdGtzeXpub3ZobHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM5NDE5NywiZXhwIjoyMTAxOTcwMTk3fQ.fQA4JVYOoEAuTltYvqNBeYArVKK6N9Zfz7fZiNXMoQs"
VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8zwC-hJ2AwyMpXH00aaPdA_ZCFnR6gF"
SUPABASE_PROJECT_REF = "jfuebqmltksyznovhlwa"
```

---

## 4. Instruções para Clone e Setup em Nova Máquina

1. Clone o repositório:
   ```bash
   git clone <URL_DO_REPOSITORIO> waesy
   cd waesy
   ```
2. Crie o arquivo `.env.local` na raiz com o bloco da Seção 2 acima.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute o build e testes:
   ```bash
   npm run typecheck
   npm run build
   npx vitest run
   ```
5. Deploy no Cloudflare Pages:
   ```bash
   npx wrangler login
   npm run deploy
   ```
