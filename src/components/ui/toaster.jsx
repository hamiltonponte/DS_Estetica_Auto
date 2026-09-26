import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div data-toast-root="" className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] print:hidden pointer-events-none">
      {toasts
        .filter((t) => t.open !== false)
        .map(function ({ id, title, description, action, duration, onOpenChange, ...props }) {
          return (
            <Toast
              key={id}
              {...props}
              data-state="open"
              className="print:hidden pointer-events-auto mb-2"
            >
              <div className="grid gap-1 pr-4">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismiss(id);
                }}
              />
            </Toast>
          );
        })}
    </div>
  );
}
