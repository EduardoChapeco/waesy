---
name: design-foundations
description: Estruturação inicial e criação de qualquer tela, componente ou layout novo na plataforma Waesy. Gatilho obrigatório ao iniciar qualquer desenvolvimento de UI.
when_not_to_use: Não utilizar para correções isoladas de backend, queries puras de banco ou scripts de migração.
inputs:
  - Spec funcional da tela ou componente (docs/specs/SPEC-*.md)
  - Identificação do domínio e viewport alvo (Compact, Medium, Expanded)
outputs:
  - Estrutura JSX canônica consumindo tokens de tokens.json e estilos em styles.css
  - Shell adaptativo, design bidirecional e matriz de 4 estados
---

# Objetivo
Garantir que toda nova superfície visual da plataforma Waesy nasça ancorada na constituição `docs/design/DESIGN.md`, consumindo tokens semânticos, implementando design bidirecional e sem deriva visual.

# Procedimento Numerado
1. Identificar a classe de janela alvo (<600px Compact, 600-839px Medium, >=840px Expanded).
2. Determinar o layout canônico aplicável (Master-Detail, Supporting Panel ou Feed/Bento Grid Tetris).
3. **Verificação de Bidirecionalidade:** Garantir que blocos de vitrine pública (`_store.*`) possuam espelho de edição no Admin Master (`admin-master.*`) ou Workspace (`workspace.*`).
4. Selecionar o primitivo canônico correspondente em `src/components/ui/` (evitar duplicatas).
5. Mapear o fundo para `--surface-canvas` ou `--surface-card` e o texto para `--text-primary`.
6. **Trava Anti-Jank:** Fixar aspect-ratio no contêiner CSS antes da chegada de dados assíncronos.
7. Implementar a matriz completa de 4 estados: Loading (Skeleton 1:1 isomórfico), Data, Empty (2 linhas e ação) e Error (com diagnóstico e reintento).
8. Aplicar utilitários canônicos de safe-area sem colchetes arbitrários (`pt-safe-modal`, `top-safe-notch`, `px-mobile-edge`, `pb-safe`).
9. Executar o lint visual localmente via `node scripts/design-lint.mjs --ratchet`.

# Regras Duras com Números
- Exatamente 1 ação primária (`variant="default"`) por superfície visual visível.
- Alvos de toque em telas móveis com dimensão mínima de 44x44px (`h-11 min-h-11`).
- Margem de shell móvel fixada em 16px (ou `px-mobile-edge` para full-bleed com borda de 1px).
- Zero valores arbitrários entre colchetes (`w-[...]`) ou classes com `!important`.
- Título de tela com teto máximo de 6 palavras; rótulo de botão com no máximo 3 palavras.
- Zero emojis no produto ou especificações técnicas.

# Checklist de Verificação
- [ ] O componente consome tokens semânticos e nenhuma cor hexadecimal literal?
- [ ] O layout bifurca adequadamente entre mobile (App Shell nativo) e desktop (sistema denso)?
- [ ] O bloco possui espelho bilateral no Admin Master ou Workspace (quando aplicável)?
- [ ] Todos os 4 estados da matriz estão implementados com skeleton isomórfico (sem spinners soltos)?
- [ ] O botão primário possui anel de foco visível com 2px de espessura (`focus-visible:ring-2`)?
- [ ] O texto em cards squircle não sofre truncamento cego com `truncate`?

# Anti-Padrões
- Desenhar layout desktop e deixá-lo encolher fluidamente no smartphone gerando quebra visual.
- Usar múltiplos botões primários competindo pela atenção do usuário.
- Omitir estado de carregamento exibindo tela em branco ou spinners soltos girando no vácuo.
- Textos conversacionais de instrução óbvia ("Bem-vindo ao...", "Aqui você pode cadastrar...").

# Exemplos

## Exemplo Bom
```tsx
<div className="flex flex-col gap-4 p-4 bg-card border border-border/80 rounded-2xl">
  <h2 className="text-lg font-semibold text-primary">Resumo do Pedido</h2>
  <Button variant="default" className="h-11 min-h-11 w-full focus-visible:ring-2">Confirmar</Button>
</div>
```

## Exemplo Ruim
```tsx
<div style={{ padding: '15px', background: '#fff' }} className="w-[340px] shadow-lg">
  <h2 className="text-[17px] font-bold text-[#111]">📦 Bem-vindo ao Resumo Completo do Pedido Geral!</h2>
  <button className="!bg-black h-8 text-white">Clique aqui para confirmar o pedido agora mesmo</button>
</div>
```
