"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Erro inesperado</p>
        <h1 className="mt-3 text-3xl font-semibold">Nao foi possivel carregar esta area.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tente novamente. Se o problema continuar, a API pode estar indisponivel ou a sessao pode ter expirado.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
