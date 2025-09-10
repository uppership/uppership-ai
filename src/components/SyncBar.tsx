import { useMemo, useState } from "react";

type Props = {
  shop?: string;          // optional; will fallback to URL ?shop=
  onDone?: () => void;    // call this to refresh Kanban after sync completes
};

export default function SyncBar({ shop: propShop, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Prefer explicit prop, else read from URL (?shop=...)
  const shop = useMemo(() => {
    if (propShop && propShop.trim()) return propShop.trim();
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("shop")?.trim() || "";
    }
    return "";
  }, [propShop]);

  async function runFullSync() {
    if (!shop) {
      setMsg("⚠️ Missing shop parameter.");
      return;
    }

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
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

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
      className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-3"
      style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
    >
      <div className="max-w-[1400px] mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={runFullSync}
            disabled={busy || !shop}
            className="btn btn-primary disabled:opacity-60"
            title="POST /api/proxy/sync/now?shop=...&force=1&orders=1&tracking=1"
          >
            {busy ? "Syncing…" : "Sync"}
          </button>
        </div>

        {msg && <div className="text-xs text-slate-300">{msg}</div>}
      </div>
    </div>
  );
}