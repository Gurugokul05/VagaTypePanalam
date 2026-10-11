import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-[0_0_20px_var(--color-primary-glow)]",
        secondary: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)]",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
        danger: "bg-[var(--color-error)] text-white hover:bg-red-600",
      },
      size: {
        default: "px-4 py-2",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-6 py-3 text-base rounded-xl",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";
