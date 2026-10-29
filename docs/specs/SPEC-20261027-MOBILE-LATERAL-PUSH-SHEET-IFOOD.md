# SPEC-20261027-MOBILE-LATERAL-PUSH-SHEET-IFOOD — Menu Lateral Push Sheet Mobile (Paridade iFood & Threads)

## 0. Metadados e Controle
- **ID da Spec:** SPEC-20261027-MOBILE-LATERAL-PUSH-SHEET-IFOOD
- **Título:** Redesenho do Menu Lateral Mobile com Push-Canvas (Threads Parity) e Sidebar Modular iFood
- **Autor / Agente Responsável:** Antigravity Architect & BigTech Red Team
- **Data de Aprovação:** 2026-10-27
- **Status:** APROVADO
- **Invariantes Relacionadas:** B.8 (Proibições Absolutas), B.20 (Bilateralidade CMS Master), B.22 (CTAs Táteis), B.26 (Piso 44px), B.32 (Layouts Híbridos), B.34 (Desobstrução Safe-Area e Z-Index)

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Substituir o antigo bottom sheet modal por um **Lateral Push Sheet** nativo mobile ativado pelo menu superior esquerdo (TopBar / IFoodHeader), onde o canvas da página é empurrado lateralmente revelando o menu (estilo Threads), com design idêntico ao sidebar do iFood (grade squircle, cards amplos, seções semânticas e alternador Grade/Lista), governado bilateralmente pelo Admin Master sem exclusão destrutiva e disponibilizado como bloco modular no Omni Builder.
- **Escopo Incluído:**
  - `src/components/shell/SuperAppModuleDrawer.tsx`: Refatoração para Lateral Push Sheet com alternância Grade/Lista e seções temáticas iFood.
  - `src/components/shell/app-shell.tsx`: Implementação da camada de translação lateral (`translate-x-[85vw]`, escala e raio na viewport mobile empurrada) com backdrop tátil.
  - `src/design-system/vitrine/vitrine-lateral-sheet.tsx`: Primitiva canônica reutilizável do menu lateral iFood.
  - `src/routes/admin-master.botoes.tsx`: Inclusão da 4ª aba de governança CMS dedicada ao Menu Lateral Mobile (`drawer_module`), suporte a seções, formato de card e ativação/desativação não destrutiva.
  - `src/services/hotpage.functions.ts`: Estrutura canônica de dados com seções ("Categorias", "Destaques para Explorar", "Destaques do Waesy", "Seleção"), badges e variantes de card.
  - `src/types/omni-builder.ts` e `src/components/builder/registry.ts`: Bloco `vitrine_lateral_drawer` para permitir que qualquer empresa crie e customize esse menu no Omni Builder.
  - `src/components/builder/blocks/vitrine-app-blocks.tsx` e `src/components/builder/vitrine-block-inspector.tsx`: Renderizador e inspetor visual do bloco no Omni Builder.
- **Não-Objetivos:**
  - Não alterar a lógica de autenticação dos usuários.
  - Não remover dados cadastrados no banco; registros existentes só podem ser desativados (`is_active = false`).
  - Não quebrar o layout desktop (a translação de push é restrita à viewport mobile `<768px`).

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### 2.1 Requisitos Ubíquos (Comportamento Geral)
- **UBI-01:** O sistema DEVE garantir que todo botão, card ou link no menu lateral mobile possua área de toque mínima de 44x44px (`h-11 min-h-11`) e anel de foco `:focus-visible`.
- **UBI-02:** O sistema DEVE preservar os itens configurados no banco de dados, proibindo a exclusão física definitiva no Admin Master em favor de soft-toggle (`is_active = false`).
- **UBI-03:** O sistema DEVE manter sincronização bilateral 100% configurável entre o Admin Master (`hotpages` com `template_type = 'drawer_module'`), as vitrines públicas e os templates do Omni Builder.

### 2.2 Requisitos Acionados por Evento (Event-Driven)
- **EVE-01:** QUANDO o usuário tocar no botão hambúrguer no topo esquerdo da vitrine (`TopBar` ou `IFoodHeader`), o sistema DEVE abrir o menu lateral deslizando da esquerda e transladar o container principal da página para a direita (`translate-x-[85vw]` com transição cúbica suave).
- **EVE-02:** QUANDO o usuário tocar na área da página empurrada visível à direita ou no botão fechar, o sistema DEVE recolher o menu lateral e restaurar o container da página para `translate-x-0`.
- **EVE-03:** QUANDO o usuário alternar o controle segmentado entre os modos Grade (`::`) e Lista (`≡`), o sistema DEVE alternar instantaneamente a disposição visual dos módulos preservando a hierarquia das seções.
- **EVE-04:** QUANDO o administrador no Admin Master editar um item de módulo ou desativá-lo, o sistema DEVE persistir o estado imediatamente no Supabase e refletir nas vitrines.

### 2.3 Requisitos Orientados a Estado (State-Driven)
- **STA-01:** ENQUANTO o menu lateral estiver aberto no mobile (`isSuperAppOpen = true`), o canvas da página DEVE permanecer empurrado em `translate-x-[85vw]`, com escala reduzida a 96% (`scale-[0.96]`), cantos esquerdos arredondados (`rounded-l-2xl`), sombra de elevação e overlay de toque inibidor de interação acidental no fundo.
- **STA-02:** ENQUANTO a viewport for desktop (`>=768px`), o canvas da página DEVE permanecer estático sem translação lateral.

### 2.4 Requisitos Opcionais e Exceções
- **OPC-01:** ONDE um botão possuir `badge_label` preenchido (ex: "Novo", "Promo", "Clube"), o sistema DEVE renderizar uma pílula destacada vermelha ou customizada no topo do card.
- **EXC-01:** SE a consulta ao backend falhar ou a rede estiver offline, ENTÃO o sistema DEVE carregar a coleção canônica embutida `CANONICAL_DRAWER_MODULES` sem travar a interface nem exibir tela branca.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] **Estado de Dados (Data/Success):** Renderização de seções agrupadas com cards amplos (2 colunas) e squircles (4 colunas), com imagens 3D/PNG transparentes e tipografia legível.
- [x] **Estado de Carregamento (Skeleton):** Skeletons com a mesma geometria dos cards sem saltos de layout (CLS < 0.05).
- [x] **Estado Vazio (Empty):** Tratamento honesto caso nenhuma hotpage esteja ativa com mensagem clara e atalho para o Admin Master.
- [x] **Estado de Erro (Error):** Fallback robusto para módulos canônicos em caso de falha de conexão.
- [x] **Touch Targets:** Piso rigoroso de 44x44px em todos os botões e alternadores.
- [x] **Contraste:** Relação superior a 4.5:1 para texto e 3.0:1 para controles.
- [x] **Safe-Area:** Respeito absoluto a `pt-safe` e `pb-safe` para evitar sobreposição por notch ou barra de gestos do smartphone.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| --- | --- | --- |
| `src/design-system/vitrine/vitrine-lateral-sheet.tsx` | Criar | Primitiva canônica reutilizável do menu lateral iFood |
| `src/components/shell/SuperAppModuleDrawer.tsx` | Modificar | Consumir primitiva iFood lateral com push-sheet |
| `src/components/shell/app-shell.tsx` | Modificar | Suporte a push-canvas via CSS transform quando aberto |
| `src/services/hotpage.functions.ts` | Modificar | Atualizar módulos canônicos com seções semânticas e variantes iFood |
| `src/routes/admin-master.botoes.tsx` | Modificar | Adicionar 4ª aba do menu lateral com governança não destrutiva |
| `src/types/omni-builder.ts` | Modificar | Schema Zod para o bloco `vitrine_lateral_drawer` |
| `src/components/builder/registry.ts` | Modificar | Registro do bloco modular no Omni Builder |
| `src/components/builder/blocks/vitrine-app-blocks.tsx` | Modificar | Renderizador do bloco no Omni Builder |
| `src/components/builder/vitrine-block-inspector.tsx` | Modificar | Inspetor de propriedades do bloco no Omni Builder |
| `docs/design/DECISIONS.md` | Modificar | Registro de encerramento da decisão DEC-20261027-LATERAL-PUSH-SHEET |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. `npm run typecheck` com Exit Code 0.
2. `npm run build` com Exit Code 0.
3. Zero violações P0/P1 no Design Lint.
4. Canvas empurrado lateralmente no mobile exibindo ~15% da página no canto direito como no Threads.
5. Menu lateral idêntico aos prints do iFood com seções, cards amplos e squircles com badges.
6. Edição e ativação/desativação no Admin Master funcional.
7. Bloco disponível no Omni Builder para qualquer aplicativo cliente.
