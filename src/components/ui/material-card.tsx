import * as React from "react";
import { cn } from "@/lib/utils";

interface MaterialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2 | 3 | 4;
  interactive?: boolean;
}

const MaterialCard = React.forwardRef<HTMLDivElement, MaterialCardProps>(
  ({ className, elevation = 1, interactive = false, children, ...props }, ref) => {
    const elevationClasses = {
      1: "shadow-[0_2px_4px_rgba(0,0,0,0.1)]",
      2: "shadow-[0_4px_8px_rgba(0,0,0,0.12)]", 
      3: "shadow-[0_8px_16px_rgba(0,0,0,0.14)]",
      4: "shadow-[0_12px_24px_rgba(0,0,0,0.16)]"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg bg-card text-card-foreground border-0",
          elevationClasses[elevation],
          interactive && "transition-all duration-200 hover:shadow-[0_8px_16px_rgba(0,0,0,0.16)] cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MaterialCard.displayName = "MaterialCard";

export { MaterialCard };
