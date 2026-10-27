# Redesign Silencioso e Minimalista da Tela Principal do Super App

Reestruturação completa da tela principal (`/_store/` — `src/routes/_store.index.tsx`) para eliminar a sobrecarga cognitiva e estabelecer um **design silencioso, fluido, confiável e padronizado**, preservando **100% das funcionalidades existentes**.

## Diagnóstico & Oportunidades de Melhoria

1. **Header / Carrossel de Módulos:**
   - *Antes:* Rail com 9 pilares misturados com aspecto 16:10 e gradientes pesados.
   - *Novo:* Carrossel horizontal em formato banner 16:9 destacando os 3 módulos mestres (**'Places'**, **'Classificados'** e **'Feed'**), com fotos de alta qualidade, overlay escuro sutil apenas na zona de texto e tipografia branca moderna e legível.

2. **Busca e Filtros (Ocultando a Complexidade):**
   - *Antes:* Barra com comutadores e múltiplos botões/chips espalhados na tela.
   - *Novo:* Campo de busca amplo e limpo (`"Buscar anúncios, empresas, etc."`) com um único botão minimalista de **Filtros** (`SlidersHorizontal`). Todos os filtros secundários (Cidades, Aceita Troca, Cartão, Destaques) ficam organizados em um **Bottom Sheet** ergonômico, mantendo a tela principal limpa e silenciosa.

3. **Navegação de Categorias (Tabs de Texto Minimalistas):**
   - *Antes:* Chips com bordas, preenchimentos pesados ou pílulas coloridas.
   - *Novo:* Abas de texto horizontais deslizantes sem bordas ou caixas. A aba ativa recebe texto em negrito escuro com sublinhado sutil da cor do app (`border-b-2 border-primary`), e as inativas ficam em cinza médio legível.

4. **Feed de Anúncios / Cards (Limpos e Focados):**
   - *Antes:* Badges e etiquetas coloridas sobrepostas sobre a imagem criando poluição visual.
   - *Novo:* Fundo do app em cinza extraclareza (`#F8F9FA`), cards brancos com cantos suaves (`rounded-2xl`) e sombra imperceptível. A foto respira sem tags por cima. Abaixo da foto: título limpo, preço em destaque na tipografia mono e localização discreta.

5. **Hierarquia e Ergonomia:**
   - Whitespace generoso entre seções. Cores saturadas reservadas exclusivamente para CTAs de conversão (ex: WhatsApp).

---

## Proposed Changes

### Super App Storefront (`src/routes/_store.index.tsx`)

#### [MODIFY] [src/routes/_store.index.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.index.tsx)

- **1. Header / Carrossel de Módulos (16:9):**
  - Configurar cards retangulares nos módulos canônicos: `'Places'` (Guia Comercial / `/diretorio`), `'Classificados'` (`/classificados`) e `'Feed'` (`/feed`).
  - Imagens de alta qualidade em formato banner 16:9 (`aspect-[16/9]`), com overlay gradiente suave na base e tipografia moderna sem serifa.
- **2. Busca Ampla + Filtros em Bottom Sheet:**
  - Barra de busca expansiva com placeholder `"Buscar anúncios, empresas, etc."`.
  - Botão de ajustes/sliders (`SlidersHorizontal`) com indicador de filtros ativos.
  - Implementar o componente `Dialog` / `Sheet` de filtros secundários:
    - Seletor de Cidades (integração com `CANONICAL_CITIES` e cookie `waesy_city`).
    - Toggle de "Apenas Destaques".
    - Toggle de "Aceita Troca".
    - Toggle de "Aceita Cartão / Parcelamento".
    - Botão "Limpar Filtros" e "Aplicar".
- **3. Tabs de Texto Deslizantes:**
  - Substituir pílulas pesadas por linha horizontal de abas de texto deslizantes: `'Todos'`, `'Imóveis'`, `'Veículos'`, `'Serviços'`, `'Places'`, `'Classificados'`, `'Feed'`, etc.
  - Estilo: Texto preto/negrito + sublinhado da cor primária na ativa; cinza médio nas inativas; sem bordas/caixas ao redor.
- **4. Cards de Anúncios Silenciosos:**
  - Remover qualquer tag/badge redundante de cima da imagem dos anúncios.
  - Estrutura clara: Foto destacada ➔ Título objetivo ➔ Preço formatado ➔ Localização discreta.
  - Fundo em cinza claro `#F8F9FA` com cards brancos, sombra imperceptível e bordas ultrafinas de 1px.
- **5. Modos de Visualização Mantidos:**
  - Garantir total paridade dos 3 modos (Feed com trilhos horizontais, Grade expandida e Lista) dentro do novo padrão silencioso.

---

## Verification Plan

### Automated Tests
- Executar `npm run build` para garantir que todas as tipagens TypeScript, rotas e compilação estejam 100% livres de erros (0 errors).

### Manual & Visual Verification
- Abrir a aplicação no navegador real via `browser_subagent`.
- Gravar a sessão de navegação navegando pela tela principal:
  - Visualizar o carrossel 16:9 de 'Places', 'Classificados' e 'Feed'.
  - Testar a barra de busca e abrir o Bottom Sheet de filtros secundários.
  - Alternar entre as abas de texto minimalistas ('Todos', 'Imóveis', 'Veículos', 'Serviços').
  - Validar a clareza e limpeza visual dos cards de anúncios sem poluição sobre as fotos.
