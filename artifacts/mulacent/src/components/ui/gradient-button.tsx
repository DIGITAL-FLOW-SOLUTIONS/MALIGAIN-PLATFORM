import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, children, isLoading, variant = "primary", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "relative inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transition-all duration-300 active:scale-[0.98] overflow-hidden group",
          variant === "primary" &&
            "text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 bg-gradient-to-r from-primary via-primary to-secondary bg-[length:200%_auto] hover:bg-right",
          variant === "secondary" &&
            "text-white shadow-lg shadow-secondary/25 hover:shadow-secondary/40 bg-gradient-to-r from-secondary to-emerald-500",
          variant === "outline" &&
            "bg-transparent border-2 border-primary/50 text-primary-foreground hover:border-primary hover:bg-primary/10",
          variant === "ghost" &&
            "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
          (disabled || isLoading) && "opacity-50 cursor-not-allowed transform-none active:scale-100",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
GradientButton.displayName = "GradientButton";
