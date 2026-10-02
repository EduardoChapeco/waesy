# PROXIMOS_PLANOS_EXECUCAO.md — Protocolo Canônico de Execução Autônoma

> **Comando de Ativação Rápida:** Ao enviar para qualquer IA o comando `"leia os proximos planos"`, o agente deve carregar este documento imediatamente como Fonte Única de Instrução Operacional e executar sequencialmente as fases pendentes sem interrupção, sem mocks, sem fallbacks sintéticos e sem quebra de rotas de produção.

---

## 1. Contexto e Estado Atual do Sistema (SSOT)

| Parâmetro | Valor Canônico |
| :--- | :--- |
| **Projeto** | Waesy (Plataforma BigTech Multitenant de Comércio, Serviços e Gestão Local) |
| **Estado Atual** | 37 de 48 fases concluídas e homologadas (**77.1% de Plano 5**) |
| **Última Decisão Homologada** | `DEC-126` (Auditoria dos 4 Pilares, Hub do Marketplace F01 e Deploy de Produção) |
| **Blocos Concluídos** | Bloco A (S01–S05), Bloco B (S06–S14), Bloco C (S15–S22), Bloco D (S23–S31), Bloco E (S32–S37) |
| **Bloco Ativo na Fila** | **Bloco F — Documentação Viva, Roadmap e Suporte (Fases S38 a S43)** |
| **Compilação TypeScript** | `npm run typecheck` com **0 erros** (Exit Code 0) em 3.355+ arquivos |
| **Suíte de Testes Unitários** | 166 arquivos de teste, **1.085 testes verdes** (Vitest) |
| **Catraca de Design Lint** | 0 violações P0/P1 nos arquivos novos, catraca aprovada (teto 37.710) |
| **Runtime de Produção** | Cloudflare Pages / Workers com bundle dentro do orçamento (< 25 MB) |
| **Banco de Dados** | Supabase PostgreSQL com RLS deny-by-default em 100% das tabelas |

---

## 2. As Quatro Leis Invioláveis do Repositório (AGENTS.md)

1. **Zero Mocks e Zero Dados Sintéticos:** Todo dado consumido pela interface provém de queries reais no Supabase via Server Functions (`src/services/`). Se o dado não existe, renderiza-se honestamente o estado vazio (`<EmptyState />`) ou esqueleto de carregamento (`<Skeleton />`).
2. **Separação Rígida de Camadas:**
   - `src/components/`: Primitivas de UI. Proibido declarar cores literais (`#hex`, `rgb`), estilos inline ou regras de negócio.
   - `src/services/`: BFF Server Functions (`createServerFn`). Proibido manipular DOM ou importar componentes visuais.
   - `src/lib/`: Utilitários puros, schemas Zod e clientes de infraestrutura.
   - `src/routes/`: Rotas TanStack Router com loaders e ações conectadas exclusivamente via BFF.
3. **Blindagem de Segurança e RLS:**
   - Toda tabela possui RLS habilitado com políticas restritivas por tenant (`store_id`, `profile_id`).
   - Views utilizam `security_invoker = true`.
   - Subconsultas escalares `(SELECT auth.uid())` para otimização de `InitPlan`.
4. **Preservação Absoluta de Produção:** Nenhuma rota existente (`workspace`, `_store`, `admin-master`, `status`, `marketplace`) pode sofrer quebra de contrato, remoção de recurso ou regressão visual durante qualquer refatoração.

---

## 3. Roteiro Sequencial das Fases Pendentes (S38 a S48)

### Bloco F — Documentação Viva, Roadmap e Suporte (Fases S38 a S43) — ATIVO AGORA

#### Fase S38: Roadmap Vivo (Projetado, Feito, A Melhorar) com Prova Item a Item
- **Objetivo:** Estabelecer rota/página e SSOT de roadmap (`docs/canonico/ROADMAP_VIVO.md` ou rota pública `/roadmap`), conectando cada funcionalidade entregue ao hash do commit, DEC correspondente e arquivo de teste como prova mecânica.
- **Ações:**
  1. Gerar catálogo sincronizado de capacidades com status de entrega real (sem fallbacks ou promessas fictícias).
  2. Implementar visualização interativa ou documento estruturado em Markdown com filtros por vertical (Comércio, Turismo, Gastronomia, Serviços, etc.).

#### Fase S39: Backlog Canônico e Sprints em Linguagem Humana
- **Objetivo:** Consolidar sprints em linguagem de negócio acessível a clientes e operadores em `docs/canonico/BACKLOG_HUMANO.md`.
- **Ações:** Tradução de épicos de engenharia para resultados de valor real para a cidade e lojistas.

#### Fase S40: ADRs, Runbook de Operação, Dicionário de Domínio e Guia de Contribuição
- **Objetivo:** Consolidar compêndio de governança operacional:
  1. `docs/operacao/RUNBOOK.md`: Procedimentos de deploy, rollback, rotação de chaves e resposta a incidentes.
  2. `docs/canonico/DICIONARIO_DOMINIO.md`: Glossário ubíquo de termos do ecossistema Waesy.
  3. `CONTRIBUTING.md`: Guia definitivo para desenvolvedores e agentes autônomos.

#### Fase S41: FAQ e Base de Conhecimento por Vertical
- **Objetivo:** Base de conhecimento estruturada e indexável para suporte operacional e autoatendimento.

#### Fase S42: Changelog e Catálogo de Capacidades Gerados do Código
- **Objetivo:** Automação de changelog (`CHANGELOG.md`) via script de extração determinística de commits e DECISIONS.

#### Fase S43: Suporte com Ticket Estruturado, SLA, Categoria e Vínculo com Cliente/Vertical
- **Objetivo:** Módulo de chamados internos de suporte com categorias, SLA por severidade e governança de atendimento.

---

### Bloco G — MCP, Autovarredura e CI Bloqueante (Fases S44 a S48) — NA FILA

- **S44**: Registry de capacidades como fonte única (tela, permissão, tool MCP, WebMCP e docs).
- **S45**: Paridade verificada por máquina entre ação, permissão e tool.
- **S46**: Scanner de órfão, duplicado e desvinculado rodando no CI (`scripts/dead-code-detector.mjs`).
- **S47**: CI bloqueante unificado (typecheck, lint, design sem ratchet, testes, paridade, orçamentos).
- **S48**: Ciclo contínuo de autoauditoria e selo final de conclusão de Plano 5.


## 4. Procedimento de Execução para a IA Responsável

Quando a IA receber o comando `"leia os proximos planos"`, o seguinte procedimento deve ser seguido à risca:

1. **Leitura de Baseline:**
   - Verificar `docs/canonico/BACKLOG_UNICO.md` e `docs/canonico/ESTADO.json`.
   - Identificar a fase exata marcada como pendente no topo da fila (ex: S23).
2. **Especificação Prévia (EARS):**
   - Criar arquivo `docs/specs/SPEC-[FASE].md` descrevendo: Condição de Gatilho, Ação do Sistema, Invariantes e Critérios de Aceite.
3. **Execução Cirúrgica:**
   - Criar ou refatorar estritamente os arquivos delimitados pelo escopo da fase.
   - Proibir edições arbitrárias fora da árvore autorizada.
4. **Verificação de Quatro Etapas:**
   - `npm run typecheck` -> Exit Code 0 (0 erros de tipagem).
   - `npm run test` -> Todas as suítes verdes (0 falhas).
   - `node scripts/design-lint.mjs --ratchet` -> 0 violações P0/P1.
   - `npm run build` -> Exit Code 0 com worker e rotas gerados.
5. **Registro e Handoff:**
   - Adicionar ADR / Decisão formal em `docs/design/DECISIONS.md` (`DEC-XXX`).
   - Marcar a fase como `[x]` em `docs/canonico/BACKLOG_UNICO.md`.
   - Atualizar métricas e fase ativa em `docs/canonico/ESTADO.json`.
   - Executar commit padronizado e push para sincronização contínua.
