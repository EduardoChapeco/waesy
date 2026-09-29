---
name: typography-scale
description: Definição, revisão e auditoria da escala modular tipográfica, pesos, tracking e limites de medida de linha. Gatilho ao definir ou revisar tipografia de interface.
when_not_to_use: Não utilizar para ajustes de cores ou configurações de animação.
inputs:
  - Elemento tipográfico em análise (títulos, corpo, tabelas, badges)
  - Papel do texto na hierarquia
outputs:
  - Classe Tailwind canônica correspondente aos 8 tamanhos permitidos
  - Alinhamento de peso e tracking
---

# Objetivo
Impor ritmo tipográfico coeso, eliminando cardinalidade excessiva de fontes e garantindo legibilidade e retenção de leitura em conformidade com Bringhurst.

# Procedimento Numerado
1. Identificar o papel textual (display, título operacional, corpo padrão, legenda compacta).
2. Mapear o tamanho exclusivamente para a escala de 8 níveis (`text-xs` a `text-4xl`).
3. Definir o peso entre os 3 permitidos: Regular (`font-normal`), Medium (`font-medium`) ou Semibold (`font-semibold`).
4. Aplicar `tracking-tight` em títulos (`text-2xl`+) e tracking padrão no corpo.
5. Limitar parágrafos de texto corrido a 45–75 caracteres (`max-w-prose`).
6. Truncar itens de lista em 1 linha de título e no máximo 2 linhas de resumo (`line-clamp-2`).

# Regras Duras com Números
- Teto absoluto de 8 tamanhos de fonte distintos no sistema inteiro (DL-10).
- Máximo de 3 pesos tipográficos ativos em interface operacional (400, 500, 600).
- Comprimento de linha contínua travado entre 45 e 75 caracteres.
- Zero classes tipográficas arbitrárias entre colchetes como `text-[15px]` (DL-02).

# Checklist de Verificação
- [ ] O tamanho da fonte pertence ao catálogo dos 8 tamanhos canônicos?
- [ ] O peso da fonte é 400, 500 ou 600?
- [ ] Títulos display utilizam tracking negativo sutil?
- [ ] O comprimento de linha de parágrafos não excede `max-w-prose`?

# Anti-Padrões
- Criar tamanhos intermediários inventados como `text-[13px]` para "encaixar" texto.
- Usar peso Black (900) ou Hairline (100) que prejudicam a renderização em telas de baixa densidade.
- Deixar textos de parágrafo expandirem por 100% da largura em monitores ultra-wide.

# Exemplos

## Exemplo Bom
```tsx
<div className="space-y-1 max-w-prose">
  <h1 className="text-2xl font-semibold tracking-tight text-primary">Relatório Financeiro</h1>
  <p className="text-sm font-normal text-muted-foreground leading-relaxed">
    Visão consolidada de recebíveis e taxas do exercício fiscal corrente.
  </p>
</div>
```

## Exemplo Ruim
```tsx
<div>
  <h1 className="text-[26px] font-black text-black">Relatório Financeiro</h1>
  <p className="text-[13px] font-thin text-gray-500 w-full">Visão consolidada...</p>
</div>
```
