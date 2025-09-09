// Column.tsx
import { memo } from "react";
import { usePackages } from "../hooks/usePackages";
import Card from "./Card";
import type { Package } from "../types/package";

type ColumnProps = {
  shop: string;
  status: string;
  refreshKey?: number; // <-- bump this to force a re-fetch
  onCardClick?: (args: { orderId?: string; packageId: string; pkg: Package }) => void;
};

type PackageWithOptionalIds = Package & {
  order_id?: string | null;
  shopify_order_id?: string | null;
  orderId?: string | null;
};

function resolveOrderId(pkg: PackageWithOptionalIds): string | undefined {
  return pkg.order_id ?? pkg.shopify_order_id ?? pkg.orderId ?? undefined;
}

/**
 * Inner component that actually calls the data hook.
 * We key() this from the outer component so changing refreshKey remounts it.
 */
const ColumnBody = memo(function ColumnBody({
  shop,
  status,
  onCardClick,
}: Omit<ColumnProps, "refreshKey">) {
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
});

/**
 * Outer wrapper: changes to refreshKey force a remount of ColumnBody,
 * which makes usePackages run fresh without changing the hook itself.
 */
export default function Column(props: ColumnProps) {
  const { refreshKey = 0, ...rest } = props;
  return <ColumnBody key={`${rest.shop}:${rest.status}:${refreshKey}`} {...rest} />;
}
