import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const dsButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-98 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
        outline: "border border-border bg-background hover:bg-muted text-foreground",
        ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
        accent: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline h-auto p-0 min-h-0 min-w-0",
      },
      size: {
        default: "min-h-11 px-5 py-2",
        sm: "min-h-9 px-3 py-2 text-xs rounded-md",
        lg: "min-h-12 px-7 py-3 text-base rounded-lg",
        icon: "size-11 p-0 rounded-lg",
        iconSm: "size-9 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface DSButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dsButtonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, DSButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isBlocked = Boolean(disabled || isLoading);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isBlocked}
        aria-busy={isLoading || undefined}
        aria-disabled={isBlocked || undefined}
        className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", dsButtonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "DSButton";

export interface IconButtonProps
  extends Omit<DSButtonProps, "leftIcon" | "rightIcon" | "children"> {
  icon: React.ReactNode;
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = "icon", "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={className}
        aria-label={ariaLabel}
        title={ariaLabel}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = "DSIconButton";
