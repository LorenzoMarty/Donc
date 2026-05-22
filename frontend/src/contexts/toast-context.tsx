"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "@/utils";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current.slice(-2), { ...input, id }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border bg-background px-4 py-3 text-sm shadow-lg",
              item.variant === "success" && "border-emerald-200 dark:border-emerald-900",
              item.variant === "error" && "border-red-200 dark:border-red-900",
              item.variant === "info" && "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                {item.description ? <p className="mt-1 text-muted-foreground">{item.description}</p> : null}
              </div>
              <button className="text-muted-foreground transition hover:text-foreground" type="button" onClick={() => remove(item.id)}>
                <span className="sr-only">Fechar notificacao</span>
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider.");
  return context;
}
