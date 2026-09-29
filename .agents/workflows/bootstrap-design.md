# WORKFLOW: bootstrap-design

## Metadados
- **Objetivo:** Inicialização canônica de um novo módulo ou domínio com tokens mínimos, primitivas e dois shells especializados.
- **Entradas:** Nome do novo módulo, nicho operacional e domínio de rota.
- **Saídas:** Estrutura de rota criada com cascas móvel e desktop, tokens verificados e zero deriva.
- **Teto de Passos:** 6 passos.

## Passos Numerados
1. **Verificação de Tokens:** Confirmar presença dos tokens semânticos necessários em `docs/design/tokens.json`.
2. **Definição de Rota:** Criar o arquivo de rota base TanStack em `src/routes/`.
3. **Casca Compacta (Móvel):** Estruturar o layout móvel com margem de 16px, cabeçalho atômico e ancoragem na zona do polegar.
4. **Casca Expandida (Desktop):** Estruturar o layout desktop com suporte a Split View ou Bento Grid de 12 colunas.
5. **Integração de Primitivas:** Importar componentes de `src/components/ui/` com estados de Loading (Skeleton) e Empty pré-configurados.
6. **Auditoria de Inicialização:** Executar `node scripts/design-lint.mjs --changed` e validar aprovação limpa.

## Critério de Parada
Parar se o novo módulo exigir tokens inexistentes não aprovados pelo `design-system-architect`.
