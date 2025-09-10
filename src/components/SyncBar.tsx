import { useState } from "react";

type Props = {
  shop: string;
  onDone?: () => void; // call this to refresh Kanban after sync completes
};

export default function SyncBar({ shop, onDone }: Props) {
  const [force, setForce] = useState(true);
  const [orders, setOrders] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function runSync(params?: { force?: boolean; orders?: boolean; tracking?: boolean }) {
    const f = params?.force ?? force;
    const o = params?.orders ?? orders;
    const t = params?.tracking ?? tracking;

    const qs = new URLSearchParams({
      shop,
      force: f ? "1" : "0",
      orders: o ? "1" : "0",
      tracking: t ? "1" : "0",
    });

    setBusy(true);
    setMsg(null);

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 60_000); // 60s safety

    try {
      const res = await fetch(`https://go.uppership.com/api/sync-tick?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg("✅ Sync kicked off successfully.");
      onDone?.(); // tell parent to refresh Kanban data
    } catch (err: unknown) {
        if (err instanceof Error) {
            setMsg(`⚠️ ${err.message}`);
          } else {
            setMsg("⚠️ Sync failed");
          }
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-3"
         style={{ paddingRight: "var(--chat-panel-width, 0px)" }}>
      <div className="max-w-[1400px] mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">Shop:</span>
          <span className="text-sm font-semibold">{shop}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[#d9592c]" checked={force} onChange={e => setForce(e.target.checked)} />
            Force
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[#d9592c]" checked={orders} onChange={e => setOrders(e.target.checked)} />
            Orders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-[#d9592c]" checked={tracking} onChange={e => setTracking(e.target.checked)} />
            Tracking
          </label>

          <button
            onClick={() => runSync()}
            disabled={busy}
            className="btn btn-primary disabled:opacity-60"
            title="POST /api/sync-tick?...">
            {busy ? "Syncing…" : "Run Sync"}
          </button>

          <button
            onClick={() => runSync({ force: true, orders: true, tracking: true })}
            disabled={busy}
            className="btn"
            title="Full refresh with force+orders+tracking=1">
            ⚡ Quick Full Refresh
          </button>
        </div>

        {msg && <div className="text-xs text-slate-300">{msg}</div>}
      </div>
    </div>
  );
}
