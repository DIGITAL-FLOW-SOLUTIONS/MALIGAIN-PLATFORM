import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "gradient" | "solid";
  gradientFrom?: string;
  gradientTo?: string;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  gradientFrom,
  gradientTo,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 relative overflow-hidden transition-all duration-300",
        variant === "default" && "glass-panel hover:bg-card/80",
        variant === "solid" && "bg-card border border-border hover:border-border/80",
        variant === "gradient" && "text-white shadow-lg",
        className
      )}
      style={
        variant === "gradient"
          ? {
              background: `linear-gradient(135deg, ${gradientFrom || "var(--primary)"}, ${
                gradientTo || "var(--secondary)"
              })`,
            }
          : undefined
      }
      {...props}
    >
      {variant === "gradient" && (
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
