# Registry Central de Blocos, Seções e Widgets (Prompt 06)

## 1. Princípio da Autoridade Única
Nenhum produtor de interface (Builder, Chat, Editor de Documentos, Apresentações) declara blocos soltos. Toda superfície consome o `src/components/builder/registry.ts`.

## 2. Famílias Canônicas de Blocos

| Família | ID do Bloco | Finalidade | Responsividade | Estados |
| :--- | :--- | :--- | :--- | :--- |
| **Hero** | `hero_minimal_split` | Apresentação com split de texto e CTA | 1 col mobile / 2 cols desktop | Vazio, Dados |
| **Hero** | `hero_interactive_carousel` | Carrossel rotativo multi-slides | Full width, touch swipe | Carregando, Dados |
| **Layout** | `bento_asymmetric_4` | Bento Grid assimétrico de 4 posições | Empilhado mobile / Grid 12 cols desktop | Dados |
| **Seções** | `pricing_three_tiers` | Tabela de planos com 3 níveis | Carrossel mobile / 3 cols desktop | Dados |
| **Seções** | `testimonials_social_proof` | Prova social com avaliações reais | Snap scroll mobile / Grade desktop | Dados |
| **Seções** | `faq_clean_accordion` | Dúvidas frequentes em acordeão limpo | Acordeão acessível (Radix) | Vazio, Dados |
| **Interativo** | `media_gallery_mosaic` | Mosaico de mídia com zoom | 2 cols mobile / Mosaico desktop | Carregando, Dados |
| **Interativo** | `contact_form_direct` | Formulário direto de contato | 1 col mobile / 2 cols desktop | Enviando, Sucesso, Erro |

## 3. Contrato Público do Bloco
Todo bloco obedece ao contrato `SiteBuilderBlockDefinition`:
- `id`: Identificador estável em snake_case.
- `name`: Título limpo e direto (máx. 3 palavras).
- `category`: `hero`, `layout`, `sections` ou `interactive`.
- `description`: Explicação objetiva da função.
- `component`: Primitiva React tipada com design tokens.
- `defaultProps`: Payload inicial válido e executável (zero mocks).
