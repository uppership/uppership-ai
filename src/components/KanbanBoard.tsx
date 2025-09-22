// src/components/KanbanBoard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import Column from "./Column";
import OrderDrawer from "./OrderDrawer";
import type { Package } from "../types/package";

const DEFAULT_STATUSES = ["ordered", "pre_transit", "in_transit", "delivered", "exception"] as const;
type Status = (typeof DEFAULT_STATUSES)[number];

export default function KanbanBoard({
  shop,
  refreshToken,
  statuses,
  allShops = false,
}: {
  shop?: string;
  refreshToken: number;
  statuses?: readonly Status[];
  allShops?: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderShop, setOrderShop] = useState<string | null>(null); // ← NEW: resolved tenant for the order
  const [packageId, setPackageId] = useState<string | null>(null);

  const STATUSES = useMemo(
    () => (statuses && statuses.length ? statuses : DEFAULT_STATUSES),
    [statuses]
  );

  const handleCardClick = useCallback(
    ({ orderId, packageId }: { orderId?: string; packageId: string; pkg?: Package }) => {
      if (orderId) {
        setOrderId(orderId);
        setOrderShop(null); // will fall back to prop shop in single-shop mode
        setDrawerOpen(true);
      } else {
        setOrderId(null);
        setOrderShop(null);
        setPackageId(packageId);
      }
    },
    []
  );

  // Resolve orderId (and shop) from packageId
  useEffect(() => {
    if (!packageId) return;
    const abort = new AbortController();

    (async () => {
      try {
        const base = `https://go.uppership.com/public/packages/${encodeURIComponent(packageId)}/order`;
        const url = allShops ? base : `${base}?shop=${encodeURIComponent(shop ?? "")}`;

        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error(`Failed to resolve order for package ${packageId}`);

        const json: { orderId?: string | null; shop?: string | null } = await res.json();
        if (json.orderId) {
          setOrderId(json.orderId);
          if (json.shop) setOrderShop(json.shop); // ← capture resolved tenant
          setDrawerOpen(true);
        } else {
          console.warn("No orderId found for package", packageId);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) console.error(err);
      } finally {
        setPackageId(null);
      }
    })();

    return () => abort.abort();
  }, [packageId, shop, allShops]);

  return (
    <>
      <div className="w-full h-full">
        <div
          className="grid gap-4 p-4 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(240px, 1fr))` }}
        >
          {STATUSES.map((status) => (
            <Column
              key={`${String(status)}:${allShops ? "ALL" : (shop ?? "")}`}
              shop={shop ?? ""}
              status={status}
              onCardClick={handleCardClick}
              refreshToken={refreshToken}
              allShops={allShops}
            />
          ))}
        </div>
      </div>

      <OrderDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setOrderId(null);
          setOrderShop(null);
          setPackageId(null);
        }}
        orderId={orderId}
        // Use the resolved shop if we have it; otherwise fall back to the prop
        shop={orderShop ?? (shop ?? "")}
      />
    </>
  );
}