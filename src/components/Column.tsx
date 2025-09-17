import { useEffect, useMemo } from "react";
import { usePackages } from "../hooks/usePackages";
import Card from "./Card";
import type { Package } from "../types/package";

// at top (below imports)
const STATUS_LABELS: Record<ColumnProps["status"], string> = {
  ordered: "🛒 Ordered",
  pre_transit: "📦 Pre-Transit",
  in_transit: "🚚 In Transit",
  delivered: "✅ Delivered",
  exception: "⚠️ Exception",
};


type ColumnProps = {
  shop: string;
  status: "ordered" | "pre_transit" | "in_transit" | "delivered" | "exception";
  refreshToken: number; // ← NEW
  onCardClick?: (args: { orderId?: string; packageId: string; pkg: Package }) => void;
};

type PackageWithOptionalIds = Package & {
  order_id?: string | null;
  shopify_order_id?: string | null;
  orderId?: string | null;
  flags?: string[] | null;
};

type PackageWithMeta = PackageWithOptionalIds & {
  tracking_ignore?: boolean | null;
  tracking_last_update?: string | null;
  created_at?: string | null;
};

function sortForColumn(a: PackageWithMeta, b: PackageWithMeta) {
  const aFlagged = (a.flags?.length ?? 0) > 0;
  const bFlagged = (b.flags?.length ?? 0) > 0;
  if (aFlagged !== bFlagged) return aFlagged ? -1 : 1; // flagged to top

  const aIgnored = !!a.tracking_ignore;
  const bIgnored = !!b.tracking_ignore;
  if (aIgnored !== bIgnored) return aIgnored ? 1 : -1; // ignored to bottom (optional)

  // Newest last_update (or created_at) first
  const aT = Date.parse(a.tracking_last_update ?? a.created_at ?? "") || 0;
  const bT = Date.parse(b.tracking_last_update ?? b.created_at ?? "") || 0;
  return bT - aT;
}

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
      wrapClass: "bg-red-500/15 text-red-600 border border-red-500/30 ring-2 ring-slate-900",
      iconTitle: "Tracking overdue",
    };
  }
  if (lower.includes("stuck")) {
    return {
      wrapClass: "bg-amber-500/15 text-amber-700 border border-amber-500/30 ring-2 ring-slate-900",
      iconTitle: "Tracking stuck",
    };
  }
  return {
    wrapClass: "bg-sky-500/15 text-sky-700 border border-sky-500/30 ring-2 ring-slate-900",
    iconTitle: `Flags: ${flags.join(", ")}`,
  };
}

function dedupeById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export default function Column({ shop, status, onCardClick, refreshToken }: ColumnProps) {
  // Fetch all statuses (keeps Rules-of-Hooks stable)
  const qOrdered     = usePackages(shop, "ordered");
  const qPreTransit  = usePackages(shop, "pre_transit");
  const qInTransit   = usePackages(shop, "in_transit");
  const qDelivered   = usePackages(shop, "delivered");
  const qException   = usePackages(shop, "exception");

  // 🔁 When refreshToken changes, refetch every query this column can depend on
  useEffect(() => {
    // React Query style:
    qOrdered.refetch?.();
    qPreTransit.refetch?.();
    qInTransit.refetch?.();
    qDelivered.refetch?.();
    qException.refetch?.();

    // If using SWR instead, swap to:
    // qOrdered.mutate?.();
    // qPreTransit.mutate?.();
    // qInTransit.mutate?.();
    // qDelivered.mutate?.();
    // qException.mutate?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const byStatus = {
    ordered: qOrdered,
    pre_transit: qPreTransit,
    in_transit: qInTransit,
    delivered: qDelivered,
    exception: qException,
  } as const;

  const baseData: PackageWithOptionalIds[] = (byStatus[status].data ?? []) as PackageWithOptionalIds[];
  const baseLoading = byStatus[status].isLoading;

  // Build exceptions view = exception status + any flagged items from other columns
  const exceptionsData = useMemo(() => {
    if (status !== "exception") return baseData;

    const others = [
      ...(qOrdered.data ?? []),
      ...(qPreTransit.data ?? []),
      ...(qInTransit.data ?? []),
      ...(qDelivered.data ?? []),
    ] as PackageWithOptionalIds[];

    const flagged = others.filter((p) => (p.flags?.length ?? 0) > 0);
    return dedupeById<PackageWithOptionalIds>([
      ...((qException.data ?? []) as PackageWithOptionalIds[]),
      ...flagged,
    ]);
  }, [
    status,
    baseData,
    qOrdered.data,
    qPreTransit.data,
    qInTransit.data,
    qDelivered.data,
    qException.data,
  ]);

  const isLoading =
    status === "exception"
      ? (qException.isLoading ||
         qOrdered.isLoading ||
         qPreTransit.isLoading ||
         qInTransit.isLoading ||
         qDelivered.isLoading)
      : baseLoading;

  const sortedDisplayData = useMemo(() => {
    const arr = (status === "exception" ? exceptionsData : baseData) as PackageWithMeta[];
    return [...(arr ?? [])].sort(sortForColumn);
  }, [status, exceptionsData, baseData]);

  const headerText = STATUS_LABELS[status];
  const visibleCount =
  status === "exception" ? (exceptionsData?.length ?? 0) : (sortedDisplayData?.length ?? 0);

  return (
    <section
      className="bg-slate-900 rounded-xl border border-slate-700 flex flex-col min-h-0"
      style={{ height: "80vh" }}
      aria-labelledby={`col-${status}`}
      aria-busy={isLoading ? "true" : "false"}
    >
      <h2
        id={`col-${status}`}
        className="text-sm font-bold px-3 py-2 border-b border-slate-700 uppercase flex items-center justify-between"
      >
        <span className="normal-case">{headerText}</span>
        <span className="text-xs font-semibold text-slate-300 bg-slate-700/60 rounded-full px-2 py-0.5">
          {visibleCount}
        </span>
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            Loading…
          </div>
        )}

        {!isLoading && (!sortedDisplayData || sortedDisplayData.length === 0) && (
          <p className="text-xs text-slate-500">No packages</p>
        )}

        {sortedDisplayData?.map((pkg: PackageWithOptionalIds) => {
          const orderId = resolveOrderId(pkg);
          const flagMeta = getFlagMeta(pkg.flags);

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

              {/* Warning icon overlay for flagged packages */}
              {flagMeta && (
                <span
                  className={`pointer-events-none absolute top-1.5 right-1.5 inline-flex items-center justify-center
                              h-6 w-6 rounded-full ${flagMeta.wrapClass}`}
                  title={flagMeta.iconTitle}
                  aria-label={flagMeta.iconTitle}
                >
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
