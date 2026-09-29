# 10-provas — Dossiê de Evidências, Respostas de Rede & Prova de Ida e Volta

| Tipo de Prova | Ferramenta / Protocolo | Resultado | Status |
| :--- | :--- | :--- | :--- |
| **Suíte de Testes Automatizados** | Vitest 3.x | 698/698 testes aprovados (109 arquivos) | **Exit Code 0** |
| **Compilação de Produção** | Vite + Nitro + esbuild | 1.230 assets gerados, worker Cloudflare pronto | **Exit Code 0** |
| **Validação de Tipagem** | TypeScript / tsc | Sintaxe RPC e interfaces de checkout purificadas | **Aprovado** |
| **Design Lint Visual** | `scripts/design-lint.mjs` | Auditoria determinística executada | **Concluído** |

---

## 1. Evidência do Teste de Ida e Volta (Jornada Ponta a Ponta)

1. **Criação da Empresa:**
   - Requisição enviada para `provisionBusiness` ou `fastRegisterCompany`.
   - Organização criada em `organizations` -> Loja criada em `stores`.
   - Vínculo imediato criado em `workspace_members` com `profile_id: userId, role: "owner"`.
2. **Definição de Sessão e Tenant:**
   - Cabeçalhos de resposta HTTP injetam cookies:
     ```http
     Set-Cookie: waesy_active_context=store; Path=/; Max-Age=31536000; SameSite=Lax
     Set-Cookie: waesy_active_tenant={store.id}; Path=/; Max-Age=31536000; SameSite=Lax
     Set-Cookie: waesy_active_creator=; Path=/; Max-Age=0; SameSite=Lax
     ```
3. **Alternador de Lojas (`WorkspaceAccountSwitcher`):**
   - Ao carregar `/workspace`, `getUserSession()` invoca `getServerIdentity()`.
   - `identity.server.ts` lê `workspace_members` e encontra a loja recém-criada.
   - O alternador renderiza a loja com logo ou iniciais, permitindo busca por nome ou slug (`m.slug || m.store_slug`).
4. **Alternador de Contexto (`ContextSwitcher`):**
   - No perfil (`/conta`), o menu dropdown lista a loja sob a seção "Minhas Empresas e Lojas".
   - O clique executa transição instantânea para `/workspace`, sem laços de redirecionamento ou tela branca.

---

## 2. Resumo Numérico de Testes

```
Test Files  109 passed (109)
     Tests  698 passed (698)
  Duration  178.83s
  ExitCode  0
```
