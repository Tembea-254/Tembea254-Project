import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-savanna-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-savanna-500 text-white shadow-glow hover:bg-savanna-600",
        dark: "bg-ink text-white hover:bg-ink/90",
        outline: "border border-ink/15 bg-white text-ink hover:border-ink/30 hover:bg-sand-50",
        ghost: "text-ink hover:bg-ink/5",
        soft: "bg-savanna-50 text-savanna-700 hover:bg-savanna-100",
        danger: "bg-maasai-50 text-maasai-600 hover:bg-maasai-100",
        glass: "glass text-white hover:bg-white/20",
        ochre: "bg-ochre-400 text-ink hover:bg-ochre-500",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-sm",
        md: "h-11 rounded-full px-5 text-sm",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-8 w-8 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
