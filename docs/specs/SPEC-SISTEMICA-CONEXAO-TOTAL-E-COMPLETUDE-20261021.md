# SPEC-SISTEMICA-CONEXAO-TOTAL-E-COMPLETUDE-20261021
## Especificação Canônica de Fechamento de Gaps de Conexão, UI, Módulos Órfãos e Completude Máxima

> **Status:** APROVADO PARA IMPLEMENTAÇÃO  
> **Data:** 21 de Outubro de 2026  
> **Autor:** Antigravity Architect Core  
> **Normas Relacionadas:** `AGENTS.md` (B.1 a B.41), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md` (DL-01 a DL-30)

---

### 1. Diagnóstico e Escopo da Intervenção

A auditoria forense identificou 5 pilares com funcionalidades implementadas no backend (BFF) mas com gaps de acoplamento na interface (UI), duplicações de código ou acessibilidade em documentos:

1. **Turismo Corporativo (B2B):**
   - As funções `createTravelProject`, `saveTravelerProfile`, `saveCompanyTravelPolicy` e `recordAirTicketCredit` existem e estão blindadas no backend, mas as telas `workspace.empresa.viagens.tsx` e `workspace.turismo.corporativo.tsx` careciam de modais interativos para criação e edição direta.
2. **Mobilidade / Carona & Ônibus Rodoviário:**
   - O motor de busca e compra de passagens de ônibus intermunicipais (`listIntercityBusSchedules`, `bookIntercityBusTicket`) e o chat de negociação de caronas (`sendCaronaChatMessage`) careciam de superfície tátil em `_store.mobilidade.tsx` e `_store.conta.mobilidade.tsx`.
3. **Pacotes de Serviços & Agenda:**
   - As operações de check-in (`checkInAppointment`) e registro de falta/no-show com penalidade no passe (`markAppointmentNoShow`) não estavam acopladas aos botões de ação de agendamentos da agenda (`workspace.agenda.index.tsx`).
4. **Currículo Digital e ATS:**
   - A exportação em PDF via `html2canvas` gerava um bitmap sem texto selecionável. É necessário injetar a camada de texto selecionável (ATS-readable) com dados do perfil para compatibilidade universal com robôs de RH.
5. **Pedidos & Resolução de Código Duplicado:**
   - `orders.functions.ts` mantinha funções paralelas defasadas enquanto `order.functions.ts` é o canônico consumido por 22 rotas. É mandatório unificar os exports para eliminar duplicação.

---

### 2. Requisitos em Sintaxe EARS

#### 2.1 Hub Corporativo B2B (EARS-CORP)
- **EARS-CORP-01 (Condicional de Evento):** QUANDO o gestor da empresa clicar em "+ Novo Projeto" na aba de Projetos de `workspace.empresa.viagens.tsx`, O sistema DEVE abrir o modal de criação de projeto e invocar `createTravelProject` persistindo no PostgreSQL.
- **EARS-CORP-02 (Condicional de Evento):** QUANDO o gestor clicar em "+ Cadastrar Viajante" na aba de Viajantes, O sistema DEVE coletar dados civis, documentos e preferências e invocar `saveTravelerProfile`.
- **EARS-CORP-03 (Condicional de Evento):** QUANDO o gestor clicar em "Configurar Política" na aba de Política, O sistema DEVE abrir o formulário parametrizado de regras aéreas e de hotelaria e persistir via `saveCompanyTravelPolicy`.

#### 2.2 Mobilidade Intermunicipal (EARS-MOB)
- **EARS-MOB-01 (Condicional de Evento):** QUANDO o usuário selecionar a modalidade "Caronas & Ônibus" na página `/mobilidade`, O sistema DEVE fornecer bifurcação entre "Caronas Compartilhadas" e "Linhas Rodoviárias", consultando `listIntercityBusSchedules` com horários, viações e poltronas.
- **EARS-MOB-02 (Condicional de Evento):** QUANDO o passageiro de uma carona acessar `/conta/mobilidade`, O sistema DEVE exibir o botão "Conversar com o Motorista", abrindo o chat com histórico de mensagens e negociação via `sendCaronaChatMessage`.
- **EARS-MOB-03 (Ubíquo):** A lista de passagens compradas de ônibus (`busTickets`) DEVE ser renderizada na aba de viagens do usuário.

#### 2.3 Pacotes de Serviços e Presença (EARS-PKG)
- **EARS-PKG-01 (Condicional de Evento):** QUANDO o recepcionista ou profissional na `/workspace/agenda` marcar um atendimento como concluído ou registrar check-in em um agendamento vinculado a um passe, O sistema DEVE registrar `check_in_at` e debitar a sessão no `service_pass_ledger`.
- **EARS-PKG-02 (Condicional de Evento):** QUANDO o recepcionista marcar "Falta (No-Show)" em um agendamento com passe, O sistema DEVE invocar a procedure de no-show aplicando a penalidade contratual.

#### 2.4 Currículo Acessível e ATS (EARS-CURR)
- **EARS-CURR-01 (Ubíquo):** O arquivo PDF gerado em `/conta/curriculo` DEVE conter os nós de texto com nome, resumo, experiências, formação e competências do candidato legíveis por robôs de parsing ATS e selecionáveis via cursor do mouse.

#### 2.5 Erradicação de Código Paralelo (EARS-DRY)
- **EARS-DRY-01 (Invariante):** O arquivo `orders.functions.ts` DEVE reexportar as definições canônicas de `order.functions.ts`, garantindo fonte única da verdade para toda a árvore do repositório.

---

### 3. Matriz de Aceite e Evidências
1. Zero quebras de compilação TypeScript (`npm run typecheck` Exit Code 0).
2. Testes de unidade e integração aprovados no Vitest.
3. Todas as 12 funções anteriormente órfãs integradas com botões e formulários nos fluxos da UI.
4. Registro de decisão em `docs/design/DECISIONS.md`.
