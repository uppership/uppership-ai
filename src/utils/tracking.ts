// utils/tracking.ts
export type TrackingEntry = { url?: string | null; number?: string | null; company?: string | null };

export function buildCarrierUrl(company: string, number?: string | null): string | null {
  const n = (number || "").trim();
  if (!n) return null;
  const c = company.toLowerCase();
  if (c.includes("usps"))      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`;
  if (c.includes("ups"))       return `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(n)}`;
  if (c.includes("fedex"))     return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`;
  if (c.includes("dhl e") || c.includes("dhl ecom"))
                               return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}`;
  if (c.includes("dhl"))       return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(n)}`;
  if (c.includes("lasership")) return `https://www.lasership.com/track/${encodeURIComponent(n)}`;
  if (c.includes("ontrac"))    return `https://www.ontrac.com/tracking?number=${encodeURIComponent(n)}`;
  return null;
}

/** Flexible extractor: array or JSON string; plus fallbacks for carrier+number and single tracking_url */
export function extractTrackingLinksFlexible(
  trackingNumbers: unknown,
  opts?: { carrier?: string | null; tracking_number?: string | null; tracking_url?: string | null }
): { url: string; number?: string; company?: string }[] {
  const out: { url: string; number?: string; company?: string }[] = [];
  const seen = new Set<string>();

  // Accept array or JSON string
  let arr: TrackingEntry[] = [];
  if (Array.isArray(trackingNumbers)) {
    arr = trackingNumbers as TrackingEntry[];
  } else if (typeof trackingNumbers === "string") {
    try {
      const parsed = JSON.parse(trackingNumbers);
      if (Array.isArray(parsed)) arr = parsed as TrackingEntry[];
    } catch { /* ignore */ }
  }

  for (const t of arr) {
    const url = (t?.url || "").trim();
    if (url.startsWith("http") && !seen.has(url)) {
      seen.add(url);
      out.push({ url, number: t?.number || undefined, company: t?.company || undefined });
    }
  }

  // Single tracking_url fallback
  if (out.length === 0 && opts?.tracking_url && opts.tracking_url.startsWith("http")) {
    if (!seen.has(opts.tracking_url)) {
      seen.add(opts.tracking_url);
      out.push({ url: opts.tracking_url, number: opts.tracking_number || undefined, company: opts.carrier || undefined });
    }
  }

  // Build from carrier + number if needed
  if (out.length === 0 && opts?.carrier && opts.tracking_number) {
    const built = buildCarrierUrl(opts.carrier, opts.tracking_number);
    if (built && !seen.has(built)) {
      out.push({ url: built, number: opts.tracking_number, company: opts.carrier });
    }
  }

  return out;
}

// utils/tracking.ts (end of file)
export { extractTrackingLinksFlexible as extractTrackingLinks };

