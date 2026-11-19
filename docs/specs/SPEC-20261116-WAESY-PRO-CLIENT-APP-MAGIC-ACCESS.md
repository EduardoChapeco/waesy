# SPEC-20261116-WAESY-PRO-CLIENT-APP-MAGIC-ACCESS

**Status:** Aprovada para Execucao End-to-End  
**Data (ISO):** 2026-11-16  
**Modulos:** Waesy Pro App da Empresa (`/app/$slug`), Desacoplamento de `/conta` Marketplace, `store_app_client_tokens`, Atendimento C360 (`Customer360Sidebar`, `C360ProfileAndDocsView`), Fichas de Clientes (`workspace.clientes.$id`), Cobrancas/Carnes (`receivables.functions.ts`), Portal do Cliente (`AppClientPortalTab`)  
**Pre-requisitos Normativos:** `AGENTS.md` (B.1-B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`

---

## 1. Requisitos em Sintaxe EARS

- **[EARS-CA-01] Desacoplamento Total do Link App do Cliente:**  
  When building `storeInfo.portal_url`, sidebar fallback props, or WhatsApp payment/portal links for a company store (`Customer360Context`, `Customer360Sidebar`, `C360ProfileAndDocsView`, `generateInstallmentWhatsAppReminder`), the system shall resolve exclusively to the decoupled company Branded App URL (`/app/${slug}?tab=minha_area` via `src/lib/branded-app-links.ts`, honoring `custom_domain` only when verified/active and never `pending_dns`), never generating `/conta?loja=<slug>` or generic Waesy Marketplace `/conta` links.

- **[EARS-CA-02] Geracao Persistida de Codigo do Cliente + Magic Link Escopado:**  
  When a staff operator generates, copies, opens, or shares the Customer App link from Atendimento (`Customer360Sidebar` / `C360ProfileAndDocsView`) or Ficha do Cliente (`workspace.clientes.$id`), the system shall invoke `generateCustomerAppMagicAccessFn` (`POST` BFF com `assertStoreAccess`), persist/reuse an active row in `public.store_app_client_tokens` scoped strictly to `(store_id, customer_id/crm_customer_id/lead_id/phone/email)`, and return a short store code (`CLI-XXXX`), high-entropy `magic_token` (`wca_...`), expiration timestamp, and the direct Branded App Magic URL (`/app/${slug}?tab=minha_area&token=${magicToken}`).

- **[EARS-CA-03] Desbloqueio Direto via Magic Link e Segundo Fator por Codigo no `/app/$slug`:**  
  When a customer opens `/app/$slug` with `?token=<magicToken>` OR enters `clientCode` + second verification factor (WhatsApp digits, CPF, or registered email) in `AppClientPortalTab`, `getClientStorePortalSummaryFn` and `unlockClientStorePortalByCodeFn` shall validate active unrevoked non-expired tokens strictly matching `store_id` and return ONLY that customer's records inside `store_id`, failing closed for invalid, expired, or cross-tenant tokens.

- **[EARS-CA-04] Zero Fuga para `/conta` Marketplace dentro do `/app/$slug` + Comprovante PIX Escopado:**  
  While authenticated inside standalone `/app/$slug` (`AppClientPortalTab`), the system shall keep all navigation inside the company's App (inline order summary, inline trip details, inline ticket QR code viewer, inline contract status) and allow PIX receipt submission (`submitInstallmentProof`) under either account session OR valid `(storeId, accessToken)`, with zero links redirecting Waesy Pro clients to generic `/conta` Marketplace routes.
