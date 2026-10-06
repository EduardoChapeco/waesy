import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
 /** Quando true, aplica borda e ring de erro (usa --destructive token) */
 hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
 ({ className, type, hasError, ...props }, ref) => {
 return (
 <input
 type={type}
 className={cn(
 // Base — layout e tipografia
 "flex h-11 min-h-11 w-full rounded-lg border border-input px-4 py-2 text-base md:text-sm",
 // Aparência — usa tokens do design system
 "bg-input text-foreground",
 // Comportamento
 "transition-colors",
 "placeholder:text-muted-foreground",
 // Foco
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
 // Desabilitado
 "disabled:cursor-not-allowed disabled:opacity-50",
 // File input
 "file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground",
 // Estado de erro — sobrescreve border e ring
 hasError && "border-destructive focus-visible:ring-destructive",
 className,
 )}
 ref={ref}
 {...props}
 aria-invalid={hasError || props["aria-invalid"]}
 />
 );
 },
);
Input.displayName = "Input";

export const FormInput = Input;
export { Input };
