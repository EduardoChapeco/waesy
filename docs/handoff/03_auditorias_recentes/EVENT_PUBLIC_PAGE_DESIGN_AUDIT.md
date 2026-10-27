# EVENT_PUBLIC_PAGE_DESIGN_AUDIT — Auditoria e Redesenho da Página Pública de Evento

## 1. Diagnóstico dos Defeitos Visuais Anteriores e Correções Aplicadas

| Problema Identificado | Causa-Raiz Anterior | Solução Arquitetural Implementada (`EventClassifiedShowcaseView`) |
| :--- | :--- | :--- |
| **Sombra escura pesada cobrindo a arte do Hero** | `div` com `bg-gradient-to-t from-background via-background/60 to-transparent` sobreposto à imagem da capa. | Removido o gradiente escuro sobre a capa. O Hero agora exibe a arte limpa com `rounded-lg`, aspect ratio estável (`aspect-[16/9] sm:aspect-[21/9]`) e ponto focal configurável (`object-center`, `object-top`, `object-bottom`). |
| **Título espremido em coluna estreita** | O título dividia a mesma linha horizontal com botões de ação dentro do overlay do Hero. | Criado bloco de cabeçalho dedicado abaixo do Hero ocupando **100% da largura útil**, com `break-words text-wrap` e zero `truncate` ou `line-clamp`. |
| **Mistura de horários com classificação etária** | `Portões: 18:30 • Livre` apareciam concatenados na mesma string. | Separação semântica estrita: Badges superiores exibem `Modalidade` (`Evento Presencial`), `Classificação Livre` e `Confirmados`, enquanto o bloco de Horários exibe `Portões`, `Início`, `Término` e `Fuso (BRT UTC-3)`. |
| **Barra de âncoras sem ScrollSpy** | `activeSection` mudava apenas no clique e exibia abas vazias. | Implementado `IntersectionObserver` real atualizando `activeSection` durante a rolagem, renderizando apenas `event.available_sections` (omitindo abas vazias conforme Regra B.33) em linha horizontal contínua (`flex-nowrap overflow-x-auto`, Regra B.39). |
| **Galeria Exclusiva do Feed ignorada** | `extraImages` (`classified.images`) era declarada na linha 169 mas nunca renderizada no JSX. | Criada a seção `#section-midia` (**Mídia e Galeria do Evento**) com grid responsivo, suporte a vídeo/aftermovie, atalho para Story 9:16 e **Lightbox Dialog** em tela cheia. |
| **Selo falso `"Anunciante Verificado"`** | String estática hardcoded na linha 1397 para qualquer evento. | Removido o selo hardcoded. O badge `"Organizador Verificado"` agora só é renderizado quando `org.is_verified === true` (validado contra `store.is_verified` ou `profiles.is_verified`). |
