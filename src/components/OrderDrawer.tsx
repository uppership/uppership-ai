// OrderDrawer.tsx
import { useEffect, useState } from "react";
import type { OrderDetails } from "../types/order";

// ---------- helpers ----------
type TrackingEntry = { url?: string; number?: string; company?: string };

/** Return an array of tracking numbers from Shopify's tracking_numbers format */
function normalizeTrackingNumbers(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  const out: string[] = [];
  for (const item of val as unknown[]) {
    if (item && typeof item === 'object') {
      const number = (item as TrackingEntry).number;
      if (typeof number === 'string' && number.trim()) out.push(number.trim());
    } else if (typeof item === 'string' && item.trim()) {
      out.push(item.trim());
    }
  }
  return Array.from(new Set(out));
}

/** Extract all tracking link objects (url, number, company) */
function extractTrackingLinks(val: unknown): { url: string; number?: string; company?: string }[] {
  if (!Array.isArray(val)) return [];
  const out: { url: string; number?: string; company?: string }[] = [];
  for (const item of val as unknown[]) {
    if (item && typeof item === 'object') {
      const { url, number, company } = item as TrackingEntry;
      if (typeof url === 'string' && url.startsWith('http')) {
        out.push({ url, number, company });
      }
    } else if (typeof item === 'string' && item.startsWith('http')) {
      out.push({ url: item }); // rare, but safe
    }
  }
  // dedupe by URL
  const seen = new Set<string>();
  return out.filter(t => (t.url && !seen.has(t.url) && seen.add(t.url)));
}

export default function OrderDrawer({
  open, onClose, orderId, shop
}: {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  shop: string;
}) {
  const [data, setData] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setData(null);
    setLoading(true);
    fetch(`https://go.uppership.com/api/orders/${encodeURIComponent(orderId)}?shop=${encodeURIComponent(shop)}`)
      .then(r => r.json())
      .then(json => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, orderId, shop]);

  if (!open || !orderId) return null;

  const o = data?.order;
  const items = data?.items || [];
  const tn = normalizeTrackingNumbers(o?.tracking_numbers);
  const trackingLinks = extractTrackingLinks(o?.tracking_numbers);
  const primaryTrack = trackingLinks[0]; // first link as the primary button

  return (
    <aside
      className="fixed top-0 right-0 h-[100dvh] w-full sm:w-[460px] lg:w-[560px] z-50
                 bg-[#0b1117] border-l border-[#1d2733] shadow-2xl flex flex-col min-h-0"
      role="dialog" aria-modal="true" aria-label={o ? `Order ${o.order_name}` : 'Order details'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1d2733] bg-[#0e141b]">
        <div className="flex flex-col">
          <div className="text-sm text-[#9aa4af]">Order</div>
          <div className="font-semibold">{o?.order_name || '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded border border-[#1d2733]">
            {(o?.tracking_status || o?.fulfillment_status || '—').replace('_',' ')}
          </span>
          <button
            onClick={onClose}
            className="rounded-md border border-[#1d2733] px-3 py-1.5 hover:-translate-y-px transition"
            aria-label="Close details"
          >
            ✖
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ background: "rgba(8,12,18,0.62)", backdropFilter: "saturate(120%) blur(4px)", zIndex: 10 }}>
            <div className="bg-[#11161c] border border-[#1d2733] rounded-xl p-4 min-w-[240px] text-center shadow">
              <div className="mx-auto mb-2" style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid #2a3a4f", borderTopColor: "#7ab7ff", animation: "spin 1s linear infinite" }} />
              <div className="font-semibold">Loading…</div>
            </div>
          </div>
        )}

        {/* Summary */}
        <section className="card p-3">
          <div className="font-semibold mb-2">Summary</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-[#9aa4af]">Status:</span> {o?.tracking_status || o?.fulfillment_status || "—"}</div>
            <div><span className="text-[#9aa4af]">Region:</span> {o?.region || "—"}</div>
            <div><span className="text-[#9aa4af]">Created:</span> {o?.created_at ? new Date(o.created_at).toLocaleString() : "—"}</div>
            <div><span className="text-[#9aa4af]">Delivered:</span> {o?.tracking_delivered_at ? new Date(o.tracking_delivered_at).toLocaleString() : "—"}</div>

            {/* Tracking numbers rendered as inline links when URLs exist */}
            <div className="col-span-2">
              <span className="text-[#9aa4af]">Tracking #:</span>{" "}
              {trackingLinks.length
                ? trackingLinks.map((t, i) => (
                    <a
                      key={t.url}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:underline"
                      title={t.company ? `${t.company} • ${t.number ?? ''}` : (t.number ?? 'Track')}
                    >
                      {t.number ?? `Link ${i + 1}`}{i < trackingLinks.length - 1 ? ', ' : ''}
                    </a>
                  ))
                : (tn.length ? tn.join(", ") : "—")}
            </div>

            <div className="col-span-2">
              <span className="text-[#9aa4af]">Last Update:</span> {o?.tracking_last_update || "—"}
            </div>
            <div className="col-span-2">
              <span className="text-[#9aa4af]">Problem:</span> {o?.tracking_problem || "—"}
              {o?.tracking_flagged ? "  • ⚠ flagged" : ""}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {o?.links?.shopify_search && (
              <a className="btn" href={o.links.shopify_search} target="_blank" rel="noopener noreferrer">
                🛍 Open in Shopify
              </a>
            )}

            {/* Primary tracking button */}
            {primaryTrack ? (
              <a
                className="btn"
                href={primaryTrack.url}
                target="_blank"
                rel="noopener noreferrer"
                title={primaryTrack.number ? `Tracking # ${primaryTrack.number}` : 'Track shipment'}
              >
                📦 {primaryTrack.company ? `Track with ${primaryTrack.company}` : 'Track shipment'}
              </a>
            ) : o?.easypost_tracker_id ? (
              <span className="btn" title={`Tracker: ${o.easypost_tracker_id}`}>
                📦 Tracker: {o.easypost_tracker_id}
              </span>
            ) : null}
          </div>
        </section>

        {/* Items */}
        <section className="card p-3">
          <div className="font-semibold mb-2">Items</div>
          <div className="border border-[#1d2733] rounded">
            <table className="w-full text-sm">
              <thead className="text-left text-[#9aa4af]">
                <tr>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Ordered</th>
                  <th className="p-2">Fulfilled</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  return (
                    <tr key={it.sku} className="border-t border-[#1d2733]">
                      <td className="p-2 font-mono">{it.sku}</td>
                      <td className="p-2">{it.ordered}</td>
                      <td className="p-2">{it.fulfilled}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Issues & Actions */}
        <section className="card p-3">
          <div className="font-semibold mb-2">Issues & Actions</div>
          <div className="text-sm mb-2">
            {o?.tracking_flagged ? "This order is flagged. Review and take action." : "No flags."}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              onClick={async () => {
                if (!o) return;
                await fetch(`https://go.uppership.com/api/orders/${encodeURIComponent(o.id)}/ignore`, { method: 'POST' });
                setData(cur => cur ? ({ ...cur, order: { ...cur.order, tracking_ignore: true } }) : cur);
              }}
              disabled={!!o?.tracking_ignore}
              title={o?.tracking_ignore ? "Already ignored" : "Ignore tracking for this order"}
            >
              🙈 {o?.tracking_ignore ? "Ignored" : "Ignore"}
            </button>

            <button className="btn" disabled>📦 Reship remainder</button>
            <button className="btn" disabled>🎟 Create ticket</button>
          </div>
        </section>
      </div>
    </aside>
  );
}