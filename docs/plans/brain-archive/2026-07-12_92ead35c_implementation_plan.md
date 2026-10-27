# MASTER PLAN: GLOBAL ARCHITECTURAL REFACTORING

Este plano reflete a auditoria recursiva (Fase 0) solicitada na base de código da Turis. Com base no "Protocolo de Verdade e Evidência", documentamos abaixo os problemas estruturais confirmados através de análise estática e definimos a ordem canônica de execução para estabilizar a plataforma.

## User Review Required
> [!IMPORTANT]
> Aprovação do Master Plan
> Por favor, revise os Achados da Fase 0 e o planejamento das Fases 1 a 14. Assim que você aprovar este plano, iniciarei automaticamente a execução segura da **FASE 1**.

## FASE 0 — BASELINE E AUDITORIA (Concluída)

**Objetivo:** Obter o estado real, cru e baseado em evidências da arquitetura atual.

**1. Acesso a Dados Incorreto (Mistura de UI e Infrastructure)**
- **Afirmação:** Componentes de interface estão realizando chamadas diretas ao banco.
- **Evidência Favorável:** Nossa varredura identificou **31 rotas** e mais de **40 componentes** utilizando chamadas diretas como `supabase.from()`, `supabase.auth.getUser()`, ou chamadas `.invoke()` diretamente em funções UI. Exemplos críticos: `agency.$slug.trips.$id.flights.tsx`, `agency.$slug.proposals.$id.tsx`.
- **Conclusão:** FUNCIONA, MAS ESTÁ NA CAMADA ERRADA. Viola o fluxo `UI -> Feature -> Application -> Domain`.

**2. Hardcodes Visuais e Falta de Consumo do Design System**
- **Afirmação:** O sistema possui tokens definidos, mas os desenvolvedores não os utilizam (ou utilizam parcialmente).
- **Evidência Favorável:** A auditoria encontrou **207 arquivos** com uso de classes hardcoded como `bg-white`, `rounded-2xl`, `rounded-3xl`, `px-4`, `px-6`. Isso viola o Design System (Ambient Glass) que prevê `--shell-page-padding`, `--radius-card` e `--os-glass-bg`.
- **Conclusão:** COMPROVADO E HARDCODADO. O código visualmente funciona, mas é arquiteturalmente frágil e inflexível a temas.

**3. Fragmentação de Shells e Layouts**
- **Afirmação:** As páginas reinventam a roda do próprio layout (overflow, padding, grids).
- **Evidência Favorável:** Mais de 60 rotas recriam propriedades como `flex-1 overflow-y-auto` em vez de utilizar uma *composition* padronizada (ex: `PageShell` ou classes `.page-content`). Notamos wrappers locais complexos (ex: `inbox.tsx` tem 6 contextos de scroll aninhados).
- **Conclusão:** DUPLICADO E ARQUITETURALMENTE FRÁGIL.

**4. Proliferação de Modais/Dialogs não-canônicos**
- **Afirmação:** Existem múltiplas formas de renderizar modais.
- **Evidência Favorável:** Varredura encontrou **61 usos** variando entre `Dialog` nativo, `createPortal`, e `SheetPage`. 
- **Conclusão:** PARCIALMENTE RESOLVIDO NA SPRINT ANTERIOR. Os Wizards já foram migrados para `SheetPage`, mas ainda há dezenas de `Dialogs` e modais ad-hoc não padronizados pelo resto do sistema.

**5. Reexports, Barrel Files e Dead Code**
- **Afirmação:** Arquivos `index.ts` causam ciclos ou carregamento excessivo.
- **Evidência Contrária:** A busca não detectou `export *` espalhados pelo repositório (0 ocorrências) e apenas 2 arquivos `index.ts` foram listados.
- **Conclusão:** NÃO CONFIRMADO. O gerenciamento de exportações está razoavelmente limpo.

---

## PLANO MESTRE DE CONTINUIDADE (FASES 1 A 14)

O plano agrupa problemas pela mesma **causa raiz**. Seguiremos rigorosamente esta ordem para garantir que a fundação exista antes do telhado.

### FASE 1 — Fontes Canônicas de Design, Tokens e Tema
**Objetivo:** Consolidar UMA única fonte de verdade para tokens visuais em `styles.css`.
- Identificar todas as variáveis em `:root` necessárias para o "Ambient Glass".
- Criar classes de utilidade para o shell (ex: `.page-content`, `.page-section-gap`, `.dock-offset-mobile`).
- **Critério de Pronto:** `styles.css` canônico finalizado. Nenhuma página será alterada nesta fase, apenas a fundação.

### FASE 2 — AppShell, Primitives, Compositions e Templates
**Objetivo:** Criar e estabilizar as composições padrão (`PageShell`, `DetailShell`, `DataTableShell`) que usarão as classes da FASE 1.
- Extrair layouts hardcoded das rotas para templates reutilizáveis.
- Unificar o uso de modais/sheets e componentes de card.

### FASE 3 — Rotas, Navegação e Eliminação de Shells Locais
**Objetivo:** Migrar as 84 rotas de agência para utilizar estritamente as Compositions da FASE 2.
- Limpar `px-6`, `bg-white`, e containers redundantes.
- Desfazer aninhamentos de scroll (ex: `inbox.tsx`).

### FASE 4 — Ações Contextuais e Page Header
**Objetivo:** Padronizar as "toolbars" e botões flutuantes para que sempre utilizem o `<HeaderPortal>` e passem pela composição unificada, sem inventar botões paralelos.

### FASE 5 — Forms, Fields, Schemas e Contratos
**Objetivo:** Garantir que 100% dos formulários utilizem `@hookform/resolvers/zod` atrelados aos contratos do banco. (Grande parte disso foi adiantado na Sprint anterior para CRUDs, mas faremos a auditoria final).

### FASE 6 — Entidades, Status, Regras de Negócio e Fórmulas
**Objetivo:** Onde quer que haja lógica de cálculo (juros, comissões) ou enumerações de Domínio não-tratadas, elas devem ir para diretórios canônicos (`src/lib/constants` e `src/domain`).

### FASE 7 — Use Cases, Repositories e Supabase
**Objetivo:** Mover as **31 ocorrências** de `supabase.from` e `supabase.auth` localizadas nas rotas para a camada de serviços (`src/services/`). A UI não pode saber que o banco é Supabase.

### FASE 8 — Banco, Migrations, RLS, Storage e Segurança
**Objetivo:** Auditar RLS para garantir que tenancy (`agency_id`) é respeitado em todas as tabelas e que assinaturas/URLs de storage não expõem arquivos publicamente indevidamente.

### FASE 9 — Erros, Logging, Observabilidade e Auditoria
**Objetivo:** Eliminar "catch silenciado" e falhas mascaradas como EmptyState. Toda mutação deve lidar com estados de falha sistemáticos via um ErrorBoundary global ou interceptor canônico.

### FASE 10 — Estado, Cache, Realtime e Performance
**Objetivo:** Eliminar useEffects em loop, queries duplicadas ou falta de debounce.
- Consolidar as *Query Keys* do React Query em um Registry.

### FASE 11 — Migração Completa e Revisão de Módulos Específicos
**Objetivo:** Passar um "pente-fino" nas rotas mais densas (CRM, Boarding, Financeiro, InfoTravel) garantindo adoção completa do sistema sem exceções.

### FASE 12 — Remoção de Código Morto e Compatibilidade Antiga
**Objetivo:** Delete agressivo. Tudo que foi renomeado, deprecado, modais antigos ou rotas antigas será apagado definitivamente. Sem dívida técnica deixada para o lançamento.

### FASE 13 — Documentação e Regras de Conformidade Automáticas
**Objetivo:** Atualizar a doc para a realidade final e injetar regras no Linter/Pipeline que impeçam `bg-white` soltos ou `supabase` nas rotas no futuro.

### FASE 14 — Testes Globais e Homologação
**Objetivo:** Gate final de validação estrutural e typechecking com zero erros.

---

## EVIDÊNCIAS DE EXECUÇÃO

Em cada Fase, seguiremos o formato de resposta obrigatório do LOTE: reportando Achados, Fatos, Código Refatorado, Consumidores Migrados e Evidências.

 Aguardando aprovação para iniciarmos a **FASE 1 — Fontes Canônicas de Design, Tokens e Tema**.
