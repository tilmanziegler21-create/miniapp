const SYMBOL = (import.meta.env?.VITE_CURRENCY_SYMBOL as string) || '€'

export function formatCurrency(amount: number) {
  const value = Number(amount)
  const n = Number.isFinite(value) ? Math.round(value) : 0
  return `${n.toLocaleString()} ${SYMBOL}`.trim()
}
