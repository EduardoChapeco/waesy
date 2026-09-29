# MATRIZ DE CHECKPOINTS DOS 5 FLUXOS CRÍTICOS (SPEC-002)

## Metodologia de Avaliação
Cada fluxo é avaliado sequencialmente através da cadeia de 7 elos:
1. **Entrada:** Rota alcançável sem redirecionamento indevido ou 404.
2. **Intenção:** Gatilho de UI acionável com affordance e target >= 44px.
3. **Validação:** Validação Zod estrita sem falsos positivos ou silent fail.
4. **Gravação:** Persistência transacional atômica no Supabase / Storage.
5. **Retorno:** Resposta do BFF com payload limpo e tratamento de exceção.
6. **Retorno Visual:** Feedback silencioso e direto (toasts <= 3 palavras, sem freeze).
7. **Consistência:** Sobrevivência ao refresh sem perda de estado ou dessincronização.

---

## D1: Upload de Ativo de Mídia (6 Checkpoints)
| Checkpoint | Descrição | Shell Mobile | Shell Desktop | Elo da Cadeia | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D1-1** | Seleção de arquivo por input nativo e drag-and-drop | Aprovado | Aprovado | Elo 1 / 2 | OK |
| **D1-2** | Validação MIME e enum de buckets (`storage.functions.ts`) | Aprovado | Aprovado | Elo 3 | OK |
| **D1-3** | Emissão de URL assinada com isolamento de tenant | Aprovado | Aprovado | Elo 4 / 5 | OK |
| **D1-4** | Auto-healing de criação automática de buckets ausentes | Aprovado | Aprovado | Elo 4 | OK |
| **D1-5** | Renderização imediata de preview na proporção canônica | Aprovado | Aprovado | Elo 6 | OK |
| **D1-6** | Persistência da URL pública e sobrevivência ao refresh | Aprovado | Aprovado | Elo 7 | OK |

---

## D2: Criar Loja / Negócio / Empresa (9 Checkpoints)
| Checkpoint | Descrição | Shell Mobile | Shell Desktop | Elo da Cadeia | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D2-1** | Entrada em `_store.criar-negocio.tsx` para usuário autenticado | Aprovado | Aprovado | Elo 1 | OK |
| **D2-2** | Seleção e validação do nicho operacional de mercado | Aprovado | Aprovado | Elo 2 / 3 | OK |
| **D2-3** | Validação em etapas MECE (identificação, visual, operação) | Aprovado | Aprovado | Elo 3 | OK |
| **D2-4** | Upload de logo e banner de cabeçalho na proporção canônica | Aprovado | Aprovado | Elo 2 / 4 | OK |
| **D2-5** | Gravação atômica da loja e criação de `workspace_members` | Aprovado | Aprovado | Elo 4 | OK |
| **D2-6** | Sincronização atômica de cookies (`waesy_active_context=store`) | Aprovado | Aprovado | Elo 4 / 5 | OK |
| **D2-7** | Limpeza de contexto divergente (`waesy_active_creator=""`) | Aprovado | Aprovado | Elo 5 | OK |
| **D2-8** | Toast de confirmação enxuto e redirecionamento ao workspace | Aprovado | Aprovado | Elo 6 | OK |
| **D2-9** | Carga imediata do painel sem anulação de `activeStoreId` | Aprovado | Aprovado | Elo 7 | OK |

---

## D3: Acessar Workspace (7 Checkpoints)
| Checkpoint | Descrição | Shell Mobile | Shell Desktop | Elo da Cadeia | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D3-1** | Rota `/workspace` protegida por guarda com 3 estados | Aprovado | Aprovado | Elo 1 | OK |
| **D3-2** | Redirecionamento limpo a `/entrar` quando sem sessão | Aprovado | Aprovado | Elo 1 / 6 | OK |
| **D3-3** | Redirecionamento a `/criar-negocio` quando usuário civil | Aprovado | Aprovado | Elo 1 / 6 | OK |
| **D3-4** | Bypass explícito para administradores de plataforma | Aprovado | Aprovado | Elo 3 | OK |
| **D3-5** | Carregamento do `WorkspaceShell` e resolução de módulos | Aprovado | Aprovado | Elo 5 | OK |
| **D3-6** | Prevenção de loop infinito de navegação na guarda | Aprovado | Aprovado | Elo 1 / 7 | OK |
| **D3-7** | Persistência da rota ativa e navegação hierárquica | Aprovado | Aprovado | Elo 7 | OK |

---

## D4: Alternar Perfil / Workspace (5 Checkpoints)
| Checkpoint | Descrição | Shell Mobile | Shell Desktop | Elo da Cadeia | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D4-1** | Abertura do seletor de contas/lojas no header ou sidebar | Aprovado | Aprovado | Elo 1 / 2 | OK |
| **D4-2** | Chamada atômica de `setTenantContext` com validação de ID | Aprovado | Aprovado | Elo 3 / 4 | OK |
| **D4-3** | Gravação síncrona dos cookies de escopo e expurgo de resíduos | Aprovado | Aprovado | Elo 4 / 5 | OK |
| **D4-4** | Invalidação seletiva de cache de rotas e consultas TanStack | Aprovado | Aprovado | Elo 6 | OK |
| **D4-5** | Recarga consistente com dados do novo espaço de trabalho | Aprovado | Aprovado | Elo 7 | OK |

---

## D5: Criar Anúncio (8 Checkpoints)
| Checkpoint | Descrição | Shell Mobile | Shell Desktop | Elo da Cadeia | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D5-1** | Abertura do formulário canônico de classificado | Aprovado | Aprovado | Elo 1 | OK |
| **D5-2** | Validação contextual dos atributos específicos do nicho | Aprovado | Aprovado | Elo 2 / 3 | OK |
| **D5-3** | Upload de galeria de imagens para bucket `classifieds` | Aprovado | Aprovado | Elo 4 | OK |
| **D5-4** | Validação de autoridade em `workspace_members` | Aprovado | Aprovado | Elo 3 / 4 | OK |
| **D5-5** | Persistência em `classifieds` com `deal_type` e preços em centavos | Aprovado | Aprovado | Elo 4 | OK |
| **D5-6** | Gravação de log de auditoria imutável (`audit_logs`) | Aprovado | Aprovado | Elo 5 | OK |
| **D5-7** | Redirecionamento e visualização na vitrine desktop e mobile | Aprovado | Aprovado | Elo 6 | OK |
| **D5-8** | Visualização pública com RLS e dados protegidos | Aprovado | Aprovado | Elo 7 | OK |
