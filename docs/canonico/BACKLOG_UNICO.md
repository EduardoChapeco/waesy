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

### Bloco 2 — O Lint Engolido e o Design System (R07–R14)
- [ ] **R07**: Diagnóstico do mecanismo de `--ratchet` e baseline do script `design-lint.mjs`.
- [ ] **R08**: Triagem das 38k violações por severidade e módulo (`components/app`, `routes`, `ui`).
- [ ] **R09**: Eliminação das violações P0 e P1 no módulo crítico `src/components/commerce/`.
- [ ] **R10**: Eliminação das violações P0 e P1 no módulo crítico `src/components/ad-engine/`.
- [ ] **R11**: Eliminação das violações P0 e P1 no módulo crítico `src/components/tourism/`.
- [ ] **R12**: Eliminação das violações P0 e P1 em `src/components/ui/`.
- [ ] **R13**: Saneamento de monólitos de rotas (`novo.tsx`, `index.tsx`, `$id.tsx`).
- [ ] **R14**: Portão: Zero tolerância a baseline permissivo nos módulos saneados.

### Bloco 3 — Unificação de Dono e Eliminação de Duplicidades (R15–R24)
- [ ] **R15**: Dono único de Preço e Parcelamento em toda a plataforma.
- [ ] **R16**: Dono único de Classificação Fiscal (NCM/CEST/CFOP/IBS).
- [ ] **R17**: Dono único de Disponibilidade, Estoque e Ledger Imutável.
- [ ] **R18**: Dono único de Mídia, Uploader e Aspect Ratio.
- [ ] **R19**: Unificação dos 4 mecanismos de presets (`niche-presets`, `presentation-presets`, `hotel-presets`).
- [ ] **R20**: Limpeza da raiz do repositório (eliminação de scripts de remendo soltos).
- [ ] **R21 a R24**: Consolidação das rotas do Workspace e Store sem duplicação de lógica.

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
