# SPEC-WHATSAPP-GOVERNANCE-CONTACT-PURGE-AI-KNOWLEDGE: Governança Estrita de Contatos, Exclusão Definitiva por Admins, Isolamento por Setor e IA com Base Normativa de Pacotes & ANAC

## 1. Contexto e Motivação
Empresas e agências que gerenciam alto volume de contatos no WhatsApp enfrentam três desafios críticos no ecossistema de atendimento:
1. **Governança e Exclusão Soberana de Contatos/Leads:** Empresas de marketing necessitam de opção para **excluir definitivamente** contatos e conversas descartáveis (além do arquivamento), limpando o banco local (`chat_threads`, `chat_messages`, `customers_crm`) e impedindo que números apagados continuem visíveis para a equipe.
2. **Isolamento Estrito de Atribuições e Ocultação da Equipe:** Funcionários e atendentes devem ter acesso estritamente delimitado aos seus setores atribuídos (`whatsapp_governance`), sem enxergar conversas de departamentos vizinhos, nem conversas sinalizadas como confidenciais/ocultas por administradores (`hidden_from_staff`). Apenas Admins e Supervisores possuem autorização para excluir contatos, reatribuir setores ou desocultar conversas.
3. **Inteligência Artificial Conectada à Base de Conhecimento do Tenant & Normas ANAC:** Clientes que chegam ao WhatsApp interessados em pacotes turísticos ou roteiros cadastrados no site precisam de respostas ricas e embasadas. A IA de atendimento (Copilot e Sandbox) deve consultar a base estrita do tenant (detalhes do pacote, roteiro diário, itens inclusos, hotelaria, opções de parcelamento) e o repositório normativo de aviação civil (Resolução 400 da ANAC sobre franquia de 10kg na bagagem de mão, 23kg na despachada, arrependimento em 24h, assistência material de 1h/2h/4h em atrasos, e proibição de cancelamento automático da volta em caso de no-show comunicado na ida).

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Exclusão Soberana e Ocultação de Contatos (Event-Driven & State-Driven)
- **EARS-01:** O sistema DEVE fornecer a server function `deleteChatContactPermanently` restrita a perfis com papéis administrativos (`owner`, `admin`, `platform_admin`), permitindo a exclusão definitiva de um contato (`customers_crm`), de suas threads (`chat_threads`) e de suas mensagens (`chat_messages`).
- **EARS-02:** QUANDO um administrador acionar a exclusão definitiva de um contato, o sistema DEVE expurgar em cascata o histórico local sem afetar instâncias do WhatsApp de terceiros e registrar log de auditoria no tenant.
- **EARS-03:** O sistema DEVE fornecer a ação `toggleChatThreadStaffVisibility` permitindo que administradores alternem a confidencialidade da conversa (`metadata.hidden_from_staff: true/false`), tornando-a invisível para operadores comuns.

### 2.2 Isolamento Estrito de Setores e Permissões de Atendentes (Ubiquitous & Unwanted Behavior)
- **EARS-04:** ENQUANTO um operador/atendente (`isSupervisor = false`) listar conversas via `listChatThreads`, o sistema DEVE ocultar todas as conversas marcadas com `metadata.hidden_from_staff === true`.
- **EARS-05:** ENQUANTO um operador estiver atribuído a setores específicos na governança da loja (`whatsapp_governance.departments`), o sistema DEVE restringir a consulta para que ele visualize exclusivamente:
  - Conversas explicitamente atribuídas ao seu `profile_id` (`assigned_to_profile_id.eq.${identity.id}`).
  - Conversas pertencentes aos setores aos quais seu `agentId` está formalmente vinculado.
- **EARS-06:** SE um operador sem privilégios de supervisor tentar acionar a exclusão definitiva de contato ou conversa, o sistema DEVE rejeitar a requisição com erro `"Permissão negada. Apenas administradores e supervisores podem excluir contatos."`.

### 2.3 Ferramentas de IA para Pacotes, Roteiros e Base Normativa ANAC (Event-Driven)
- **EARS-07:** O sistema DEVE fornecer a ferramenta `toolLookupTourismPackages` em `whatsapp-ai-agent-tools.server.ts` que busca pacotes turísticos e viagens ativas da loja (`tourism_trips`, `tourism_experiences`, `travel_quotes`), retornando título, destino, saídas, roteiro dia a dia, itens inclusos e opções de parcelamento.
- **EARS-08:** O sistema DEVE fornecer a ferramenta `toolGetTourismAviationPolicies` com a base normativa consolidada de aviação civil e regras de viagem:
  - **Bagagem:** 10kg gratuita na cabine + item pessoal sob o assento; franquia despachada padrão de 23kg.
  - **Cancelamento e Arrependimento:** Direito de desistência sem ônus até 24h da compra para passagens adquiridas com antecedência mínima de 7 dias do voo.
  - **Alteração de Malha pela Cia Aérea:** Aviso prévio de 72h; alterações superiores a 30min (doméstico) ou 1h (internacional) garantem reacomodação gratuita ou reembolso integral.
  - **Assistência Material:** Atrasos >1h (comunicação), >2h (alimentação), >4h (hospedagem e transporte).
  - **No-Show:** Proibição de cancelamento automático do voo de volta se o passageiro notificar a companhia aérea antes da partida do voo de ida.
- **EARS-09:** QUANDO um cliente enviar mensagem no WhatsApp mencionando pacote, roteiro, regras de voo, bagagem, cancelamento ou parcelamento, o runtime de IA (`evaluateControlledAiInboundRuntime`) DEVE enriquecer o contexto de geração com os dados do pacote e a base normativa correspondente, gerando sugestões para o Copilot ou respostas no Sandbox com precisão documental.

### 2.4 Interface do Hub de Atendimento SAC (Ubiquitous)
- **EARS-10:** A interface do Workspace Atendimento DEVE exibir no menu da conversa as opções:
  - "Excluir Contato & Conversa (Definitivo)" visível apenas para administradores, com diálogo de confirmação seguro.
  - "Ocultar da Equipe" / "Tornar Visível para Equipe" para administradores.
- **EARS-11:** Todos os controles interativos DEVEM cumprir a altura mínima de 44px (`h-11 min-h-11`), anel de foco teclado (`:focus-visible`) e zero novas violações no Design Lint.

---

## 3. Invariantes do Repositório
- Invariante B.1 / B.20: Governança multi-tenant estrita e isolamento total entre lojas.
- Invariante B.4 / B.8: Zero cores arbitrárias fora de token; alvos de toque móveis >= 44px; foco visível em todos os botões e links.
- Invariante B.7: Toda mutação em código existente via `edit_file` cirúrgico contíguo.
- Invariante B.9: Zero erros TypeScript (`npm run typecheck`), build de produção aprovado e testes de integração validados.
