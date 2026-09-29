# TOKENS.md — Arquitetura de Tokens e Cadeia de Sincronização

## D.1 Estrutura em Três Camadas (Padrão W3C DTCG)
Os design tokens do projeto Waesy residem estritamente em `docs/design/tokens.json` e seguem o padrão normativo do *W3C Design Tokens Community Group*. Nenhuma camada pode ser ignorada:

```
[ Camada 1: Primitiva ]   -> Valores brutos neutros (ex: neutral-900, space-4, radius-md)
          │
          ▼
[ Camada 2: Semântica ]   -> Valores mapeados por função (ex: surface-canvas, text-primary, border-default)
          │
          ▼
[ Camada 3: Componente ]  -> Variáveis atadas às peças de UI (ex: button-primary-bg, input-border)
```

### Regra de Consumo
- **O Componente consome estritamente a Camada de Componente ou Semântica:** É terminantemente proibido o componente referenciar tokens primitivos diretamente (ex: usar `color.neutral.900` em vez de `button.primaryBg`).
- **Zero Hardcode:** Nenhum componente em TSX/JSX pode declarar valores hexadecimais, `rgb()`, `rem` ou `px` arbitrários.

---

## D.2 Convenções de Nomenclatura como API Pública
Os nomes de tokens são contratos de API pública imutáveis:
1. Formato: `kebab-case` sem abreviações crípticas e sem número de versão no identificador (ex: `button-primary-bg`, nunca `btn-prim-v2`).
2. Estabilidade: A renomeação de qualquer token exige aprovação expressa do `design-system-architect` e registro formal em `docs/design/DECISIONS.md`.
3. Aliases Válidos: Todo alias em `tokens.json` utiliza o formato `{grupo.subgrupo.token}` e é validado no pipeline de CI.

---

## D.3 Modos de Aparência
O sistema opera com aparência nativa única de alta fidelidade:
1. **Modo Claro Operacional Base:** Fundo puro (#FFFFFF), contraste máximo (16.8:1), bordas de 1px (#E5E7EB) e tipografia neutra.
2. **Modo Escuro por Inversão Semântica:** Acontece unicamente pela reatribuição dos valores da Camada Semântica (ex: `--surface-canvas` mapeia para `{primitive.color.neutral.950}` e `--text-primary` para `{primitive.color.neutral.50}`). Proibida a criação de paletas paralelas desvinculadas.

---

## D.4 Cadeia de Geração e Sincronização
A cadeia de propagação dos tokens opera em pipeline determinístico:

```
docs/design/tokens.json  ──(scripts/token-sync.mjs)──►  src/styles.css  ──(Tailwind v4 @theme)──►  Componentes UI
```

### Comando de Sincronização
Para propagar alterações de tokens para as variáveis CSS do Tailwind:
```bash
node scripts/token-sync.mjs
```
A sincronização manual é proibida; o script gera as variáveis CSS e atualiza a ponte `@theme inline` automaticamente.

---

## D.5 Piso de Integridade e Validação
- Nenhuma variável pode ser declarada em `src/styles.css` sem pelo menos um consumidor ativo (prevenção contra tokens mortos, DL-30).
- Nenhum componente de produção pode conter valores literais fora do token lint (DL-01, DL-02).
- Ambos os critérios são auditados por `scripts/design-lint.mjs`.
