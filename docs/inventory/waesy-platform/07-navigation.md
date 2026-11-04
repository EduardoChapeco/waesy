# 07 — Estrutura de Navegação do Sistema

## 1. Menus de Navegação Corporativa (`src/lib/workspace-navigation.ts`)
O Workspace é regido por uma matriz unificada contendo **38 grupos de navegação** divididos em 3 seções conceituais:
- **Linha Mestra Universal (`section: "master"`):** Painel, Tarefas, Inteligência e Atendimento.
- **Módulos Verticais de Nicho (`section: "niche"`):** Gastronomia, Varejo, Serviços, Locação, Assistência, Jurídico, Imóveis, Turismo, Vagas, Eventos, Veículos, Pet, Supermercado, Farmácia, Redação, Cursos e Atacado.
- **Linha Corporativa Transversal (`section: "corporate"`):** WhatsApp, Comercial, Marketing, Logística, Financeiro, Fiscal, Equipe, Captação, Conformidade e Ajustes.

## 2. Componentes de Casca e Menus Visuais
- **Sidebar Desktop (`workspace-sidebar.tsx` & `workspace-sidebar-flyout.tsx`):** Barra lateral retrátil de nível de produção com acordeões por grupo, badges reativos de pendência e atalho de busca global.
- **Barra de Topo Global (`TopBar.tsx` & `builder-top-bar.tsx`):** Piso canônico de 44px (`h-11 min-h-11`), seletor de tenant, busca rápida e gatilho de perfil civil.
- **Navegação Móvel (`mobile-nav.tsx`):** Barra de 5 abas inferiores conectada ao CMS dinâmico com suporte a atalhos rápidos e drawer de contas.
