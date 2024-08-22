export function formatNumber(value: string): number {
  return parseFloat(value.replace(',', '.'));
}
