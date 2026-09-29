# Protocolo de Clarificação de Ambiguidades

Quando um PRD possui lacunas ou requisitos vagos, a IA nunca deve assumir silenciosamente.

## As 4 Categorias de Ambiguidades
1. **Ambiguidade de Escopo:**
   - "Deve incluir sincronização offline no MVP ou apenas na Fase 2?"
2. **Ambiguidade Técnica:**
   - "Qual provedor de mensageria deve ser utilizado: RabbitMQ, SQS ou Supabase Queues?"
3. **Ambiguidade de Prioridade:**
   - "Se houver restrição de tempo, o painel de métricas é descartável em prol do checkout?"
4. **Ambiguidade de Dependência:**
   - "O faturamento depende da aprovação manual do gestor ou ocorre automaticamente?"

## Disparo da Ferramenta AskUserQuestion
Quando 3 ou mais ambiguidades críticas forem identificadas, estruture as perguntas como múltipla escolha clara com recomendação justificada.
