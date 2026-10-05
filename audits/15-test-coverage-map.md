# Onda 15 — Mapeamento de Cobertura de Testes Automatizados

## 1. Topologia da Suíte de Testes (Vitest v4.1)

O repositório possui **110+ suítes de teste automatizadas** cobrindo contratos de BFF, isolamento de RLS, motores de mineração, integridade financeira e regras de negócio.

| Domínio de Teste | Suítes Representativas | Invariantes Validadas |
| :--- | :--- | :--- |
| **Engines de Mineração** | `industrial-crawlers.test.ts`, `pncp-and-indicators.test.ts`, `mining-forensic-quality.test.ts` | Zero dados sintéticos, extração Schema.org, similaridade Jaccard, circuit breaker |
| **Segurança & RLS** | `rls-cross-tenant-isolation.test.ts`, `finance-rbac-security.test.ts`, `marketplace-compliance.test.ts` | Isolamento estrito entre lojistas, bloqueio de vazamento de tenant |
| **Agentes & Copilot** | `autonomous-copilot.test.ts`, `ai-core-gateway.test.ts`, `mcp-server.test.ts` | Roteamento EARS, orquestração de ferramentas, cache SHA-256 |
| **Comércio & Checkout**| `marketplace-checkout.functions.test.ts`, `hybrid-checkout-and-omni-cart.test.ts` | Idempotência de transações, cálculo de frete, regras de split |
| **Logística & Entregas**| `delivery-pin.test.ts`, `wms.test.ts`, `dynamic-surge-pricing` | Confirmação de PIN, picking de estoque e tarifação dinâmica |
| **Design System & A11y**| `scripts/design-lint.test.mjs`, `accessibility-wcag.test.ts` | Catraca de CI contra classes arbitrárias e conformidade WCAG AA |

---

## 2. Resultado da Amostragem de Execução (Fevereiro/Outubro 2026)
- **`vitest run src/services/mining/`**: 12/12 testes passando em 2.50s com 100% de sucesso.
- **Design Lint (`scripts/design-lint.mjs`)**: 0 violações bloqueantes na catraca, mantendo a baseline histórica estável.
