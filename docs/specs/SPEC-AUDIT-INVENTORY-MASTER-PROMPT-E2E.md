# SPEC-20261117: PROMPT MESTRE DE AUDITORIA, INVENTÁRIO & EXECUÇÃO CIRÚRGICA E2E

## 1. Visão Geral e Propósito
Este documento define a especificação técnica e o template do Prompt Mestre Soberano para auditar, inventariar e certificar a completude das últimas 50 fases e requisições do ecossistema Waesy. O objetivo é assegurar isolamento total entre os universos Civil e Corporativo (Workspace), implementação do Portal Selector pós-login (estilo iFood Parceiro), onboarding corporativo autônomo, conformidade estrita de Design System (Apple HIG + WCAG 2.2 AA) e 0% de débito técnico ou brechas de segurança.

---

## 2. Matriz de Inventário & Escopo dos Últimos 50 Prompts

### Módulo 1: Segregação Radical Civil ⇄ Workspace & Autenticação Seletiva
- **Portal Selector Pós-Login:** Após autenticação (e-mail, magic link, OTP), o usuário corporativo NÃO deve ser jogado na vitrine civil. Uma tela intermediária (`/auth/portal-selector` ou `/workspace/selecionar-empresa`) lista os painéis autorizados: Lojas/Empresas (com indicação de cargo: Owner, Gerente, Vendedor) e Perfil Pessoal/Civil.
- **Onboarding Corporativo Desacoplado:** Fluxo de criação de empresa B2B (`/onboarding/empresa`) sem criação prévia ou dependência de dados da conta civil, coletando diretamente os dados do titular e da organização (Nome Completo, CPF, Data de Nascimento, Telefone, WhatsApp, CNPJ, Razão Social, Regime Tributário).
- **Zero-Leak de Contexto:** Erradicação de `store_id: null` no Workspace, bloqueio de `TenantSwitcher` para perfis civis e garantia de que rotas civis (`/_store`, `/conta`) nunca exibam controles operacionais.

### Módulo 2: Motor Neural OmniMatch & MatchTravel
- **Schema & pgvector:** Tabelas `match_deck_templates`, `match_deck_cards`, `match_visitor_brains`, `match_time_swipes` com `hesitation_ms`, embeddings L2 e RPC `match_next_cards_batch`.
- **Física Nativa 60fps:** Componente `OmniMatchDeckView` com `PointerEvents`, animação fluida, botões de ação >= 44px e stitch determinístico para WhatsApp.
- **Integração no PWA:** Aba `omni_match` configurável pelo lojista no editor do App Próprio (`BrandedAppWorkspaceEditor`).

### Módulo 3: Comercial B2B, Carteira Rotativa & Rotas GPS
- **Hub B2B `/workspace/b2b`:** Compras por Atacado (desconto progressivo por volume e tabelas B2B) e Rotas GPS de Campo (geofence de 200m e check-in com telemetria).
- **Carteira Rotativa:** Reatribuição automática de clientes por inatividade e regras RLS para restrição de visibilidade por vendedor.

### Módulo 4: Propostas Web, Viagens & Comissões
- **Propostas Web V2:** Lâmina comercial interativa sem CORS, itinerário IATA e cards de investimento detalhados.
- **Regras Financeiras & Wooba/InfoTravel:** Split de comissões off-payroll e consolidação de cotações em tempo real.

### Módulo 5: WhatsApp CRM, Grupos & Copilot
- **Isolamento DM vs Grupos:** Segregação estrita por `thread_type` e `groupJid`.
- **Higiene de Contatos:** Eliminação de e-mails sintéticos `@sem-email.waesy.local` e rastreio de jornada Multi-Touch.

### Módulo 6: Design System, Layout Adaptativo & Qualidade
- **Bifurcação Estrita:** Mobile Native App (<600px, sem containeritis, >=92% largura útil) vs Desktop System App (>=840px, alta densidade).
- **Catraca Zero Defeitos:** 0 violações no Design Lint (`DL-01` a `DL-32`), 0 tipos duplicados e 100% de testes aprovados.
