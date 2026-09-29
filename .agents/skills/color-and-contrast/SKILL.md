---
name: color-and-contrast
description: Seleção, derivação e auditoria rigorosa de paletas tonais e contraste visual (WCAG 2.2 AA). Gatilho ao escolher, criar ou auditar pares de cores em qualquer interface.
when_not_to_use: Não utilizar para ajustes puramente espaciais ou de tipografia sem impacto cromático.
inputs:
  - Cores ou tokens em análise
  - Superfície de fundo (Canvas, Card, Dialog)
outputs:
  - Razão de contraste calculada (APCA / WCAG 2.2)
  - Mapeamento para tokens semânticos seguros
---

# Objetivo
Assegurar que todas as relações de cor na plataforma cumpram o piso inegociável de acessibilidade e que a cor nunca seja o único portador de significado.

# Procedimento Numerado
1. Identificar o plano de fundo da superfície onde o elemento será inserido.
2. Selecionar o token semântico apropriado na Camada 2 de `tokens.json`.
3. Calcular a razão de contraste contra o fundo usando a fórmula W3C de luminância relativa.
4. Validar se o texto normal atinge >= 4.5:1 e elementos de controle atingem >= 3:1.
5. Em casos de status (sucesso, erro, alerta), adicionar ícone semântico obrigatório.
6. Proibir terminantemente o uso de `text-white` ou hexadecimais literais nos componentes.

# Regras Duras com Números
- Razão de contraste mínima de 4.5:1 para todo texto inferior a 18pt (DL-16).
- Razão de contraste mínima de 3:1 para bordas de controles ativos e ícones essenciais (DL-17).
- Zero ocorrências de cores hexadecimais (#HEX) no código JSX/TSX de produção (DL-01).
- Zero uso de `text-white` fixo em badges de aviso ou status (DL-18).

# Checklist de Verificação
- [ ] A cor do texto possui contraste comprovado >= 4.5:1?
- [ ] O controle possui contraste de borda ou preenchimento >= 3:1?
- [ ] Existe ícone semântico acompanhando mensagens de alerta ou erro?
- [ ] O token consumido pertence à camada semântica?

# Anti-Padrões
- Usar texto branco sobre fundos amarelos ou laranjas claros gerando ilegibilidade.
- Usar cor vermelha isolada sem ícone ou texto explicativo para indicar erro em formulário.
- Declarar estilos inline dinâmicos como `style={{ color: '#2563eb' }}`.

# Exemplos

## Exemplo Bom
```tsx
<div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
  <WarningCircle className="size-5 shrink-0" aria-hidden="true" />
  <span className="text-sm font-medium">Estoque insuficiente para conclusão</span>
</div>
```

## Exemplo Ruim
```tsx
<div style={{ color: '#ff0000' }} className="p-2">
  <span>Falha no estoque</span>
</div>
```
