# SPEC-AUDITORIA-WHATICKET-CRM-WHATSAPP-WAESY: Engenharia Reversa e Plano de Convergência

## 1. Escopo & Objetivos
- **Meta:** Auditar o projeto open-source `canove/whaticket-community`, decompor seus módulos, modelos e fluxos de atendimento e CRM WhatsApp, e incorporar os diferenciais funcionais no ecossistema Waesy, mantendo integridade com TanStack Start, Supabase Postgres, RLS Zero-Trust e padrões Apple HIG.
- **Status:** Especificação e Arquitetura Canônica Aprovada.
- **Artefato de Auditoria:** `C:\Users\aline\.gemini\antigravity\brain\2f3a0f8a-c81b-450b-a85b-841099a21dd2\auditoria-engenharia-reversa-whaticket-crm-waesy.md`.

## 2. Decomposição MECE das Features do Whaticket Community
1. **Multi-atendimento no mesmo número WhatsApp:** Múltiplos operadores dividindo a mesma linha de atendimento.
2. **Filas / Departamentos:** Categorização de chamados por setor (Vendas, Suporte, Financeiro, etc.) com cores e mensagens de saudação.
3. **Máquina de Estados de Tickets:** `pending` (aguardando) $\rightarrow$ `open` (em atendimento) $\rightarrow$ `closed` (resolvido).
4. **Respostas Rápidas / Macros:** Atalhos (`/chave`, `/ola`, `/horario`) customizáveis por empresa.
5. **Etiquetas e Tags Coloridas:** Organização e filtragem de tickets e contatos.
6. **Notas Internas no Chat:** Mensagens visíveis apenas pela equipe sem envio ao cliente WhatsApp.
7. **Agendamento de Mensagens:** Programação de envio futuro no chat do cliente.
8. **Transferência de Conversas com Nota:** Reatribuição de atendente/fila com justificativa.
9. **Chatbot / URA Numérica:** Triagem inicial automática antes de acionar o atendente humano.
10. **Gravação de Áudio PTT:** Envio de mensagem de voz gravada no navegador.

## 3. Estado Atual do Waesy & Diferenciais Estratégicos Preexistentes
- **Segurança Zero-Trust:** Criptografia de mensagens em repouso (`encryptConversationMessageForThread`), RLS Deny-by-Default por loja e cofre de segredos criptografado.
- **Conectividade Híbrida:** Suporte simultâneo a Meta Cloud API oficial e provedores não-oficiais (Evolution API, Wasender API, Render Bridge).
- **Customer 360 & E-commerce Nativo:** Painel lateral no chat trazendo pedidos do cliente, histórico transacional, saldo e chamados RMA integrados.
- **SDR IA Autônomo:** Agente inteligente capaz de conduzir conversas de pré-venda, qualificar leads e detectar intenção de compra antes do transbordo humano.

## 4. Oportunidades de Extração & Roadmap de Melhorias
1. **Fase 1 — Respostas Rápidas Dinâmicas:** Migrar macros de código fixo para tabela `store_quick_answers` gerenciável pelo painel do lojista com atalho de teclado `/`.
2. **Fase 2 — Tags e Kanban de Atendimento:** Implementar etiquetagem multi-tag no chat com chips visuais e visualização em grade kanban de conversas ativas.
3. **Fase 3 — Modal de Transferência Fluida:** Criar diálogo de transferência com seleção de departamento, atendente e inclusão de nota interna de contexto.
4. **Fase 4 — Agendamento de Mensagens Individuais:** Adicionar ação de agendamento na barra de composição para follow-up automatizado.
5. **Fase 5 — URA de Triagem Plug-and-Play:** Habilitar chatbot de autoatendimento com menu 1-5 configurável nas configurações de suporte da loja.
6. **Fase 6 — Áudio Microfone PTT:** Habilitar gravação direta de áudio no painel de atendimento via `ChatComposer`.
7. **Fase 7 — Unificação CRM ⇄ Chat:** Conectar a lista de leads do WhatsApp no CRM diretamente com as threads de atendimento do Workspace.
