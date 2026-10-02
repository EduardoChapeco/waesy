# RUNBOOK DE OPERACAO E RESPOSTA A INCIDENTES — WAESY v2.0

## 1. Identificacao e Escopo
- **Sistema:** Ecossistema Operacional Waesy (Places, Classificados, Marketplace, Workspace Pro)
- **Topologia de Producao:**
  - **Edge Runtime:** Cloudflare Pages (Single-file worker `dist/_worker.js`)
  - **Persistencia & Auth:** Supabase PostgreSQL 15+ com Row-Level Security (RLS) e Realtime
  - **DNS & CDN:** Cloudflare Edge Network (TLS 1.3, HSTS, Brotli)
  - **Storage:** Supabase Storage Buckets (`listing-images`, `store-media`, `documents`)

---

## 2. Procedimentos de Deploy

### 2.1 Pipeline Padrao (Deploy Continuo via GitHub Actions / Cloudflare Pages)
1. O merge na branch `main` dispara o pipeline de validacao no GitHub Actions:
   - Verificacao de integridade TypeScript: `tsc --noEmit`
   - Auditoria estrita de design lint: `node scripts/design-lint.mjs --ratchet`
   - Bateria de testes automatizados: `vitest run`
   - Scanner de codigo morto e orfaos: `node scripts/dead-code-detector.mjs`
   - Compilacao de producao: `npm run build`
2. Apos aprovacao unanime dos 5 gates, o Cloudflare Pages compila e distribui o artefato `_worker.js` para as edge locations globais.
3. As rotas SSR sao ativadas instantaneamente sem parada ou recarregamento forçado.

### 2.2 Deploy Manual de Emergencia (Cloudflare CLI / Wrangler)
Caso o pipeline do GitHub Actions esteja indisponivel:
```bash
# 1. Geracao do pacote limpo de producao
npm run build

# 2. Publicacao direta no projeto de producao Cloudflare Pages
npx wrangler pages deploy dist --project-name=waesy --branch=main
```

### 2.3 Aplicacao de Migracoes de Banco de Dados (Supabase)
As alteracoes estruturais no banco de dados devem ser executadas com transacoes idempotentes:
```bash
# Via Supabase CLI autenticada com service role
npx supabase db push

# Verificacao de integridade das politicas RLS ativas
npx supabase db lint
```

---

## 3. Procedimento de Rollback

### 3.1 Rollback Instantaneo de Edge Worker (Cloudflare Pages)
1. Acesse o Cloudflare Dashboard -> **Workers & Pages** -> **waesy** -> **Deployments**.
2. Localize o ultimo deployment homologado estavel com indicador verde.
3. Clique nas opcoes do deployment -> **Rollback to this deployment**.
4. O tráfego de borda e redirecionado para o hash de commit anterior em menos de 5 segundos.

### 3.2 Rollback de Migracao de Banco de Dados
1. Toda migracao DEVE conter script de reversao correspondente (`down.sql`).
2. Se uma coluna ou constraint causou quebra em producao:
   - Se for aditiva (nova coluna nullable ou tabela): Nao reverter o banco; executar rollback da edge para desacoplar a leitura.
   - Se for destrutiva (alteracao de tipo ou renomeacao): Aplicar a migracao corretiva revertendo para os tipos anteriores em bloco de transacao `BEGIN ... COMMIT`.

---

## 4. Rotacao de Chaves de API e Segredos

### 4.1 Segredos Criticos do Sistema
- `SUPABASE_SERVICE_ROLE_KEY`: Acesso administrativo com bypass de RLS (Uso restrito a Server Functions isoladas).
- `SUPABASE_ANON_KEY`: Chave publica de cliente para sessao anonima.
- `JWT_SECRET`: Assinatura de sessoes criptograficas.
- `STORAGE_ACCESS_TOKEN`: Acesso a buckets privados de documentos.

### 4.2 Protocolo de Rotacao sem Indisponibilidade (Zero-Downtime Key Rotation)
1. No painel do Supabase -> **Project Settings** -> **API**, gerar a chave secundaria (Next Key).
2. Atualizar as variaveis de ambiente no Cloudflare Pages:
   ```bash
   npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY
   ```
3. Apos a propagacao do deployment (30 a 60 segundos), revogar a chave antiga no painel do Supabase.
4. Validar o funcionamento atraves do endpoint de telemetria `/status`.

---

## 5. Resposta a Incidentes

### 5.1 Matriz de Severidade

| Nivel | Definicao | Tempo Maximo de Resposta | Acao Imediata |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critico)** | Indisponibilidade total de rotas publicas, falha transacional de checkout, vazamento multi-tenant ou bypass de RLS. | 15 minutos | Rollback imediato para ultimo commit estavel; ativacao de modo manutencao no gateway se necessario. |
| **SEV-2 (Alto)** | Degradação de latencia (> 2000ms), falha parcial em servicos externos (geolocalizacao ou envio de emails), falha de upload de midia. | 1 hora | Investigacao de logs de borda, chaveamento para fallbacks estaveis, isolamento da rota afetada. |
| **SEV-3 (Medio)** | Defeitos visuais nao-bloqueantes, desvio em relatorios historicos, quebra de cache local ou orfaos de telemetria. | 8 horas | Criacao de patch de correcao profunda na raiz com esteira normal de CI. |

### 5.2 Roteiro de Diagnostico em Caso de SEV-1
1. **Verificar Saude da Edge:**
   Requisitar `GET https://waesy.com/status` — verificar latencia e status do banco.
2. **Consultar Logs em Tempo Real da Cloudflare:**
   ```bash
   npx wrangler pages deployment tail
   ```
3. **Inspecionar Logs de Banco e RLS no Supabase:**
   - Verificar taxa de conexoes ativas no pool pgBouncer (max 80%).
   - Checar queries com timeout (> 5000ms) ou erros de permissao `42501` (permission denied).
4. **Isolar Causa Raiz:**
   - Se for falha de compilacao/runtime no worker: Rollback imediato via Cloudflare Pages Dashboard.
   - Se for esgotamento de conexoes no Postgres: Reiniciar o pooler ou elevar max_connections temporariamente.

---

## 6. Monitoramento, Healthchecks e Telemetria

### 6.1 Endpoints Oficiais de Diagnostico
- `GET /status`: Resumo operacional de saude dos 4 pilares, versao do worker e latencia de banco.
- `getSystemHealth()`: Server Function com validacao de ping no Supabase e tempo de resposta.

### 6.2 Alarmes e Limiares Operacionais
- Taxa de erro 5xx na borda > 0.5% durante 5 minutos -> Notificacao automatica canal de plantao.
- Latencia p95 > 800ms em rotas publicas -> Alarme de sobrecarga.
- Conexoes livres no banco < 10% -> Alarme de saturacao do pooler de conexoes.
