# DESIGN_LINT.md — Diagnóstico e Plano de Saneamento do Design Lint (R07–R08)

Este documento registra a anatomia do mecanismo de auditoria visual automatizada (`scripts/design-lint.mjs`) e o plano de saneamento contínuo das violações do monorepo.

---

## 1. O Diagnóstico do "Lint Engolido" (R07)

No setup legado, o comando `npm run lint:design` executava:
```bash
node scripts/design-lint.mjs --ratchet
```
O flag `--ratchet` comparava o total de erros com o arquivo `design-lint.baseline.json`.
Como o baseline continha a contagem histórica de erros (mais de 38.000 violações), o script retornava **Exit Code 0** contanto que o total não aumentasse.
**Consequência**: Milhares de telas continuavam com classes quebradas, alvos de toque abaixo de 44px e falta de foco teclado, enquanto a esteira de CI reportava "verde".

### A Nova Catraca Absoluta (Operação Verdade Única)
1. **Regra de Ouro**: Todo arquivo novo ou modificado em qualquer tarefa deve passar em `node scripts/design-lint.mjs --changed` com **EXATAMENTE 0 VIOLAÇÕES P0 E 0 VIOLAÇÕES P1**.
2. **Proibição de Baseline**: É estritamente proibido aumentar o baseline ou inserir exceções artificiais para mascarar débitos técnicos.

---

## 2. Mapa dos Maiores Ofensores por Regra (R08)

| Regra ID | Descrição | Total no Monorepo | Severidade | Como Eliminar |
| :--- | :--- | :--- | :--- | :--- |
| **DL-09** | Raio de curvatura não-canônico (`rounded-xl`, `rounded-[20px]`) | ~9.900 | P2 | Substituir por `rounded-lg`, `rounded-md` ou `rounded-full`. |
| **DL-03** | Espaçamento fora da grade modular de 4px (`p-3.5`, `gap-5`) | ~9.200 | P1 | Alinhar estritamente com múltiplos de 4px (`p-3` [12px], `p-4` [16px], `gap-4`). |
| **DL-02** | Classes arbitrárias com valores entre colchetes (`w-[327px]`) | ~5.800 | P1 | Utilizar classes padrão do Tailwind v4 (`w-full`, `max-w-md`, etc.). |
| **DL-15** | Ação interativa ou botão sem anel de foco teclado | ~5.500 | P0 | Incluir `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`. |
| **DL-14** | Alvo de toque no mobile inferior a 44x44px | ~3.100 | P1 | Adicionar altura mínima `h-11` (44px) nos controles interativos móveis. |
| **DL-04** | Uso de `!important` ou especificidade forçada no Tailwind | ~1.400 | P0 | Remover `!important` e ajustar a hierarquia de cascata sem coerção. |

---

## 3. Priorização de Saneamento por Módulo

1. **Módulo 1: `src/components/commerce/`**: Fluxos de conversão, vitrine, sacola e checkout.
2. **Módulo 2: `src/components/ad-engine/`**: Editores, previews e páginas de classificados unificados.
3. **Módulo 3: `src/components/tourism/`**: Embarques, roteiros e vouchers turísticos.
4. **Módulo 4: `src/components/ui/`**: Primitivas de interface reutilizáveis.
5. **Módulo 5: `src/routes/`**: Monólitos de telas de gestão (`novo.tsx`, `index.tsx`, `$id.tsx`).
