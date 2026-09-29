---
name: design-foundations
description: Estruturação inicial e criação de qualquer tela, componente ou layout novo na plataforma Waesy. Gatilho obrigatório ao iniciar qualquer desenvolvimento de UI.
when_not_to_use: Não utilizar para correções isoladas de backend, queries puras de banco ou scripts de migração.
inputs:
  - Spec funcional da tela ou componente (docs/specs/SPEC-*.md)
  - Identificação do domínio e viewport alvo (Compact, Medium, Expanded)
outputs:
  - Estrutura JSX canônica consumindo tokens de tokens.json e estilos em styles.css
  - Shell adaptativo e matriz de 4 estados
---

# Objetivo
Garantir que toda nova superfície visual da plataforma Waesy nasça ancorada na constituição `docs/design/DESIGN.md`, consumindo tokens semânticos e sem deriva visual.

# Procedimento Numerado
1. Identificar a classe de janela alvo (<600px Compact, 600-839px Medium, >=840px Expanded).
2. Determinar o layout canônico aplicável (Master-Detail, Supporting Panel ou Feed/Bento Grid).
3. Selecionar o primitivo canônico correspondente em `src/components/ui/` (evitar duplicatas).
4. Mapear o fundo para `--surface-canvas` ou `--surface-card` e o texto para `--text-primary`.
5. Implementar a matriz de 4 estados: Loading (Skeleton), Data, Empty (2 linhas) e Error (com reintento).
6. Executar o lint visual localmente via `node scripts/design-lint.mjs --changed`.

# Regras Duras com Números
- Exatamente 1 ação primária (`variant="default"`) por superfície visual visível.
- Alvos de toque em telas móveis com dimensão mínima de 44x44px (`h-11`).
- Margem de shell móvel fixada em 16px (ou 0px para full-bleed com borda de 1px).
- Zero valores arbitrários entre colchetes (`w-[...]`) ou classes com `!important`.

# Checklist de Verificação
- [ ] O componente consome tokens semânticos e nenhuma cor hexadecimal literal?
- [ ] O layout bifurca adequadamente entre mobile e desktop?
- [ ] Todos os 4 estados da matriz estão implementados?
- [ ] O botão primário possui anel de foco visível com 2px de espessura?

# Anti-Padrões
- Desenhar layout desktop e deixá-lo encolher fluidamente no smartphone gerando truncamento.
- Usar múltiplos botões pretos sólidos competindo pela atenção do operador.
- Omitir estado de carregamento exibindo tela em branco durante queries de rede.

# Exemplos

## Exemplo Bom
```tsx
<div className="flex flex-col gap-4 p-4 bg-card border border-border rounded-lg">
  <h2 className="text-lg font-semibold text-primary">Resumo do Pedido</h2>
  <Button variant="default" className="h-11 w-full focus-visible:ring-2">Confirmar</Button>
</div>
```

## Exemplo Ruim
```tsx
<div style={{ padding: '15px', background: '#fff' }} className="w-[340px] shadow-lg">
  <h2 className="text-[17px] font-bold text-[#111]">Resumo do Pedido</h2>
  <button className="!bg-black h-8 text-white">Confirmar</button>
</div>
```
