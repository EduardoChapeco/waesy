# SPEC-20261106-POS-MULTITERMINAL-HR-DOSSIER-WMS-UNIFICATION

## 1. Contexto e Motivação
A plataforma Waesy opera com estabelecimentos que variam de pequenas lojas com um único ponto de venda a grandes mercados, restaurantes e empórios com múltiplos terminais de caixa concorrentes (balcão, salão/garçom, financeiro/diretoria).
Anteriormente, o backend impunha uma restrição artificial de unicidade (`"Já existe um caixa aberto nesta loja"`), impedindo a coexistência de múltiplos operadores de PDV e gerando erro de `maybeSingle()` caso mais de um registro estivesse em aberto.
Adicionalmente, os módulos de Recursos Humanos (DP) exigem governança completa de prontuários com monitoramento de exames ocupacionais (ASO admissional/periódico/demissional com alertas de validade), pastas de documentos, benefícios e permissões de caixa vinculadas ao colaborador (ex.: trava de cancelamento de item com autorização gerencial por PIN).

## 2. Requisitos em Sintaxe EARS

### 2.1 Múltiplos Terminais de Caixa & PDV Concorrentes
- **REQ-POS-001 (Ubiquitous):** O sistema deve permitir que múltiplos operadores de caixa em uma mesma loja mantenham turnos ativos simultaneamente, identificados por operador e nome do terminal.
- **REQ-POS-002 (Event-Driven):** QUANDO um operador abre um novo turno de caixa, O sistema deve validar se aquele operador específico já possui um turno aberto, impedindo duplicidade por usuário sem bloquear outros operadores da loja.
- **REQ-POS-003 (State-Driven):** ENQUANTO houver múltiplos caixas abertos na loja, O painel de fluxo de caixa (`/workspace/financeiro/caixa`) deve exibir um seletor visual em pílulas dos terminais ativos permitindo ao gestor/financeiro alternar a visualização e auditar gaveta e movimentações de cada operador em tempo real.
- **REQ-POS-004 (Event-Driven):** QUANDO um operador sem permissão de estorno tentar cancelar um item ou conceder desconto acima do teto no PDV, O sistema deve exigir a autenticação gerencial por PIN via `ManagerOverrideDialog`.

### 2.2 Prontuário Digital, ASO & Benefícios no RH/DP
- **REQ-HR-001 (Ubiquitous):** A aba de colaboradores (`/workspace/financeiro/funcionarios`) deve gerenciar o prontuário digital com abas de Dados/Cargo, Exames Ocupacionais (ASO), Documentos/Pastas, Benefícios Padrão e Permissões de PDV.
- **REQ-HR-002 (State-Driven):** ENQUANTO um exame ASO estiver cadastrado, O sistema deve computar visualmente o status de conformidade: Válido (verde, >30 dias), A Vencer (amarelo, <=30 dias) ou Vencido (vermelho, <=0 dias).
- **REQ-HR-003 (Event-Driven):** QUANDO o gestor de RH configurar benefícios padrão (VT, VR, Plano de Saúde) no prontuário ou por setor, O motor de cálculo contábil (`payroll-calculator.ts`) deve consumir automaticamente esses parâmetros para cálculo da folha.

### 2.3 Sincronização de Embalagem no WMS & Separação
- **REQ-WMS-001 (Ubiquitous):** As ordens de separação e conferência no WMS (`/workspace/pedidos/expedicao`) devem exibir o formato de embalagem recomendado (Caixa, Sacola, Envelope) derivado dos metadados de logística cadastrados no produto.

## 3. Critérios de Aceite
1. `_openRegister` permite que operadores distintos abram caixas na mesma loja com nomes de terminal customizados.
2. `_listActiveRegisters` retorna a coleção de todos os caixas com status `open` da loja.
3. `workspace.financeiro.caixa.index.tsx` renderiza o seletor de terminais ativos com saldo em gaveta e contagem de itens de cada operador.
4. `workspace.financeiro.funcionarios.tsx` exibe o prontuário completo do colaborador com visualização e gestão de ASO e pastas de documentos.
5. `workspace.pedidos.expedicao.tsx` renderiza o badge da embalagem recomendada nos itens de separação.
6. Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).
7. Catraca de CI de Design Lint aprovada sem novas violações P0/P1.
