---
name: motion-and-feedback
description: Implementação e auditoria de micro-interações, durações, curvas de física e acessibilidade a movimento reduzido. Gatilho ao animar, transicionar ou prover feedback de ação.
when_not_to_use: Não utilizar para renderização puramente estática sem transição ou evento interativo.
inputs:
  - Elemento ou superfície sujeita a transição ou retorno de clique
  - Evento disparador (hover, foco, navegação, abertura de modal)
outputs:
  - Classes de transição otimizadas para GPU com respeito a prefers-reduced-motion
  - Curvas de easing padronizadas
---

# Objetivo
Prover física de interface fluida e silenciosa, sem atrasos perceptíveis para o operador e garantindo proteção a sensibilidades vestibulares.

# Procedimento Numerado
1. Determinar o papel do movimento (micro-interação, expansão, superfície modal ou rota).
2. Fixar a duração conforme a tabela: micro (100–150ms), expansão (200ms), modal (250ms), rota (300ms).
3. Aplicar a curva de desaceleração expo: `cubic-bezier(0.16, 1, 0.3, 1)`.
4. Especificar propriedades explicitamente (ex: `transition-colors`, `transition-transform`). Proibir `transition-all`.
5. Adicionar a proteção `motion-reduce:transition-none` para cancelamento em clientes com acessibilidade ativada.
6. Garantir que gestos de arraste (bottom sheet) sejam interrompíveis e reversíveis sem saltos visuais.

# Regras Duras com Números
- Teto absoluto de duração de qualquer animação travado em 300ms (DL-26).
- Resposta a interação iniciada em menos de 100ms.
- Zero uso da classe genérica `transition-all` em componentes de aplicação (DL-27).
- Presença obrigatória de suporte a movimento reduzido em todas as transições (DL-28).

# Checklist de Verificação
- [ ] A animação dura 300ms ou menos?
- [ ] Apenas propriedades leves (opacity, transform, colors) são animadas?
- [ ] A classe `motion-reduce:transition-none` está presente?
- [ ] A transição não bloqueia a entrada de novos toques do usuário?

# Anti-Padrões
- Usar animações decorativas lentas (500ms a 1000ms) que causam sensação de lentidão no sistema.
- Animar propriedades de layout caras como `width`, `height`, `padding` ou `top`, forçando reflow contínuo.
- Omitir o cancelamento de movimento em ambientes de acessibilidade.

# Exemplos

## Exemplo Bom
```tsx
<button className="transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-muted focus-visible:ring-2">
  Detalhes
</button>
```

## Exemplo Ruim
```tsx
<button className="transition-all duration-700 ease-in-out hover:w-64">
  Detalhes
</button>
```
