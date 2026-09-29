---
name: component-api
description: Criação, refatoração e auditoria de contratos de componentes reutilizáveis e suporte à matriz completa de 4 estados. Gatilho ao criar ou alterar componentes de UI.
when_not_to_use: Não utilizar para rotas ou configurações de infraestrutura sem exportação de componente.
inputs:
  - Primitiva ou bloco modular sob desenvolvimento
  - Requisitos de estados e dados assíncronos
outputs:
  - Interface TypeScript tipada (Props) com valores padrão seguros
  - Implementação exaustiva de Data, Loading (Skeleton), Empty e Error
---

# Objetivo
Transformar cada componente em um contrato público estável e à prova de falhas, eliminando duplicações e assegurando robustez de estados.

# Procedimento Numerado
1. Verificar em `src/components/ui/` se já existe componente equivalente antes de iniciar codificação (DL-25).
2. Definir a tipagem estrita de Props via TypeScript, evitando `any` ou props implícitas.
3. Declarar variantes visuais usando `class-variance-authority` (cva) mapeando tokens do sistema.
4. Para componentes de dados, implementar os 4 estados obrigatórios:
   - `isLoading`: Exibe `<Skeleton />` com as mesmas dimensões do card final.
   - `isEmpty`: Exibe título explicativo em 2 linhas e botão de ação primária.
   - `isError`: Exibe diagnóstico com botão de reintento.
   - `data`: Renderiza a visualização final do payload.
5. Exportar componente com acessibilidade Radix/ARIA embutida.

# Regras Duras com Números
- Proibido criar componente duplicado por variação cosmética menor (DL-25).
- Proibido aceitar cores hexadecimais ou estilos arbitrários via prop `style`.
- Matriz completa de 4 estados obrigatória em qualquer visualização de dados (DL-11, DL-12, DL-13).
- Nome do componente em PascalCase sem prefixos informais ou números de versão (ex: `ProductCard`, não `CardV2`).

# Checklist de Verificação
- [ ] O componente já existe na biblioteca canônica?
- [ ] A matriz de estados está 100% coberta (loading, data, empty, error)?
- [ ] O componente possui anel de foco visível de 2px para navegação por teclado?
- [ ] O componente compila sem erros no typecheck (`npm run typecheck`)?

# Anti-Padrões
- Aceitar prop `customColor` recebendo string de hexadecimal livre do usuário.
- Deixar lista vazia sem componente informativo, gerando tela em branco para o cliente.
- Criar `OrderCard`, `OrderCardNew` e `OrderCardFinal` no mesmo diretório.

# Exemplos

## Exemplo Bom
```tsx
interface OrderListProps {
  orders?: Order[];
  isLoading: boolean;
  onRetry: () => void;
}

export function OrderList({ orders, isLoading, onRetry }: OrderListProps) {
  if (isLoading) return <OrderListSkeleton />;
  if (!orders || orders.length === 0) return <OrderEmptyState />;
  return <div className="divide-y divide-border">...</div>;
}
```

## Exemplo Ruim
```tsx
export function OrderList(props: any) {
  return <div>{props.orders.map((o: any) => <div>{o.id}</div>)}</div>;
}
```
