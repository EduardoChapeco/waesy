# W7.1 — Contrato canônico de provider WhatsApp

**Data:** 2026-10-07  
**Branch/HEAD inicial:** `audit/full-remediation-20261007` / `fc8f9fc3`  
**Base:** `origin/main` / `919c8688`  
**Finding:** provider oficial divergente entre credencial (`whatsapp_cloud_api`) e canal operacional (`meta_cloud_api`).  
**Paths autorizados:** `src/routes/api.webhooks.whatsapp.ts`, novo `src/services/whatsapp-provider-contract.ts`, novo teste de contrato e este ledger.

## Reprodução

O webhook consultava `integration_credentials` com `whatsapp_cloud_api`, mas propagava o mesmo literal para `resolveWhatsAppIdentity`, leads, mensagens e `dispatchWhatsAppInboundFlows`, enquanto a instância oficial em `whatsapp_channel_instances` e os adapters outbound usam `meta_cloud_api`. Isso cria identidades, flows e outbox que não conseguem casar com a instância operacional.

## Decisão

Manter `whatsapp_cloud_api` somente como namespace histórico da tabela de credenciais e traduzir explicitamente para `meta_cloud_api` ao entrar no domínio operacional de canal, identidade, mensagem, lead e flow. Não alterar providers Evolution/WaSender nem a enumeração do banco nesta microfase.

## Critérios

A regressão deve provar os dois namespaces distintos e impedir o retorno do literal antigo no webhook. Typecheck, testes focados, suíte aplicável, build e `git diff --check` devem passar. Integração de banco/provider real permanece não verificada e não será simulada.
