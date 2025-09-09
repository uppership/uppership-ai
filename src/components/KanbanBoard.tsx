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
  // read shop from URL (?shop=...) with SSR safety
  const shopFromUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search);
    const s = q.get("shop");
    return s ? s.trim().toLowerCase() : null;
  }, []);

  // prefer URL param; fall back to prop
  const shopNorm = useMemo(
    () => (shopFromUrl || shop || "").trim().toLowerCase(),
    [shopFromUrl, shop]
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // open drawer from any card
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

  // discreet sync: force both orders + tracking with force=1
  const triggerSync = useCallback(async () => {
    if (!shopFromUrl) return; // only allow when URL has ?shop=
    setSyncing(true);

    try {
      const qs = new URLSearchParams();
      qs.set("shop", shopNorm);
      qs.set("force", "1");
      qs.set("orders", "1");
      qs.set("tracking", "1");

      const res = await fetch(`https://go.uppership.com/api/admin/sync-tick?${qs.toString()}`, {
        method: "POST",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      setRefreshKey((k) => k + 1); // refresh columns
    } catch (err: unknown) {
      console.error("Sync failed:", getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }, [shopNorm, shopFromUrl]);

  // resolve package -> order, then open drawer
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
      <div className="w-full h-full">
        {/* top bar with discreet sync button (only if ?shop= present) */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="text-sm text-gray-600">Shop:</div>
          <div className="px-2 py-1 rounded bg-gray-100 text-sm">
            {shopNorm || "—"}
          </div>

          {shopFromUrl && (
            <button
              onClick={triggerSync}
              disabled={syncing}
              aria-busy={syncing}
              className={`ml-auto inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm
                ${syncing ? "cursor-not-allowed opacity-70" : "hover:bg-gray-50"}`}
              title="Sync now"
            >
              {syncing && (
                <span className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
              )}
              <span>{syncing ? "Syncing…" : "Sync"}</span>
            </button>
          )}
        </div>

        {/* columns */}
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
              refreshKey={refreshKey} // remounts fetch in Column
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
