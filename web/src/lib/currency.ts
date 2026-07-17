import api from './api'

let symbol = 'DH'

export async function loadCurrency() {
  try {
    const res = await api.get('/currencies')
    const base = res.data.find((c: any) => c.isBase && c.isActive)
    if (base) symbol = base.symbol
  } catch (e) { console.warn('Failed to load currency:', e) }
}

export function formatCurrency(n: number | null | undefined): string {
  return `${symbol} ${(n || 0).toLocaleString('es-AR')}`
}

export function getSymbol(): string {
  return symbol
}
