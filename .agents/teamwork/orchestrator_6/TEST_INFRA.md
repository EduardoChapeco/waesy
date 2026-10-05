# E2E Test Infra: Telemetria 360º & Governança Master

## Test Philosophy
- Requirement-driven, opaque-box and contract-conforming.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise + Workload Testing.

## Feature Inventory & Test Coverage
| # | Feature | Scope | Verification Channel | Tier 1 | Tier 2 |
|---|---------|-------|----------------------|:------:|:------:|
| 1 | Database Tables & RLS | M1 | Schema inspection & SQL integrity | ✓ | ✓ |
| 2 | Ingestores de Telemetria | M2 | Invariante B.25, unit test mocks | ✓ | ✓ |
| 3 | Aggregator 360º & SHA-256 | M2 | Hash verification & JSON serialization | ✓ | ✓ |
| 4 | Admin User Actions | M2 | Password reset, lock/unlock, transfer | ✓ | ✓ |
| 5 | Master Admin 7 Abas UI | M3 | Design lint ratchet & DOM structure | ✓ | ✓ |
| 6 | Civil My Activity UI | M4 | 4-state matrix, touch targets >= 44px | ✓ | ✓ |
| 7 | Production Deploy & Smoke | M5 | `npm run build`, Cloudflare Pages HTTP | ✓ | ✓ |

## Test Runner & Validation Commands
- **Unit Tests**: `npx vitest run src/services/admin-360-governance.functions.test.ts`
- **Design Lint Ratchet**: `node scripts/design-lint.mjs --ratchet`
- **Build**: `npm run build`
- **Deploy**: `wrangler pages deploy dist --project-name usewaesy --commit-dirty=true --no-bundle`
- **Smoke Tests**: HTTP curl verification on live URLs
