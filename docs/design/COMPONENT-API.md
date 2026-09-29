# COMPONENT-API.md — Contrato Canônico de Componentes e Matriz de Estados

## 1. Princípios de Arquitetura de Componentes
Seguindo os preceitos de *Atomic Design (Brad Frost)* e *Component APIs as Public Contracts (Nathan Curtis)*:
1. **Contrato Estável:** Props de componentes utilizam nomes previsíveis e semânticos (`variant`, `size`, `isLoading`, `isEmpty`, `isError`).
2. **Encapsulamento de Estilo:** Nenhum componente aceita sobrescrita de cores literais ou tamanhos arbitrários via `style`.
3. **Composição em vez de Configuração:** Uso extensivo de primitivas Radix UI compostas com acessibilidade embutida.

---

## 2. A Matriz Obrigatória de 4 Estados

Toda superfície ou componente que consome dados assíncronos DEVE implementar os quatro estados da matriz:

```
┌────────────────────────────────────────────────────────┐
│                   MATRIZ DE ESTADOS                    │
├──────────────────────────┬─────────────────────────────┤
│ 1. CARREGANDO (Loading)  │ Skeleton estruturado no CLS │
├──────────────────────────┼─────────────────────────────┤
│ 2. DADOS (Data/Success)  │ Renderização estrita payload│
├──────────────────────────┼─────────────────────────────┤
│ 3. VAZIO (Empty)         │ 2 linhas + ação primária    │
├──────────────────────────┼─────────────────────────────┤
│ 4. ERRO (Error)          │ Diagnóstico + reintento     │
└──────────────────────────┴─────────────────────────────┘
```

### 2.1 Estado de Carregamento (DL-11)
- Proibido spinner em tela cheia que desloque o layout ao finalizar o carregamento.
- Usar esqueletos (`<Skeleton className="..." />`) espelhando rigorosamente a geometria dos cartões finais.

### 2.2 Estado Vazio (DL-12)
- Renderiza ilustração neutra SVG ou ícone semântico sutil.
- Mensagem objetiva em 2 linhas: O que está vazio e como adicionar o primeiro registro.
- Botão primário chamando a ação de criação.

### 2.3 Estado de Erro (DL-13)
- Caixa de feedback com borda sutil vermelha (`border-destructive/30`).
- Explicação clara sem jargões de servidor.
- Botão "Tentar novamente" refazendo a consulta sem recarregar a janela inteira.
