---
name: flow-tracer
description: Rastreio sistemático da jornada ponta a ponta através da cadeia de 7 elos em cada um dos fluxos nomeados D1 a D5.
---

# Flow Tracer — Rastreio de Jornadas Ponta a Ponta

## Gatilho
Ao auditar ou revalidar qualquer um dos cinco fluxos nomeados: Upload (D1), Criar Negócio (D2), Acessar Workspace (D3), Alternar Perfil (D4) e Criar Anúncio (D5).

## Quando NÃO Usar
- Em tarefas pontuais que não pertencem ou impactam as 5 jornadas críticas de usuário.

## Entradas
1. Identificador do fluxo (D1..D5).
2. Matriz de checkpoints do fluxo no código.
3. Sessão de usuário e shells (mobile e desktop).

## Saídas
- Tabela de checkpoints com veredito (OK, FALHA ou UNKNOWN) e elo quebrado na cadeia.

## Procedimento
1. Percorrer os checkpoints do fluxo rigorosamente na ordem sequencial.
2. Interromper a verificação no primeiro checkpoint que falhar.
3. Identificar qual dos 7 elos da cadeia foi rompido:
   - 1: Entrada (rota alcançável)
   - 2: Intenção (gatilho de UI acionável)
   - 3: Validação (validador de formulário/Zod)
   - 4: Gravação (persistência no banco/storage)
   - 5: Retorno (resposta do BFF/Server Function)
   - 6: Retorno Visual (feedback, toast, redirecionamento)
   - 7: Consistência (sobrevivência ao recarregar a página)
4. Validar o fluxo nos dois shells (mobile e desktop) e registrar evidências.

## Regras Duras
- Fluxo não percorrido até o fim não recebe veredito de aprovação.
- Proibido inferir comportamento sem testar o código real e as chamadas de rede.

## Anti-Padrões
- Pular checkpoints intermediários para testar apenas o final do fluxo.
- Considerar fluxo funcional apenas porque a UI exibiu toast de sucesso sem persistir.

## Critério de Pronto
Todos os checkpoints do fluxo avaliados com OK, FALHA ou UNKNOWN justificado.
