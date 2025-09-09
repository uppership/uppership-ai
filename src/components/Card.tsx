// Card.tsx
import type { Package } from "../types/package";
import { extractTrackingLinksFlexible, type TrackingEntry } from "../utils/tracking";

type PackageWithTracking = Package & {
  tracking_numbers?: TrackingEntry[] | string | null; // array or JSON string
  tracking_url?: string | null;
  tracking_number?: string | null;                    // single number fallback if you have it
  carrier?: string | null;
};

export default function Card({ pkg }: { pkg: PackageWithTracking }) {
  const links = extractTrackingLinksFlexible(pkg.tracking_numbers, {
    carrier: pkg.carrier ?? null,
    tracking_number: pkg.tracking_number ?? null,
    tracking_url: pkg.tracking_url ?? null,
  });

  const carrierText = pkg.carrier || (links.length ? "Track" : "No tracking");

  return (
    <div className="relative bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-sm text-sm">
      <p className="font-semibold text-lg">{pkg.order_name}</p>
      <p className="text-slate-400">{pkg.customer_name}</p>

      <p className="text-slate-500 text-base lg:text-lg">
        {links.length === 0 && carrierText}
        {links.length === 1 && (
          <a
            href={links[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline text-current"
            title={links[0].company ? `${links[0].company}${links[0].number ? ` • ${links[0].number}` : ""}` : "Track"}
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
                {l.company || `Link ${i + 1}`}{i < links.length - 1 ? ", " : ""}
              </a>
            ))}
          </>
        )}
      </p>
    </div>
  );
}