// KanbanBoard.tsx
import { useCallback, useEffect, useState } from "react";
import Column from "./Column";
import OrderDrawer from "./OrderDrawer";

// Make the array literal and derive the union type
const STATUSES = ["ordered", "pre_transit", "in_transit", "delivered", "exception"] as const;
type Status = typeof STATUSES[number];

export default function KanbanBoard({ shop }: { shop: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  const handleCardClick = useCallback(
    ({ orderId, packageId }: { orderId?: string; packageId: string }) => {
      if (orderId) {
        setOrderId(orderId);
        setPackageId(null);
        setDrawerOpen(true);
      } else {
        setOrderId(null);
        setPackageId(packageId);
      }
    },
    []
  );

  useEffect(() => {
    if (!packageId) return;
    const abort = new AbortController();
    (async () => {
      try {
        const url = `https://go.uppership.com/public/packages/${encodeURIComponent(
          packageId
        )}/order?shop=${encodeURIComponent(shop)}`;
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error(`Failed to resolve order for package ${packageId}`);
        const json: { orderId?: string | null } = await res.json();
        if (json.orderId) {
          setOrderId(json.orderId);
          setDrawerOpen(true);
        } else {
          console.warn("No orderId found for package", packageId);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(err);
        }
      } finally {
        setPackageId(null);
      }
    })();
    return () => abort.abort();
  }, [packageId, shop]);

  return (
    <>
      <div className="w-full h-full">
        <div
          className="grid gap-4 p-4 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(240px, 1fr))` }}
        >
          {STATUSES.map((status: Status) => (
            <Column key={status} shop={shop} status={status} onCardClick={handleCardClick} />
          ))}
        </div>
      </div>

      <OrderDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setOrderId(null);
          setPackageId(null);
        }}
        orderId={orderId}
        shop={shop}
      />
    </>
  );
}