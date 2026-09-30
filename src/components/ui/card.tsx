import * as React from "react";
import { cn } from "@/lib/utils";

export type WindowVariant = "auto" | "compact" | "expanded";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  windowVariant?: WindowVariant;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => {
    const variantClasses = {
      compact: "p-3.5 rounded-xl border border-border/60",
      expanded: "p-6 rounded-2xl border border-border/50",
      auto: "p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-border/50",
    }[windowVariant];

    return (
      <div
        ref={ref}
        className={cn("squircle-soft bg-card text-card-foreground", variantClasses, className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  windowVariant?: WindowVariant;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => {
    const variantSpacing = {
      compact: "space-y-1 pb-2",
      expanded: "space-y-2 pb-4",
      auto: "space-y-1 sm:space-y-2 pb-2 sm:pb-4",
    }[windowVariant];

    return (
      <div
        ref={ref}
        className={cn("flex flex-col", variantSpacing, className)}
        {...props}
      />
    );
  }
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  windowVariant?: WindowVariant;
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => {
    const variantTypography = {
      compact: "text-base font-semibold leading-tight tracking-tight",
      expanded: "text-2xl font-bold leading-none tracking-tight",
      auto: "text-base sm:text-xl lg:text-2xl font-bold leading-tight sm:leading-none tracking-tight",
    }[windowVariant];

    return (
      <h3
        ref={ref}
        className={cn(variantTypography, className)}
        {...props}
      />
    );
  }
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  windowVariant?: WindowVariant;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs sm:text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  windowVariant?: WindowVariant;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => (
    <div ref={ref} className={cn("pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  windowVariant?: WindowVariant;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => {
    const variantPadding = {
      compact: "pt-2 gap-2",
      expanded: "pt-4 gap-3",
      auto: "pt-2 sm:pt-4 gap-2 sm:gap-3",
    }[windowVariant];

    return (
      <div
        ref={ref}
        className={cn("flex items-center", variantPadding, className)}
        {...props}
      />
    );
  }
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
