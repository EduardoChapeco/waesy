# Alinhamento Definitivo VoyageOS: PRD vs Realidade

A Auditoria Holística revelou que o cerne (Banco de Dados, Autenticação, Kanban) está sólido e pronto. Porém, a **Camada Visual e de Orquestração estão em débito técnico severo** com o PRD de Nível Sênior. Tudo está cinza, quadrado e as inteligências artificiais não tem a base conversacional prometida.

## User Review Required
> [!IMPORTANT]
> O foco desta fase é a **Refatoração Visual (Design System)** e a **Engrenagem de Rotinas (Supabase/IA)**. Revise a proposta abaixo. O objetivo é destruir o "quadrado feio" sem quebrar o core que já consertamos ontem.

## Proposed Changes

---

### UI & Design System (Obliteração do "Quadrado Feio")

#### [MODIFY] `src/index.css`
- **Por quê:** O Lovable injetou um tema genérico. Vamos forçar as variáveis raiz dictadas pelo PRD:
  - `--color-primary`: `#1E3A5F`
  - `--color-accent`: `#2E86AB`
  - `--color-surface`: `#F8FAFC`
- Adicionar os imports das fontes Google (`Sora` 700/600 e `Inter` 400/500).

#### [MODIFY] `tailwind.config.ts`
- **Por quê:** Atualizar e mapear as configurações do Tailwind para consumir nativamente as variáveis `#1E3A5F` em classes ativas como `bg-primary`, `bg-accent`.

#### [MODIFY] `src/pages/Index.tsx` (Dashboard)
- **Por quê:** O painel atual não é o "Bento Grid".
- **O que será feito:** 
  - Reescrever o layout usando CSS `grid-cols-4`, separando os cards `Viagens Hoje (1x1)`, `Kanban Vendas (2x2)`, `Embarques da Semana (2x1)` e animando-os para um aspecto polido/glass leve com Sombras delicadas.

#### [MODIFY] `src/pages/ClientDetail.tsx` (Ficha World ID)
- **Por quê:** Você pediu "Ficha estilo Notion / Apple Wallet". O grid formatado padrão atual é burocrático e sem vida.
- **O que será feito:** Criar Header largo (Banner com Foto), centralizar Tags em formato de badges Premium Purple/Accent, dividir navegação visual entre Viagens Escorridas e Contratos em TABS laterais, e botões expressos de "Chamar no Whats".

---

### Inteligência Artificial & Automação de Agentes Compartilhados

#### [NEW] `supabase/functions/ai-chat-agent/index.ts`
- **Por quê:** Criar formalmente a função de Backend responsável pela comunicação do squad usando `openrouter`/`groq`.

#### [MODIFY] `supabase/migrations/2026...`
- **Por quê:** Necessário executar os `CREATE TRIGGER` e Extensões descritos no Item 5 do PRD (pg_cron e update_at automáticos em TODAS as tabelas, que possivelmente faltaram em scripts base).

## Open Questions

> [!WARNING]
> Para reconstruir o Layout Visual do Dashboard Bento Grid, você prefere que **1) Os gráficos sejam puramente conceituais/dummy** até que ocorram vendas reais para acenderem as cores OU **2) Consumamos imediatamente as Queries baseadas em datas e exibimos em Empty States (Estados Vazios) desenhados (arte flat "Nenhum embarque")?** Eu recomendo a opção 2 para manter a honestidade do dado. Confirma?

## Verification Plan

### Automated Tests
1. Rodar `npx tsc --noEmit` pós-mudança brutal do `tailwind.config`.
2. Verificar se a paleta CSS conflita com arquivos `@radix-ui` / `shadcn` base.

### Manual Verification
1. Abrir a rota `/` (Dashboard) e validar a experiência Bento Grid Responsiva.
2. Abrir `/clients/:id` e validar se o conceito visual Apple Wallet / Notion encaixou perfeitamente.
