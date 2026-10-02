# BACKLOG_UNICO.md — Fonte Única da Verdade Transacional e Engenharia (R01)

Este documento reconcilia e consolida todos os planos mestres concorrentes da plataforma Waesy (`docs/prompts/`, `docs/audit/` e monorepo).
Nenhum item foi descartado. Todos os planos têm ID canônico, origem declarada, arquivos-alvo, dono semântico e status real com evidências.

---

## 1. Mapa Consolidado dos Planos Mestres

| Plano ID | Documento de Origem | Escopo / Missão | Total Fases | Status Geral | Provas / Evidências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PLANO-1** | `02_PROMPT_MESTRE_E_PROMPTS_P01_A_P78.md` | Protocolo Base, Contratos BFF e Catálogo Mestre | 78 Fases (P01–P78) | Concluído | Vitest 100% / Decisões DEC-001 a DEC-080 |
| **PLANO-2** | `03_PLANO_MOTOR_DE_ANUNCIOS_E_VITRINE_F01_A_F48.md` | Motor de Anúncios Unificado, Preview Real e Vitrine | 48 Fases (F01–F48) | Concluído e Homologado | DEC-086 / Migração 20261221 / View ativa |
| **PLANO-3** | `04_PLANO_3_MOTOR_DE_OFERTAS_E_NICHOS.md` | Nichos, 11 Blocos, Estoque Ledger e Motor de Preço | 72 Fases (G01–G72) | Concluído e Homologado | DEC-087 / DEC-088 / 38 testes verdes |
| **PLANO-4** | `05_SUPER_PROMPT_OPERACAO_VERDADE_UNICA.md` | Operação Verdade Única, Erradicação de Remendos | 64 Fases (R01–R64) | **EM EXECUÇÃO ATIVA** | Bloco 1 iniciado (R01–R06) |
| **PLANO-5** | `06_PROMPT_ESTRUTURA_ESCALA_OPERACAO_BIGTECH.md` | Governança BigTech, Telemetria e Escala | 40 Fases | Na Fila | Planejado após R64 |

---

## 2. Detalhamento do Plano Ativo: OPERAÇÃO VERDADE ÚNICA (R01 a R64)

### Bloco 1 — Reconciliação e Verdade Única (R01–R06)
- [x] **R01**: Leitura dos planos legados e unificação estrita em `docs/canonico/BACKLOG_UNICO.md`. *(Concluído)*
- [x] **R02**: Reabertura e saneamento da fila e selos de meta-trabalho sem prova real. *(Concluído)*
- [x] **R03**: Mapeamento da proporção meta-trabalho vs produto no histórico de auditoria. *(Concluído)*
- [x] **R04**: Triagem de entregas com impacto visível e funcional para o usuário final. *(Concluído)*
- [x] **R05**: Matriz de rotas das verticais do ecossistema e donos semânticos. *(Concluído)*
- [x] **R06**: Consolidação da SSOT em `BACKLOG_UNICO.md` e `ESTADO.json`. *(Concluído)*

### Bloco 2 — O Lint Engolido e o Design System (R07–R14) — CONCLUÍDO
- [x] **R07**: Diagnóstico do mecanismo de `--ratchet` e baseline do script `design-lint.mjs`. *(Concluído)*
- [x] **R08**: Triagem das 38k violações por severidade e módulo (`components/app`, `routes`, `ui`). *(Concluído)*
- [x] **R09**: Eliminação das violações P0 e P1 no módulo crítico `src/components/commerce/`. *(Concluído)*
- [x] **R10**: Expansão de primitivas de layout (`CanonicalPage`, `CanonicalShell`, `CanonicalSection`, etc.). *(Concluído)*
- [x] **R11**: Expansão de primitivas de formulário e CMS (`CanonicalField`, `CanonicalFormRow`, etc.). *(Concluído)*
- [x] **R12**: Piloto completo de migração em `src/components/commerce/` (0 violações em 4 arquivos). *(Concluído)*
- [x] **R13**: Densidade móvel (390px), alvos de toque >= 44px (`h-11`) e `motion-reduce:animate-none`. *(Concluído)*
- [x] **R14**: Portão estrito de lint: tolerância zero a baseline permissivo em arquivos alterados (`--changed`). *(Concluído)*

### Bloco 3 — Monólitos de Rota (R15–R20) — EM ANDAMENTO
- [x] **R15**: ALVO: `workspace.catalogo.produtos.novo.tsx` (1.644 para 251 linhas, redução de 85%). *(Concluído)*
- [x] **R16**: ALVO: `workspace.catalogo.produtos.$id.tsx` (1.705 para 296 linhas, redução de 82%). *(Concluído)*
- [x] **R17**: ALVO: `_store.classificados.$id.tsx` (1.829 para 255 linhas, redução de 86%, 0 violações de lint). *(Concluído)*
- [x] **R18**: ALVO: `_store.classificados.index.tsx` (reduzido para 227 linhas; 8 componentes catalog criados; 0 violações lint changed). *(Concluído — commit e8f8fd0e)*
- [x] **R19**: Varredura de todos os arquivos de rota acima de 500 linhas. *(Concluído — 73 rotas identificadas, top monolito: 9.285L)*
- [x] **R20**: Regra de composição de página e verificador automático no CI. *(Concluído — `scripts/check-route-size.mjs`, gate 300L/250L integrado em `check:canonical`)*

### Bloco 4 — Duplicação e Dono Único (R21–R28) — CONCLUÍDO
- [x] **R21**: Dono único de parcelamento e pagamento. *(Concluído — `src/lib/payment/installment-calculator.ts`)*
- [x] **R22**: Dono único de NCM/CEST/CFOP/IBS. *(Concluído — `src/lib/fiscal/ncm-registry.ts`)*
- [x] **R23**: Dono único de preço, comparativo, custo, margem e sinal. *(Concluído — `src/lib/pricing/price-calculator.ts`)*
- [x] **R24**: Dono único de estoque, agenda e capacidade. *(Concluído — `src/services/canonical-stock-ledger.functions.ts`)*
- [x] **R25**: Dono único de galeria, capa e mídia. *(Concluído — `src/lib/media/gallery-manager.ts`)*
- [x] **R26**: Dono único de inclusos, exclusos, políticas e FAQ. *(Concluído — `src/lib/policies/cancellation-policy-registry.ts`)*
- [x] **R27**: Kill list com mapa de migração de dados e reversão. *(Concluído — `KILL_LIST_R27` em cancellation-policy-registry.ts)*
- [x] **R28**: Verificador de duplicidade no CI. *(Concluído — `scripts/check-duplication.mjs`, 9/9 campos canônicos aprovados)*

### Bloco 5 — Metamorfose e Nichos (R29–R36) — EM ANDAMENTO
- [x] **R29**: Inventário completo dos mecanismos concorrentes de template. *(Concluído — DEC-095)*
- [ ] **R30**: Eleger dono único da metamorfose e sanitizar concorrentes. *(Em andamento)*
- [ ] **R31**: `product-field-registry.ts` como coração de padronização de campos por nicho.
- [ ] **R32**: Alinhar `permission-registry.ts` e `route-registry.ts` com a capacidade real.
- [ ] **R33**: Matriz nicho × arquétipo de oferta canônica.
- [ ] **R34**: Templates coerentes — filtro estrito por nicho na UI.
- [x] **R35**: Biblioteca semântica por nicho, eliminando hardcode de texto. *(Concluído — `src/lib/ad-engine/niche-semantic-library.ts`)*
- [x] **R36**: Biblioteca de nichos como dado puro, não como código. *(Concluído — `src/lib/ad-engine/niche-data-registry.ts`)*

---

## 3. Matriz de Arquétipos e Nichos Canônicos (Consolidada do Plano 3)

| Nicho | Arquétipos Habilitados | Arquétipo Default | Documento Emitido | Órgão Regulador |
| :--- | :--- | :--- | :--- | :--- |
| **Turismo & Viagens** | A07, A08, A10, A13, A04 (opc), A15 (opc) | A07 (Pacote) | Voucher / Contrato Embratur | Cadastur / MTur |
| **Varejo & Comércio** | A01, A02, A03, A04, A06 (opc) | A01 (Produto Simples) | Danfe NF-e | Inmetro / Procon / CDC |
| **Mercado & Perecíveis** | A01, A04, A14, A03 (opc), A06 (opc) | A14 (Varejo de Consumo) | Cupom NFC-e | Anvisa / MAPA |
| **Serviços & Especialistas** | A07, A08, A09, A15, A04 (opc), A06 (opc) | A08 (Com Agendamento) | Ordem de Serviço (OS) | Conselhos de Classe |
| **Imóveis & Real Estate** | A10, A11, A12, A09 (opc) | A12 (Venda Alto Valor) | Contrato de Locação / Escritura | CRECI / Cofeci |
| **Veículos & Automotivo** | A10, A12, A04 (opc), A06 (opc), A11 (opc) | A12 (Venda Alto Valor) | CRLV / Contrato de Locação | Detran / Senatran |
| **Produtos Digitais** | A05, A06, A03 (opc), A13 (opc) | A05 (Produto Digital) | Chave Serial / Voucher de Acesso | CDC Art. 49 / ABED |
