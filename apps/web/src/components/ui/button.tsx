import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-border bg-card text-foreground hover:bg-accent/70",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        danger: "border-danger/20 bg-danger text-white hover:opacity-90",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-7 rounded-md px-2.5 text-[11px]",
        lg: "h-10 px-5",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));

Button.displayName = "Button";
