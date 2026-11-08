# 01 — Arquitetura Estrutural do Repositório Waesy

## 1. Stack Tecnológica Central
- **Framework Web:** TanStack Start (SSR híbrido + Hydration no cliente).
- **Roteamento:** TanStack Router v1 (roteamento estático type-safe baseado em arquivos em `src/routes/`).
- **Linguagem:** TypeScript 5.8 estrito em 100% da base.
- **Camada de Estilos:** Tailwind CSS v4 com motor de variáveis CSS nativas (`src/styles.css`) e tokens semânticos (`tokens.json`).
- **Design System:** Primitivos Radix UI headless, Phosphor Icons e Lucide React.
- **Backend & BFF:** Server Functions do TanStack Start com validação Zod e isolamento de runtime.
- **Banco de Dados & Auth:** Supabase PostgreSQL com RLS deny-by-default, RPCs plpgsql e autenticação via JWT/Cookies.
- **Runtime de Produção:** Cloudflare Pages Worker (`dist/_worker.js/index.js`).

## 2. Mapa Estrutural de Pastas
```text
waesy/
├── .agents/                 # Skills e agentes autônomos
├── docs/                    # Fonte única da verdade (SSOT) de design, specs e auditorias
│   ├── design/              # Tokens, decisões e catálogo de design lint
│   ├── inventory/           # Inventário Mestre Integral
│   └── specs/               # Especificações formais em sintaxe EARS
├── src/
│   ├── components/          # 983 componentes divididos por domínio e primitivos
│   │   ├── admin/           # Telas do Admin Master e Studio
│   │   ├── builder/         # Motor visual e blocos do Builder Omni
│   │   ├── chat/            # Chat operacional, Copilot e Inbox WhatsApp
│   │   ├── classifieds/     # Classificados de veículos, imóveis e serviços
│   │   ├── shell/           # Cascas de navegação (TopBar, MobileNav, ContextSidebar)
│   │   ├── tourism/         # Módulos especializados de turismo e viagens
│   │   ├── ui/              # Primitivos canônicos do Design System Waesy
│   │   └── workspace/       # Componentes operacionais do ERP corporativo
│   ├── lib/                 # Utilitários puros, schemas Zod e clientes de infra
│   ├── routes/              # 443 rotas ativas da aplicação
│   ├── services/            # 290 BFF Server Functions (*.functions.ts)
│   └── styles.css           # Camada de tokens e variáveis de design
└── supabase/
    └── migrations/          # 576 migrações SQL canônicas (775 tabelas)
```

## 3. Modelo de Camadas Zero-Trust
1. **Interface (UI):** Consome dados exclusivamente via loaders do TanStack Router ou hooks do TanStack Query. Proibido executar queries SQL ou invocar Supabase client com service_role diretamente no cliente.
2. **BFF (Server Functions):** Desestrutura parâmetros validados por Zod, autentica o usuário via `getUserSession(request)` e autoriza o acesso ao tenant (`authorizeBuilderStoreContext`).
3. **Banco de Dados (PostgreSQL):** RLS ativado em 100% das tabelas críticas com isolamento por `store_id` ou `organization_id`.
