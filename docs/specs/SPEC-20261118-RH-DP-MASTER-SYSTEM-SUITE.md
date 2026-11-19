# SPEC-20261118: Suite Master de RH, DP, Setores Corporativos, Dossiê 360° e Inteligência Multi-Nicho

## 1. Contexto e Motivação
A gestão de Recursos Humanos (RH) e Departamento Pessoal (DP) no ecossistema Waesy apresentava fragmentação operacional:
- A navegação estava dispersa entre rotas desconexas (`/workspace/configuracoes/equipe`, `/workspace/rh/ponto`, `/workspace/rh/folha`, `/workspace/rh/compliance`), sem uma rota raiz centralizada (`/workspace/rh`) que funcionasse como o **Cockpit Geral de Gente & Gestão**.
- Não havia gestão explícita de **Setores & Departamentos Horizontais da Empresa** (Comercial, Atendimento, Financeiro, Operações, Logística, Marketing, RH, TI), dificultando a atribuição de líderes, centros de custo e regras de atendimento.
- Os perfis de colaboradores careciam de edição unificada 360° integrando dados pessoais, contratuais (CLT, PJ, Estagiário, Salão Parceiro, Autônomo), bancários/PIX, benefícios, ponto eletrônico (PIN), comissões/metas e carteira de clientes atribuída.
- Faltava adaptabilidade semântica por nicho para profissionais especializados (Turismo: emissores/metas de operadoras; Beleza/Barbearia: Lei do Salão Parceiro 13.352/2016 e cota-parte; Imobiliária/Automotivo: CRECI/CNH e comissões sobre VGV/veículos; Saúde: CRM/CRO e repasses de procedimentos).

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### 2.1 Hub Central e Cockpit Executivo de RH/DP (`/workspace/rh`)
- **Quando** o gestor ou operador de RH acessar a rota `/workspace/rh`, **o sistema deve** renderizar o Painel Master de Gente & Gestão com:
  - Header canônico com resumo métrico em 4 blocos: (1) Total de Colaboradores e Headcount Ativo; (2) Ponto do Dia (Presentes, Almoçando, Faltas/Atrasos); (3) Custo Consolidado da Folha e Provisões do Mês; (4) Alertas Regulatórios (ASOs periódicos a vencer em < 30 dias, CNHs/Conselhos profissionais, contratos de experiência).
  - Barra de navegação interna com abas canônicas: `overview` (Visão Geral), `colaboradores` (Ficha & Gestão de Pessoas), `setores` (Setores & Departamentos), `ponto` (Ponto Eletrônico MTE 671), `folha` (Folha de Pagamento & Holerites), `compliance` (Documentos & Conformidade) e `vagas` (Recrutamento & Seleção).
  - Interface adaptativa em conformidade estrita com o piso WCAG 2.2 AA (touch targets >= 44px, `:focus-visible:ring-2`, tokens semânticos).

### 2.2 Gestão de Setores & Departamentos Horizontais
- **Quando** o administrador acessar a aba `setores`, **o sistema deve** listar todos os departamentos da empresa com contagem de colaboradores ativos, líder responsável, centro de custo e canal WhatsApp/roleta de atendimento vinculado.
- **Quando** o gestor criar ou editar um setor, **o sistema deve** persistir os dados na tabela `chat_departments` e sincronizar com `governance_settings` sem quebras de integridade relacional.

### 2.3 Ficha 360° e Edição Completa do Perfil do Colaborador
- **Quando** o operador clicar em "Editar Perfil" ou "Adicionar Colaborador", **o sistema deve** abrir o modal/sheet `EmployeeFullProfileModal` com 6 abas estruturadas:
  1. **Dados Pessoais & Contratuais:** Nome completo, CPF mascarado, RG, PIS/PASEP, CTPS, nascimento, telefone/WhatsApp, e-mail corporativo, endereço residencial, admissão, regime de contratação (CLT, PJ, Estagiário, Jovem Aprendiz, Salão Parceiro, Autônomo), cargo, setor/departamento, salário base (R$) e dados bancários/chave PIX.
  2. **Comercial & Atendimento:** Ativação de papel comercial, percentual de comissão (%), meta mensal de faturamento (R$), instância/fila de WhatsApp atribuída e carteira de clientes vinculados.
  3. **Ponto & Jornada:** Carga horária semanal (44h, 40h, 30h, 12x36), escala de trabalho, código PIN do ponto eletrônico com auditoria e tolerância de marcação.
  4. **Benefícios:** Vale Transporte (com trava do desconto legal de 6%), Vale Refeição/Alimentação diário, Plano de Saúde e outros descontos acordados.
  5. **Documentos & ASO:** Upload e visualização de documentos admissionais e registro de exames médicos ocupacionais (Admissional, Periódico, Demissional) com status de aptidão e data limite de validade.
  6. **Especialidades por Nicho:** Campos contextuais de nicho (CRECI, CNH, CRM/CRO, contrato da Lei do Salão Parceiro).

### 2.4 Reestruturação da Navegação do Workspace (`GROUP_TEAM_RH`)
- **Quando** o usuário visualizar a barra lateral do Workspace, **o sistema deve** exibir o grupo de navegação "Gente & Gestão (RH/DP)" com as rotas unificadas:
  - `/workspace/rh` (Painel Geral, Colaboradores & Setores)
  - `/workspace/rh/ponto` (Ponto Eletrônico)
  - `/workspace/rh/folha` (Folha de Pagamento)
  - `/workspace/rh/compliance` (Compliance & Documentos)
  - `/workspace/configuracoes/equipe` (Acessos & Permissões da Equipe)

## 3. Invariantes Arquiteturais & Regras de Negócio
- **INV-1 (Multi-Tenant Zero-Trust):** 100% das leituras e mutações de colaboradores, setores, ponto e folha devem exigir `assertStoreAccess` (`identity.store_id`), sendo vedado acesso cruzado entre empresas.
- **INV-2 (Piso Acessível WCAG 2.2 AA):** Todos os botões, links e controles interativos devem ter área de toque mínima de 44x44px (`h-11 min-h-11` ou `size-11`) e anéis de foco `:focus-visible:ring-2`.
- **INV-3 (Design Tokens Canônicos):** Zero classes com cores literais hex/rgb fora do catálogo de tokens (`tokens.json`/`styles.css`), zero classes arbitrárias com colchetes e zero `!important`.
- **INV-4 (Paridade de Folha e Ponto):** As rotas pré-existentes `/workspace/rh/folha`, `/workspace/rh/ponto` e `/workspace/rh/compliance` devem permanecer 100% funcionais e interoperáveis, servindo como rotas profundas linkadas a partir do Hub `/workspace/rh`.

## 4. Critérios de Aceite & Evidências Esperadas
- [ ] Rota `/workspace/rh` criada e acessível via TanStack Router com abas `overview`, `colaboradores`, `setores`, `ponto`, `folha`, `compliance` e `vagas`.
- [ ] Componente `EmployeeFullProfileModal.tsx` implementado e integrado na listagem de colaboradores.
- [ ] Componente `DepartmentManagerPanel.tsx` implementado para gestão horizontal de setores corporativos.
- [ ] BFF em `hr.functions.ts` enriquecido com `getStoreHRDashboardMetrics`, `listStoreDepartments` e `saveEmployeeFullProfile`.
- [ ] Menu lateral em `workspace-navigation.ts` refatorado e alinhado.
- [ ] Design lint aprovado com zero violações na catraca de CI (`node scripts/design-lint.mjs --ratchet`).
- [ ] Zero duplicações de tipos (`node scripts/check-type-duplications.mjs`).
- [ ] Zero tabelas faltantes no BFF (`node scripts/check-bff-table-contracts.mjs`).
- [ ] Suíte de testes automatizados Vitest aprovada.
- [ ] Compilação TypeScript limpa com Exit Code 0 (`npm run typecheck`).
