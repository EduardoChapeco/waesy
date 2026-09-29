# Especificação de Tarefas Executáveis por IA

Este documento define o padrão obrigatório para que uma tarefa seja concluída por um agente sem necessidade de esclarecimentos adicionais.

## Anatomia Canônica da Tarefa
1. **Identificador & Título:** Ex: `T-FIN-01: Implementar RPC de Split de Recebíveis`.
2. **Objetivo Atômico:** Declaração única do que deve ser alcançado.
3. **Contratos de Entrada (Inputs):**
   - Tipos de dados, arquivos de origem, variáveis de ambiente necessárias.
4. **Contratos de Saída (Outputs):**
   - Caminhos absolutos dos arquivos a criar/modificar.
   - Caminhos dos arquivos de teste correspondentes.
5. **Critérios de Aceitação (Given / When / Then):**
   - Cenários mensuráveis com dados reais.
6. **Condições de Borda & Tratamento de Erros:**
   - Respostas a falhas de rede, dados inválidos ou permissão negada.
7. **Orçamento de Tokens:** Calibrado entre 2000 e 4000 tokens de output.
