# SPEC-ADMIN-MASTER-UX-REORGANIZATION: Reorganização Harmônica do Painel Admin Master

## 1. Contexto e Motivação
O Admin Master da plataforma Waesy agrega 38 módulos e submódulos operacionais para governança multi-tenant, CMS bilateral, logística Waesy Go, segurança forense Bacen e conformidade regulatória. O layout anterior exibia 36 links em uma lista vertical sem categorização operacional por jornada, sem busca instantânea de ferramentas e sem navegação contextual por trilhas (breadcrumbs).

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **R1 (Ubíquo):** O sistema DEVE fornecer busca instantânea (Search/Filter) no menu lateral do Admin Master, filtrando módulos e submódulos em tempo real enquanto o usuário digita.
- **R2 (Orientado a Eventos):** QUANDO o usuário digitar no campo de busca do menu lateral, o sistema DEVE ocultar seções vazias e destacar visualmente os módulos correspondentes.
- **R3 (Ubíquo):** O sistema DEVE organizar os 38 módulos em 5 clusters canônicos operacionais baseados na rotina do gestor:
  1. *Centro de Comando & Governança*
  2. *Omni Studio & Vitrines do Ecossistema*
  3. *Comércio, Logística & Waesy Go*
  4. *Marketing, Comunidade & Web3*
  5. *Segurança, Finanças & Compliance*
- **R4 (Orientado a Eventos):** QUANDO a rota ativa mudar, a barra superior (Topbar) DEVE exibir a trilha contextual (Breadcrumb) refletindo a seção e o módulo atual, acompanhada de indicador de status "Produção Live" e atalhos rápidos para o OmniBuilder e Vitrine Pública.
- **R5 (Opcional/Condicional):** ONDE o Dashboard (`/admin-master`) for renderizado, o sistema DEVE exibir um bloco de *Cockpit Operacional / Fila Zero* com atalhos de um clique e contadores para as três filas diárias prioritárias: Aprovação de Entregadores, Verificação KYC e Moderação de Denúncias.
- **R6 (Invariante):** O módulo anteriormente órfão de Gestão do Onboarding (`/admin-master/onboarding`) DEVE estar integrado de forma nativa e visível no menu lateral.

## 3. Critérios de Aceite
- [x] Zero erros de tipagem (`npm run typecheck` Exit Code 0).
- [x] Zero regressões no Design Lint (`node scripts/design-lint.mjs --ratchet` Exit Code 0, 0 violações P0).
- [x] Pelo menos 44px de área de toque em todos os controles móveis e de cabeçalho (`h-11 min-h-11`).
- [x] `:focus-visible` em todos os botões e links interativos.
- [x] Build de produção aprovado (`npm run build`).
