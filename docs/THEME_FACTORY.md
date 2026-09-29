# Fábrica de Temas & Estilização de Artefatos (Waesy Platform)

> **Single Source of Truth (SSOT)** para estilização visual de apresentações de slides, documentos institucionais, relatórios analíticos, páginas de destino e artefatos de software na plataforma Waesy.
> Referência técnica vinculante: `.agents/skills/theme-factory/SKILL.md`.

---

## 🎨 1. Catálogo Oficial dos 10 Temas Canônicos

| ID | Nome em Português | Nome Original | Atmosfera / Arquétipo | Heading Font | Body Font |
| --- | --- | --- | --- | --- | --- |
| `ocean-depths` | Profundezas do Oceano | Ocean Depths | Corporativo marítimo, solidez e calma | Plus Jakarta Sans | Inter |
| `sunset-boulevard` | Sunset Boulevard | Sunset Boulevard | Criativo, caloroso e cinematográfico | Syne | DM Sans |
| `forest-canopy` | Copa da Floresta | Forest Canopy | Orgânico, botânico e sustentável | Fraunces | Outfit |
| `modern-minimal` | Minimalismo Moderno | Modern Minimal | Monocromático, high-end e limpo | Geist | Inter |
| `golden-hour` | Hora Dourada | Golden Hour | Nobre, luxuoso e outonal | Playfair Display | Lora |
| `arctic-frost` | Geada Ártica | Arctic Frost | Refrescante, glacial e tecnológico | Cabinet Grotesk | Satoshi |
| `desert-rose` | Rosa do Deserto | Desert Rose | Sofisticado, acolhedor e pó-terroso | Cormorant Garamond | Plus Jakarta Sans |
| `tech-innovation` | Inovação Tecnológica | Tech Innovation | Cibernético, veloz e de alta energia | Space Grotesk | JetBrains Mono |
| `botanical-garden` | Jardim Botânico | Botanical Garden | Fresco, vigoroso e curativo | Newsreader | Manrope |
| `midnight-galaxy` | Galáxia da Meia-Noite | Midnight Galaxy | Profundo, cósmico e futurista | Clash Display | Inter |

---

## 🛠️ 2. Regras de Aplicação de Estilo

1. **Contraste Mínimo WCAG 2.2 AA:**
   - Todo texto deve atingir contraste mínimo de $4.5:1$ contra a cor de fundo subjacente.
   - Elementos interativos e títulos devem manter no mínimo $3.0:1$.
2. **Harmonia Estrutural 60-30-10:**
   - 60% Fundo / Superfície principal.
   - 30% Estrutura de cartões, divisores e fundos secundários.
   - 10% Acento primário de ação (Call to Action).
3. **Geração Dinâmica de Temas (On-the-Fly):**
   - Na ausência de compatibilidade com os 10 temas nativos, o motor `theme-factory` sintetiza uma paleta customizada com verificação imediata de contraste antes de aplicar no artefato.
