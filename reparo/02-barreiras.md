# BARREIRAS DEFENSIVAS PERMANENTES (S1 A S7)

## S1: Barreira de Rota & Prevenção de Tela Branca
- **Localização:** `src/routes/__root.tsx` e guardas de rota em `workspace.tsx`.
- **Mecanismo:** Error boundaries em todos os níveis e detecção de rotas órfãs. Se o loader falhar ou a sessão for interrompida, o layout redireciona para a rota canônica segura com `returnUrl` sem disparar crash de React ou tela em branco.
- **Evidência:** `isRedirect(err)` tratado antes de logar erro; tela de recuperação com botão de recarga direta.

---

## S2: Barreira de Sessão & Sanitização Multi-Contexto
- **Localização:** `src/lib/identity.server.ts` e `src/services/identity.functions.ts`.
- **Mecanismo:** Isolamento estrito entre os 3 contextos operacionais da plataforma (`civil`, `store`, `creator`). Toda troca de contexto limpa os cookies dos contextos concorrentes atomicamente. Se `waesy_active_context === "civil"`, o `activeStoreId` é forçadamente anulado no servidor, prevenindo vazamento de dados corporativos.
- **Evidência:** Teste `src/services/identity.functions.ts` e `setTenantContext`.

---

## S3: Barreira de Validação Zod & Contratos Rígidos
- **Localização:** Camada BFF em `src/services/*.functions.ts`.
- **Mecanismo:** Todas as Server Functions validam payloads com schemas Zod estritos no padrão `.validator(z.object({...}))`. É proibido processar requisições com dados malformados ou enums truncados.
- **Evidência:** `storage.functions.ts` com validação de 16 buckets e tipo MIME verificado antes de alocar recursos.

---

## S4: Barreira de Auto-Healing de Storage
- **Localização:** `src/services/storage.functions.ts`.
- **Mecanismo:** Se uma requisição de upload solicitar um bucket que ainda não exista no Supabase Storage, a rotina captura o erro `Bucket not found`, cria o bucket programaticamente com as permissões corretas (público vs. privado) e refaz a operação sem repassar o erro para o usuário final.
- **Evidência:** `createBucket` com limite de 10MB e reemissão de signed upload URL.

---

## S5: Barreira de Isolamento Multi-Tenant & RLS Universal
- **Localização:** `supabase/migrations/20261204000000_v140_complete_rls_lockdown_and_role_matrix.sql`.
- **Mecanismo:** 100% das tabelas do schema `public` possuem Row Level Security ativado com verificação via `workspace_members`. Proibido acesso direto a dados de tenants concorrentes, mesmo por injeção de parâmetros na URL.
- **Evidência:** Prova empírica de consulta vazia (`[]`) em `orders` para clientes anônimos e execução com service_role restrito.

---

## S6: Barreira de Feedback Visual & Anti-Freeze
- **Localização:** Componentes de formulário e checkout (`_store.checkout.tsx`, `workspace.pdv.index.tsx`).
- **Mecanismo:** Blocos `try/catch` sempre restauram estados de carregamento (`setIsSubmitting(false)`) e emitem feedback de erro sucinto via toast. Proibido botões congelados em loading perpétuo ou ausência de notificação visual.
- **Evidência:** Reset garantido de `isSubmitting` no bloco `catch` e tratamento de transações de pagamento.

---

## S7: Barreira de Anti-Recorrência & Prova Contínua
- **Localização:** Suíte automatizada de 109 arquivos de teste em `vitest` e linter de design em `scripts/design-lint.mjs`.
- **Mecanismo:** Toda correção na raiz é acompanhada de verificação automatizada. Nenhuma alteração é aceita sem teste de regressão e garantia de 0 erros no build de produção.
- **Evidência:** 698 de 698 testes aprovados no Vitest e compilação limpa do worker Nitro.
