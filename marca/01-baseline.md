# 01-baseline.md — Baseline Operacional: Fluxo do Perfil de Pessoa Física

| Atributo | Estado Canônico |
| :--- | :--- |
| **Entidade** | Pessoa Física / Conta Civil (`profiles`) |
| **Ponto de Entrada** | `/conta` (`src/routes/_store.conta.index.tsx`) e `/conta/perfil` |
| **Status Operacional** | Estável e Funcional (Exit Code 0 em 100% dos testes) |

---

## 1. Topologia de Identidade Civil

1. **Autenticação:**
   - Supabase Auth emite token JWT com refresh seguro via SSR cookies (`waesy_access_token`, `waesy_refresh_token`).
   - O disparador `handle_new_user` cria o registro correspondente em `public.profiles`.
2. **Dados Pessoais:**
   - Nome completo (`full_name`), identificador único (`username`), e-mail, telefone e CPF com validação Módulo 11 (`src/lib/document-validator.ts`).
3. **Pipeline de Ativos Pessoais:**
   - **Avatar (`1:1`):** Capturado via `ImageUpload` com recorte quadrado (`aspect-square`), persistido no storage e referenciado em `profiles.avatar_url`.
   - **Capa (`21:9`):** Capturada com recorte panorâmico (`PRESET_ASPECT_RATIOS["21:9"]`), persistida e referenciada em `profiles.cover_url`.
   - **Persistência Atômica:** Executada via `uploadProfileMediaDirect` com update síncrono no banco.

---

## 2. Relação com Workspaces e Multi-Tenancy

- Uma conta civil pode possuir 0, 1 ou N empresas vinculadas na tabela canônica `workspace_members`.
- Quando o usuário não possui empresas cadastradas (`memberships.length === 0`), a rota `/workspace` o redireciona automaticamente para `/criar-negocio`.
- O alternador de contexto (`ContextSwitcher`) permite transição em 1 clique entre:
  - **Contexto Civil:** `waesy_active_context=civil`, operando em `/conta` (pedidos pessoais, favoritos, endereços de entrega).
  - **Contexto de Loja:** `waesy_active_context=store`, com `waesy_active_tenant={store_id}`, operando em `/workspace`.
  - **Contexto de Criador:** `waesy_active_context=creator`, com `waesy_active_creator={creator_id}`.

---

## 3. Invariantes Comprovadas do Baseline

1. **Zero Vazamento:** Um usuário civil só visualiza e edita seus próprios dados pessoais e pedidos (RLS `auth.uid() = id`).
2. **Zero Desconexão de Sessão:** A alternância de contexto limpa cookies concorrentes sem invalidar a sessão Auth principal.
3. **Piso de Acessibilidade:** Botões e formulários do perfil respeitam o piso mínimo de toque de 44x44px (`h-11`) e anéis de foco visíveis (`focus-visible`).
