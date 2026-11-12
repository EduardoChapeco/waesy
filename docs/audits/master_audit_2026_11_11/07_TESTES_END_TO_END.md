# DOCUMENTO 07 — RELATÓRIO DE TESTES END-TO-END E MATRIZ DE VERIFICAÇÃO
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Comitê Técnico:** Especialista em QA, Testes End-to-End e Observabilidade  

---

## 1. Resumo da Execução da Bateria de 24 Testes

| Teste | Descrição do Cenário | Status | Evidência / Diagnóstico |
| :--- | :--- | :--- | :--- |
| **TESTE 01** | Mensagem recebida via WhatsApp | **PARCIAL** | Webhook recebe e persiste se o socket estiver conectado; mas falha ao notificar em tempo real se a sessão WebSocket expirar. |
| **TESTE 02** | Mensagem enviada pelo sistema | **PARCIAL** | Enfileira no outbox com sucesso, mas falha no gateway se a sessão Baileys na VPS estiver em código 403 (zombie). |
| **TESTE 03** | Mensagem enviada pelo celular do lojista | **REPROVADO** | Linha 167 de `whatsapp-provider-webhook.server.ts` ignora mensagens com `fromMe === true`. |
| **TESTE 04** | Dois atendentes simultâneos | **APROVADO** | Ambas as sessões carregam o histórico corretamente via `getChatMessages` com bloqueio multi-tenant. |
| **TESTE 05** | Reconexão de sessão | **APROVADO** | Geração e leitura de QR Code validada com auto-criação de socket anti-zombie (DEC-484). |
| **TESTE 06** | Contato existente (sem duplicidade) | **APROVADO** | Deduplicação por telefone E.164 em `chat_threads` e `customers_crm` validada. |
| **TESTE 07** | Novo lead criado a partir do chat | **APROVADO** | `convertChatThreadToCrmLead` cria contato na carteira e abre lead no funil. |
| **TESTE 08** | Movimentação no Kanban | **APROVADO** | `persistLeadMove` atualiza a etapa do lead e registra atividade na linha do tempo. |
| **TESTE 09** | Criação de proposta de viagem | **APROVADO** | Proposta gerada com passageiros, valores e itens inclusos via `travel-proposal-conversion`. |
| **TESTE 10** | Contagem de histórico comercial | **APROVADO** | Dossiê 360° calcula propostas abertas, recusadas e aprovadas a partir de dados reais. |
| **TESTE 11** | Anexo de documentos ao cliente | **APROVADO** | Upload para bucket seguro com associação de `customer_id` via `createCustomerDocument`. |
| **TESTE 12** | Cobrança simulada e faturas | **APROVADO** | Registro de títulos a receber e status de pagamento via `financial-ledger.functions.ts`. |
| **TESTE 13** | Fluxo de chatbot por regras | **APROVADO** | Mensagens de boas-vindas e macros de nicho despachadas conforme regras comerciais. |
| **TESTE 14** | Consulta do Copilot de IA | **APROVADO** | Consulta contextual de roteiros e políticas sem alucinação de dados cadastrais. |
| **TESTE 15** | Execução de Squad multiagente | **BLOQUEADO** | Infraestrutura funcional em testes unitários, porém sem trigger de entrada automático no SAC. |
| **TESTE 16** | Transferência de IA para atendente humano | **APROVADO** | `metadata.handoff_mode` atualizado para `human_active` com desativação do bot. |
| **TESTE 17** | Rastreio de origem de campanha | **APROVADO** | Parâmetros UTM e referência de anúncio salvos no cadastro do lead. |
| **TESTE 18** | Múltiplas oportunidades para o mesmo cliente | **APROVADO** | O mesmo `customer_id` possui 2+ leads simultâneos sem colisão de chaves. |
| **TESTE 19** | Concorrência de eventos e ordenação | **APROVADO** | `uq_chat_messages_thread_external_message` garante idempotência e impede duplicações. |
| **TESTE 20** | Atualização visual sem refresh | **PARCIAL** | Opera sob polling e visibilidade, mas o WebSocket Realtime sofre interrupções silenciosas por RLS. |
| **TESTE 21** | Envio e recebimento de anexos | **APROVADO** | Imagens e documentos tratados e salvos com marcadores canônicos ("[Imagem]", "[Documento]"). |
| **TESTE 22** | Isolamento de permissões multi-tenant | **APROVADO** | `assertStoreAccess` impede que operadores de uma loja visualizem conversas de outra. |
| **TESTE 23** | Idempotência e reprocessamento | **APROVADO** | Webhook ignora payloads idênticos baseando-se no hash SHA256 do corpo (`payload_hash`). |
| **TESTE 24** | Jornada comercial completa | **APROVADO** | Lead criado -> proposta emitida -> contrato gerado -> fatura registrada -> SAC integrado. |

---

## 2. Detalhamento dos Testes Críticos Reprovados ou Parciais

### TESTE 03 — Mensagem enviada pelo celular do lojista
- **Pré-condições:** Instância WhatsApp pareada via QR Code. Lojista com o aplicativo WhatsApp aberto no smartphone.
- **Procedimento:** Enviar mensagem de texto para o cliente diretamente pelo smartphone.
- **Resultado Esperado:** A mensagem enviada deve aparecer no chat do Waesy como balão de saída (`is_staff_reply: true`).
- **Resultado Observado:** A mensagem não aparece no sistema Waesy.
- **Causa Raiz Comprovada:** O normalizador em `whatsapp-provider-webhook.server.ts` aborta na linha 167:
  ```typescript
  if (message.fromMe || !message.phone) return { ignored: "outgoing_or_without_phone" };
  ```
- **Recomendação:** Remover o descarte de `fromMe: true` e persistir a mensagem vinculada ao número remoto (`remoteJid`).

### TESTE 02 — Mensagem enviada pelo sistema quando o socket está em código 403
- **Pré-condições:** Sessão desconectada no smartphone, mas processo da Evolution API ativo na VPS.
- **Procedimento:** Atendente clica em "Enviar" no chat do Waesy.
- **Resultado Esperado:** Mensagem entregue ao cliente ou notificação explícita imediata de falha de conexão.
- **Resultado Observado:** Mensagem fica retida em `whatsapp_outbox` como `dead_letter`, e o atendente não é alertado de que o aparelho foi desconectado.
- **Causa Raiz Comprovada:** A Evolution API mantém `state: "open"` em cache de memória e só relata o código 403 em `/instance/fetchInstances`.
- **Recomendação:** Implementar checagem ativa de `disconnectionReasonCode` no health-check periódico.
