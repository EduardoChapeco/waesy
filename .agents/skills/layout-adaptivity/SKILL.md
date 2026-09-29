---
name: layout-adaptivity
description: Decisão estrutural e bifurcação de layout entre plataformas Compact (<600px), Medium (600-839px) e Expanded (>=840px). Gatilho ao definir ou refatorar layouts responsivos.
when_not_to_use: Não utilizar para ajustes em componentes folha (ícones ou botões isolados).
inputs:
  - Tela completa ou fluxo operacional
  - Requisitos de densidade de informação
outputs:
  - Bifurcação estrutural com os dois produtos (móvel nativo e desktop expandido)
  - Layouts canônicos aplicados (Master-Detail, Bento, Bottom Sheet)
---

# Objetivo
Assegurar que dispositivos móveis recebam experiência nativa de alta ergonomia e que desktops tirem proveito da área expandida, eliminando layouts que apenas encolhem.

# Procedimento Numerado
1. Identificar se a rota é primariamente de consumo rápido (móvel) ou gestão densa (desktop).
2. Adotar o layout canônico apropriado (Lista-Detalhe, Painel de Apoio ou Feed).
3. No Compact (<600px):
   - Proibir tabelas horizontais com scroll desajeitado; converter em cartões empilhados ou lista vertical estilo WhatsApp.
   - Posicionar a ação primária e as abas principais na barra inferior fixa (zona do polegar).
   - Utilizar Bottom Sheets de 100dvh para formulários e filtros auxiliares.
4. No Expanded (>=840px):
   - Renderizar barra lateral fixa ou trilho global à esquerda.
   - Utilizar Master-Detail de 2 colunas para listagem e edição concorrente.
   - Aproveitar Bento Grid para KPIs e resumos operacionais.

# Regras Duras com Números
- Proibido layout que apenas reduza o tamanho da fonte e colunas sem mudar de estrutura (DL-29).
- Barra de navegação móvel com no máximo 5 destinos centrais (Apple HIG).
- Margens externas: 16px no Compact, 24px no Medium, 32px no Expanded.
- Ponto de corte para troca de shell estrutural em 1024px (`lg:` no Tailwind).

# Checklist de Verificação
- [ ] A tela possui layout próprio para smartphone sem scroll horizontal não intencional?
- [ ] O desktop aproveita a largura sem deixar espaços vazios gigantescos desnecessários?
- [ ] A ação principal no mobile está ao alcance do polegar sem esforço?
- [ ] Modais móveis abrem como sheets inferiores e no desktop como diálogos centralizados?

# Anti-Padrões
- Forçar uma tabela com 7 colunas a caber em uma tela de 390px cortando textos.
- Colocar o botão de fechamento ou ação principal no canto superior em smartphones grandes.
- Usar gavetas laterais deslizantes que cobrem 90% da tela no desktop em vez de split view.

# Exemplos

## Exemplo Bom
```tsx
<div className="flex flex-col lg:flex-row gap-6 h-full">
  <aside className="hidden lg:block w-80 shrink-0 border-r border-border p-4">
    {/* Lista Mestre Desktop */}
  </aside>
  <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
    {/* Detalhe / Conteúdo */}
  </main>
</div>
```

## Exemplo Ruim
```tsx
<div className="w-full overflow-x-scroll">
  <table className="min-w-[1200px] text-xs">...</table>
</div>
```
