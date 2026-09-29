# 07-quebras.md — Matriz de Quebras de Marca (Classes MB1 a MB12)

| Classe | Descrição Objetiva da Quebra | Status | Evidência em Código | Causa Raiz | Ação Preventiva Instalada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MB1** | Criação não conclui ou termina sem workspace utilizável | **Corrigido** | `company-mvp.functions.ts:198` | Cookie gravado como `waesy_store_id` em vez de `waesy_active_tenant` | Cookie canônico `waesy_active_tenant` + `waesy_active_context=store` unificado |
| **MB2** | Workspace órfão (sem vínculo com o criador ou sem role de admin) | **Prevenido** | `onboarding.functions.ts:660`, `identity.functions.ts:162` | Falha silenciosa de upsert em `workspace_members` | Upsert atômico via service_role garantindo `role: 'owner'` e atualização de `profiles.role` |
| **MB3** | Novo workspace não aparece no alternador ou não abre | **Corrigido** | `workspace-account-switcher.tsx:66` | Busca filtrava por `m.store_slug` quando o campo retornado por `identity.server.ts` era `m.slug` | Filtro corrigido para `(m.slug || m.store_slug)` |
| **MB4** | Código envia mídia para bucket inexistente | **Prevenido** | `storage.functions.ts:43`, `storage.functions.ts:89` | Enum Zod com 16 buckets validados e rotina de auto-healing | Auto-healing cria automaticamente o bucket no Supabase Storage se não existir |
| **MB5** | Upload negado silenciosamente por política de storage | **Prevenido** | `storage.functions.ts:214` | Falta de bypass server-side em operações autenticadas | Uploads realizados via Server Functions com rate limiting e bypass controlado |
| **MB6** | Arquivo sobe e referência não é gravada (ou vice-versa) | **Prevenido** | `storage.functions.ts:581` | Falta de atualização síncrona na tabela relacional | `uploadProfileMediaDirect` executa upload e UPDATE atômico na mesma transação lógica |
| **MB7** | Ativo aceito em proporção incorreta (corte ou esticamento) | **Corrigido** | `docs/marca/ATIVOS.md:9` | Falta de SSOT de proporções para capas e logos | Matriz canônica (`1:1` logo, `21:9` capa, `16:9` cartão) e derivação `object-center` sem corte |
| **MB8** | Imagem morta (URL efêmera que expira ou caminho quebrado) | **Prevenido** | `storage.functions.ts:106` | Uso indevido de signed URLs temporárias para exibição estática | Persistência exclusiva de URLs públicas permanentes (`getPublicUrl`) |
| **MB9** | Vertical sem definição de campos, rótulos ou ativos | **Corrigido** | `docs/marca/NICHOS.md:15` | Ausência de documentação de campos dirigidos por vertical | SSOT `docs/marca/NICHOS.md` com as 17 verticais detalhadas |
| **MB10**| Duplicidade divergente de nichos ou categorias | **Corrigido** | `fast-company-onboarding.tsx:13` | Dropdown local com emojis e IDs divergentes | Emojis erradicados e mapeamento convergente em `resolveRegistryEntry` |
| **MB11**| Falha técnica crua exibida ao usuário sem tradução | **Prevenido** | `workspace.tsx:101`, `_store.criar-negocio.tsx:324` | Erros não interceptados lançados diretamente na UI | Captura com mensagens amigáveis em português e registro no log de telemetria |
| **MB12**| Mesmo dado capturado de formas diferentes em pessoa e empresa | **Prevenido** | `document-validator.ts:1` | Formatações divergentes de CPF, CNPJ e telefone | Sanitização e validação centralizada Módulo 11 para documentos civis e PJ |

---

## 1. Classificação de Severidade & Resolução

- **Bloqueadores de Confiabilidade (P0):**
  - MB1 (Criação de empresa sem workspace ativo): Resolvido pela sincronização dos cookies `waesy_active_tenant` e `waesy_active_context=store`.
  - MB2 (Workspace órfão): Resolvido pelo vinculo garantido em `workspace_members`.
  - MB3 (Alternador que não encontra a loja): Resolvido pela correção do filtro de slug.
- **Bloqueadores de Ativos (P1):**
  - MB4/MB5/MB6: Garantidos pelo pipeline unificado de `storage.functions.ts`.
  - MB7: Garantido pelo consumo estrito de `docs/marca/ATIVOS.md`.
- **Governança de Nichos (P1):**
  - MB9/MB10: Garantidos por `docs/marca/NICHOS.md` e eliminação de listas paralelas.
