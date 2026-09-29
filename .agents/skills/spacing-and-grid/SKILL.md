---
name: spacing-and-grid
description: Ajuste e auditoria da grade espacial de 4px/8px, margens de janela, gutters e colunas. Gatilho ao definir espaçamento, margem ou alinhamento de componentes.
when_not_to_use: Não utilizar para ajustes exclusivos de conteúdo textual ou cores.
inputs:
  - Componente ou container sob ajuste espacial
  - Classe de janela do dispositivo alvo
outputs:
  - Classes de padding, margin e gap estritamente ancoradas na grade modular
  - Alinhamento de colunas e gutters responsivos
---

# Objetivo
Impor consistência geométrica absoluta baseada no sistema modular de 4px/8px, eliminando espaçamentos mágicos e alinhamentos manuais desordenados.

# Procedimento Numerado
1. Identificar o tipo de relação espacial (micro-espaço, padding de componente ou margem de seção).
2. Selecionar o valor exclusivamente na escala: 4, 8, 12, 16, 20, 24, 32, 40, 48px.
3. Para paddings de cartões e modais, adotar o padrão `p-4` (16px) ou `p-6` (24px).
4. No mobile (<600px), travar a margem externa em 16px (`px-4`) sem acúmulo de padding duplo no shell.
5. No desktop (>=840px), utilizar gutter de 24px (`gap-6`) e margem de 32px (`px-8`).
6. Eliminar qualquer ocorrência de valores ímpares ou colchetes arbitrários.

# Regras Duras com Números
- Todo valor de espaçamento é estritamente múltiplo de 4px (DL-03).
- Zero uso de colchetes com valores em pixels como `p-[11px]` ou `mt-[17px]` (DL-02).
- Distância mínima de 8px entre alvos de toque adjacentes no mobile.
- Teto de largura máxima centralizada de aplicação em 1440px (`max-w-[1440px]` ou classe `max-w-7xl`).

# Checklist de Verificação
- [ ] Todas as classes `p-`, `m-` e `gap-` são múltiplos de 4px?
- [ ] O componente não gera scroll horizontal indesejado?
- [ ] O espaçamento móvel não duplica a margem já existente no shell global?
- [ ] O layout de colunas respeita a classe de janela correspondente?

# Anti-Padrões
- Usar números mágicos arbitrários para "corrigir visualmente" desalinhamento de ícone.
- Acumular múltiplos containers aninhados todos com `px-4`, espremendo o conteúdo no smartphone.
- Usar valores negativos de margem (`-mt-6`) para compensar quebras de layout.

# Exemplos

## Exemplo Bom
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  <div className="p-4 bg-card border border-border rounded-lg space-y-4">
    <div className="flex items-center gap-2">...</div>
  </div>
</div>
```

## Exemplo Ruim
```tsx
<div style={{ margin: '13px' }} className="gap-[15px] p-[9px]">
  <div className="mt-[-7px] pl-[11px]">...</div>
</div>
```
