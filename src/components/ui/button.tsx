import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
 // Base: squircle-action por padrão — geometria retangular inflada com cantos suavemente arredondados em todo o sistema
 "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
 {
 variants: {
 variant: {
 default:
 "bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-xs",
 destructive:
 "bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15 font-semibold",
 outline:
 "border border-border bg-background hover:bg-muted/50 text-foreground font-semibold",
 secondary:
 "bg-background border border-primary text-primary hover:bg-primary/5 font-semibold",
 ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
 link: "text-primary underline-offset-4 hover:underline font-semibold",
 pillow:
 "rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-[0.97]",
 pillowOutline:
 "rounded-xl border border-border bg-background hover:bg-muted text-foreground font-bold active:scale-[0.97]",
 heroAction:
 "rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 active:scale-[0.97]",
 },
 size: {
 default: "h-11 px-5.5 py-2.5", /* 44px — padrão ergonômico Apple Squircle */
 sm: "h-9 px-4 text-xs rounded-lg", /* 36px — compacto squircle */
 lg: "h-13 px-8 text-base font-bold rounded-2xl", /* 52px — destaque */
 icon: "size-10 rounded-xl",
 iconSm: "size-8 rounded-lg",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 },
);

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
 asChild?: boolean;
 /** Coloca o botão em estado de carregamento: desabilita interação, exibe spinner */
 isLoading?: boolean;
 /** Texto alternativo exibido enquanto carregando (padrão: conteúdo original com spinner) */
 loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 (
 {
 className,
 variant,
 size,
 asChild = false,
 isLoading = false,
 loadingText,
 children,
 disabled,
 ...props
 },
 ref,
 ) => {
 const Comp = asChild ? Slot : "button";

 // Se estiver carregando, bloqueia cliques e renderiza spinner de feedback
 if (isLoading) {
 return (
 <button
 ref={ref}
 disabled
 aria-busy="true"
 className={cn(buttonVariants({ variant, size }), "pointer-events-none opacity-80", className)}
 {...props}
 >
 <svg
 className="animate-spin size-4 shrink-0"
 xmlns="http://www.w3.org/2000/svg"
 fill="none"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <circle
 className="opacity-25"
 cx="12"
 cy="12"
 r="10"
 stroke="currentColor"
 strokeWidth="4"
 />
 <path
 className="opacity-75"
 fill="currentColor"
 d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
 />
 </svg>
 {loadingText ?? children}
 </button>
 );
 }

 return (
 <Comp
 ref={ref}
 disabled={disabled}
 className={cn(buttonVariants({ variant, size, className }))}
 {...props}
 >
 {children}
 </Comp>
 );
 },
);
Button.displayName = "Button";

export { Button, buttonVariants };
