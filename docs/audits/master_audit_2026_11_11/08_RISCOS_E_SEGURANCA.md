# DOCUMENTO 08 — MATRIZ DE RISCOS, CONFORMIDADE LGPD E SEGURANÇA
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Comitê Técnico:** Especialista em Segurança, Privacidade e LGPD  

---

## 1. Classificação de Riscos Identificados

| ID | Risco Técnico / Operacional | Severidade | Probabilidade | Impacto Operacional | Mitigação Atual / Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Túnel Efêmero (`trycloudflare.com`)** | **P0 (Crítico)** | Alta | Queda total da comunicação com WhatsApp se a VPS reiniciar ou o túnel expirar. | Criar Cloudflare Tunnel nomeado com credencial fixa no DNS corporativo. |
| **RSK-02** | **Socket Zombie 403 sem Alerta** | **P0 (Crítico)** | Média | Atendentes enviam mensagens que caem em `dead_letter` sem saber que o WhatsApp foi desconectado. | Health-check ativo com leitura de `disconnectionReasonCode`. |
| **RSK-03** | **Descarte de Mensagens do Aparelho** | **P1 (Alto)** | Contínua | Histórico fragmentado e perda de contexto comercial das mensagens digitadas no celular. | Remover filtro excludente `fromMe` e persistir como `is_staff_reply`. |
| **RSK-04** | **Falha de Entrega Realtime por RLS** | **P1 (Alto)** | Média | Atendente precisa recarregar a página para ver mensagens novas recebidas de clientes. | Injetar `store_id` em `chat_messages` ou usar canal broadcast autenticado. |
| **RSK-05** | **Bloqueio de Número por Automação Abusiva** | **P1 (Alto)** | Baixa | Risco de banimento do número pela Meta caso ocorram disparos massivos via Baileys. | Respeitar rate limits estritos (máx. 1 msg a cada 3-5s) e incentivar Meta Cloud API. |
| **RSK-06** | **Vazamento de Documentos de Passageiros** | **P0 (Crítico)** | Baixa | Acesso indevido a passaportes e RGs anexados em viagens. | Políticas RLS restritivas em `customer_documents` vinculadas a `store_id` e papel gestor. |

---

## 2. Conformidade LGPD & Criptografia de Conversas

### 1. Criptografia em Repouso por Thread (`conversation-crypto.server.ts`)
- O conteúdo sensível das mensagens é cifrado utilizando envelopes criptográficos de 2 níveis (DEK/KEK) com chaves protegidas no servidor.
- Mensagens excluídas pelo cliente no WhatsApp (`messages.delete`) **NÃO** são apagadas do banco físico (Invariante B.33 Anti-Fake). O sistema grava a flag `is_revoked_by_sender: true` com timestamp de revogação, mantendo o histórico intacto para fins de auditoria jurídica e resolução de litígios contratuais da agência.

### 2. Governança de Consentimento (Opt-In)
- Leads capturados via anúncios ou formulários possuem registro explícito de consentimento e canal de origem (`metadata.consent_given_at`).
- Opção de opt-out (descadastramento) suportada nas automações de marketing da loja.

---

## 3. Segurança dos Webhooks & HMAC

- **Webhook da Evolution API:** Protegido por API Key mestre no header `apikey` e validação de existência atômica da instância no tenant correspondente.
- **Webhook da Meta Cloud API & Lead Ads:** Protegido por handshake `hub.challenge` e verificação de assinatura criptográfica HMAC SHA256 (`X-Hub-Signature-256`) utilizando o App Secret da Meta.
- **Prevenção de Ataques de Repetição (Replay):** O sistema calcula o hash SHA256 do corpo da requisição (`payload_hash`) e utiliza chave composta com índice único em `whatsapp_provider_webhook_events(provider, instance_id, event_key)`.
