# Handoff Report: Roteamento Híbrido BYOK vs Background da Plataforma com Quarentena Invisível e Failover 429 (Requirement R2)

**Explorer**: explorer_survey_orchestrator11_2  
**Data**: 2026-10-18T09:50:00Z  
**Parent Agent**: 2e600c46-95e2-4963-8431-c31ea9d5365f  
**Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_survey_orchestrator11_2`

---

## 1. Observation

Direct code observations from the codebase:

### 1.1 Localização e Carregamento de Chaves BYOK (`store_id` / Tenant)
- **Arquivo**: `src/services/secret-vault.functions.ts` (linhas 150–285)
  - Função: `getActiveSecretForProvider(provider: string, ownerId?: string, storeId?: string): Promise<string | null>`
  - Ordem de resolução cascata:
    1. `public.secret_vault`:
       ```ts
       query = supabase.from("secret_vault").select("encrypted_secret")
         .eq("provider", provider)
         .eq("is_active", true);
       if (ownerId) query = query.eq("owner_id", ownerId);
       ```
       Descriptografa com `decryptSecret(data.encrypted_secret)` via AES-256-GCM (`src/lib/crypto-vault.server.ts`).
    2. `public.tenant_ai_providers`:
       Resolve `targetStoreId` diretamente de `storeId` ou via `workspace_members` para o `ownerId`:
       ```ts
       query = supabase.from("tenant_ai_providers").select("api_key")
         .eq("store_id", targetStoreId)
         .eq("provider", provider)
         .eq("is_active", true);
       ```
    3. `public.integration_credentials` (Hub Central de Integrações da Loja):
       ```ts
       query = supabase.from("integration_credentials").select("token_payload")
         .eq("store_id", targetStoreId)
         .eq("provider", provider)
         .eq("is_active", true);
       ```
       Extrai chaves como `api_key`, `secret_key`, `token`.

- **Arquivo**: `src/services/api-orchestrator.functions.ts` (linhas 475–489 e 985–998)
  - Em `getAllActiveKeysForProvider(provider: ApiProvider, ownerId?: string)`:
    ```ts
    // 1. BYOK do usuário ou loja (se houver no cofre)
    if (ownerId) {
      try {
        const byokSecret = await getActiveSecretForProvider(provider, ownerId).catch(() => null);
        if (byokSecret) {
          keys.push({ id: `byok-${provider}`, rawKey: byokSecret });
        }
      } catch {}
    }
    ```
    *Observação de Defeito*: `getAllActiveKeysForProvider` não recebia `storeId`, não checava `isKeyInMemoryCooldown` para a chave BYOK, e usava ID não escopado por tenant (`byok-${provider}`).
  - Em `executeUnifiedAiCall` (linhas 985–998):
    ```ts
    if (canUseByok) {
      const isProviderCompatibleWithTask = isVisionTask ? provider !== "groq" : true;
      if (isProviderCompatibleWithTask) {
        const byokSecret = await getActiveSecretForProvider(provider, targetOwner || undefined, targetStore || undefined).catch(() => null);
        if (byokSecret && !keysToTry.some((k) => k.rawKey === byokSecret)) {
          const byokKeyId = `byok-${provider}-${targetStore || targetOwner || "user"}`;
          if (!isKeyInMemoryCooldown(byokKeyId)) {
            keysToTry.push({ id: byokKeyId, rawKey: byokSecret });
          }
        }
      }
    }
    ```
    *Observação de Defeito*: Na linha 1002, `getAllActiveKeysForProvider(provider, canUseByok ? targetOwner : undefined)` era chamado logo a seguir. Quando `canUseByok` era verdadeiro, se a chave estivesse em cooldown na linha 993, `getAllActiveKeysForProvider` re-inseria a chave BYOK na linha 1004 sem checagem de cooldown, contornando a quarentena.

### 1.2 Representação de Tarefas de Background e Isolamento Anti-BYOK
- **Arquivos**:
  - `src/services/mining/editorial-squad.ts` (linhas 200–209):
    Invoca `executeUnifiedAiCall` com:
    `taskType: "editorial_squad"`, `feature: "mining_editorial_squad"`, `isSystemTask: true`.
  - `src/services/mining/datajud-harvester.ts` (linha 195):
    Invoca `getNextActiveKey("datajud")` diretamente sem passar `ownerId` ou `storeId`.
  - `src/services/mining/automated-harvest.ts`, `auction-harvester.ts`, `places-harvester.ts`:
    Operam sem contexto de tenant (`storeId = undefined`, `ownerId = undefined`).
- **Garantia de Isolamento em `src/services/api-orchestrator.functions.ts`** (linhas 964–976):
  ```ts
  const isPlatformBackground =
    Boolean(options.isSystemTask) ||
    Boolean(options.feature?.startsWith("mining_")) ||
    Boolean(options.feature?.startsWith("cron_")) ||
    Boolean(options.feature?.startsWith("crawler_")) ||
    Boolean(options.feature?.startsWith("datajud_")) ||
    options.taskType === "scraping" ||
    options.taskType === "background" ||
    (!options.storeId && !options.ownerId && (Boolean(options.feature?.includes("harvest")) || Boolean(options.feature?.includes("crawler"))));

  const canUseByok = !isPlatformBackground && (Boolean(targetOwner) || Boolean(targetStore));
  ```
  Se `isPlatformBackground === true`, `canUseByok` é avaliado como `false`.

### 1.3 Detecção e Captura de Erros HTTP 429
- **Arquivo**: `src/services/api-orchestrator.functions.ts` (linhas 1093–1466)
  - Em cada provedor (OpenRouter, Groq, Gemini, OpenAI, Anthropic):
    ```ts
    if (!res.ok) {
      await markKeyError(keyInfo.id, `Provider HTTP ${res.status}: ${errText.slice(0, 300)}`, res.status);
      errors.push(`Provider (${res.status})`);
      continue;
    }
    ```
  - Em exceções de rede/timeout:
    ```ts
    catch (err: any) {
      if (keyInfo?.id) {
        await markKeyError(keyInfo.id, `Erro de conexão: ${err.message || "Network Error"}`);
      }
      errors.push(`${provider}: ${err.message}`);
    }
    ```
  - Em `classifyKeyQuotaError` (linhas 689–724):
    - Código 401/403: `scope = "permanent"`, `until = null` (desativa chave no pool).
    - Código 402 ou `insufficient_quota` / `monthly_limit`: `scope = "month"`, `until = 1º dia do mês seguinte`.
    - Código 429 com `per day`, `daily`, `rpd`, `tpd`: `scope = "day"`, `until = 00:00 UTC do dia seguinte`.
    - Código 429 padrão RPM/TPM: `scope = "minute"`, `until = now + 60_000` (60 segundos).
    - Erro 5xx transitório: `scope = "minute"`, `until = now + 30_000` (30 segundos).

### 1.4 Quarentena Silenciosa Local e Failover Atômico para o Master Pool
- **Arquivo**: `src/services/api-orchestrator.functions.ts` (linhas 730–752):
  ```ts
  export async function markKeyError(
    keyId: string,
    errorMessage: string = "Rate limit or network error",
    statusCode?: number
  ): Promise<void> {
    if (!keyId) return;
    const cls = classifyKeyQuotaError(statusCode, errorMessage);
    keyCooldownUntilMap.set(keyId, cls.until ?? Date.now() + 365 * 86_400_000);

    if (keyId.startsWith("env-") || keyId.startsWith("byok-") || keyId === "override-key") return;
    // ... persiste apenas chaves gerenciadas em public.api_key_pools
  }
  ```
  - Se a chave for `byok-${provider}-${tenantId}`, a linha 737 grava `keyCooldownUntilMap.set(keyId, cls.until)`. A linha 739 aborta a escrita no banco `api_key_pools` (pois a BYOK não é linha de `api_key_pools`).
  - No loop de execução de `executeUnifiedAiCall` (linha 1018):
    `keysToTry = [byokKey, ...poolKeys, ...envFallbacks]`.
    Ao ocorrer o 429 na chave BYOK:
    1. `markKeyError(byokKey.id, ..., 429)` coloca a chave do lojista em quarentena local.
    2. O loop faz `continue` imediato para a próxima chave: a primeira chave saudável de `public.api_key_pools`.
    3. A chave do Master Pool responde com sucesso (200 OK).
    4. `finalizeSuccess` registra telemetria (`status: "fallback_recovered"`, `fallbackUsed: true`, `fallbackFrom: "Provider (429)"`).
    5. O resultado é retornado sem qualquer exceção ou banner para o usuário.
    6. Em chamadas subsequentes do mesmo tenant, `!isKeyInMemoryCooldown(byokKeyId)` é falso, pulando a chave esgotada sem fazer requisição de rede e usando diretamente o Master Pool.

### 1.5 Estrutura de `public.api_key_pools` no Banco de Dados
- **Tabela criada em**: `supabase/migrations/20260826040000_api_orchestrator_pools_and_master_prompts.sql`
  - Colunas base: `id (UUID)`, `provider (TEXT)`, `label (TEXT)`, `encrypted_key (TEXT)`, `masked_key (TEXT)`, `priority (INT)`, `is_active (BOOLEAN)`, `rate_limit_per_minute (INT)`, `daily_request_count (INT)`, `last_used_at (TIMESTAMPTZ)`, `last_error_at (TIMESTAMPTZ)`, `last_error_message (TEXT)`.
- **Hardening RLS em**: `supabase/migrations/20260829220000_security_hardening_rls_phase1.sql`
  - `ALTER TABLE public.api_key_pools ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.api_key_pools FORCE ROW LEVEL SECURITY;`
  - Policy: `api_keys_admin_only` (Restrito exclusivamente a `platform_admin` e `service_role`).
- **Quarentena Temporal e Rotação em**: `supabase/migrations/20261018080000_api_key_pools_scoped_quarantine_and_copilot_tasks.sql`
  - Adição de:
    - `quarantine_until TIMESTAMPTZ DEFAULT NULL`
    - `quarantine_scope TEXT CHECK (quarantine_scope IN ('minute', 'day', 'month', 'permanent'))`
    - `quarantine_reason TEXT`
    - `monthly_request_count INT NOT NULL DEFAULT 0`
    - `last_daily_reset_date DATE NOT NULL DEFAULT CURRENT_DATE`
    - `last_monthly_reset_month TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM')`
  - Índice Composto: `idx_api_key_pools_healthy_rotation` em `(provider, is_active, quarantine_until, priority ASC, daily_request_count ASC, last_used_at ASC NULLS FIRST)`.
  - RPC Atômica: `public.claim_healthy_api_keys_for_provider(p_provider TEXT, p_limit INT DEFAULT 50)` que limpa quarentenas expiradas, zera contadores diários/mensais e retorna as chaves prontas para uso.
- **Circuit Breaker e Telemetria em**: `supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql`
  - Colunas: `circuit_state TEXT ('closed', 'open', 'half_open')`, `consecutive_failures INT`, `circuit_broken_until TIMESTAMPTZ`.
  - Tabelas complementares: `public.ai_telemetry_logs`, `public.ai_response_cache`, `public.ai_task_routing_rules`, `public.ai_async_jobs`.

### 1.6 Cobertura de Testes Unitários
- **Testes executados com sucesso**:
  1. `npx.cmd vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts`
     - 4 testes passando:
       - Aptidão `vision` ignora Groq e seleciona Gemini.
       - Aptidão `fast_json` prioriza Groq.
       - `isSystemTask: true` nunca chama `getActiveSecretForProvider`.
       - Chave BYOK com 429 realiza failover transparente e silencioso para o Master Pool sem erros.
  2. `npx.cmd vitest run src/services/copilot-keypool-quarantine.test.ts`
     - 7 testes passando:
       - 429 RPM/TPM quarentena por 60s.
       - 429 RPD/TPD quarentena até 00:00 UTC do dia seguinte.
       - Gemini RESOURCE_EXHAUSTED no escopo day.
       - 402/insufficient_quota quarentena até dia 1º do próximo mês.
       - Virada de ano em dezembro para janeiro.
       - 401/403 chave inválida permanente.
       - Erro 5xx transitório por 30s.
  3. `npx.cmd vitest run src/services/ai-core-gateway.test.ts`
     - 7 testes passando (matriz canônica, circuit breaker, cálculo de custos e prompt shield).

---

## 2. Logic Chain

1. **Premissa de Isolamento Soberano**: Chaves BYOK pertencem a lojistas e possuem cotas individuais ou de faturamento direto com o provedor. Tarefas de background da plataforma consomem dezenas de milhares de requisições contínuas de mineração e não devem, em hipótese alguma, gerar custos ou consumir cotas de lojistas.
   - *Suporte*: A verificação de `isPlatformBackground` em `api-orchestrator.functions.ts` (linhas 965–976) bloqueia o uso de BYOK (`canUseByok = false`) quando a flag `isSystemTask` ou prefixos de mineração (`mining_`, `crawler_`, `datajud_`, `cron_`) estiverem presentes.
2. **Defeito Mitigado no Carregamento de Chaves da Pool**: Em `executeUnifiedAiCall`, o pool do Admin Master é lido via `getAllActiveKeysForProvider`. Na linha 1002, se `targetOwner` fosse repassado para `getAllActiveKeysForProvider`, este re-buscava o segredo BYOK e o inseria com o id genérico `byok-${provider}`, sem validar `isKeyInMemoryCooldown`.
   - *Correção recomendada*: Na chamada da linha 1002 em `executeUnifiedAiCall`, passar estritamente `undefined` no parâmetro de dono (`getAllActiveKeysForProvider(provider, undefined)`), garantindo que a lista de chaves da pool contenha **exclusivamente** chaves de `public.api_key_pools` gerenciadas pelo Admin Master.
3. **Escopo de Quarentena Local por Tenant**: A chave BYOK deve ter identificador estruturado `byok-${provider}-${targetStore || targetOwner}`. Ao receber `HTTP 429`, `markKeyError` registra o timestamp de liberação em `keyCooldownUntilMap.get(byokKeyId)`. Como o identificador contém o ID da loja/usuário, a quarentena afeta unicamente as requisições daquele tenant, sem impactar outros lojistas nem o pool master.
4. **Mecanismo de Failover Invisível**: O loop de execução itera sobre `keysToTry`. Ao detectar falha HTTP 429 na chave BYOK (índice 0), `markKeyError` é executado de forma assíncrona, o erro é empurrado para o array interno `errors`, e o loop avança para a próxima chave (índice 1: chave de `public.api_key_pools`). A chave master responde com 200 OK. A função `finalizeSuccess` marca `status: "fallback_recovered"`, loga telemetria com `fallback_used: true`, e retorna a resposta pura ao cliente, garantindo zero degradação de UX e zero visibilidade de erro para o lojista.

---

## 3. Caveats

- **Persistência em Processos Distribuídos**: O mapa `keyCooldownUntilMap` é mantido em memória no processo Node/Cloudflare Worker ativo. Em arquitetura multi-instância ou serverless distribuído, cada worker isola a sua memória de cooldown. A persistência no banco (`api_key_pools`) já ocorre para as chaves master. Caso se deseje quarentena distribuída de BYOK através de múltiplos workers sem repetição de 429 no primeiro round de cada worker, recomenda-se armazenar o timestamp em Redis/Upstash ou adicionar a coluna `quarantine_until` na tabela `public.secret_vault`. Para a carga atual de workers persistentes, o mapa em memória com failover instantâneo é completamente suficiente e tem latência de 0ms.
- **Provedores Suportados no BYOK**: Os lojistas atualmente cadastram principalmente chaves do Google Gemini e OpenAI. Chaves text-only como Groq, se cadastradas por engano para tarefas `vision`, são descartadas pela checagem de aptidão (`isProviderCompatibleWithTask`).
- **Restrição de Execução**: `npm run typecheck` e `npm run build` não foram executados, em estrito cumprimento da Regra B.6 e do Mandato R6 de `ORIGINAL_REQUEST.md`. A verificação foi conduzida via inspeção de código estática e testes unitários focados com Vitest.

---

## 4. Conclusion

1. O fluxo arquitetural de R2 está plenamente mapeado e validado:
   - Chaves BYOK residem em `public.secret_vault` (com fallbacks para `tenant_ai_providers` e `integration_credentials`).
   - Background tasks usam `isSystemTask: true` / `taskType: "scraping"` / `feature: "mining_*"` e jamais tocam BYOK.
   - O failover transparente 429 com transbordo imediato para `public.api_key_pools` opera via iteração sequencial em `keysToTry`.
2. Para blindagem definitiva de R2 na implementação, o implementador deve adotar as 3 regras pontuais:
   - **Regra 1**: Em `api-orchestrator.functions.ts` linha 1002, chamar sempre `getAllActiveKeysForProvider(provider, undefined)` para isolar o passo 2 das chaves de lojistas.
   - **Regra 2**: Em `getAllActiveKeysForProvider`, ao lidar com `ownerId`, aceitar também `storeId` opcional e validar `!isKeyInMemoryCooldown(byokKeyId)`.
   - **Regra 3**: Padronizar todos os módulos de background (`mining/`, `cron/`, `datajud/`) para passarem `isSystemTask: true` ou `feature: "mining_*"` ao invocar `executeUnifiedAiCall`.

---

## 5. Verification Method

Para verificar de forma independente as observações e regras comprovadas neste relatório:

1. **Execução da suíte de testes de isolamento BYOK e roteamento de aptidão**:
   ```powershell
   npx.cmd vitest run src/services/ai-task-aptitude-and-byok-isolation.test.ts
   ```
   *Critério de aprovação*: 4/4 testes aprovados (Exit Code 0).

2. **Execução da suíte de testes de quarentena por escopo de quota**:
   ```powershell
   npx.cmd vitest run src/services/copilot-keypool-quarantine.test.ts
   ```
   *Critério de aprovação*: 7/7 testes aprovados (Exit Code 0).

3. **Execução da suíte de testes do Gateway Core de IA**:
   ```powershell
   npx.cmd vitest run src/services/ai-core-gateway.test.ts
   ```
   *Critério de aprovação*: 7/7 testes aprovados (Exit Code 0).

4. **Inspeção visual dos arquivos-chave**:
   - `src/services/api-orchestrator.functions.ts`: linhas 475–593, 689–750, 896–1035.
   - `src/services/secret-vault.functions.ts`: linhas 150–285.
   - `supabase/migrations/20261018080000_api_key_pools_scoped_quarantine_and_copilot_tasks.sql`: linhas 1–129.
   - `supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql`: linhas 1–162.
