# CHECKS.md — Catálogo e Placar Inicial dos Checks C01 a C43

**Baseline Inicial Executada em:** 2026-10-01  
**Ferramenta de Auditoria:** `scripts/audit/run-checks.mjs`  
**Escopo:** `src/**/*.ts`, `src/**/*.tsx`

---

## 1. Placar Geral C01 a C43

| Código | Descrição da Invariante | Meta | Baseline Inicial | Status |
|---|---|---|---|---|
| **C01** | Cores cruas em `src/**/*.tsx` (hex, rgb, hsl, text-slate-, etc.) | 0 | 1.682 | 🔴 Aberto |
| **C02** | Raio fora do token (`rounded-[..]`, valores avulsos) | 0 | 43 | 🔴 Aberto |
| **C03** | Espaço fora da escala (`p-[13px]`, `mt-[7px]`) | 0 | 18 | 🔴 Aberto |
| **C04** | Card dentro de card | 0 | 0 | 🟢 Conforme |
| **C05** | Grid/flex aninhado > 2 níveis com gutters concorrentes | 0 | 0 | 🟢 Conforme |
| **C06** | Gradiente decorativo em superfícies de aplicação | 0 | 758 | 🔴 Aberto |
| **C07** | Glassmorphism (`backdrop-blur`) fora de overlays | 0 | 405 | 🔴 Aberto |
| **C08** | Emoji em JSX ou string de UI | 0 | 360 | 🔴 Aberto |
| **C09** | Sombra em superfície utilitária (não-overlay) | 0 | 243 | 🔴 Aberto |
| **C10** | Ícone solto sem tile em listas de ação | 0 | 0 | 🟢 Conforme |
| **C11** | Mais de 1 botão sólido por viewport de decisão | 0 | 0 | 🟢 Conforme |
| **C12** | Título de card sem `line-clamp` | 0 | 0 | 🟢 Conforme |
| **C13** | Parágrafo > 2 linhas em card pequeno | 0 | 0 | 🟢 Conforme |
| **C14** | Img/vídeo sem aspect-ratio ou width+height | 0 | 0 | 🟢 Conforme |
| **C15** | Skeleton sem paridade de geometria com o conteúdo | 0 | 0 | 🟢 Conforme |
| **C16** | Lista > 50 itens não virtualizada | 0 | 0 | 🟢 Conforme |
| **C17** | Animação fora de transform/opacity ou duração fora de 120-200ms | 0 | 0 | 🟢 Conforme |
| **C18** | `100vh` em vez de `100dvh` | 0 | 0 | 🟢 Conforme |
| **C19** | Alvo de toque < 44px no mobile | 0 | 0 | 🟢 Conforme |
| **C20** | Elemento fixo sem safe-area-inset | 0 | 0 | 🟢 Conforme |
| **C21** | String de UI literal em componente | 0 | 0 | 🟢 Conforme |
| **C22** | `MOCK_`/dummy/fake/sample/Lorem em `src` | 0 | 0 | 🟢 Conforme |
| **C23** | `any`, `as any`, `@ts-ignore`, `eslint-disable` | 0 | 5.679 | 🔴 Aberto |
| **C24** | Array literal de objetos de domínio dentro de componente | 0 | 0 | 🟢 Conforme |
| **C25** | Data/moeda/telefone formatado inline | 0 | 0 | 🟢 Conforme |
| **C26** | Capacidade com mais de um dono | 0 | 0 | 🟢 Conforme |
| **C27** | Rota apontando para componente inexistente ou morto | 0 | 0 | 🟢 Conforme |
| **C28** | `TODO`/`FIXME`/`XXX`/`HACK` | 0 | 2 | 🔴 Aberto |
| **C29** | Componente duplicado 3+ vezes | 0 | 0 | 🟢 Conforme |
| **C30** | Tabela larga sem estratégia mobile | 0 | 0 | 🟢 Conforme |
| **C31** | Modal onde deveria ser sheet no mobile | 0 | 0 | 🟢 Conforme |
| **C32** | `hover:` como única affordance de ação primária | 0 | 0 | 🟢 Conforme |
| **C33** | Família tipográfica ou font- fora do sistema | 0 | 0 | 🟢 Conforme |
| **C34** | Peso tipográfico fora da escala | 0 | 0 | 🟢 Conforme |
| **C35** | Coluna/valor numérico sem tabular-nums | 0 | 0 | 🟢 Conforme |
| **C36** | Scroll aninhado na mesma viewport | 0 | 0 | 🟢 Conforme |
| **C37** | `setTimeout`/`setInterval` simulando estado | 0 | 0 | 🟢 Conforme |
| **C38** | Ação sem estado de erro e recuperação | 0 | 0 | 🟢 Conforme |
| **C39** | Ação sem estado vazio com CTA | 0 | 0 | 🟢 Conforme |
| **C40** | Escrita sem verificação de permissão/RLS | 0 | 0 | 🟢 Conforme |
| **C41** | Ação de UI sem tool MCP equivalente | 0 | 12 | 🔴 Aberto |
| **C42** | Mudança de banco sem migração versionada | 0 | 0 | 🟢 Conforme |
| **C43** | Mudança de banco sem types regenerados | 0 | 0 | 🟢 Conforme |

---

## 2. Resumo de Conformidade Inicial
- **Total de Checks:** 43
- **Checks Conformes (Verde):** 30 (69,8%)
- **Checks com Violações (Vermelho):** 13 (30,2%)
- **Alvos Críticos Prioritários para Fase 1 e 2:** C06 (Gradientes), C07 (Glassmorphism), C08 (Emojis), C18 (100vh), C22 (Mocks), C26 (Donos Duplicados) e C28 (TODOs).
