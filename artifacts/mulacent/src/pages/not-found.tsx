import { Link } from "wouter";
import { GradientButton } from "@/components/ui/gradient-button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6 glass-panel p-12 rounded-3xl">
        <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto text-destructive">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-6xl font-display font-black text-foreground">404</h1>
        <p className="text-xl text-foreground/80">Page not found</p>
        <p className="text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
        <div className="pt-4">
          <Link href="/">
            <GradientButton className="w-full">Return Home</GradientButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
