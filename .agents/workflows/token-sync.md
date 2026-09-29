# WORKFLOW: token-sync

## Metadados
- **Objetivo:** Propagação mecânica determinística entre o catálogo DTCG e as variáveis CSS de produção.
- **Entradas:** Alterações aprovadas em `docs/design/tokens.json`.
- **Saídas:** `src/styles.css` sincronizado com novas variáveis e build validado.
- **Teto de Passos:** 5 passos.

## Passos Numerados
1. **Validação JSON:** Validar a conformidade do schema DTCG e a ausência de aliases quebrados.
2. **Execução da Sincronização:** Rodar `node scripts/token-sync.mjs`.
3. **Auditoria de Tokens Mortos:** Verificar que nenhuma nova variável foi declarada sem uso planejado.
4. **Verificação de Estilos:** Validar que `@tailwindcss/vite` compila as novas variáveis sem avisos.
5. **Registro de Alteração:** Documentar as variáveis criadas ou atualizadas em `docs/design/DECISIONS.md`.

## Critério de Parada
Parar se a compilação do Tailwind v4 falhar após a injeção das variáveis no CSS.
