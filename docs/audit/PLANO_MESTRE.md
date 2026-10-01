# PLANO MESTRE CONSOLIDADO — ECOSSISTEMA WAESY

**Versão:** 3.0.0  
**Data:** 2026-10-01  
**Autoridade:** PROMPT ZERO & MÉTODO 8A  
**SSOT Única:** Backlog Consolidado de Fases e Ondas  

---

## 1. Princípios da Reconciliação
1. **Dono Único por Capacidade:** Nenhuma funcionalidade é implementada em duplicidade.
2. **Zero Mocks:** Toda tela consome tabelas reais do Supabase via BFF server functions.
3. **Contrato de Ponta a Ponta:** Banco → Tipos → Schema Zod → BFF → Cliente → MCP Tool.
4. **Segurança no Servidor:** RLS deny-by-default e guarda de tenant em 100% das mutações.
5. **Nativo por Plataforma:** Compact (<600px) e Expanded (>=840px) com safe area e touch targets >= 44px.

---

## 2. Backlog Único Consolidado (R01 a R64)

| ID | Título | Origem | Tipo | Módulo | Dono Único | Depende de | Risco | Critério de Pronto (Binário) | Check que Prova | Onda | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R01** | Censo de Arquivos e Mapa de Dependências | Plano Antigo (Fase 0) | refatoração | platform/core | engineering-auditor | - | Baixo | 1.561 arquivos mapeados sem links quebrados | C37 | 0 | **VERIFICADO** |
| **R02** | Purga de Mocks e Fallbacks Encenados | Auditoria (Fase 0) | refatoração | platform/core | engineering-auditor | R01 | Médio | Zero mocks ou imagens estáticas simuladas | C18 | 0 | **VERIFICADO** |
| **R03** | Auditoria de Segurança RLS Multi-Tenant | Plano Antigo (Fase 7) | segurança | backend/supabase | security-guard | R01 | Alto | 550 tabelas com RLS habilitado | C30, C31 | 0 | **VERIFICADO** |
| **R04** | Reconciliação de 445 Migrations | Plano Antigo (Fase 8) | contrato | backend/supabase | data-contract-auditor | R03 | Alto | Supabase em paridade total sem drift | C39 | 0 | **VERIFICADO** |
| **R05** | Deploy de Produção Cloudflare Pages | Plano Antigo (Fase 8) | integração | devops/cloudflare | platform-lead | R04 | Médio | Nitro Worker ativo com HTTP 200 OK | C40 | 0 | **VERIFICADO** |
| **R06** | Revogação de Selos Falsos e Reavaliação | Auditoria Operação Verdade | refatoração | platform/core | red-team-board | R02 | Alto | 10 selos revogados e 4 rebaixados | C43 | 0 | **VERIFICADO** |
| **R07** | Desarme e Purga de Scripts da Raiz | Onda 1 (Bloco 2) | refatoração | platform/core | engineering-auditor | R06 | Baixo | Raiz limpa sem detritos temporários | C37 | 1 | **VERIFICADO** |
| **R08** | Desarme da Causa Raiz do Design Lint | Onda 1 (Bloco 2) | UI/UX | design/system | design-system-architect | R07 | Médio | Ratchet baseline reduzido sem quebrar CI | C01-C04 | 1 | **VERIFICADO** |
| **R09** | Primitivas Canônicas de Layout (Page, Shell) | Onda 1 (Bloco 2) | UI/UX | components/layout | component-craftsman | R08 | Médio | `Page` e `Shell` com 100dvh e zero lint errors | C10, C12 | 1 | **VERIFICADO** |
| **R10** | Primitivas de Estrutura (Section, Stack, Grid, Toolbar, BottomBar) | Onda 1 (Bloco 2) | UI/UX | components/layout | component-craftsman | R09 | Médio | 0 violações em DL-01 a DL-30 | C06-C08 | 1 | **VERIFICADO** |
| **R11** | Primitivas Canônicas de Formulário (Field, FormRow, FieldGroup, FormError) | Onda 1 (Bloco 2) | UI/UX | components/forms | component-craftsman | R10 | Médio | Acessibilidade WCAG 2.2 AA e 0 violações | C07, C16 | 1 | **VERIFICADO** |
| **R12** | Piloto de Migração Cirúrgica: `workspace.contratos.novo.tsx` | Onda 1 (Bloco 2) | UI/UX | routes/workspace | flow-architect | R11 | Alto | Tela 100% migrada com zero violações DL | C01-C36 | 1 | **VERIFICADO** |
| **R13** | Cirurgia de Monólito: `workspace.catalogo.produtos.novo.tsx` | Onda 1 (Bloco 2) | UI/UX | routes/workspace | component-craftsman | R12 | Alto | Decomposição em seções com primitivas | C01, C09 | 1 | **EM ANDAMENTO** |
| **R14** | Cirurgia de Monólito: `_store.conta.classificados.novo.tsx` | Onda 1 (Bloco 2) | UI/UX | routes/store | flow-architect | R13 | Alto | Decomposição do arquivo de 9k linhas | C01, C10 | 1 | **NÃO INICIADO** |
| **R15** | Erradicação de Cores Literais Hex/RGB Restantes | Onda 2 (Bloco 2) | UI/UX | design/system | visual-auditor | R14 | Médio | Zero hexadecimais em `src/components` | C01 | 2 | **NÃO INICIADO** |
| **R16** | Eliminação de Classes Arbitrárias com Colchetes | Onda 2 (Bloco 2) | UI/UX | design/system | visual-auditor | R15 | Médio | Zero classes `-[...]` fora de allowlist | C04 | 2 | **NÃO INICIADO** |
| **R17** | Adequação de Todos os Alvos de Toque para 44px | Onda 2 (Bloco 2) | UI/UX | design/system | a11y-guardian | R16 | Médio | Alvos interativos com min-h-11 no mobile | C08 | 2 | **NÃO INICIADO** |
| **R18** | Piso de Foco Visível (`focus-visible`) em Toda a UI | Onda 2 (Bloco 2) | UI/UX | design/system | a11y-guardian | R17 | Médio | 100% dos controles operáveis por teclado | C07 | 2 | **NÃO INICIADO** |
| **R19** | Erradicação Total do AI-Smell Textual | Onda 2 (Bloco 2) | UI/UX | platform/content | content-editor | R18 | Baixo | Títulos <= 6 palavras, zero explicações | C11 | 2 | **NÃO INICIADO** |
| **R20** | Redução Periódica da Catraca de Design Lint | Onda 2 (Bloco 2) | refatoração | design/system | platform-lead | R19 | Médio | Abaixamento permanente da baseline em 5k | C01-C30 | 2 | **NÃO INICIADO** |
| **R21** | Isolamento de Tenant em Consultas e Agregados | Onda 3 (Bloco 3) | segurança | backend/supabase | security-guard | R03 | Alto | Zero vazamento de dados entre empresas | C31 | 3 | **NÃO INICIADO** |
| **R22** | Auditoria de Permissões por Papel no BFF | Onda 3 (Bloco 3) | segurança | backend/bff | security-guard | R21 | Alto | Mutações bloqueadas no servidor por papel | C30 | 3 | **NÃO INICIADO** |
| **R23** | Auditoria de RLS nos Buckets de Storage | Onda 3 (Bloco 3) | segurança | backend/storage | storage-auditor | R22 | Alto | Buckets privados isolados por tenant | C32 | 3 | **NÃO INICIADO** |
| **R24** | Higienização de Sessão Multi-Perfil | Onda 3 (Bloco 3) | segurança | auth/session | state-sanitizer | R23 | Alto | Zero vazamento de contexto civil/empresa | C36 | 3 | **NÃO INICIADO** |
| **R25** | Trilha de Auditoria e Logs de Ações Sensíveis | Onda 3 (Bloco 3) | segurança | backend/audit | security-guard | R24 | Médio | Registro em `domain_events` de mutações | C21 | 3 | **NÃO INICIADO** |
| **R26** | Sincronização da Cadeia Única DB → UI → MCP | Onda 4 (Bloco 4) | contrato | platform/core | data-contract-auditor | R12 | Alto | Zero campos órfãos ou faltantes | C16, C17 | 4 | **NÃO INICIADO** |
| **R27** | Schemas Zod Estritos em Mutações de Catálogo | Onda 4 (Bloco 4) | contrato | commerce/catalog | component-craftsman | R26 | Médio | Validação estrita de atributos e variantes | C16 | 4 | **NÃO INICIADO** |
| **R28** | Schemas Zod Estritos em Pedidos e Checkout | Onda 4 (Bloco 4) | contrato | commerce/checkout| flow-architect | R27 | Alto | Validação de itens, frete e pagamento | C16, C19 | 4 | **NÃO INICIADO** |
| **R29** | Schemas Zod Estritos em CRM e Leads | Onda 4 (Bloco 4) | contrato | crm/leads | flow-architect | R28 | Médio | Sanitização de dados de contato e funil | C16, C27 | 4 | **NÃO INICIADO** |
| **R30** | Regeneração Tipada Automática do Supabase | Onda 4 (Bloco 4) | contrato | backend/supabase | platform-lead | R29 | Médio | Tipos TypeScript sincronizados via CLI | C37 | 4 | **NÃO INICIADO** |
| **R31** | Fluxo Transacional Turismo Ponta a Ponta | Onda 5 (Bloco 5) | feature | tourism/core | flow-architect | R30 | Alto | Proposta → Reserva → Voucher → Embarque | C23-C26 | 5 | **NÃO INICIADO** |
| **R32** | Emissão de Vouchers com Validação por QR Code | Onda 5 (Bloco 5) | feature | tourism/voucher | flow-architect | R31 | Médio | Rota pública `/v/$token` com leitura offline | C25 | 5 | **NÃO INICIADO** |
| **R33** | Manifesto de Embarques ANTT e Lista de Passageiros | Onda 5 (Bloco 5) | feature | tourism/boarding | flow-architect | R32 | Alto | Relatório oficial para fiscalização rodoviária | C24 | 5 | **NÃO INICIADO** |
| **R34** | Linha do Tempo 360 do Passageiro no CRM | Onda 5 (Bloco 5) | feature | crm/customer360 | flow-architect | R33 | Médio | Histórico consolidado de viagens e créditos | C22, C27 | 5 | **NÃO INICIADO** |
| **R35** | Integração Financeira Automática com ASAAS | Onda 5 (Bloco 5) | feature | finance/gateway | platform-lead | R34 | Alto | Cobrança Pix e Cartão com split e webhook | C19 | 5 | **NÃO INICIADO** |
| **R36** | Vínculo Bilateral CRM ↔ Vendas e Catálogo | Onda 6 (Bloco 6) | integração | platform/core | flow-architect | R35 | Médio | Cliente compra e pontua no CRM sem ação manual | C22 | 6 | **NÃO INICIADO** |
| **R37** | Vínculo Bilateral Estoque ↔ Vendas e PDV | Onda 6 (Bloco 6) | integração | commerce/stock | component-craftsman | R36 | Alto | Baixa automática de estoque em compras PDV/Loja | C20 | 6 | **NÃO INICIADO** |
| **R38** | Vínculo Bilateral Eventos ↔ Embarques e Turismo | Onda 6 (Bloco 6) | integração | events/core | flow-architect | R37 | Médio | Excursão vinculada ao ingresso do evento | C23 | 6 | **NÃO INICIADO** |
| **R39** | Vínculo Bilateral Classificados ↔ Chat e Contatos | Onda 6 (Bloco 6) | integração | classifieds/chat| flow-architect | R38 | Médio | Mensagem no anúncio gera lead no CRM da loja | C27 | 6 | **NÃO INICIADO** |
| **R40** | Barramento Central de Eventos de Domínio | Onda 6 (Bloco 6) | integração | platform/events | platform-lead | R39 | Alto | Eventos atômicos auditados com idempotência | C21 | 6 | **NÃO INICIADO** |
| **R41** | Design Nativo: Workspace Shell e Navegação | Onda 7 (Bloco 7) | UI/UX | workspace/shell | design-system-architect | R40 | Alto | Menu inferior mobile e dock desktop nativo | C08, C13 | 7 | **NÃO INICIADO** |
| **R42** | Design Nativo: Vitrine Pública e Feed | Onda 7 (Bloco 7) | UI/UX | store/vitrine | visual-auditor | R41 | Alto | Lista estilo WhatsApp limpa sem poluição | C10, C11 | 7 | **NÃO INICIADO** |
| **R43** | Design Nativo: Carrinho e Checkout | Onda 7 (Bloco 7) | UI/UX | store/checkout | flow-architect | R42 | Alto | Ação primária no terço inferior da viewport | C08, C19 | 7 | **NÃO INICIADO** |
| **R44** | Design Nativo: Gestão de Pedidos e Kanban | Onda 7 (Bloco 7) | UI/UX | workspace/kanban| component-craftsman | R43 | Médio | Drag and drop fluido com feedback de toque | C12, C20 | 7 | **NÃO INICIADO** |
| **R45** | Design Nativo: Painel de Curadoria Admin Master | Onda 7 (Bloco 7) | UI/UX | admin/master | visual-auditor | R44 | Médio | Tabelas densas monocromáticas font-mono | C05, C06 | 7 | **NÃO INICIADO** |
| **R46** | MCP Registry: Ferramentas Operacionais de Turismo | Onda 8 (Bloco 8) | MCP | mcp/registry | platform-lead | R45 | Médio | 10 ferramentas de turismo expostas | C28 | 8 | **NÃO INICIADO** |
| **R47** | MCP Registry: Ferramentas de CRM e Lead Scoring | Onda 8 (Bloco 8) | MCP | mcp/registry | platform-lead | R46 | Médio | Ingestão e qualificação de contatos | C29 | 8 | **NÃO INICIADO** |
| **R48** | MCP Registry: Ferramentas de Catálogo e Produtos | Onda 8 (Bloco 8) | MCP | mcp/registry | platform-lead | R47 | Médio | Consulta e atualização de preços e itens | C28 | 8 | **NÃO INICIADO** |
| **R49** | MCP Registry: Ferramentas de Atendimento e Suporte | Onda 8 (Bloco 8) | MCP | mcp/registry | platform-lead | R48 | Médio | Resposta a tickets e consulta de regras | C29 | 8 | **NÃO INICIADO** |
| **R50** | WebMCP: Endpoint Canônico com Autenticação por Chave | Onda 8 (Bloco 8) | MCP | mcp/server | security-guard | R49 | Alto | Protocolo MCP via SSE / JSON-RPC seguro | C33 | 8 | **NÃO INICIADO** |
| **R51** | Porta Única Server-Side para Inteligência Artificial | Onda 9 (Bloco 9) | IA | ai/gateway | platform-lead | R50 | Alto | Roteamento por tarefa com pool de chaves | C33 | 9 | **NÃO INICIADO** |
| **R52** | Telemetria de IA: Registro de Custo, Latência e Tokens | Onda 9 (Bloco 9) | IA | ai/telemetry | engineering-auditor | R51 | Médio | Gravação de tokens gastos por workspace | C21 | 9 | **NÃO INICIADO** |
| **R53** | Circuit Breaker e Fallback Resiliente entre Provedores | Onda 9 (Bloco 9) | IA | ai/resilience | platform-lead | R52 | Alto | Fallback transparente OpenAI ↔ Groq ↔ Gemini | C34 | 9 | **NÃO INICIADO** |
| **R54** | SDR de Vendas Conversacional Baseado em RAG Local | Onda 9 (Bloco 9) | IA | ai/sdr | flow-architect | R53 | Alto | Atendimento com catálogo e cotações reais | C27 | 9 | **NÃO INICIADO** |
| **R55** | IA Studio: Geração de Minutas e Propostas | Onda 9 (Bloco 9) | IA | ai/studio | component-craftsman | R54 | Médio | Minutas geradas a partir de dados de cotação | C26 | 9 | **NÃO INICIADO** |
| **R56** | Pipeline de Testes Automatizados no Vitest | Onda 10 (Bloco 10) | teste | testing/core | engineering-auditor | R55 | Médio | Cobertura de testes unitários em BFF | C37 | 10 | **NÃO INICIADO** |
| **R57** | Testes de Regressão Visual nos 5 Viewports | Onda 10 (Bloco 10) | teste | testing/visual | visual-auditor | R56 | Médio | Validação em 320, 390, 768, 1280, 1920px | C08, C10 | 10 | **NÃO INICIADO** |
| **R58** | Testes de Carga e Concorrência Transacional | Onda 10 (Bloco 10) | teste | testing/load | platform-lead | R57 | Alto | Múltiplas compras simultâneas sem race condition | C19 | 10 | **NÃO INICIADO** |
| **R59** | CI/CD GitHub Actions com Gates Bloqueantes | Onda 10 (Bloco 10) | devops/ci | platform-lead | R58 | Alto | Bloqueio automático de merge em erro de lint | C04, C37 | 10 | **NÃO INICIADO** |
| **R60** | Auditoria Contínua de Drift de Código e Tokens | Onda 10 (Bloco 10) | devops/drift | engineering-auditor | R59 | Médio | Verificação periódica de conformidade | C43 | 10 | **NÃO INICIADO** |
| **R61** | Otimização de Core Web Vitals (LCP < 2.5s, CLS < 0.1) | Onda 10 (Bloco 10) | performance | platform/web | visual-auditor | R60 | Médio | Pré-carregamento de fontes e divisão de bundle | C15 | 10 | **NÃO INICIADO** |
| **R62** | Documentação Viva de Arquitetura e Runbooks | Onda 10 (Bloco 10) | documentação | docs/core | platform-lead | R61 | Baixo | Guias de recuperação e governança | C43 | 10 | **NÃO INICIADO** |
| **R63** | Smoke Test Ponta a Ponta de Todas as 385 Rotas | Onda 10 (Bloco 10) | teste | testing/smoke | flow-architect | R62 | Alto | Zero rotas retornando 500 ou tela branca | C38, C40 | 10 | **NÃO INICIADO** |
| **R64** | Certificação Canônica Final do Ecossistema | Onda 10 (Bloco 10) | governança | executive/board | bigtech-board | R63 | Crítico | Emissão do Selo de Produção Definitivo | C01-C43 | 10 | **NÃO INICIADO** |

---

## 3. Plano de Implementação — Motor de Anúncios e Vitrine (F01 a F48)

| Fase | Título | Bloco | Objetivo Principal | Dependência | Status |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **F01** | Inventário do Domínio de Anúncios | A | Mapeamento completo de arquivos, tabelas e rotas | - | **VERIFICADO** |
| **F02** | Matriz de Duplicidade e Dono Único | A | Definição de dono único para os 26 campos conflitantes | F01 | **VERIFICADO** |
| **F03** | Mapa de Fluxos do Anúncio | A | Desenho do ciclo ponta a ponta e corte de elos rompidos | F02 | **VERIFICADO** |
| **F04** | Mapa de Contratos do Anúncio | A | Rastreabilidade DB → TS → Zod → BFF → UI → MCP | F03 | **VERIFICADO** |
| **F05** | Diagnóstico Visual e de Quebras | A | Catalogação com arquivo:linha dos 12 casos (O01 a O12) | F04 | **VERIFICADO** |
| **F06** | Baseline e Travas | A | Congelamento de métricas e catraca de design | F05 | **VERIFICADO** |
| **F07** | Modelo Canônico da Listagem | B | Entidade unificada `UnifiedListing` e view SQL | F06 | **VERIFICADO** |
| **F08** | Ciclo de Vida e Expiração | B | Máquina de estados determinística e job de expiração | F07 | **VERIFICADO** |
| **F09** | Taxonomia por Nicho | B | Manifesto canônico de composição e seções por nicho | F08 | **VERIFICADO** |
| **F10** | Atributos Dinâmicos e Validação | B | Validação condicional e bloqueio estrito na publicação | F09 | **VERIFICADO** |
| **F11** | Vitrine e Descoberta Facetada | B | Filtros, ordenação e contratos de descoberta semântica | F10 | **VERIFICADO** |
| **F12** | Moderação e Auditoria | B | Estados de moderação com trilha e justificativa formal | F11 | **VERIFICADO** |
| **F13** | Integração com Catálogo Central | B | Sincronização e busca com Central Knowledge Engine | F12 | **VERIFICADO** |
| **F14** | SEO, Schema.org e WebMCP | B | JSON-LD estruturado por nicho e exportador de IA | F13 | **VERIFICADO** |
| **F15-F24**| Editor: Modo Rápido e Completo | C | Refatoração unificada do editor eliminando duplicidades | Bloco B | **VERIFICADO** |
| **F25-F32**| Preview Real e Página Pública | D | Live Preview em iframe isolado com postMessage | Bloco C | **PRÓXIMO ALVO** |
| **F33-F40**| Transações Geradas e Integração | E | Criação de pedido, financeiro, voucher e timeline | Bloco D | **A INICIAR** |
| **F41-F48**| Blindagem, WebMCP e CI Final | F | Paridade total via agente, testes E2E e homologação | Bloco E | **A INICIAR** |
