# SPEC-REMEDIACAO-TURISMO-DESIGN-E-UNIFICACAO: Remediação de Design System, Omissão Dinâmica de Abas Vazias e Unificação de Vitrines no Nicho de Turismo

> **Status:** APROVADO PARA IMPLEMENTAÇÃO  
> **Data:** 24 de Outubro de 2026  
> **Autor:** Antigravity Architect Core  
> **Normas Relacionadas:** `AGENTS.md` (B.1 a B.41), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md` (DL-01 a DL-30), B.33, B.36  

---

## 1. Problema e Motivação
A auditoria forense identificou violações críticas de Design Lint e regras de integridade visual no componente `TravelPackageDetailView` (`src/components/commerce/travel/travel-package-detail-view.tsx`):
1. **Violação da Invariante B.33:** Abas de navegação (`Destino`, `Hospedagem`, `Roteiro`, `Voos e Mapa`) são renderizadas estaticamente mesmo quando o pacote turístico não contém dados preenchidos de resort, itinerário ou voos.
2. **Violação DL-02 (Classes Arbitrárias):** Uso de `h-[50vh] min-h-[350px] max-h-[500px]`, `after:w-8 after:h-0.5` e gradientes decorativos sobre superfícies de aplicação (`bg-gradient-to-t from-black/85...`).
3. **Violação DL-14 (Touch Targets < 44px):** Botões de abas com altura efetiva de ~36px (`py-3`) sem o piso obrigatório de 44px (`h-11 min-h-11`).
4. **Violação DL-15 (Foco Teclado Ausente):** Elementos `<button>` interativos sem classes `:focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.

---

## 2. Requisitos Estruturados (Sintaxe EARS)

### REQ-TUR-01: Omissão Dinâmica de Abas em Detalhe de Pacote (EARS-DynamicTabs)
- **QUANDO** um pacote turístico for exibido em `TravelPackageDetailView`,
- **O SISTEMA DEVE** avaliar dinamicamente a presença de dados reais em cada dimensão:
  - A aba `Hospedagem` só deve ser exibida se `resort.name` ou `packageData.hotel_name` ou `packageData.hotel_details` estiver preenchido com dados válidos.
  - A aba `Roteiro` só deve ser exibida se `itineraryDays` contiver pelo menos 1 dia preenchido.
  - A aba `Voos e Mapa` só deve ser exibida se `flightDetails` possuir trechos aéreos ou se houver latitude/longitude válidas para mapa.
  - A aba `Destino` é a aba base descritiva e sempre permanece disponível se houver título ou descrição.
- **SE** uma aba não possuir dados reais,
- **ENTÃO O SISTEMA DEVE** omitir completamente o botão da aba da régua de navegação e nunca renderizar contêineres vazios.

### REQ-TUR-02: Piso Ergonômico de 44px e Foco Teclado (EARS-A11yFloor)
- **UBÍQUO:** Todo botão de navegação de aba, botão de reserva, botão de contato e expansão de dia de roteiro DEVE possuir altura mínima de 44px (`h-11 min-h-11`), anel de foco explícito `:focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` e indicador de clique acessível.

### REQ-TUR-03: Erradicação de Classes com Colchetes e Gradientes Proibidos (EARS-TokenCompliance)
- **UBÍQUO:** Todas as classes com colchetes arbitrários (`h-[50vh]`, `min-h-[350px]`, `max-h-[500px]`) DEVEM ser substituídas por classes canônicas da escala Tailwind (`aspect-video`, `aspect-[16/9]` canônico ou alturas nominais `h-80 sm:h-96`).
- **UBÍQUO:** O gradiente decorativo de fundo deve ser substituído por sobreposição semântica neutra do tema (`bg-background/80` ou `bg-black/60` para legibilidade de texto sobre fotografia).

---

## 3. Matriz de Arquivos Afetados

| Arquivo | Ação | Responsabilidade |
| :--- | :--- | :--- |
| `src/components/commerce/travel/travel-package-detail-view.tsx` | Modificação | Sanear DL-02, DL-14, DL-15, remover gradiente decorativo e filtrar abas dinamicamente (B.33) |

---

## 4. Critérios de Aceite e Evidências
1. `node scripts/design-lint.mjs --target src/components/commerce/travel/travel-package-detail-view.tsx` executado com zero novas violações P0/P1 no arquivo.
2. Abas sem dados reais omitidas 100% da navegação.
3. Alvos de toque de abas e botões com dimensão mínima de 44x44px (`h-11 min-h-11`).
4. Foco visível `:focus-visible:ring-2` operante em todos os elementos clicáveis.
