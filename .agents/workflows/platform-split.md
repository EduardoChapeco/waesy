# WORKFLOW: platform-split

## Metadados
- **Objetivo:** Tomada de decisão e bifurcação de cascas arquiteturais entre telas móveis e telas expandidas.
- **Entradas:** Rota candidata a bifurcação ou tela desktop sofrendo compactação incorreta.
- **Saídas:** Arquitetura limpa com casca móvel ergonômica e casca desktop densa.
- **Teto de Passos:** 6 passos.

## Passos Numerados
1. **Inspeção de Densidade:** Avaliar a quantidade de dados e colunas necessárias para a tarefa.
2. **Definição de Breakpoint:** Marcar o ponto de corte estrito em 1024px (`lg:`).
3. **Desenho da Casca Móvel (<1024px):** Projetar lista vertical simplificada com botões de 44px e bottom sheet.
4. **Desenho da Casca Desktop (>=1024px):** Projetar layout Master-Detail em 2 colunas ou Bento Grid balanceado.
5. **Reaproveitamento de Estado:** Compartilhar o mesmo hook de dados e lógica Zod sem duplicar código de negócio.
6. **Verificação nos Viewports:** Validar visualização em 390px (mobile) e 1280px (desktop).

## Critério de Parada
Parar se a bifurcação duplicar lógica de validação ou criar rotas paralelas desconexas.
