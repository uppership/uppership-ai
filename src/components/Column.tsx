import { usePackages } from "../hooks/usePackages";
import Card from "./Card";
import type { Package } from "../types/package";

type ColumnProps = {
  shop: string;
  status: string;
  // parent (KanbanBoard) can open the OrderDrawer with this
  onCardClick?: (args: { orderId?: string; packageId: string; pkg: Package }) => void;
};

type PackageWithOptionalIds = Package & {
  order_id?: string | null;
  shopify_order_id?: string | null;
  orderId?: string | null;
  flags?: string[] | null; // <-- use existing flags field
};

function resolveOrderId(pkg: PackageWithOptionalIds): string | undefined {
  return pkg.order_id ?? pkg.shopify_order_id ?? pkg.orderId ?? undefined;
}

function getFlagIndicator(flags?: string[] | null): { className: string; title: string } | null {
  if (!flags || flags.length === 0) return null;
  const lower = flags.map((f) => String(f).toLowerCase());
  if (lower.includes("overdue")) return { className: "bg-red-500", title: "Tracking overdue" };
  if (lower.includes("stuck")) return { className: "bg-amber-500", title: "Tracking stuck" };
  // fallback: show first flag name(s) as tooltip
  return { className: "bg-sky-500", title: `Flags: ${flags.join(", ")}` };
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
        {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-xs text-slate-500">No packages</p>
        )}

        {data?.map((pkg: PackageWithOptionalIds) => {
          const orderId = resolveOrderId(pkg);
          const indicator = getFlagIndicator(pkg.flags);

          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              className="relative outline-none focus:ring-2 focus:ring-slate-500 rounded-lg"
              onClick={() => onCardClick?.({ orderId, packageId: pkg.id as string, pkg: pkg as Package })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCardClick?.({ orderId, packageId: pkg.id as string, pkg: pkg as Package });
                }
              }}
            >
              <Card pkg={pkg as Package} />

              {indicator && (
                <span
                  className={`pointer-events-none absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${indicator.className}`}
                  title={indicator.title}
                  aria-label={indicator.title}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}