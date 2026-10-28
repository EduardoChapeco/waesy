# SPEC-20261028-PROFILE-UNIFICATION-AND-BRANDKIT-COVER.md
## Unificação Canônica dos Perfis Públicos (Instagram/Threads/Apple HIG) & Deslocamento da Capa para o BrandKit

- **Status:** Aprovado para Implementação
- **Data:** 2026-10-28
- **Contexto:** Solicitação do usuário após inspeção de telas reais (capturas de Instagram, Threads e Waesy). Foi constatado que os perfis públicos ainda exibiam capas panorâmicas volumosas (21:9 e 4:1) com placeholders e botões de câmera no topo, gerando ruído visual, containeritis e quebra da paridade entre tipos de perfil (empresa, pessoal, criador, marca). Além disso, a opção de capa deve ser retirada dos perfis e movida exclusivamente para o BrandKit (pois sua função real é estampar os cards em feeds, buscas e vitrines), unificando também os editores in-page de perfil.

---

### 1. Requisitos em Sintaxe EARS

#### 1.1 Supressão Integral de Capas nos Perfis Públicos
- **Quando** qualquer perfil público for renderizado (`_store.loja.$slug.tsx`, `_store.diretorio.$id.tsx`, `_store.perfil-da-loja.tsx`, `_store.membro.$id.tsx`, `_store.u.$username.tsx`), **o sistema deve** omitir completamente qualquer banner ou container de capa decorativa no topo da página.
- **O sistema deve** iniciar a superfície diretamente pelo cabeçalho nativo (`NativeMobileHeader`) seguido do cluster canônico de identidade.

#### 1.2 Padrão Unificado de Identidade Visual (Instagram / Threads / Apple HIG)
- **O sistema deve** adotar uma estrutura bidirecional idêntica para todos os perfis públicos (Empresa / Loja, Pessoal / Civil, Marca, Criador / Influencer):
  1. **Linha Superior de Identidade:** Avatar canônico à esquerda (squircle/círculo com borda suave) e cluster de métricas horizontais (Publicações, Seguidores, Seguindo, Curtidas) em tipografia tabular e limpa;
  2. **Identidade & Título:** Nome do perfil em destaque (`text-xl font-bold`), selo oficial de verificação (`ShieldCheck`), badge de papel/admin quando aplicável, e `@handle` em fonte mono discreta;
  3. **Classificação & Avaliação:** Nicho/categoria em texto claro (ex: `Comércio Local`, `Serviço`, `Gastronomia`), avaliação real com estrelas quando houver avaliações reais registradas ou selo neutro "Verificado";
  4. **Biografia Sem Truncamento:** Renderização integral da bio (`whitespace-pre-line break-words`), sem `truncate` ou caixas artificiais;
  5. **Metadados Úteis:** Localização canônica (`Cidade - UF`) com ícone discreto de alfinete e links/biolinks em chips de navegação direta;
  6. **Ações Primárias Táteis:** Grade de botões lado a lado (`h-11 min-h-11`):
     - Para o proprietário (`isOwner`): Botão "Editar Perfil" e botão "Workspace" (ou painel);
     - Para visitantes: Botão "Seguir" (primário) e botão de contato ("Mensagem" ou "Atendimento via WhatsApp") e botão de compartilhar;
  7. **Régua Canônica de Abas:** Navegação por abas uniforme (`Vitrine`, `Sobre`, `Avaliações` para empresas; `Publicações`, `Mídia`, `Sobre` para civil/criador).

#### 1.3 Remoção da Opção de Capa dos Editores de Perfil & Centralização no BrandKit
- **Quando** o usuário abrir o editor in-page de perfil (seja empresa ou membro/criador), **o sistema deve** retirar os campos de upload e recorte de capa panorâmica.
- **O sistema deve** exibir no editor de empresa um aviso explicativo com atalho: *"A capa da sua empresa exibida nos cards de feeds, buscas e vitrines é configurada no Brand Kit"*, direcionando para `/workspace/marketing/brand-kit`.
- **No BrandKit** (`workspace.marketing.brand-kit.tsx`), **o sistema deve** manter e reforçar o campo de capa como *"Capa da Empresa (Cards, Feeds e Vitrines)"*, assegurando que a imagem salva seja sincronizada com `store.cover_url` e `store.settings.places_cover_url` para consumo correto em cards (`StoreCard`, `PlacesCard`, `DirectoryBusinessCard`).

#### 1.4 Padronização dos Editores de Perfil
- **O sistema deve** alinhar o modal/sheet de edição rápida da empresa em `canonical-store-profile-view.tsx` e o `ProfileInPageEditor.tsx` com a mesma linguagem visual: abas padronizadas (`Identidade`, `Sobre & Bio`, `Contato & Redes`, `Biolinks`), campos com altura mínima tátil, labels consistentes e eliminação de duplicação.

---

### 2. Matriz de Arquivos Afetados

| Arquivo | Papel na Correção |
| :--- | :--- |
| `src/components/commerce/canonical-store-profile-view.tsx` | Remoção do hero de capa 21:9 e carrossel de banners do topo; implantação do cabeçalho limpo Instagram/Threads; remoção do upload de capa do modal de edição da empresa com redirecionamento claro para o BrandKit. |
| `src/routes/_store.membro.$id.tsx` | Remoção da capa 4:1 panorâmica e do placeholder "Espaço para foto de capa"; harmonização do cluster de identidade com o padrão unificado. |
| `src/components/profile/ProfileInPageEditor.tsx` | Remoção das opções e diálogos de recorte de capa (`coverUrl`, `setCoverUrl`); alinhamento dos campos de avatar e identidade. |
| `src/components/profile/universal-profile-editor.tsx` | Remoção de `coverUrl` e métodos de capa órfãos; alinhamento aos contratos canônicos. |
| `src/components/workspace/quick-store-editor-dialog.tsx` | Ajuste explicativo no upload de banner indicando que a capa oficial para vitrines e feeds é centralizada no BrandKit. |
| `src/routes/workspace.marketing.brand-kit.tsx` | Reforço da especificação da capa de cards/feeds no BrandKit e garantia de sincronização com o objeto store. |
