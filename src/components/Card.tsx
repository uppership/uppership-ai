// Card.tsx
import type { Package } from "../types/package";

type TrackingObj = {
  url?: string;
  number?: string;
  company?: string;
};

type PackageWithTracking = Package & {
  tracking_url?: string | null;
  tracking_numbers?: TrackingObj[] | null;
};

function getTrackingLinks(pkg: PackageWithTracking): { url: string; label: string }[] {
  const out: { url: string; label: string }[] = [];
  const seen = new Set<string>();

  // 1) Single tracking_url
  if (pkg.tracking_url && typeof pkg.tracking_url === "string") {
    const url = pkg.tracking_url.trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push({ url, label: "Track" });
    }
  }

  // 2) Array of tracking_numbers
  if (Array.isArray(pkg.tracking_numbers)) {
    for (const t of pkg.tracking_numbers) {
      const url = t?.url?.trim();
      if (!url || seen.has(url)) continue;

      seen.add(url);
      const label = t.company
        ? `${t.company}${t.number ? ` · ${t.number}` : ""}`
        : t.number || "Track";

      out.push({ url, label });
    }
  }

  return out;
}

export default function Card({ pkg }: { pkg: PackageWithTracking }) {
  const links = getTrackingLinks(pkg);
  const hasOne = links.length === 1;
  const hasMany = links.length > 1;

  return (
    <div className="relative bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-sm text-sm">
      {/* Top-right tracking control */}
      {hasOne && (
        <a
          href={links[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 px-2 py-1 rounded-md border border-slate-600 bg-white/5 text-xs hover:bg-white/10"
          title="Open tracking in a new tab"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Track
        </a>
      )}

      {hasMany && (
        <details
          className="absolute top-2 right-2 group"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <summary
            className="list-none px-2 py-1 rounded-md border border-slate-600 bg-white/5 text-xs cursor-pointer hover:bg-white/10"
            title="Open tracking menu"
            aria-label="Open tracking menu"
          >
            Track ({links.length})
          </summary>
          <div className="mt-2 absolute right-0 z-10 min-w-[220px] rounded-md border border-slate-700 bg-slate-900 p-1 shadow-lg">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-1 text-xs rounded hover:bg-white/5"
                title="Open tracking in a new tab"
                onClick={(e) => e.stopPropagation()}
              >
                {l.label}
              </a>
            ))}
          </div>
        </details>
      )}

      {/* Existing content */}
      <p className="font-semibold text-base">{pkg.order_name}</p>
      <p className="text-slate-400">{pkg.customer_name}</p>
      <p className="text-slate-500 text-xs">
        {pkg.carrier || (links.length ? "Has tracking" : "No tracking")}
      </p>
    </div>
  );
}
