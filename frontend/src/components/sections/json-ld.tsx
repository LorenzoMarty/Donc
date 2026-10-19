/** Dados estruturados (schema.org) como `<script type="application/ld+json">`. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // O caractere de abertura de tag é escapado para o conteúdo nunca fechar a tag script antes da hora.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
