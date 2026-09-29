# Estratégias de Carregamento de Fontes Web

Evitar Flash of Invisible Text (FOIT) e Flash of Unstyled Text (FOUT).

## Diretrizes Mandatórias
1. **Formato WOFF2:** Utilizar exclusivamente WOFF2, que oferece 30% a mais de compressão que WOFF.
2. **Font-Display: Swap:** Declarar `font-display: swap` para exibir fontes de sistema imediatamente enquanto a fonte customizada carrega.
3. **Unicode Range Subset:** Restringir o conjunto de caracteres para Latin (`U+0000-00FF`) para reduzir o peso do arquivo para menos de 30 KB.
4. **Fontes Variáveis:** Preferir uma única fonte variável (ex: Inter-Variable) cobrindo pesos 100 a 900 em vez de múltiplos arquivos estáticos.
