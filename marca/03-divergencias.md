# 03-divergencias.md — Divergências Classificadas: Perfil de Pessoa Física vs Marca

| Eixo de Comparação | Perfil de Pessoa Física (`profiles`) | Perfil de Marca / Loja (`stores`) | Classificação / Impacto |
| :--- | :--- | :--- | :--- |
| **Identidade Primária** | Nome civil, CPF e @username | Razão Social, Nome Fantasia e CNPJ | MB12 (Divergência de fluxo unificada por validação Módulo 11) |
| **Cardinalidade** | 1:1 estrito com `auth.users.id` | 1:N (Um usuário pode ser dono ou membro de várias lojas) | MB2 (Exige `workspace_members` com papéis RBAC canônicos) |
| **Contexto de Sessão** | `waesy_active_context=civil` | `waesy_active_context=store` + `waesy_active_tenant` | MB3 (Sincronização atômica de cookies sem resíduos) |
| **Destino de Operação** | `/conta` (Pedidos, endereços e favoritos) | `/workspace` (Catálogo, PDV, KDS, financeiro) | MB1 (Redirecionamento contextual garantido) |
| **Ativo Principal** | Avatar `1:1` (512x512 px) em `avatars` | Logotipo `1:1` e Lockup `4:1` em `store-assets` / `brand-assets` | MB7 (Proporções rigorosamente tipadas em `ATIVOS.md`) |
| **Ativo Panorâmico** | Capa `21:9` (2100x900 px) em `banners` | Capa Hero `21:9` e Cartão `16:9` em `banners` / `cms-media` | MB7 (Derivação centralizada `object-center` sem CLS) |
| **Documentos** | CNH ou Comprovante de Residência | Alvará de Funcionamento, Cartão CNPJ, Licença Sanitária | MB4 / MB5 (Storage privado em `legal-documents` via RLS) |
| **Direcionamento de Nicho** | Interesses de consumo do usuário | 1 de 17 verticais de negócio dirigindo catálogo e PDV | MB9 / MB10 (Padronizado via `docs/marca/NICHOS.md`) |

---

## 1. Matriz de Classificação das Divergências

### D1 — Isolamento de Persistência
- **Divergência:** Perfil civil grava em colunas nativas de `profiles`. Loja grava atributos operacionais no JSONB `stores.settings`.
- **Governança:** `stores.settings` segue schema Zod rígido (`ProvisionBusinessSchema`), impedindo dados não tipados ou propriedades órfãs.

### D2 — Pipeline de Ativos Compartilhado
- **Divergência Anterior:** Perfil civil utilizava `uploadProfileMediaDirect` enquanto lojas utilizavam `uploadStoreMedia` com regras distintas de bucket.
- **Governança:** Ambos consom os mesmos limites (10MB para capa, 5MB para logo/avatar), mesmo conjunto de MIME types seguros e a convenção canônica de caminhos `{tipo-dono}/{id-dono}/{tipo-ativo}/{timestamp}_{hash}.webp`.

### D3 — Alternador Universal de Contexto
- **Divergência Anterior:** Alternar para loja não limpava cookies de criador, gerando colisão de visualização.
- **Governança:** O `ContextSwitcher` e o `WorkspaceAccountSwitcher` executam purificação idempotente de cookies em todas as transições de identidade.
