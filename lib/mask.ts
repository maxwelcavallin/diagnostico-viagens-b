/** Máscara de moeda BRL baseada em centavos — mesmo padrão do admin dashboard (applyCurrencyMask). */
export function maskCurrencyInput(raw: string): { display: string; value: number } {
  const digits = raw.replace(/\D/g, "")
  const cents = digits ? parseInt(digits, 10) : 0
  const value = cents / 100
  const display = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
  return { display, value }
}
