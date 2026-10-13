import Link from "next/link";

type TermsConsentProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

// Aceite obrigatório de Termos + Privacidade (LGPD). A label inteira é o alvo de toque (>=44px).
export function TermsConsent({ checked, onChange, id = "accept-terms" }: TermsConsentProps) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm text-muted-foreground">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required
        className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
      />
      <span>
        Li e aceito os{" "}
        <Link href="/termos" target="_blank" className="font-medium text-primary underline">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" target="_blank" className="font-medium text-primary underline">
          Política de Privacidade
        </Link>
        .
      </span>
    </label>
  );
}
