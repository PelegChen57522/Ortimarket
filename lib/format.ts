export function formatPercentFromPrice(price: number): string {
  return `${Math.round(price * 100)}%`;
}

export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  const format = (num: number, suffix: string) => {
    const precision = num >= 100 ? 0 : 1;
    const compact = num.toFixed(precision).replace(/\.0$/, "");
    return `${sign}$${compact}${suffix}`;
  };

  if (abs >= 1_000_000_000) {
    return format(abs / 1_000_000_000, "B");
  }

  if (abs >= 1_000_000) {
    return format(abs / 1_000_000, "M");
  }

  if (abs >= 1_000) {
    return format(abs / 1_000, "K");
  }

  return `${sign}$${Math.round(abs)}`;
}

export function formatDateChip(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}
