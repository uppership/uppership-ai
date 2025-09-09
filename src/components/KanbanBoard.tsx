// KanbanBoard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import Column from "./Column";
import OrderDrawer from "./OrderDrawer";

const STATUSES = ["ordered", "pre_transit", "in_transit", "delivered", "exception"];

function getErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") return "Request aborted";
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}


export default function KanbanBoard({ shop }: { shop: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  // Toolbar state
  const [runOrders, setRunOrders] = useState(true);
  const [runTracking, setRunTracking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  // Force a re-fetch in child columns when this changes
  const [refreshKey, setRefreshKey] = useState(0);

  const shopNorm = useMemo(() => shop.trim().toLowerCase(), [shop]);

  // Open drawer from any card
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

  // Trigger backend sync; show overlay while waiting; then refresh columns
  const triggerSync = useCallback(async () => {
    if (!runOrders && !runTracking) return;
    setSyncing(true);
    setLastMsg(null);

    const controller = new AbortController();
    const qs = new URLSearchParams();
    qs.set("shop", shopNorm);
    qs.set("force", "1");
    qs.set("orders", runOrders ? "1" : "0");
    qs.set("tracking", runTracking ? "1" : "0");

    try {
      const res = await fetch(`/api/admin/sync-tick?${qs.toString()}`, {
        method: "POST",
        signal: controller.signal,
      });
    
      const text = await res.text();
      if (!res.ok) {
        // surface server error text
        throw new Error(text || `HTTP ${res.status}`);
      }
    
      setLastMsg(text);
      // bump key so columns re-fetch fresh data
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setLastMsg(`❌ Sync failed: ${msg}`);
      console.error(err);
    } finally {
      setSyncing(false);
    }
    

    return () => controller.abort();
  }, [shopNorm, runOrders, runTracking]);

  // Resolve package -> order, then open drawer
  useEffect(() => {
    if (!packageId) return;

    const abort = new AbortController();
    (async () => {
      try {
        const url = `https://go.uppership.com/public/packages/${encodeURIComponent(
          packageId
        )}/order?shop=${encodeURIComponent(shopNorm)}`;

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
  }, [packageId, shopNorm]);

  return (
    <>
      {/* Loading Overlay */}
      {syncing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
            <div className="text-sm text-gray-700">Syncing… This can take a moment.</div>
          </div>
        </div>
      )}

      <div className="w-full h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="text-sm text-gray-600">Shop:</div>
          <div className="px-2 py-1 rounded bg-gray-100 text-sm">{shopNorm}</div>

          <label className="flex items-center gap-2 ml-4 text-sm">
            <input
              type="checkbox"
              checked={runOrders}
              onChange={(e) => setRunOrders(e.target.checked)}
              disabled={syncing}
            />
            Orders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={runTracking}
              onChange={(e) => setRunTracking(e.target.checked)}
              disabled={syncing}
            />
            Tracking
          </label>

          <button
            onClick={triggerSync}
            disabled={syncing || (!runOrders && !runTracking)}
            className={`ml-2 px-3 py-1.5 rounded text-white text-sm ${
              syncing || (!runOrders && !runTracking)
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            title="Force a sync-tick run for this shop"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={syncing}
            className="ml-auto px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh board data"
          >
            Refresh board
          </button>
        </div>

        {/* Status message */}
        {lastMsg && (
          <div className="px-4 pt-2 text-xs text-gray-600 whitespace-pre-wrap">{lastMsg}</div>
        )}

        {/* Columns */}
        <div
          className="grid gap-4 p-4 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(240px, 1fr))` }}
        >
          {STATUSES.map((status) => (
            <Column
              key={status}
              shop={shopNorm}
              status={status}
              onCardClick={handleCardClick}
              refreshKey={refreshKey} // Column should re-fetch when this changes
            />
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
        shop={shopNorm}
      />
    </>
  );
}