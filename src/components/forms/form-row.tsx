import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Quantidade de colunas no breakpoint desktop (>=sm ou >=md).
   * No mobile (<600px), colapsa automaticamente para 1 coluna (Nativo por Plataforma).
   */
  columns?: 2 | 3 | 4;
}

const columnsMap = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Primitiva Canônica de Linha de Formulário (FormRow)
 * Responsiva por definição: 1 coluna no mobile para prevenir esmagamento de controles
 * e múltiplas colunas em telas médias e expandidas.
 */
export const FormRow = forwardRef<HTMLDivElement, FormRowProps>(
  ({ className, columns = 2, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid grid-cols-1 gap-4 w-full",
          columnsMap[columns],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FormRow.displayName = "FormRow";
