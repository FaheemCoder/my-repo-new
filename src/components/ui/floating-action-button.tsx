import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
}

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ className, size = "md", variant = "primary", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-12 w-12",
      md: "h-14 w-14", 
      lg: "h-16 w-16"
    };

    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl"
    };

    return (
      <Button
        ref={ref}
        className={cn(
          "fixed bottom-6 right-6 rounded-full transition-all duration-200 ease-in-out",
          "hover:scale-110 active:scale-95",
          "shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

FloatingActionButton.displayName = "FloatingActionButton";

export { FloatingActionButton };
