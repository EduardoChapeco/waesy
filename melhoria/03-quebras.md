# 03-QUEBRAS.md — Diagnóstico de Falhas de Round-Trip e Bloqueios de Conclusão

**Definição:** Uma "Quebra de Round-Trip" ocorre quando a ação do usuário é processada ou gravada, mas o ciclo visual não se fecha (a lista não atualiza, o feedback não aparece, o estado permanece travado ou exige F5 manual).

---

## 1. As 5 Maiores Quebras de Round-Trip Identificadas

### Quebra 1: Ausência de Invalidação de Cache TanStack Query em Mutações
- **Localização:** `src/routes/workspace.estoque.tsx` e `src/routes/workspace.turismo.destinos.tsx`.
- **Sintoma:** Ao cadastrar ou editar um item de catálogo/destino, o registro é salvo com sucesso no banco Supabase, mas a listagem continua exibindo os dados antigos até que o usuário pressione F5 manualmente.
- **Causa Raiz:** Mutações chamam a server function diretamente sem executar `queryClient.invalidateQueries({ queryKey: [...] })` no callback `onSuccess`.
- **Severidade:** P1 (Frustração de usuário e risco de edição duplicada).

### Quebra 2: Spinners de Loading Infinito em Tratamentos Silenciosos de Erro
- **Localização:** `src/routes/workspace.pdv.index.tsx` (fluxo de fechar mesa) e `src/routes/checkout.tsx`.
- **Sintoma:** Se a rede falhar ou a chave Pix expirar, o botão de ação permanece com spinner congelado sem exibir mensagem de diagnóstico.
- **Causa Raiz:** Bloco `catch (err) { console.error(err); }` que não reseta o estado `setIsSubmitting(false)` e não dispara `toast.error()`.
- **Severidade:** P0 (Bloqueio total de conclusão do cliente no PDV e Checkout).

### Quebra 3: Desconexão de Realtime no Acompanhamento de Pedidos
- **Localização:** `src/routes/conta.meus-pedidos.tsx` e `src/routes/workspace.pedidos.index.tsx`.
- **Sintoma:** O entregador do MotoLink aceita a corrida e altera o status para "Em Rota", mas o cliente precisa puxar para atualizar (pull-to-refresh) para ver a moto se mover.
- **Causa Raiz:** Canal Supabase Realtime sem reconexão automática após perda temporária de socket em conexões 4G instáveis.
- **Severidade:** P1 (Desalinhamento operacional e chamados repetidos de suporte).

### Quebra 4: Falta de Feedback Reversível em Ações Destrutivas
- **Localização:** `src/routes/workspace.crm.tsx` (exclusão de contato).
- **Sintoma:** Abre modal genérico "Tem certeza?", e após confirmar, não oferece ação "Desfazer" caso o clique tenha sido acidental.
- **Causa Raiz:** Violação do princípio Silencioso (AGENTS.md B.8: Proibido modal para ações destrutivas reversíveis; usar toast com Desfazer).
- **Severidade:** P2 (Atrito desnecessário e sobrecarga cognitiva).

### Quebra 5: Bloqueio de Navegação por Parâmetros Ausentes na URL
- **Localização:** `src/routes/workspace.turismo.cotacoes.tsx`.
- **Sintoma:** Ao clicar em "Voltar para Lista", se o filtro de busca anterior continha caracteres especiais ou paginação profunda, a rota quebra e exibe página em branco.
- **Causa Raiz:** Schema de validação de search params do TanStack Router sem valor padrão defensivo (`z.object({ page: z.number().default(1) })`).
- **Severidade:** P1 (Queda abrupta de fluxo operacional).
