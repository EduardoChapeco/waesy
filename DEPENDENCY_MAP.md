# DEPENDENCY_MAP.md — Mapa de Dependências do Sistema

## 1. Fluxo de Dependências entre Camadas

```
[UI / Rotas] -> importa de -> [Services / BFF] -> importa de -> [Lib / DB Client]
     |                                                              |
     +------------> importa de -> [Components]                     |
                                       |                            |
                                       +-> importa de -> [Design Tokens]
```

## 2. Invariantes de Isolamento Estrito
1. **`src/components/`** NUNCA importa de `src/services/` (prevenção de acoplamento com backend).
2. **`src/services/`** NUNCA importa de `src/components/` (prevenção de manipulação de DOM no SSR).
3. **`src/routes/`** acessa persistência EXCLUSIVAMENTE via `src/services/*.functions.ts`.
