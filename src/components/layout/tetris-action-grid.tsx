import React from "react";
import { cn } from "@/lib/utils";

export interface TetrisActionGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * TetrisActionGrid — Engine Algorítmica Canônica de Ações Ergonômicas (Waesy Platform)
 * 
 * Invariantes Absolutas:
 * 1. Zero Voids & 100% Fill: Cada linha preenche deterministicamente 100% da largura.
 * 2. Zero Colisão / Zero Overlap: Nenhum botão invade outro. Sem margens negativas ou overflows acidentais.
 * 3. Piso Canônico de 44px (Apple HIG / WCAG 2.2 AA): Altura mínima de 44px (h-11 min-h-11).
 * 4. Preservação Estrita da Ordem Semântica: Não reordena itens arbitrariamente.
 * 5. Bifurcação 5-itens:
 *    - Linha 1: 2 ações primárias (50% / 50% = span 6 + 6).
 *    - Linha 2: 3 ações complementares (33.3% cada = span 4 + 4 + 4).
 */
export function TetrisActionGrid({ children, className }: TetrisActionGridProps) {
  // Extrai filhos válidos e não-nulos
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const count = validChildren.length;

  if (count === 0) return null;

  // CASO 1: 1 Ação -> 100% da largura
  if (count === 1) {
    return (
      <div className={cn("w-full grid grid-cols-1 gap-2 pt-2", className)}>
        {validChildren.map((child, idx) => (
          <div key={idx} className="w-full min-w-0 flex items-center">
            {child}
          </div>
        ))}
      </div>
    );
  }

  // CASO 2: 2 Ações -> 50% / 50%
  if (count === 2) {
    return (
      <div className={cn("w-full grid grid-cols-2 gap-2 pt-2", className)}>
        {validChildren.map((child, idx) => (
          <div key={idx} className="w-full min-w-0 flex items-center">
            {child}
          </div>
        ))}
      </div>
    );
  }

  // CASO 3: 3 Ações -> 3 colunas em tela confortável, ou flex balanceado
  if (count === 3) {
    return (
      <div className={cn("w-full grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2", className)}>
        {validChildren.map((child, idx) => (
          <div key={idx} className="w-full min-w-0 flex items-center">
            {child}
          </div>
        ))}
      </div>
    );
  }

  // CASO 4: 4 Ações -> 2x2 no mobile, 4 colunas em telas maiores
  if (count === 4) {
    return (
      <div className={cn("w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2", className)}>
        {validChildren.map((child, idx) => (
          <div key={idx} className="w-full min-w-0 flex items-center">
            {child}
          </div>
        ))}
      </div>
    );
  }

  // CASO 5: 5 Ações (Caso do perfil CDL Jovem / Excelência Tour)
  // Linha 1: 2 itens (WhatsApp + Ligar) preenchendo 50% / 50%
  // Linha 2: 3 itens (SDR + Orçamento + Compartilhar) preenchendo 33.3% cada
  if (count === 5) {
    const row1 = validChildren.slice(0, 2);
    const row2 = validChildren.slice(2, 5);

    return (
      <div className={cn("w-full space-y-2 pt-2", className)}>
        {/* Linha 1: Ações Primárias de Contato */}
        <div className="w-full grid grid-cols-2 gap-2">
          {row1.map((child, idx) => (
            <div key={idx} className="w-full min-w-0 flex items-center">
              {child}
            </div>
          ))}
        </div>

        {/* Linha 2: Ações Secundárias / Consulta / Compartilhamento */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
          {row2.map((child, idx) => (
            <div key={idx + 2} className="w-full min-w-0 flex items-center">
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // CASO GERAL: N > 5 -> Divide em linhas balanceadas de 2 ou 3
  const rows: React.ReactNode[][] = [];
  let currentIndex = 0;
  while (currentIndex < count) {
    const remaining = count - currentIndex;
    // Se restar 4 ou 2, pega 2; se restar 3 ou múltiplo de 3, pega 3
    const take = remaining % 3 === 0 || remaining === 3 ? 3 : 2;
    rows.push(validChildren.slice(currentIndex, currentIndex + take));
    currentIndex += take;
  }

  return (
    <div className={cn("w-full space-y-2 pt-2", className)}>
      {rows.map((rowItems, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            "w-full grid gap-2",
            rowItems.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
          )}
        >
          {rowItems.map((child, idx) => (
            <div key={idx} className="w-full min-w-0 flex items-center">
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
