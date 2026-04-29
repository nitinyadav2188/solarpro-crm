export function formatINR(n: number | null | undefined, opts: { compact?: boolean } = {}) {
  const v = Number(n ?? 0);
  if (opts.compact) {
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
    if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatNumber(n: number | null | undefined) {
  return new Intl.NumberFormat("en-IN").format(Number(n ?? 0));
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(dt);
}
