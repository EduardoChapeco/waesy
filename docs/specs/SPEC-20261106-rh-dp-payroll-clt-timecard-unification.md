# SPEC-20261106: Unificação e Soberania do Módulo RH, DP, Folha de Pagamento Contábil CLT/PJ e Ponto Eletrônico

## 1. Contexto e Motivação
A gestão de pessoas no Waesy operava com uma visão puramente fragmentada e rudimentar de vales/bônus na rota `/workspace/financeiro/funcionarios`, sem cálculo contábil real, sem suporte a competências mensais (`YYYY-MM`), sem emissão de holerites (Recibo de Pagamento de Salário) oficiais nos padrões CLT/MTE com canhoto destacável, sem cálculo progressivo de INSS e IRRF 2026, sem espelho de ponto mensal assinado, sem simulação de rescisão/férias e sem bilateralidade com as Contas a Pagar da tesouraria financeira.

## 2. Requisitos em Sintaxe EARS

### 2.1 Motor Contábil de Folha de Pagamento (CLT / PJ)
- **Quando** o operador de RH/DP selecionar uma competência (ex.: `2026-10`), **o sistema deve** carregar todos os colaboradores da empresa e calcular automaticamente:
  - Salário Base contratual;
  - Horas Extras 50% e 100% com divisor de jornada (padrão 220h/mês) e reflexo do Descanso Semanal Remunerado (DSR sobre HE);
  - Adicional Noturno (20% sobre hora normal com hora reduzida de 52m30s);
  - Desconto progressivo oficial do INSS 2026 por faixas (7,5%, 9%, 12%, 14% até o teto de R$ 951,62);
  - Desconto progressivo oficial do IRRF 2026 com dedução por dependente (R$ 189,59/dep) ou Desconto Simplificado (R$ 564,80);
  - Provisão patronal do FGTS (8% sobre o total remuneratório);
  - Descontos de benefícios: Vale Transporte (até 6% do salário base), Vale Alimentação/Refeição (coparticipação), Plano de Saúde e Faltas não justificadas;
  - Desconto de adiantamentos/vales concedidos no período;
  - Salário Líquido final a transferir.

### 2.2 Edição Ágil em Formato Planilha (In-Page Spreadsheet Editor)
- **Quando** o operador estiver na aba de Folha Mensal, **o sistema deve** permitir a edição inline rápida dos campos variáveis (dias trabalhados, horas extras, faltas, bônus, outros descontos) com recálculo instantâneo na tela (Zero Jank) no estilo de edição de grades rápidas.

### 2.3 Emissão Canônica de Holerite em PDF e Canhoto Destacável
- **Quando** o operador ou colaborador acionar "Visualizar / Emitir Holerite", **o sistema deve** renderizar o documento oficial de Recibo de Pagamento de Salário com:
  - Identificação completa do empregador (Razão Social, Nome Fantasia, CNPJ, Endereço);
  - Dados do colaborador (Nome, CPF mascarado, Matrícula, Cargo, CBO, PIS, Admissão, Departamento);
  - Tabela contábil oficial com códigos de rubricas (001 Salário, 015 HE 50%, 016 HE 100%, 020 DSR, 101 INSS, 102 IRRF, 105 VT, 106 VR/VA, 150 Adiantamento);
  - Quadro de bases legais (Base INSS, Base FGTS, FGTS do Mês, Base IRRF, Faixa IRRF);
  - Canhoto destacável de quitação para assinatura ou protocolo de assinatura digital;
  - Botão de impressão com estilização A4 otimizada e exportação direta.

### 2.4 Ponto Eletrônico & Espelho de Ponto Mensal (Portaria 671 MTE)
- **Quando** a visualização de ponto for aberta por colaborador e competência, **o sistema deve** exibir a grade de todos os dias do mês com Entrada 1, Saída Almoço, Volta Almoço, Saída Final, Total de Horas do Dia, Saldo Diário e Banco de Horas consolidado (positivo ou negativo), permitindo gerar o Espelho de Ponto Mensal para assinatura física ou digital.

### 2.5 Bilateralidade com Financeiro (Contas a Pagar)
- **Quando** a folha for fechada ("Fechar Competência & Lançar no Financeiro"), **o sistema deve** gerar automaticamente a obrigação financeira em `financial_transactions` na categoria `folha_pagamento` com status pendente de liquidação para a tesouraria aprovar e anexar comprovante bancário.

### 2.6 Rescisão Trabalhista & Férias Integradas
- **Quando** o DP simular ou emitir férias ou rescisão, **o sistema deve** calcular automaticamente saldo de salário, aviso prévio indenizado/trabalhado proporcional à lei 12.506/11, 13º proporcional, férias proporcionais/vencidas + 1/3 e multa rescisória do FGTS (40% ou 20%).

## 3. Critérios de Aceite & Invariantes
- **AC-1:** Testes unitários do motor contábil (`payroll-calculator.test.ts`) cobrindo 100% das faixas de INSS, IRRF, FGTS, DSR sobre HE, férias e rescisão com tolerância zero a erros de arredondamento em centavos.
- **AC-2:** Interface sem violações de acessibilidade WCAG 2.2 AA (touch target >= 44px, `:focus-visible`, contraste).
- **AC-3:** Zero regressões no design lint (`node scripts/design-lint.mjs --ratchet`).
- **AC-4:** Compilação TypeScript limpa com Exit Code 0.
