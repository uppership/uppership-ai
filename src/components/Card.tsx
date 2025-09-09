// Card.tsx
import type { Package } from "../types/package";
import { extractTrackingLinks, type TrackingEntry } from "../utils/tracking";

type PackageWithTracking = Package & {
  tracking_numbers?: TrackingEntry[] | null;
  tracking_url?: string | null;   // if you sometimes store a single URL
  carrier?: string | null;
};

export default function Card({ pkg }: { pkg: PackageWithTracking }) {
  const links = extractTrackingLinks(pkg.tracking_numbers);
  const label = pkg.carrier || (links.length ? "Track" : "No tracking");

  return (
    <div className="relative bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-sm text-sm">
      <p className="font-semibold text-base">{pkg.order_name}</p>
      <p className="text-slate-400">{pkg.customer_name}</p>

      {/* Carrier line: make it clickable when we have a link */}
      <p className="text-slate-500 text-xs">
        {links.length === 0 && label}
        {links.length === 1 && (
          <a
            href={links[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-slate-300"
            title={links[0].company ? `${links[0].company}${links[0].number ? ` • ${links[0].number}` : ""}` : "Track"}
            onClick={(e) => e.stopPropagation()}  // don't open drawer
          >
            {pkg.carrier ? pkg.carrier : (links[0].number ?? "Track")}
          </a>
        )}
        {links.length > 1 && (
          <>
            {links.map((t, i) => (
              <a
                key={t.url}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-slate-300"
                title={t.company ? `${t.company}${t.number ? ` • ${t.number}` : ""}` : "Track"}
                onClick={(e) => e.stopPropagation()}
              >
                {t.company ? t.company : (t.number ?? `Link ${i + 1}`)}
                {i < links.length - 1 ? ", " : ""}
              </a>
            ))}
          </>
        )}
      </p>
    </div>
  );
}
