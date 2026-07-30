const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCents(cents: number, { whole = false } = {}): string {
  const dollars = cents / 100;
  return whole ? usdWhole.format(dollars) : usd.format(dollars);
}
