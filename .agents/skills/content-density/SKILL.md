---
name: content-density
description: Revisão de concisão textual, rótulos de botões, títulos de tela e erradicação de prolixidade ou AI-smell. Gatilho ao escrever ou revisar textos de interface.
when_not_to_use: Não utilizar para elaboração de contratos legais complexos ou termos de privacidade integrais.
inputs:
  - Textos de interface, títulos, rótulos de botão ou mensagens de feedback
outputs:
  - Textos concisos e diretos em conformidade com as regras DL-19 a DL-24
  - Erradicação de jargões e emojis
---

# Objetivo
Impor silêncio textual, eliminando frases prolixas, instruções óbvias sobre a tela e adjetivos de marketing desnecessários.

# Procedimento Numerado
1. Ler o texto da interface e identificar sua função primordial (ação, título, alerta, dado).
2. Para botões: reduzir para no máximo 3 palavras no formato `[Verbo] + [Substantivo]`.
3. Para títulos de tela: limitar a no máximo 6 palavras atômicas.
4. Para subtítulos: remover qualquer texto que apenas repita ou explique o título óbvio.
5. Em itens de lista e tabelas: aplicar truncamento em 1 linha de título e no máximo 2 linhas de resumo.
6. Remover qualquer emoji da interface do produto (substituir por ícone técnico).

# Regras Duras com Números
- Rótulos de botão com teto máximo de 3 palavras (DL-24).
- Títulos de cabeçalho com teto máximo de 6 palavras (DL-19).
- Proibido parágrafo explicativo dentro de cartão de ação óbvia (DL-21).
- Zero emojis no produto ou especificações técnicas (DL-23).

# Checklist de Verificação
- [ ] O botão possui no máximo 3 palavras com verbo de ação direto?
- [ ] O título possui 6 palavras ou menos?
- [ ] Foram eliminadas saudações redundantes ("Bem-vindo ao...")?
- [ ] Todos os emojis foram substituídos por ícones SVG?

# Anti-Padrões
- "Clique aqui para confirmar o salvamento do seu novo item de catálogo".
- "Bem-vindo à tela de gestão de pedidos onde você pode visualizar seus pedidos recentes".
- Usar emojis como substitutos amadores de componentes de status.

# Exemplos

## Exemplo Bom
```tsx
<div className="space-y-1">
  <h1 className="text-xl font-semibold text-primary">Estoque Central</h1>
</div>
<Button variant="default">Salvar Produto</Button>
```

## Exemplo Ruim
```tsx
<div>
  <h1>📦 Bem-vindo ao Módulo de Gestão Geral de Estoque Central!</h1>
  <p>Aqui você gerencia com facilidade todos os seus itens cadastrados.</p>
</div>
<Button>Clique aqui para salvar o novo produto agora mesmo</Button>
```
