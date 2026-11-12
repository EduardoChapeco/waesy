# DOCUMENTO 09 — PLANO DE CORREÇÃO E BACKLOG PRIORIZADO
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Comitê Técnico:** Comitê Executivo de Engenharia & Staff Principal Architect  

---

## 1. Backlog Priorizado por Nível de Severidade

### P0-01: Correção do Descarte de Mensagens Enviadas pelo Celular (`fromMe: true`)
- **Problema:** Mensagens digitadas pelo lojista ou equipe no smartphone físico não aparecem no chat do Waesy.
- **Evidência:** Linha 167 de `src/services/whatsapp-provider-webhook.server.ts` aborta com `{ ignored: "outgoing_or_without_phone" }`.
- **Causa Raiz:** Filtro prematuro descartando qualquer mensagem com `message.fromMe === true`.
- **Arquivos Afetados:** `src/services/whatsapp-provider-webhook.server.ts`.
- **Solução Técnica:**
  Quando `message.fromMe === true`, extrair o destinatário remoto de `key.remoteJid` (ou `key.cleanedSenderPn`), localizar ou criar a thread correspondente e inserir a mensagem em `chat_messages` com `is_staff_reply: true`, `delivery_status: "delivered"` e `sender_id: null` (ou perfil do proprietário).
- **Risco:** Baixo (apenas adiciona registros que antes eram descartados).
- **Testes de Aceitação:** Enviar mensagem pelo celular para um cliente e verificar que ela surge instantaneamente no painel do Waesy.
- **Estratégia de Rollback:** Reverter a branch condicional de `fromMe` no arquivo.
- **Prioridade:** **P0 (Crítico)**.

---

### P0-02: Detecção Proativa de Socket Zombie (Código 403) na Oracle VPS
- **Problema:** Quando o WhatsApp revoga a sessão, a Evolution API mantém `state: "open"`, e o Waesy continua exibindo "Conectado", gerando mensagens em `dead_letter`.
- **Evidência:** Chamada a `/instance/fetchInstances` revelou `disconnectionReasonCode: 403`, enquanto `/instance/connectionState` reportava `open`.
- **Causa Raiz:** Checagem rasa de estado no conector.
- **Arquivos Afetados:** `src/services/whatsapp-channel-instances.functions.ts`.
- **Solução Técnica:**
  No health-check de instâncias (`checkInstanceStatus`), consultar `/instance/fetchInstances` e inspecionar se existe `disconnectionReasonCode` preenchido. Se houver código de desconexão, atualizar atômica e imediatamente `status: "disconnected"` no banco de dados e notificar a UI.
- **Risco:** Baixo.
- **Testes de Aceitação:** Desconectar a sessão no celular e constatar que o painel muda imediatamente para "Desconectado" e exibe o botão de novo QR Code.
- **Estratégia de Rollback:** Retornar ao endpoint anterior de verificação.
- **Prioridade:** **P0 (Crítico)**.

---

### P0-03: Estabilização de Túnel Fixo para a Oracle Cloud (Eliminação do Quick Tunnel)
- **Problema:** A URL `feb-genre-kathy-indicator.trycloudflare.com` é temporária e expira com facilidade.
- **Evidência:** Hardcode da URL em `whatsapp-channel-instances.functions.ts` e `chat.functions.ts`.
- **Causa Raiz:** Ausência de túnel nomeado configurado via Cloudflare Zero Trust.
- **Arquivos Afetados:** Infraestrutura OCI VPS, `.env` e `src/services/whatsapp-channel-instances.functions.ts`.
- **Solução Técnica:**
  Configurar na VPS Oracle um Cloudflare Tunnel persistente associado a um CNAME corporativo no domínio `waesy.com.br` (ex: `gateway-whatsapp.waesy.com.br`) gerenciado por serviço do sistema (`systemctl enable cloudflared`).
- **Risco:** Médio (requer acesso SSH à VPS para instalação do daemon permanente).
- **Testes de Aceitação:** Reiniciar a VPS e comprovar que a URL permanece idêntica e operante.
- **Estratégia de Rollback:** Manter a variável de ambiente `EVOLUTION_API_URL` como override.
- **Prioridade:** **P0 (Crítico)**.

---

### P1-01: Desobstrução da Entrega Realtime (Eliminação de Falhas de Subscrição RLS)
- **Problema:** Mensagens novas de clientes às vezes não atualizam a tela sem refresh.
- **Evidência:** `chat_messages` não possui `store_id` direto, e a política RLS exige junção com `chat_threads` e `workspace_members`, falhando quando a sessão do navegador expira ou a thread não está atribuída.
- **Arquivos Afetados:** `src/routes/workspace.atendimento.index.tsx` e `supabase/migrations/`.
- **Solução Técnica:**
  1. Adicionar coluna `store_id` indexada em `chat_messages` (preenchida por trigger automática herdando da thread) e simplificar a política de RLS.
  2. Implementar canal de broadcast no Supabase Realtime (`store-chat-events-${storeId}`) para notificação leve de novos IDs de mensagens, forçando revalidação via BFF.
- **Risco:** Médio (envolve migração de banco não-destrutiva).
- **Testes de Aceitação:** Receber mensagem em cliente com permissão restrita de atendente e confirmar atualização visual instantânea.
- **Estratégia de Rollback:** Reverter para a subscrição original.
- **Prioridade:** **P1 (Alto)**.

---

### P1-02: Conexão Automática de Mensagens Inbound com Oportunidades do CRM
- **Problema:** Quando um lead em negociação no Kanban envia mensagem, o atendente precisa abrir a oportunidade manualmente.
- **Evidência:** Falta de indicador visual de "Etapa do Funil" no cabeçalho do chat ativo.
- **Arquivos Afetados:** `src/routes/workspace.atendimento.index.tsx` e `src/components/chat/customer-360-sidebar.tsx`.
- **Solução Técnica:**
  Exibir pílula compacta clicável no cabeçalho da conversa com a etapa atual do lead (ex: `[Em Negociação]`) com atalho direto para o card no Kanban.
- **Risco:** Mínimo (apenas enriquecimento visual).
- **Prioridade:** **P1 (Alto)**.

---

### P2-01: Ativação Transacional do Squad de Triagem no Atendimento
- **Problema:** Os squads de IA existem na infraestrutura mas não atuam automaticamente nas mensagens de novos contatos.
- **Arquivos Afetados:** `src/services/whatsapp-automation-runtime.server.ts`.
- **Solução Técnica:**
  Adicionar toggle nas configurações de atendimento: "Ativar Agente de Triagem para Novos Contatos", acionando `runSquadWorkflow` para qualificar destino e datas antes de notificar o atendente humano.
- **Prioridade:** **P2 (Médio)**.
