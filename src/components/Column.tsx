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
  // add more optional keys if you sometimes only have them:
  // order_name?: string | null;
};

function resolveOrderId(pkg: PackageWithOptionalIds): string | undefined {
  return pkg.order_id ?? pkg.shopify_order_id ?? pkg.orderId ?? undefined;
}

export default function Column({ shop, status, onCardClick }: ColumnProps) {
  const { data, isLoading } = usePackages(shop, status);

  return (
    <section
      className="bg-slate-900 rounded-xl border border-slate-700 flex flex-col min-h-0"
      style={{ height: "80vh" }} // keep your current height; swap to 100%/grid if you move to full-viewport layouts
      aria-labelledby={`col-${status}`}
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

        {data?.map((pkg: Package) => {
          const orderId = resolveOrderId(pkg);

          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              className="outline-none focus:ring-2 focus:ring-slate-500 rounded-lg"
              onClick={() => onCardClick?.({ orderId, packageId: pkg.id, pkg })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCardClick?.({ orderId, packageId: pkg.id, pkg });
                }
              }}
            >
              <Card pkg={pkg} />
            </div>
          );
        })}
      </div>
    </section>
  );
}