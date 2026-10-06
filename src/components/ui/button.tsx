import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15",
        outline: "border border-border bg-background hover:bg-muted text-foreground",
        secondary: "bg-background border border-primary text-primary hover:bg-primary/5",
        ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        pillow: "bg-primary text-primary-foreground hover:bg-primary/90",
        pillowOutline: "border border-border bg-background hover:bg-muted text-foreground",
        heroAction: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-11 px-4 py-2 text-xs",
        lg: "h-13 px-8 py-3 text-base",
        icon: "size-11 p-0",
        iconSm: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, loadingText, children, disabled, type, ...props }, ref) => {
    const blocked = Boolean(disabled || isLoading);
    const content = (label: React.ReactNode) => isLoading ? (
      <>
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {loadingText ?? label}
      </>
    ) : label;
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
      const preventActivation = (event: React.SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
      };
      return (
        <Slot
          {...props}
          ref={ref}
          className={classes}
          aria-busy={isLoading || undefined}
          aria-disabled={blocked || undefined}
          tabIndex={blocked ? -1 : props.tabIndex}
        >
          {React.cloneElement(child, blocked ? {
            onClick: preventActivation,
            onClickCapture: preventActivation,
            tabIndex: -1,
            "aria-disabled": true,
          } : {}, content(child.props.children))}
        </Slot>
      );
    }

    return (
      <button
        {...props}
        ref={ref}
        type={type ?? (props.onClick ? "button" : undefined)}
        disabled={blocked}
        aria-busy={isLoading || undefined}
        className={cn(classes, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      >
        {content(children)}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
