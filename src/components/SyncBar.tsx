import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  shop?: string;       // optional; will fallback to URL ?shop=
  onDone?: () => void; // refresh Kanban after sync completes
};

export default function SyncBar({ shop: propShop, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  const shop = useMemo(() => {
    if (propShop?.trim()) return propShop.trim();
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("shop")?.trim() || "";
    }
    return "";
  }, [propShop]);

  async function fetchStatus() {
    if (!shop) return;
    try {
      const res = await fetch(`https://go.uppership.com/api/proxy/sync/status?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();
      setLastSyncAt(data.lastSyncAt);
      setMsLeft(data.msLeft);
    } catch {
      // ignore; keep prior state
    }
  }

  useEffect(() => {
    fetchStatus();
    tickRef.current = window.setInterval(() => {
      setNow(Date.now());
      // degrade msLeft locally between polls
      setMsLeft((prev) => (prev > 1000 ? prev - 1000 : prev > 0 ? 0 : 0));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  function fmtAgo(ms: number) {
    if (!isFinite(ms) || ms < 0) return "never";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
  }

  function fmtLeft(ms: number) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m > 0 ? `${m}:${String(ss).padStart(2, "0")}` : `${ss}s`;
  }

  const canSync = !!shop && !busy && msLeft === 0;

  async function runFullSync() {
    if (!shop) {
      setMsg("⚠️ Missing shop parameter.");
      return;
    }
    if (!canSync) return;

    setBusy(true);
    setMsg(null);

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 60_000);

    try {
      const url = `https://go.uppership.com/api/proxy/sync/now?shop=${encodeURIComponent(
        shop
      )}&force=1&orders=1&tracking=1`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: "{}",
      });

      const text = await res.text();
      if (!res.ok) {
        // e.g., 429 cooldown message comes back as text
        throw new Error(text || `HTTP ${res.status}`);
      }

      setMsg(text || "✅ Sync kicked off successfully.");
      onDone?.();
      // Immediately refresh server status (it claimed the slot)
      await fetchStatus();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? `⚠️ ${err.message}` : "⚠️ Sync failed");
      // refresh status; maybe we were blocked by cooldown
      await fetchStatus();
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  const lastMs = lastSyncAt ? now - lastSyncAt : Number.POSITIVE_INFINITY;

  return (
    <div
      className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-2"
      style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
        <button
          onClick={runFullSync}
          disabled={!canSync}
          className="inline-flex items-center rounded-md border border-[#2a3747] bg-[#0f1720] px-2 py-1 text-xs font-medium text-slate-200 hover:bg-[#162232] disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            canSync
              ? "Run full sync (force+orders+tracking)"
              : msLeft > 0
              ? `Cooldown: ${fmtLeft(msLeft)} remaining`
              : "Missing shop"
          }
        >
          {busy ? "Syncing…" : "Sync"}
        </button>

        <div className="text-[11px] leading-none text-slate-400">
          Last sync: {isFinite(lastMs) ? fmtAgo(lastMs) : "never"}
          {msLeft > 0 && ` • next in ${fmtLeft(msLeft)}`}
          {msg && <span className="ml-2 text-slate-300">{msg}</span>}
        </div>
      </div>
    </div>
  );
}