# SPEC-002 — Execução da Onda 1: Resiliência Transacional, Anti-AI Design & Silêncio Visual

## 0. Metadados e Controle
- **ID da Spec:** SPEC-002
- **Módulo:** Transacional Core (`workspace.estoque.index`, `workspace.pdv.index`, `_store.checkout`, `_store.conta.pedidos.$id`, `workspace.turismo.cotacoes`)
- **Status:** APROVADA
- **Data:** 2026-09-28
- **Dependência:** SPEC-000 (Diretrizes de Design) e SPEC-001 (Motor de Melhoria e Ledger)

---

## 1. Escopo Delimitado e Arquivos Autorizados
Esta especificação autoriza intervenções estritamente nos 5 arquivos da Onda 1 para fechamento de gaps P0 e purificação de silêncio visual:
1. `src/routes/workspace.estoque.index.tsx` (GAP-001)
2. `src/routes/workspace.pdv.index.tsx` (GAP-002)
3. `src/routes/_store.checkout.tsx` (GAP-003)
4. `src/routes/_store.conta.pedidos.$id.tsx` (GAP-004)
5. `src/routes/workspace.turismo.cotacoes.tsx` (GAP-005)

Nenhum outro arquivo de produto está autorizado para escrita nesta rodada.

---

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### EARS-01: Invalidação de Cache no Catálogo (GAP-001)
- **Quando** o usuário executa uma movimentação de estoque ou transferência entre armazéns em `workspace.estoque.index.tsx`,
- **O sistema deve** sincronizar imediatamente o estado local e invocar a invalidação de rota e query sem exibir frases prolixas de banco de dados, retornando feedback conciso ("Estoque atualizado").

### EARS-02: Recuperação de Erro no PDV (GAP-002)
- **Se** o fechamento de venda ou envio de itens para comanda no PDV falhar por qualquer motivo de rede ou validação,
- **O sistema deve** restaurar imediatamente `isProcessing = false`, manter os itens no carrinho e exibir mensagem de erro concisa via toast, sem congelar botões.

### EARS-03: Resiliência do Checkout e Pix (GAP-003)
- **Quando** o checkout inicia uma transação Pix ou cartão,
- **O sistema deve** garantir feedback claro e seletivo caso o gateway falhe, permitindo nova tentativa ou troca de método sem travar a interface e aplicando silêncio visual ("Pedido confirmado" em vez de frases redundantes).

### EARS-04: Acompanhamento de Pedido com Realtime & Polling Resiliente (GAP-004)
- **Enquanto** o cliente visualiza a tela de acompanhamento de pedido `_store.conta.pedidos.$id.tsx`,
- **O sistema deve** manter sincronização periódica (polling a cada 5s quando em rota de entrega) e escuta de canal Supabase Realtime, atualizando o status do pedido e da corrida do entregador automaticamente sem pull-to-refresh.

### EARS-05: Defensividade nos Parâmetros de Turismo (GAP-005)
- **Onde quer que** a rota `workspace.turismo.cotacoes.tsx` receba parâmetros de busca malformados ou incompletos,
- **O sistema deve** sanitizar os valores com fallback defensivo para `undefined` ou strings limpas, impedindo quebras de renderização.

---

## 3. Diretrizes de Purificação de Silêncio Visual (Anti-AI Design)
Conforme as regras do `anti-ai-design` e `content-density`:
1. **Títulos Diretos:** Teto máximo de 6 palavras (DL-19). Eliminar títulos compostos ("Gestão Completa e Avançada de...").
2. **Rótulos Canônicos:** Botões com no máximo 3 palavras no padrão `[Verbo] + [Substantivo]` (DL-24).
3. **Erradicação do AI-Smell:** Eliminar parágrafos explicativos sob inputs óbvios e caixas de instrução prolixas (DL-21).
4. **Zero Fallbacks Mocks:** Proibido uso de arrays simulados (`mockData`, `fakeOrders`). Todas as leituras e mutações devem consumir os serviços reais da plataforma.
5. **Zero Emojis:** Proibido o uso de emojis na interface ou alertas (DL-23).

---

## 4. Invariantes
- Proibido qualquer uso de `!important` ou utilitários arbitrários com colchetes.
- Proibido quebrar contratos de loader ou search params do TanStack Router.
- Cores consumidas estritamente das variáveis canônicas de `styles.css`.
- Dimensão mínima de toque de 44x44px mantida em todos os botões móveis.

---

## 5. Critérios de Aceite e Evidência Esperada
- [ ] TypeScript compila com 0 erros (`npm run typecheck`).
- [ ] Os 5 gaps da Onda 1 marcados como `RESOLVIDO` no `melhoria/05-ledger.json`.
- [ ] `_estado.md` atualizado com o encerramento da Onda 1.
- [ ] Registro formal em `docs/design/DECISIONS.md`.
