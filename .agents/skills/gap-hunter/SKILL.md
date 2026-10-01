---
name: gap-hunter
description: "Executa auditoria completa do projeto baseada nos 15 checklists canônicos. Classifica achados por severidade (SEV-1/2/3) e rastreia o catálogo de páginas e rotas."
---

# Gap Hunter — Auditoria Forense Canônica (15 Checklists)

## Missão
Identificar, documentar e classificar sistematicamente qualquer gap arquitetural, funcional ou de interface na plataforma Waesy antes que cause falha em produção.

## Os 15 Checklists Canônicos

### Checklist 1: Páginas GAP / PARCIAL / LEGADO
- Inspecione as rotas em `src/routes/` e o catálogo de páginas.
- Identifique se rotas registradas possuem componentes funcionais ou stubs vazios.
- Classifique: SEV-1 (Tela quebrada/inexistente), SEV-2 (Parcial), SEV-3 (Dívida visual).

### Checklist 2: Zero-Crash Loader Mandate (SEV-1)
- Todo loader TanStack Router DEVE possuir bloco `try/catch` tratando exceções.
- Fallback de erro explícito com mensagem legível e botão de repetição atômico.

### Checklist 3: Acesso Direto ao Supabase (SEV-1)
- Proibido componentes React importarem `createClient` diretamente para mutations.
- Todo acesso deve passar pela camada BFF (`src/services/*.functions.ts`).

### Checklist 4: Fallbacks Hardcoded de Dados (SEV-2)
- Erradique strings mágicas do tipo `|| "5D / 4N"` ou dados de negócio fictícios.
- Dados ausentes devem exibir estado vazio neutro ou valores computados legítimos.

### Checklist 5: Imagens e Mocks Sintéticos (SEV-2)
- Remoção de URLs Unsplash, Lorem Picsum ou placeholders externos em fluxos de negócio.
- Imagens reais persistidas no Supabase Storage com fallback para ícone vetorial da categoria.

### Checklist 6: Isolamento Multi-Tenant (SEV-1)
- Conferência de RLS em 100% das tabelas.
- O `store_id` e identidade do usuário devem vir exclusivamente da sessão validada do backend (`getServerIdentity`).

### Checklist 7: Completude Séptupla (SEV-2)
- As 7 Camadas: Banco -> BFF -> UI -> Workspace -> Higiene -> 3 Toques -> Fluidez.

### Checklist 8: CMS ↔ View Parity (SEV-2)
- Todo campo exibido na vitrine pública deve possuir formulário de edição correspondente no Workspace do lojista.

### Checklist 9: Tokens Semânticos vs Cores Hardcoded (SEV-3)
- Uso exclusivo de tokens semânticos (`text-foreground`, `bg-background`, `text-muted-foreground`).
- Proibição de cores cruas no Tailwind (`bg-red-500`, `#ff0000`).

### Checklist 10: AI-Smell Visual Patterns (SEV-3)
- Erradicação de caixas de boas-vindas redundantes, emojis em tabelas, títulos compostos e cards explicativos desnecessários.

### Checklist 11: Touch Targets & Mobile Layout (SEV-3)
- Controles móveis com altura mínima de 44px (`h-11`).
- Headers desacoplados no mobile shell.

### Checklist 12: Upload Contextual Obrigatório (SEV-2)
- Seções de mídia com uploader na mesma tela, aceitando drag-and-drop e atalho `Ctrl+V`.

### Checklist 13: Integrações & Feature Flags (SEV-2)
- Recursos não configurados exibem "Não configurado" honesto em vez de simular sucesso.

### Checklist 14: Performance & Bundle Size (SEV-3)
- Code-splitting por rota e lazy loading de mídias abaixo da dobra.

### Checklist 15: Oportunidades de Conversão & UX (SEV-3)
- Hero banner com CTA claro em até 8 palavras, fluxo de compra em até 3 toques e recuperação de estados vazios.
