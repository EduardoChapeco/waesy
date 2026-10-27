# 🏛️ Plano Diretor de Expansão & Excelência Operacional (Wave 5)

> **Status:** Aguardando Validação do Usuário para Execução  
> **Escopo:** Encartes Promocionais & Tabloides + Semântica Universal dos Nichos + Gestão de Convites & RBAC + Avaliações do Cliente + Gaveta da Comunidade  
> **Repositório:** `EduardoChapeco/waesy` | **Plataforma:** Waesy Platform v4.2

---

## 1. 🎨 Pilar 1: Refatoração Visual & UI Ergonomics

### 1.1. Minhas Avaliações (`_store.conta.avaliacoes.tsx`)
- **`src/routes/_store.conta.avaliacoes.tsx`**:
  - Alinhamento da lista de avaliações do cliente ao Paradigma Clean com botões e links de 44px (`h-11`), badges de status em alta legibilidade e empty state amigável.

### 1.2. Gaveta de Criação da Comunidade (`post-creation-drawer.tsx`)
- **`src/components/community/post-creation-drawer.tsx`**:
  - Polimento da experiência móvel de criação de postagens ("simple", "carousel", "grid", "news", "travel", "threads", "moment"), touch targets de 44px (`h-11`) e feedback de upload sem *layout shift*.

---

## 2. ⚡ Pilar 2: APIs, Semântica de Nichos & Governança de Equipe

### 2.1. Métricas e Tracking de Encartes Promocionais (`store-flyers.functions.ts`)
- **`src/services/store-flyers.functions.ts`**:
  - Consolidação do rastreamento de visualizações e cliques (`incrementFlyerMetrics`) com isolamento multi-tenant rigoroso.

### 2.2. Semântica Universal dos 17 Nichos Comercial (`niche-semantics.ts`)
- **`src/lib/niche-semantics.ts`**:
  - Auditoria e polimento das 17 identidades semânticas (gastronomia, varejo, turismo, imóveis, veículos, serviços, pet, etc.) com atalhos operacionais e botões PDV/KDS.

### 2.3. Gestão e Revogação de Convites de Colaboradores (`invite.functions.ts`)
- **`src/services/invite.functions.ts`**:
  - Adição de função `revokeInviteToken` para expiração e revogação imediata de links de convites com log de auditoria.

---

## 3. 🎯 Roteiro Sequencial de Execução

---

### 🟢 Fase 1: Avaliações da Conta & Gaveta da Comunidade
#### [MODIFY] [`src/routes/_store.conta.avaliacoes.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.conta.avaliacoes.tsx)
- Refinar cabeçalho, empty state e cards de avaliação com touch targets de 44px (`h-11`).

#### [MODIFY] [`src/components/community/post-creation-drawer.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/community/post-creation-drawer.tsx)
- Otimizar botões de ação e abas de formato na gaveta de criação de post.

---

### 🔵 Fase 2: Serviços de Encartes, Convites & Semântica
#### [MODIFY] [`src/services/invite.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/invite.functions.ts)
- Adicionar função server-side `revokeInviteToken`.

#### [MODIFY] [`src/services/store-flyers.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/store-flyers.functions.ts)
- Garantir rastreamento e incrementos defensivos em `incrementFlyerMetrics`.

#### [MODIFY] [`src/lib/niche-semantics.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/lib/niche-semantics.ts)
- Refinar e validar semântica de todos os 17 nichos comerciais.

---

## 4. 🧪 Plano de Verificação

### Testes Automatizados
- Executar `cmd /c npm test` garantindo 100% de aprovação nas 62 suítes de testes.

### Verificação Visual & UX
- Confirmar zero erros no console, touch targets de no mínimo 44px e responsividade total no mobile.
