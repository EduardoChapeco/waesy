# SPEC-000-TEMPLATE — Modelo de Especificação Técnica Orientada a Evidências

## 0. Metadados e Controle
- **ID da Spec:** SPEC-XXX
- **Título:** [Nome do Módulo ou Tarefa]
- **Autor / Agente Responsável:** [spec-writer]
- **Data de Aprovação:** [AAAA-MM-DD]
- **Status:** [DRAFT | APROVADO | EM IMPLEMENTACAO | CONCLUIDO]

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** [Em 2 linhas, o objetivo central desta alteração]
- **Escopo Incluído:** [Lista atômica dos arquivos e rotas autorizados]
- **Não-Objetivos:** [O que esta spec explicitamente NÃO fará]

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo:** O sistema DEVE [comportamento padrão constante].
- **Acionado por Evento:** QUANDO [evento disparador ocorrer], o sistema DEVE [resposta esperada].
- **Orientado a Estado:** ENQUANTO [estado estiver ativo], o sistema DEVE [comportamento].
- **Opcional:** ONDE [recurso ou módulo opcional estiver presente], o sistema DEVE [ação].
- **Exceção:** SE [condição de erro ou falha acontecer], ENTÃO o sistema DEVE [tratamento].

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [ ] Estado de Dados (Data/Success) especificado.
- [ ] Estado de Carregamento (Loading/Skeleton) especificado sem CLS.
- [ ] Estado Vazio (Empty) com 2 linhas e ação primária.
- [ ] Estado de Erro (Error) com mensagem amigável e botão de reintento.
- [ ] Touch Targets >= 44x44px no mobile.
- [ ] Contraste >= 4.5:1 (texto) e >= 3.0:1 (controles).
- [ ] Anel de foco `:focus-visible` definido.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| --- | --- | --- |
| `src/routes/...` | Modificar | Vinculação de rota |
| `src/components/...` | Criar | Primitiva de UI modular |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. `npm run typecheck` com Exit Code 0.
2. `npm run build` com Exit Code 0 gerando `dist/_worker.js`.
3. `node scripts/design-lint.mjs --changed` com 0 violações P0 e 0 violações P1.
4. Registro de encerramento em `docs/design/DECISIONS.md`.
