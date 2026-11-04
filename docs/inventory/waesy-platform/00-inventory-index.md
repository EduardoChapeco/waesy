# Inventário Mestre Integral da Plataforma Waesy
**Documento Central de Governança, Arquitetura e Engenharia Reversa**
*Data da Auditoria: 2026-11-03 | Versão: 2.0.0-FORENSIC-VALIDATED | Status: Validado e Aprofundado*

---

## 1. Missão e Metodologia Forense
Este inventário técnico, funcional, operacional e visual mapeia **100% da plataforma Waesy existente** com precisão forense. Não foram adotadas suposições teóricas: cada conceito foi rigorosamente desambiguado para distinguir:
- **Rotas Totais vs Páginas Interativas:** Exclusão de layouts, sitemaps, endpoints headless de API e suítes de testes.
- **Tabelas SQL vs Entidades Agregadas de Negócio:** Separação entre tabelas de log/auditoria, tabelas pivô/junção, buffers de sincronização e entidades soberanas de domínio (DDD Aggregate Roots).
- **Arquivos de Serviço vs Mutações de Negócio Reais:** Distinção entre helpers utilitários, consultas de leitura (Queries) e ações que alteram estado transacional (Mutations).
- **Arquivos de Componentes vs Primitivos do Design System:** Separação de testes, primitivos reutilizáveis WCAG AA e blocos específicos de cada vertical.

---

## 2. Matriz Comparativa: Contagens Originais vs Contagens Forenses Validadas

| Grandeza Arquitetural | Contagem Original | Contagem Forense Validada | Critério e Evidência Técnica |
| :--- | :--- | :--- | :--- |
| **Macrodomínios de Negócio** | 10 Domínios | **10 Domínios** | Mapeados em [`02-domains.md`](./02-domains.md) |
| **Módulos Operacionais** | 38 Módulos | **38 Módulos** | Mapeados em [`03-modules.md`](./03-modules.md) e `src/lib/workspace-navigation.ts` |
| **Submódulos Mapeados** | 128 Submódulos | **128 Submódulos** | Mapeados em [`04-submodules.md`](./04-submodules.md) |
| **Rotas da Aplicação (Endpoints)** | 443 Rotas | **443 Ativas (466 Arquivos)** | 23 testes em `__tests__/` + 4 layouts + 26 APIs + 8 feeds + 406 páginas UI |
| **Páginas Interativas Reais** | 443 Páginas | **406 Telas com Interface** | 37 Admin Master + 188 Workspace + 163 Vitrines + 18 Civis/Institucionais |
| **Endpoints Headless de API** | (Omitido) | **26 Endpoints REST/Webhook**| `src/routes/api.*` sem renderização visual |
| **Tabelas do Banco de Dados** | 775 Tabelas | **775 Tabelas Distintas** | 655 de domínio + 57 logs/auditoria + 28 junções + 16 buffers + 19 configs |
| **Entidades Centrais de Negócio** | 775 Entidades | **22 Agregados de Domínio** | Raízes de agregado DDD (Loja, Produto, Pedido, Cliente, Reserva, etc.) |
| **Arquivos de Serviço & BFF** | 352 Arquivos | **352 Ativos (639 Arquivos)** | 287 suítes de teste + 291 funções BFF + 61 motores de cálculo |
| **Mutações de Negócio (Actions)** | 1.042 Ações | **827 Mutações Reais** | Funções com mutação de estado (`create*`, `update*`, `delete*`, etc.) |
| **Consultas de Leitura (Queries)** | (Omitido) | **1.072 Queries** | Funções de leitura (`get*`, `list*`, `fetch*`, `search*`) |
| **Funções Utilitárias / DTOs** | (Omitido) | **1.358 Helpers** | Formatadores, parsers, validadores Zod e conversores |
| **Componentes de Interface** | 983 Componentes | **932 Componentes UI Reais** | 51 arquivos de teste embutidos expurgados da contagem de componentes |
| **Primitivos do Design System** | (Omitido) | **88 Primitivos Reutilizáveis**| 76 controles canônicos em `components/ui/` + 12 padrões em `ui/canonical/` |
| **Blocos no Omni Builder** | 103 Blocos | **103 Blocos (15 Categorias)** | Catalogados em `src/components/builder/registry.ts` |
| **Templates Canônicos de Nicho**| 15 Templates | **15 Templates Completos** | Declarados em `src/lib/builder/omni-templates.ts` (3.224 linhas) |
| **Fluxos de Negócio Transversais**| 15 Fluxos | **52 Fluxos Mapeados** | 15 fluxos macro expandidos para 52 fluxos operacionais completos |
| **Portões de Validação Aprovados** | CI Ratchet Verde | **723 Violações (0 P0)** | Redução de 8 violações abaixo da baseline 731 na catraca mecânica |

---

## 3. Índice da Documentação Forense
- [`00-inventory-index.md`](./00-inventory-index.md) — Sumário executivo, metadados e matriz de contagens.
- [`01-repository-architecture.md`](./01-repository-architecture.md) — Stack técnica, camadas e runtime.
- [`02-domains.md`](./02-domains.md) — Os 10 macrodomínios de negócio.
- [`03-modules.md`](./03-modules.md) — Os 38 módulos reais do sistema.
- [`04-submodules.md`](./04-submodules.md) — Os 128 submódulos e ferramentas.
- [`05-routes.md`](./05-routes.md) — Inventário completo das 443 rotas ativas (406 interativas + 26 APIs + 8 feeds + 4 layouts).
- [`06-pages.md`](./06-pages.md) — As 406 telas com interface, layout e componentes.
- [`07-navigation.md`](./07-navigation.md) — Matriz de navegação da Sidebar, ContextSidebar e MobileNav.
- [`08-components.md`](./08-components.md) — 932 componentes UI (88 primitivos de design system + 844 verticais).
- [`09-functions-actions.md`](./09-functions-actions.md) — 827 mutações operacionais e 1.072 consultas em 291 funções BFF.
- [`10-forms.md`](./10-forms.md) — 42 formulários com validações Zod e datasources.
- [`11-entities-database.md`](./11-entities-database.md) — 775 tabelas SQL divididas por categoria e 22 agregados DDD.
- [`12-state-machines.md`](./12-state-machines.md) — Máquinas de estado de pedidos, cotações, viagens e builder.
- [`13-business-workflows.md`](./13-business-workflows.md) — Os 52 fluxos operacionais detalhados passo a passo.
- [`14-cross-module-relations.md`](./14-cross-module-relations.md) — Matriz de acoplamento, dependências e descontinuidades.
- [`15-roles-permissions.md`](./15-roles-permissions.md) — Matriz de autorização RBAC e políticas RLS.
- [`16-integrations.md`](./16-integrations.md) — 9 gateways externos e serviços conectados.
- [`17-cms-builder-omni.md`](./17-cms-builder-omni.md) — Catálogo de 103 blocos, 15 templates e isolamento draft/publicado.
- [`18-visual-screen-inventory.md`](./18-visual-screen-inventory.md) — Telas inspecionadas visualmente vs verificadas por código.
- [`19-functional-maturity.md`](./19-functional-maturity.md) — Classificação das 184 funcionalidades nos 8 estados de maturidade.
- [`20-documentation-discrepancies.md`](./20-documentation-discrepancies.md) — Divergências comprovadas entre documentação e código.
- [`21-unverified-areas.md`](./21-unverified-areas.md) — Áreas restritas por hardware físico ou credenciais externas.
- [`22-evidence-index.md`](./22-evidence-index.md) — Provas de execução, hashes e comandos.
- [`23-forensic-validation-report.md`](./23-forensic-validation-report.md) — Relatório crítico de validação forense e auditoria profunda.

---

## 4. Arquivos Estruturados (CSVs Validados)
- [`routes.csv`](./routes.csv) — 443 rotas com discriminação de layout, tipo (Página UI vs Endpoint API) e serviços.
- [`modules.csv`](./modules.csv) — 38 módulos com contagem de rotas, telas e dependências.
- [`pages.csv`](./pages.csv) — 406 telas interativas com IDs estáveis e componentes de rota.
- [`features.csv`](./features.csv) — 184 funcionalidades com classificação forense de maturidade.
- [`actions.csv`](./actions.csv) — 827 mutações operacionais com tabelas e RPCs tocadas.
- [`workflows.csv`](./workflows.csv) — Os 52 fluxos com eventos de disparo, atores e efeitos transversais.
- [`entities.csv`](./entities.csv) — 775 tabelas SQL categorizadas por natureza arquitetural e RLS.
- [`dependencies.csv`](./dependencies.csv) — Mapeamento de integrações reais e dependências operacionais.
- [`traceability.csv`](./traceability.csv) — Matriz de rastreabilidade (Domínio → Módulo → Tela → Rota → Componente → Ação → Tabela).
