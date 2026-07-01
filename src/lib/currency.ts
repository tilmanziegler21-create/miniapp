import { useConfigStore } from '../store/useConfigStore'

const FALLBACK_SYMBOL = (import.meta.env?.VITE_CURRENCY_SYMBOL as string) || '€'

function currencySymbol() {
  try {
    return useConfigStore.getState().config?.currencySymbol || FALLBACK_SYMBOL
  } catch {
    return FALLBACK_SYMBOL
  }
}

export function formatCurrency(amount: number) {
  const value = Number(amount)
  const cents = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0
  // Show cents only when the amount actually has a fractional part, so
  // whole-euro prices stay clean while bonuses/discounts don't lose precision.
  const hasFraction = Math.abs(cents % 1) > 0.001
  const n = cents.toLocaleString(undefined, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return `${n} ${currencySymbol()}`.trim()
}
