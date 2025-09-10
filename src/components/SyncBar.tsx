import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  shop?: string;       // optional; will fallback to URL ?shop=
  onDone?: () => void; // refresh Kanban after sync completes
};

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default function SyncBar({ shop: propShop, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<number | null>(null);

  // Prefer explicit prop, else read from URL (?shop=...)
  const shop = useMemo(() => {
    if (propShop?.trim()) return propShop.trim();
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("shop")?.trim() || "";
    }
    return "";
  }, [propShop]);

  // Keyed per-shop
  const lsKey = shop ? `uppership:lastSync:${shop}` : null;

  // Load last sync from localStorage
  useEffect(() => {
    if (!lsKey) return;
    const v = localStorage.getItem(lsKey);
    setLastSyncAt(v ? Number(v) : null);
  }, [lsKey]);

  // Ticker for countdown / "x min ago"
  useEffect(() => {
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const msSince = lastSyncAt ? now - lastSyncAt : Infinity;
  const msLeft = Math.max(0, COOLDOWN_MS - msSince);
  const canSync = !!shop && !busy && msLeft === 0;

  function fmtAgo(ms: number) {
    if (!isFinite(ms)) return "never";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
  }

  function fmtLeft(ms: number) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m > 0 ? `${m}:${String(ss).padStart(2, "0")}` : `${ss}s`;
    }

  async function runFullSync() {
    if (!shop) {
      setMsg("⚠️ Missing shop parameter.");
      return;
    }
    if (msLeft > 0) {
      setMsg(`⏱️ Please wait ${fmtLeft(msLeft)} before running another sync.`);
      return;
    }

    setBusy(true);
    setMsg(null);

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 60_000);

    try {
      const url = `/api/proxy/sync/now?shop=${encodeURIComponent(
        shop
      )}&force=1&orders=1&tracking=1`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: "{}",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      // record last sync time
      const t = Date.now();
      if (lsKey) localStorage.setItem(lsKey, String(t));
      setLastSyncAt(t);

      setMsg(text || "✅ Sync kicked off successfully.");
      onDone?.();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? `⚠️ ${err.message}` : "⚠️ Sync failed");
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  return (
    <div
      className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-2"
      style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
        {/* Left: small sync button */}
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

        {/* Right: status line */}
        <div className="text-[11px] leading-none text-slate-400">
          Last sync: {lastSyncAt ? fmtAgo(msSince) : "never"}
          {msLeft > 0 && ` • next in ${fmtLeft(msLeft)}`}
          {msg && <span className="ml-2 text-slate-300">{msg}</span>}
        </div>
      </div>
    </div>
  );
}