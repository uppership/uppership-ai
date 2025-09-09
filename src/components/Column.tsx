import { usePackages } from "../hooks/usePackages";
import Card from "./Card";
import type { Package } from "../types/package";

type ColumnProps = {
  shop: string;
  status: string;
  onCardClick?: (args: { orderId?: string; packageId: string; pkg: Package }) => void;
};

type PackageWithOptionalIds = Package & {
  order_id?: string | null;
  shopify_order_id?: string | null;
  orderId?: string | null;
  flags?: string[] | null;
};

function resolveOrderId(pkg: PackageWithOptionalIds): string | undefined {
  return pkg.order_id ?? pkg.shopify_order_id ?? pkg.orderId ?? undefined;
}

function getFlagMeta(flags?: string[] | null):
  | { wrapClass: string; iconTitle: string }
  | null {
  if (!flags || flags.length === 0) return null;
  const lower = flags.map((f) => String(f).toLowerCase());

  if (lower.includes("overdue")) {
    return {
      // soft red bg, red text, subtle border; ring to separate from dark card
      wrapClass:
        "bg-red-500/15 text-red-600 border border-red-500/30 ring-2 ring-slate-900",
      iconTitle: "Tracking overdue",
    };
  }

  if (lower.includes("stuck")) {
    return {
      wrapClass:
        "bg-amber-500/15 text-amber-700 border border-amber-500/30 ring-2 ring-slate-900",
      iconTitle: "Tracking stuck",
    };
  }

  return {
    wrapClass:
      "bg-sky-500/15 text-sky-700 border border-sky-500/30 ring-2 ring-slate-900",
    iconTitle: `Flags: ${flags.join(", ")}`,
  };
}

export default function Column({ shop, status, onCardClick }: ColumnProps) {
  const { data, isLoading } = usePackages(shop, status);

  return (
    <section
      className="bg-slate-900 rounded-xl border border-slate-700 flex flex-col min-h-0"
      style={{ height: "80vh" }}
      aria-labelledby={`col-${status}`}
      aria-busy={isLoading ? "true" : "false"}
    >
      <h2
        id={`col-${status}`}
        className="text-sm font-bold px-3 py-2 border-b border-slate-700 uppercase"
      >
        {status} {data ? `(${data.length})` : ""}
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            Loading…
          </div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <p className="text-xs text-slate-500">No packages</p>
        )}

        {data?.map((pkg: PackageWithOptionalIds) => {
          const orderId = resolveOrderId(pkg);
          const flagMeta = getFlagMeta(pkg.flags);

          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              className="relative outline-none focus:ring-2 focus:ring-slate-500 rounded-lg"
              onClick={() =>
                onCardClick?.({ orderId, packageId: pkg.id as string, pkg: pkg as Package })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCardClick?.({ orderId, packageId: pkg.id as string, pkg: pkg as Package });
                }
              }}
            >
              <Card pkg={pkg as Package} />

              {/* Warning icon overlay (top-right) */}
              {flagMeta && (
                <span
                  className={`pointer-events-none absolute top-1.5 right-1.5 inline-flex items-center justify-center
                              h-6 w-6 rounded-full ${flagMeta.wrapClass}`}
                  title={flagMeta.iconTitle}
                  aria-label={flagMeta.iconTitle}
                >
                  {/* Inline warning triangle (stroke follows text color) */}
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12" y2="17" />
                  </svg>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}