import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2 } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            {variant !== "destructive" && (
              <CheckCircle2 className="h-8 w-8 shrink-0 rounded-full bg-[#20b35b] p-1.5 text-white" />
            )}
            <div className="grid min-w-0 gap-1">
              {title && (
                <ToastTitle className={variant !== "destructive" ? "text-lg font-bold leading-tight text-[#08783d] dark:text-emerald-300 sm:text-xl" : undefined}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className={variant !== "destructive" ? "text-sm leading-relaxed text-[#111827]/90 dark:text-emerald-50/90 sm:text-base" : undefined}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
