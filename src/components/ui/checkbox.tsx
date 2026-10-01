import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
 React.ElementRef<typeof CheckboxPrimitive.Root>,
 React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
 <CheckboxPrimitive.Root
 ref={ref}
 className={cn(
 "inline-flex items-center justify-center shrink-0 w-5 h-5 min-w-[20px] max-w-[20px] min-h-[20px] max-h-[20px] rounded-md border-2 border-border/90 bg-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground transition-all duration-150 hover:border-foreground/60 select-none overflow-hidden",
 className,
 )}
 {...props}
 >
 <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
 <Check className="w-3.5 h-3.5 stroke-[3.5]" />
 </CheckboxPrimitive.Indicator>
 </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };

