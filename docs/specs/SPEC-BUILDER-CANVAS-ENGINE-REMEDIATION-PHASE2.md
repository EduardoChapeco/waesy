# SPEC-BUILDER-CANVAS-ENGINE-REMEDIATION-PHASE2 — Consolidação End-to-End de Builders, Templates Sociais e Dossiê 360°

## 0. Metadados e Controle
- **ID da Spec:** SPEC-CANVAS-BUILDER-002
- **Título:** Consolidação End-to-End dos Geradores, Catálogo de Templates Sociais e Dossiê 360°
- **Autor / Agente Responsável:** spec-writer
- **Data de Aprovação:** 2026-10-24
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Conectar o acervo de 14 templates profissionais Ultra HD (`social-templates`) ao Studio de Marketing, padronizar o exportador de Guia de Embarque em `workspace.turismo.embarques.tsx`, integrar o Dossiê 360° no funil comercial (`workspace.comercial.tsx`) e migrar o currículo em `_store.conta.curriculo.tsx` para o motor multipágina canônico sem distorção.
- **Escopo Incluído:**
  1. `src/routes/workspace.marketing.studio.tsx`: Seletor de templates avançados do `SOCIAL_TEMPLATES_REGISTRY` permitindo alternância entre os layouts básicos e os 14 templates verticais (Imóveis, Turismo, Varejo, Gastronomia).
  2. `src/routes/workspace.turismo.embarques.tsx`: Substituição da injeção de HTML em string solta com estilos inline por renderização canônica e chamada de `exportElementAsPdf`.
  3. `src/routes/_store.conta.curriculo.tsx`: Migração do exportador manual que forçava dimensão 210x297 para o `exportElementAsPdf` com suporte nativo a paginação contínua e multipágina.
  4. `src/routes/workspace.comercial.tsx`: Inclusão de botão e ação de exportação de Dossiê 360° do Lead em folha A4 canônica.
- **Não-Objetivos:**
  - Não alterar esquemas SQL de banco ou criar novas rotas.
  - Não adicionar novas dependências externas.

---

## 2. Requisitos EARS
- **Ubíquo:** O sistema DEVE utilizar exclusivamente a função `exportElementAsPdf` de `src/lib/pdf-export.ts` para qualquer geração de PDF no ecossistema de turismo, clientes, currículos e guias operacionais.
- **Acionado por Evento:** QUANDO o usuário selecionar um template temático no Studio de Marketing, a prévia DEVE alternar para o layout do componente correspondente mantendo reatividade de dados (título, preço, imagens e selos).
- **Acionado por Evento:** QUANDO o corretor ou consultor clicar em "Exportar Dossiê" na Ficha 360° do Lead (`workspace.comercial.tsx`), o sistema DEVE compilar o Dossiê A4 confidencial com dados do lead e baixar o documento PDF formatado.
- **Orientado a Estado:** ENQUANTO o currículo profissional for exportado em `_store.conta.curriculo.tsx`, o sistema DEVE preservar a proporção das páginas sem achatamento forçado para 1 folha quando houver conteúdo adicional.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] Controles com altura mínima de 44px (`h-11 min-h-11`).
- [x] Contraste >= 4.5:1 para textos e >= 3.0:1 para controles.
- [x] Anéis de foco `:focus-visible:ring-2` preservados.
- [x] Sem classes arbitrárias ou `!important`.

---

## 4. Critérios de Aceite e Evidências
1. `node scripts/design-lint.mjs --ratchet` com Exit Code 0.
2. `node scripts/design-lint.test.mjs` com 45/45 aprovações.
3. Registro de decisão técnica em `docs/design/DECISIONS.md`.
