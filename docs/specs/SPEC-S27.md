# SPEC-S27: Família Mídia Canônica (Plano 5 — Bloco D)

## 1. Identificação e Metadados
- **ID da Especificação:** SPEC-S27
- **Fase:** S27 (Plano 5 — Estrutura, Escala e Operação BigTech)
- **Módulo Alvo:** `src/components/ui/canonical/media-family.tsx`, `src/components/ui/canonical/index.ts`, `src/components/design-system/media-showcase-family.tsx`, `src/routes/workspace.design-system.tsx`
- **Autor / Agente:** Antigravity / BigTech Executive Board
- **Data:** 2026-10-02
- **Status:** Aprovada para Implementação

---

## 2. Contexto e Objetivos
A Fase S27 canoniciza a **Família Mídia** do Waesy Design System, garantindo estabilidade geométrica absoluta (CLS = 0), suporte robusto a carregamento assíncrono e conformidade integral com a Constituição de Design (`AGENTS.md` e `docs/design/DESIGN-LINT.md`):
- **DL-03**: Espaçamentos restritos à grade de 4px (`p-3`, `p-4`, `gap-2`, `gap-3`).
- **DL-08**: Proporções intrínsecas fixas (`aspect-square`, `aspect-video`) para erradicar o layout-shift na renderização de imagens e vídeos.
- **DL-11/DL-12/DL-13**: Matriz de 4 estados completa (Pronto, Skeleton espelhado, Vazio com ação, Erro com reintento).
- **DL-14 / DL-15**: Alvos de toque móveis >= 44px (`h-11`) e `:focus-visible` obrigatório.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- [REQ-S27-U1]: O sistema SEMPRE deve renderizar `CanonicalMediaFrame` com proporção de tela explícita (`aspect-square`, `aspect-video` ou classes canônicas de proporção) e container com `rounded-lg overflow-hidden bg-muted/40`.
- [REQ-S27-U2]: O sistema SEMPRE deve fornecer texto alternativo (`alt`) em todas as tags `img` renderizadas, garantindo acessibilidade a leitores de tela conforme WCAG 2.2 AA.

### 3.2 Requisitos Orientados a Evento (Quando... O sistema deve...)
- [REQ-S27-E1]: QUANDO a imagem em `CanonicalMediaFrame` falhar no carregamento (`onError`), O sistema DEVE transicionar automaticamente para o estado visual de mídia corrompida com ícone descritivo e sem quebra visual da página.
- [REQ-S27-E2]: QUANDO o usuário interagir com `CanonicalUploadDropzone`, O sistema DEVE fornecer feedback de foco visual claro (`focus-visible:ring-2 focus-visible:ring-ring`) e aceitar acionamento via teclado (Enter / Barra de espaço).

### 3.3 Requisitos Baseados em Estado (Enquanto... O sistema deve...)
- [REQ-S27-S1]: ENQUANTO o estado for `loading`, O sistema DEVE renderizar `Skeleton` de exata proporção dimensional para garantir CLS = 0.
- [REQ-S27-S2]: ENQUANTO não houver mídia cadastrada (`src` ausente), O sistema DEVE renderizar placeholder neutro com ícone semântico e botão de upload opcional com altura mínima de 44px (`h-11`).
- [REQ-S27-S3]: ENQUANTO houver erro de upload ou leitura de mídia, O sistema DEVE exibir alerta descritivo com ação de reintento.

---

## 4. Invariantes do Módulo
1. **Zero Layout Shift (CLS = 0)**: Imagens sem proporção intrínseca declarada são terminantemente proibidas.
2. **Grade Espacial Limpa**: Espaçamentos estritamente na grade de 4px (`p-2`, `p-4`, `gap-2`, `gap-3`).
3. **Piso Acessível**: Todo controle de upload, botão de ação ou alternador de galeria deve manter altura mínima de 44px (`h-11` ou `min-h-11`).

---

## 5. Critérios de Aceite e Evidências
1. Primitivas `CanonicalMediaFrame`, `CanonicalAvatarCluster` e `CanonicalUploadDropzone` criadas em `src/components/ui/canonical/media-family.tsx`.
2. Barrel `src/components/ui/canonical/index.ts` atualizado com exportações da família de mídia.
3. Componente `src/components/design-system/media-showcase-family.tsx` criado exibindo a matriz de 4 estados.
4. Rota `src/routes/workspace.design-system.tsx` atualizada com aba de mídia.
5. Suíte de testes `design-system-showcase.test.ts` estendida com asserções para a família de mídia.
6. Design lint executado com 0 violações P0 e 0 violações P1.
7. Vitest 100% verde.
