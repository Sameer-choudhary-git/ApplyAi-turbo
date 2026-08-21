import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,opacity,transform,box-shadow,filter] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/50 bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:-translate-y-px hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20",
        destructive:
          "border border-destructive/50 bg-destructive text-destructive-foreground shadow-lg shadow-destructive/10 hover:-translate-y-px hover:bg-destructive/90",
        outline:
          "border border-border/90 bg-card/60 text-foreground shadow-sm hover:-translate-y-px hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border/70 bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-px hover:border-primary/30 hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "min-h-0 rounded-md text-primary underline-offset-4 hover:text-primary hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
