# Motor de Decomposição MECE & Jobs-to-be-Done

O motor de decomposição transforma a intenção do produto em entregáveis atômicos de engenharia.

## Princípio MECE (Mutuamente Exclusivo, Coletivamente Exaustivo)
- **Mutuamente Exclusivo:** Cada tarefa possui um único escopo de código e arquivos afetados. Duas tarefas nunca competem pela mesma responsabilidade.
- **Coletivamente Exaustivo:** A soma das tarefas cobre 100% dos requisitos explícitos e implícitos do PRD. Nenhum requisito é esquecido.

## Hierarquia Estrita de 3 Níveis
1. **Nível 1: Épicos (3 a 7 por PRD):**
   - Representa um domínio funcional completo (ex: "Auth & Identity", "Order Ledger", "PDV Salão 2D").
2. **Nível 2: Funcionalidades (2 a 5 por Épico):**
   - Um incremento demonstrável de valor com critérios Given/When/Then.
3. **Nível 3: Tarefas (2 a 7 por Funcionalidade):**
   - Unidade atômica executável por um engenheiro ou agente IA em uma sessão (2000-4000 tokens).

## Taxonomia de Domínios Técnicos
- **Frontend / Client UI:** Telas, formulários, componentes Radix, feedback tátil.
- **Backend / BFF:** Server Functions (`createServerFn`), schemas Zod, RPC atômico.
- **Data & Persistence:** Tabelas, colunas, chaves estrangeiras, migrações, políticas RLS.
- **Security & RBAC:** Validação de identidade, tokens de sessão, sanitização.
- **Integrações & Webhooks:** Provedores de pagamento, emissão fiscal, mensageria.
