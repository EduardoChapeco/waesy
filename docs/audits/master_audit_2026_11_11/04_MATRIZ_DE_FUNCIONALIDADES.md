# DOCUMENTO 04 — MATRIZ DETERMINÍSTICA DE FUNCIONALIDADES
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Taxonomia Aplicada:** Funcional | Parcialmente Funcional | Implementada, Não Validada | Apenas Interface/Mock | Quebrada | Inexistente | Bloqueada para Teste  

---

## 1. Módulo: Atendimento Omnichannel & Chat

| Recurso / Funcionalidade | Classificação | Evidência Técnica | Dependências / Pendências |
| :--- | :--- | :--- | :--- |
| **Lista de Conversas e Abas** | **FUNCIONAL** | Filtros em `workspace.atendimento.index.tsx` (Todas, Individuais, Grupos, Abertas, Aguardando, Arquivadas) operam sobre dados reais de `listChatThreads`. | Nenhuma pendência visual. |
| **Identificação de Grupos e Canais** | **FUNCIONAL** | Detecção de JIDs `@g.us` e `@newsletter` com badges visuais `<Users />` e `<Radio />`. | Concluído na DEC-486. |
| **Importação de Fotos de Perfil** | **FUNCIONAL** | Busca via `POST /chat/findContacts` indexada no metadata da thread e exibida com fallback direto. | Concluído na DEC-486. |
| **Composer de Mensagens** | **FUNCIONAL** | Segmented control "Responder (Cliente)" vs "Nota Interna (Equipe)", sanitização de tags e altura canônica de 44px. | Concluído na DEC-482. |
| **Trilho de Macros Rápidas** | **FUNCIONAL** | Semântica dinâmica por nicho (`getNicheSemantics`): Turismo com `/roteiro`, `/cotacao`, `/embarque`, `/pix`. | Concluído na DEC-479. |
| **Desconexão WhatsApp com Reset** | **FUNCIONAL** | Modal de confirmação com opção de purga local em `whatsapp_channel_instances_check1`. | Concluído na DEC-480. |
| **Adição de Múltiplos Números** | **FUNCIONAL** | Blindagem contra duplicidade em `uq_whatsapp_default_instance_per_store`. | Concluído na DEC-480. |
| **Sincronização Realtime (Inbound)** | **PARCIALMENTE FUNCIONAL** | Funciona quando o WebSocket Supabase está autenticado, mas falha se o token expirar ou a thread for desatribuída. | Exige canal broadcast ou enriquecimento de `store_id` em `chat_messages`. |
| **Sincronização de Envio pelo Celular** | **QUEBRADA** | Webhook descarta mensagens enviadas pelo próprio lojista no celular (`if (message.fromMe) return IGNORED`). | Causa raiz mapeada no Documento 03. |
| **Detecção de Sessão Revogada (403)** | **QUEBRADA** | Gateway reporta `state: "open"` mesmo quando o Baileys sofreu desconexão 403 pelo WhatsApp. | Causa raiz mapeada no Documento 03. |
| **Transferência de Conversas** | **IMPLEMENTADA, NÃO VALIDADA** | Server Function `assignChatThread` implementada com logs em `chat_thread_assignments`. | Requer teste sob múltiplos atendentes simultâneos. |
| **Respostas Rápidas Persistidas** | **FUNCIONAL** | Carregamento soberano de `chat_quick_replies` sem arrays simulados. | Concluído na Fase A. |

---

## 2. Módulo: CRM, Contatos & Kanban Comercial

| Recurso / Funcionalidade | Classificação | Evidência Técnica | Dependências / Pendências |
| :--- | :--- | :--- | :--- |
| **Dossiê 360° do Cliente** | **FUNCIONAL** | `Customer360Sidebar` exibe dados cadastrais, LTV, última compra, notas e status de inadimplência via `getCustomer360`. | Totalmente persistido. |
| **Dossiê Adaptativo para Grupos** | **FUNCIONAL** | Oculta dados fiscais e LTV quando a conversa é um grupo corporativo ou canal comunitário. | Concluído na DEC-486. |
| **Sincronização Lead ⇄ Carteira** | **FUNCIONAL** | `createLead` e `convertChatThreadToCrmLead` realizam upsert determinístico em `customers_crm`. | Concluído na DEC-483. |
| **Kanban Comercial (Oportunidades)** | **FUNCIONAL** | `workspace.comercial.tsx` com colunas de funil, drag-and-drop e persistência via `persistLeadMove`. | Totalmente operacional. |
| **Prevenção de Duplicidade de Leads** | **FUNCIONAL** | Deduplicação por telefone e e-mail via `deduplicateAndLinkLead`. | Validado no backend. |
| **Múltiplas Viagens por Cliente** | **FUNCIONAL** | Relacionamento 1:N entre `customers_crm` e `leads_crm` / `travel_proposals`. | Suportado pelo schema. |

---

## 3. Módulo: Propostas, Contratos & Financeiro

| Recurso / Funcionalidade | Classificação | Evidência Técnica | Dependências / Pendências |
| :--- | :--- | :--- | :--- |
| **Geração de Proposta de Viagem** | **FUNCIONAL** | `travel-proposal-conversion.functions.ts` gera propostas vinculadas a passageiros e roteiros. | Operacional. |
| **Emissão de Contratos Digitais** | **FUNCIONAL** | `contracts-*.functions.ts` cria envelopes com assinatura eletrônica e verificação pública. | Operacional. |
| **Cobrança Pix no Chat** | **FUNCIONAL** | Geração de payload Pix e QR Code dinâmico injetável diretamente no diálogo do atendimento. | Operacional. |
| **Conciliação de Pagamentos** | **IMPLEMENTADA, NÃO VALIDADA** | Webhooks em `api.webhooks.payments.ts` com validação de idempotência. | Necessário homologação de gateway externo. |

---

## 4. Módulo: Inteligência Artificial & Automações

| Recurso / Funcionalidade | Classificação | Evidência Técnica | Dependências / Pendências |
| :--- | :--- | :--- | :--- |
| **Porta Única de IA (Gateway)** | **FUNCIONAL** | `ai-core-gateway.functions.ts` com isolamento de tokens, prompt-shield e fallback de chaves. | Operacional. |
| **Squads de Agentes Especializados** | **IMPLEMENTADA, NÃO VALIDADA** | `ai-agent-squad-orchestrator.functions.ts` com contratos de handoff e orçamento em USD. | Falta ativação de gatilhos automáticos no SAC. |
| **Copilot de Atendimento** | **PARCIALMENTE FUNCIONAL** | Sugestão de respostas e resumo de contexto implementados, mas sem execução autônoma de ações financeiras. | Opera em modo assistido com aprovação humana. |
| **Base de Conhecimento e Busca** | **FUNCIONAL** | `copilot-internal-search.ts` com busca contextual sobre roteiros, políticas e catálogo. | Operacional. |

---

## 5. Módulo: Meta Ads, Pixel & Campanhas

| Recurso / Funcionalidade | Classificação | Evidência Técnica | Dependências / Pendências |
| :--- | :--- | :--- | :--- |
| **Ingestão de Lead Ads** | **FUNCIONAL** | `api.webhooks.meta-ads.ts` com validação HMAC SHA256 e conversão direta em oportunidades de CRM. | Operacional. |
| **Conversions API (CAPI)** | **IMPLEMENTADA, NÃO VALIDADA** | Funções de despacho em `ads.functions.ts` estruturadas para eventos server-side. | Requer preenchimento de Pixel Token da loja. |
