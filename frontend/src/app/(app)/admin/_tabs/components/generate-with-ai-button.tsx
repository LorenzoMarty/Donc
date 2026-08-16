"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * REQ-3 (admin-reorganizacao-ux): geração por IA deixa de ser uma área principal do admin ("Criar
 * com IA") e vira uma ação disponível dentro de cada conteúdo — este botão abre o formulário
 * específico (Jogo/Exercício/Tema) num modal, no lugar onde o admin já está trabalhando.
 */
export function GenerateWithAiButton({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} icon={Sparkles}>
        {children(() => setOpen(false))}
      </Modal>
    </>
  );
}
