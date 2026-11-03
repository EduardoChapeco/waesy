# SPEC-20261103-DARK-THEME-CONTRAST-AND-WORKSPACE-PALETTE

## 1. Contexto e Motivação
O usuário relatou duas quebras graves de experiência e conformidade visual:
1. **Deficiência de Contraste e Estrutura no Tema Dark:** Sensação de que o contraste no tema dark "não funciona" e parece estranho, decorrente da falta de profundidade entre fundo e cartões (contraste 1.08:1 entre `--background` e `--card`), fragmentação de seletores (`.dark`, `[data-theme="dark"]`, `:root:not(.light)`) com omissão crítica de variáveis de estado (`--secondary`, `--accent`, `--destructive`, `--success`, `--warning`) no alternador manual, e texto muted com contraste inconsistente.
2. **Contaminação Cromática Amarela no Workspace (Painel de Agência de Viagens):** O painel do nicho de turismo (ex: Excelência Tour) sofria injeção da classe `.theme-luxury` diretamente na casca raiz do `WorkspaceShell`, forçando `--primary: #d4af37` (amarelo ouro/mostarda), suprimindo os raios (`--radius: 0px`) e forçando a fonte serifada Playfair Display. Essa mutação destruía a identidade visual corporativa do Waesy e gerava contraste ilegível de 2.10:1 em botões com texto branco.

## 2. Requisitos em Sintaxe EARS

### [REQ-THEME-01] Paridade Completa de Variáveis em Seletores Dark (Ubíquo)
QUANDO o modo dark estiver ativo — seja por preferência de sistema (`prefers-color-scheme: dark`), classe `.dark` ou atributo `[data-theme="dark"]` —,
O sistema DEVE declarar e aplicar o conjunto completo e idêntico de variáveis semânticas:
- `--background`: `oklch(0.10 0 0)` (~#09090b)
- `--card`: `oklch(0.16 0 0)` (~#141416)
- `--popover` / `--surface-raised`: `oklch(0.20 0 0)` (~#1f1f23)
- `--foreground` / `--card-foreground`: `oklch(0.97 0 0)` (~#f4f4f5, contraste >= 16:1)
- `--muted`: `oklch(0.18 0 0)` (~#1a1a1d)
- `--muted-foreground`: `oklch(0.70 0 0)` (~#a1a1aa, contraste >= 7:1)
- `--secondary`: `oklch(0.18 0 0)` (~#1a1a1d)
- `--secondary-foreground`: `oklch(0.97 0 0)` (~#f4f4f5)
- `--accent`: `oklch(0.18 0 0)` (~#1a1a1d)
- `--accent-foreground`: `oklch(0.97 0 0)` (~#f4f4f5)
- `--border` / `--input`: `oklch(0.26 0 0)` (~#27272a)
- `--border-strong`: `oklch(0.38 0 0)` (~#3f3f46)
- `--ring`: `var(--magic-accent-primary)`
- `--destructive`: `oklch(0.65 0.20 25)` com `--destructive-foreground: #ffffff`
- `--success`: `oklch(0.68 0.18 145)` com `--success-foreground: #ffffff`
- `--warning`: `oklch(0.78 0.16 75)` com `--warning-foreground: #09090b`
- `--info`: `oklch(0.70 0.16 230)` com `--info-foreground: #ffffff`

### [REQ-THEME-02] Separação de Superfícies e Camadas (Event-Driven)
QUANDO qualquer painel, tabela ou cartão for renderizado no tema escuro,
O sistema DEVE garantir que a elevação entre superfície base e cartões possua delimitação nítida por contorno `--border` visível (`oklch(0.26 0 0)` / `border-border/60`), eliminando blocos opacos indiferenciados.

### [REQ-THEME-03] Soberania do Design System no Workspace Operacional (Invariante)
ENQUANTO qualquer rota dentro de `/workspace/*` estiver ativa,
O componente `WorkspaceShell` DEVE renderizar exclusivamente a identidade limpa e soberana do Waesy Design System, sendo terminantemente proibida a injeção de classes temáticas de nicho (`theme-luxury`, `theme-health`, etc.) na casca estrutural do workspace.

### [REQ-THEME-04] Saneamento de Classes Temáticas de Nicho (Ubíquo)
EM TODAS as definições de classes de nicho em `src/styles.css` (incluindo `.theme-luxury`),
O sistema NÃO DEVE zerar o border-radius (`--radius: 0px`) nem forçar tipografia serifada de controles (`--font-master: "Playfair Display"`), preservando a escala modular e garantindo contraste seguro em qualquer elemento interativo.

### [REQ-THEME-05] Higienização de Cores Âmbar/Amarelas no Módulo de Turismo (Opcional)
QUANDO badges ou contadores no módulo `/workspace/turismo/*` exibirem status de atenção ou moderação,
O sistema DEVE consumir tokens semânticos e classes com contraste garantido (`text-amber-700 dark:text-amber-300`, `bg-amber-500/10 border-amber-500/30`), erradicando fundos e textos amarelos conflitantes que violem a conformidade visual.

## 3. Critérios de Aceite
1. Zero injeção de `themeClass` na casca raiz do `WorkspaceShell` (`src/components/workspace/workspace-shell.tsx`).
2. Painel de turismo (`Excelência Tour`) exibe o azul primário institucional e raios de 8px/12px do Waesy Design System.
3. Unificação completa dos blocos `.dark`, `[data-theme="dark"]` e `:root:not(.light)` em `src/styles.css` com 100% dos tokens de superfície, texto, bordas e feedback.
4. Razão de contraste calculada >= 4.5:1 para texto normal e >= 3:1 para controles e bordas no dark mode.
5. Aprovação plena na catraca mecânica de design lint (`node scripts/design-lint.mjs --ratchet`) com Exit Code 0.
6. Aprovação plena em todos os testes unitários (`npm run test` / `vitest`).
7. Build de produção com Exit Code 0 (`npm run build`).
