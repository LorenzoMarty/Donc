export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="h-8 w-44 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    </main>
  );
}
