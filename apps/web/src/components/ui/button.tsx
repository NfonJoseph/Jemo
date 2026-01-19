import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jemo-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] min-h-[44px] tap-highlight-none",
  {
    variants: {
      variant: {
        default: "bg-jemo-orange text-white hover:bg-jemo-orange-dark",
        secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
        outline: "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100",
        ghost: "hover:bg-gray-100 text-gray-700",
        destructive: "bg-error text-white hover:bg-red-700",
        link: "text-jemo-orange underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 px-4 py-2 text-small",
        lg: "h-12 px-8 py-3",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

