"use client";

import { toast as sonnerToast } from "sonner";

type ToastVariant = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; variant: ToastVariant };

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastInput) => {
      if (variant === "success") sonnerToast.success(title, { description });
      else if (variant === "error") sonnerToast.error(title, { description });
      else sonnerToast(title, { description });
    },
  };
}
