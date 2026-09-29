---
name: theme-factory
description: Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can apply to any artifact that has been creating, or can generate a new theme on-the-fly.
---

# Fábrica de Temas (Theme Factory)

> **Missão:** Fornecer um kit profissional de estilização visual consistente e harmoniosa para apresentações de slides, documentos executivos, relatórios analíticos, páginas de destino (landing pages) e artefatos de software. Dispõe de 10 temas de alta fidelidade prontos para uso e motor para gerar temas personalizados sob demanda.

---

## ⚡ Invocação e Uso

```bash
/theme-factory $ARGUMENTS
```

Aplique uma identidade visual coesa com fontes e paletas de cores refinadas a qualquer artefato gerado na plataforma.

---

## 🎨 Os 10 Temas Pré-definidos Canônicos

Cada tema é especificado com paleta de cores hexadecimais, pares tipográficos complementares e identidade visual única:

1. **Profundezas do Oceano (`ocean-depths`)**: Tema marítimo profissional, elegante e relaxante.
   - *Cores:* Azul marinho profundo (`#0f172a`), Azul petróleo (`#0284c7`), Turquesa (`#06b6d4`), Areia clara (`#f8fafc`).
   - *Tipografia:* Títulos em **Plus Jakarta Sans**, Corpo em **Inter**.
2. **Sunset Boulevard (`sunset-boulevard`)**: Cores quentes, vibrantes e cinematográficas do entardecer.
   - *Cores:* Roxo crepúsculo (`#2e1065`), Magenta vivo (`#db2777`), Laranja dourado (`#f97316`), Pêssego suave (`#fff7ed`).
   - *Tipografia:* Títulos em **Syne**, Corpo em **DM Sans**.
3. **Copa da Floresta (`forest-canopy`)**: Tons terrosos naturais, botânicos e equilibrados.
   - *Cores:* Verde musgo escuro (`#14532d`), Sálvia (`#16a34a`), Oliva quente (`#84cc16`), Creme natural (`#fefce8`).
   - *Tipografia:* Títulos em **Fraunces**, Corpo em **Outfit**.
4. **Minimalismo Moderno (`modern-minimal`)**: Tons de cinza limpos, monocromáticos e contemporâneos (Estilo Apple/Vercel).
   - *Cores:* Preto grafite (`#09090b`), Cinza ardósia (`#71717a`), Prata suave (`#e4e4e7`), Branco puro (`#ffffff`).
   - *Tipografia:* Títulos em **Geist**, Corpo em **Inter**.
5. **Hora Dourada (`golden-hour`)**: Paleta outonal rica, calorosa e luxuosa.
   - *Cores:* Marrom chocolate (`#451a03`), Âmbar refinado (`#d97706`), Dourado solar (`#fbbf24`), Baunilha (`#fffbeb`).
   - *Tipografia:* Títulos em **Playfair Display**, Corpo em **Lora**.
6. **Geada Ártica (`arctic-frost`)**: Tema inspirado no inverno, fresco, translúcido e revigorante.
   - *Cores:* Azul glacial profundo (`#082f49`), Ciano gelo (`#38bdf8`), Azul névoa (`#bae6fd`), Branco polar (`#f0f9ff`).
   - *Tipografia:* Títulos em **Cabinet Grotesk**, Corpo em **Satoshi**.
7. **Rosa do Deserto (`desert-rose`)**: Tons suaves, sofisticados, terrosos e acolhedores.
   - *Cores:* Terracota suave (`#881337`), Rosa empoeirado (`#f43f5e`), Argila rosa (`#fecdd3`), Areia pálida (`#fff1f2`).
   - *Tipografia:* Títulos em **Cormorant Garamond**, Corpo em **Plus Jakarta Sans**.
8. **Inovação Tecnológica (`tech-innovation`)**: Estética tecnológica arrojada, cibernética e de alta energia (Estilo Linear/Stripe).
   - *Cores:* Índigo cósmico (`#1e1b4b`), Violeta elétrico (`#6366f1`), Ciano laser (`#06b6d4`), Preto obsidiana (`#020617`).
   - *Tipografia:* Títulos em **Space Grotesk**, Corpo em **JetBrains Mono**.
9. **Jardim Botânico (`botanical-garden`)**: Cores frescas, orgânicas, vivas e revigorantes de estufa.
   - *Cores:* Esmeralda profunda (`#064e3b`), Menta fresca (`#10b981`), Limão orvalho (`#a7f3d0`), Branco vegetal (`#f0fdf4`).
   - *Tipografia:* Títulos em **Newsreader**, Corpo em **Manrope**.
10. **Galáxia da Meia-Noite (`midnight-galaxy`)**: Tons profundos, dramáticos, espaciais e etéreos.
    - *Cores:* Vazio cósmico (`#030712`), Roxo estelar (`#7c3aed`), Rosa nebulosa (`#ec4899`), Estrela cadente (`#fdf4ff`).
    - *Tipografia:* Títulos em **Clash Display**, Corpo em **Inter**.

---

## 🛠️ Fluxo de Aplicação de Temas

1. **Exibir Vitrine de Temas (`theme-showcase`):**
   - Apresentar o catálogo dos 10 temas disponíveis com suas respectivas amostras de cores e fontes para visualização.
2. **Consultar Preferência do Usuário:**
   - Perguntar qual tema melhor atende ao objetivo do baralho/artefato.
3. **Aguardar Confirmação Explícita:**
   - Obter a seleção final antes de aplicar as mutações visuais.
4. **Aplicação Consistente:**
   - Aplicar tokens semânticos (`--color-primary`, `--font-heading`, etc.) de forma homogênea em todos os slides ou seções.
   - Validar taxa de contraste mínima (WCAG 2.2 AA $\ge 4.5:1$ para texto regular e $\ge 3:1$ para títulos/UI).

---

## 🧪 Geração de Tema Personalizado (On-the-Fly)

Quando nenhum dos 10 temas predefinidos atender plenamente à necessidade específica:
1. Receber o briefing descritivo (ex: "Clínica de Saúde Integrativa", "Boutique de Café Especial").
2. Gerar uma paleta de 5 cores harmoniosas (fundo, superfície, primária, secundária e destaque).
3. Selecionar par tipográfico coerente com o arquétipo da marca.
4. Apresentar o tema personalizado para validação e aplicar no artefato desejado.

---

## 📚 Biblioteca de Referências Técnicas & Arquivos de Temas

- Arquivos de temas em formato estruturado: `.agents/skills/theme-factory/themes/*.json` (10 arquivos).
- [`references/typography-pairings.md`](references/typography-pairings.md): Combinações tipográficas modernas e seguras para web.
- [`references/color-palette-harmony.md`](references/color-palette-harmony.md): Regras de proporção 60-30-10, contraste WCAG e HSL.
- [`references/theme-application-guide.md`](references/theme-application-guide.md): Aplicação em slides (reveal.js/Marp), HTML landing pages e relatórios.
- [`references/dynamic-theme-generation.md`](references/dynamic-theme-generation.md): Algoritmo de síntese de temas customizados a partir de palavras-chave.
