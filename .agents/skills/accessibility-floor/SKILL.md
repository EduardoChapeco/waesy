---
name: accessibility-floor
description: Auditoria e garantia mecânica de conformidade com o piso WCAG 2.2 AA. Gatilho obrigatório antes de qualquer entrega com elementos interativos ou rotas de UI.
when_not_to_use: Não utilizar para rotinas de backend sem interação humana.
inputs:
  - Rota, tela ou componente interativo
  - Árvore DOM ou código TSX
outputs:
  - Verificação de foco visível, touch targets, contraste e navegação por teclado
  - Eliminação de bloqueadores P0
---

# Objetivo
Blindar a plataforma contra barreiras de acessibilidade, assegurando cumprimento estrito do piso WCAG 2.2 Nível AA.

# Procedimento Numerado
1. Mapear todos os elementos clicáveis (`button`, `a`, `input`, `select`, `div onClick`).
2. Garantir que cada elemento possua `:focus-visible` com anel contrastante de 2px (DL-15).
3. Verificar a dimensão dos alvos de toque: no mobile, exigir mínimo de 44x44px (`h-11`) (DL-14).
4. Calcular o contraste de texto: exigir >= 4.5:1 para texto normal e >= 3:1 para controle (DL-16, DL-17).
5. Validar que todo input possua elemento `<Label>` com `htmlFor` correspondente.
6. Garantir navegação sequencial por Tab e armadilha de foco (focus trap) em modais.

# Regras Duras com Números
- 100% dos elementos interativos com anel de foco `:focus-visible:ring-2` visível (DL-15).
- Área de toque móvel de 44x44px mínima inegociável (DL-14).
- Contraste de texto mínimo de 4.5:1 (DL-16).
- Contraste de controle e bordas de input mínimo de 3:1 (DL-17).

# Checklist de Verificação
- [ ] A navegação por Tab atinge todos os controles sem saltar elementos?
- [ ] O anel de foco não fica oculto sob barras fixas de topo ou rodapé?
- [ ] Todos os botões de ícone possuem `aria-label` descritivo?
- [ ] Não há nenhum texto branco sobre fundo de baixo contraste?

# Anti-Padrões
- Usar `outline-none` sem fornecer anel de substituição `:focus-visible:ring-2`.
- Criar botões de ícone minúsculos (`h-6 w-6`) sem padding de expansão no mobile.
- Depender apenas da cor para indicar status de erro em formulários.

# Exemplos

## Exemplo Bom
```tsx
<button
  type="button"
  aria-label="Fechar diálogo"
  className="size-11 flex items-center justify-center rounded-md border border-border text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <X className="size-5" aria-hidden="true" />
</button>
```

## Exemplo Ruim
```tsx
<div onClick={handleClose} className="w-5 h-5 cursor-pointer outline-none">
  <X />
</div>
```
