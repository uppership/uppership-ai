// src/components/Card.tsx
import type { Package } from "../types/package";
import { extractTrackingLinksFlexible, type TrackingEntry } from "../utils/tracking";

type PackageWithTracking = Package & {
  tracking_numbers?: TrackingEntry[] | string | null;
  tracking_url?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;

  created_at?: string | null;
  tracking_ignore?: boolean | null;

  // ⬇️ include store for all-shops display
  shop_domain?: string | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Card({ pkg, allShops = false }: { pkg: PackageWithTracking; allShops?: boolean }) {
  const links = extractTrackingLinksFlexible(pkg.tracking_numbers, {
    carrier: pkg.carrier ?? null,
    tracking_number: pkg.tracking_number ?? null,
    tracking_url: pkg.tracking_url ?? null,
  });

  const ignored = pkg.tracking_ignore ?? false;
  const carrierText = pkg.carrier || (links.length ? "Track" : "No tracking");
  const orderedOn = formatDate(pkg.created_at);

  // 🔴 compute age in days
  const createdAtMs = Date.parse(pkg.created_at ?? "") || 0;
  const ageDays = createdAtMs ? Math.floor((Date.now() - createdAtMs) / 86400000) : null;
  const isAged = (ageDays ?? 0) > 5;

  const store = pkg.shop_domain?.trim();

  return (
    <div
      className={`relative border border-slate-700 rounded-lg p-2 shadow-sm text-sm
        ${ignored ? "bg-slate-900 opacity-60 grayscale" : "bg-slate-800"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-lg truncate">{pkg.order_name}</p>

          {/* ⬇️ show store badge when viewing all shops */}
          {allShops && store && (
            <span
              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-slate-600/70 bg-slate-700/40 text-slate-200"
              title={store}
            >
              {store}
            </span>
          )}
        </div>

        {ignored && (
          <span className="text-xs px-1.5 py-0.5 border border-slate-600 rounded">
            Ignored
          </span>
        )}
      </div>

      {/* customer */}
      <p className="text-slate-400 truncate">{pkg.customer_name}</p>

      {/* main line (tracking or ordered on …) */}
      <p className="text-slate-500 text-base lg:text-lg">
        {links.length === 0 && (
          <>
            {orderedOn ? <>Ordered on {orderedOn}</> : <>No Tracking</>}
          </>
        )}

        {links.length === 1 && (
          <a
            href={links[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline text-current"
            title={
              links[0].company
                ? `${links[0].company}${links[0].number ? ` • ${links[0].number}` : ""}`
                : "Track"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {carrierText}
          </a>
        )}

        {links.length > 1 && (
          <>
            {links.map((l, i) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-2 hover:underline text-current"
                title={l.company ? `${l.company}${l.number ? ` • ${l.number}` : ""}` : "Track"}
                onClick={(e) => e.stopPropagation()}
              >
                {l.company || `Link ${i + 1}`}
                {i < links.length - 1 ? ", " : ""}
              </a>
            ))}
          </>
        )}
      </p>

      {links.length === 0 && orderedOn && pkg.created_at && (
        <div className={`mt-0.5 text-xs ${isAged ? "text-red-400" : "text-slate-400"}`}>
          {ageDays}d since order
        </div>
      )}
    </div>
  );
}