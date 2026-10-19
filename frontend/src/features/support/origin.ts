/** Caminho interno vindo de `?origem=` no atalho de ajuda; qualquer outra coisa (URL externa, `//host`,
 * query, caracteres estranhos) vira `null` e não entra no texto do chamado. */
export function safeOrigin(value: string | null | undefined): string | null {
  return value && /^\/(?!\/)[a-z0-9/_-]*$/i.test(value) ? value : null;
}
