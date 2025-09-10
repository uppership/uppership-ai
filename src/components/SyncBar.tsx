import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  shop?: string;       // optional; will fallback to URL ?shop=
  onDone?: () => void; // refresh Kanban after sync completes
};

const POLL_MS_IDLE = 1000;   // 1s heartbeat for the clock
const POLL_MS_ACTIVE = 2500; // faster poll while a sync is in progress
const AUTO_HIDE_MS = 6000;   // auto-fade message after 6s if not expanded

export default function SyncBar({ shop: propShop, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgExpanded, setMsgExpanded] = useState(false);
  const [msgVisible, setMsgVisible] = useState(false); // controls fade-out
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  const tickRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const sawActiveWindowRef = useRef(false); // msLeft > 0 at least once after clicking Sync
  const firedDoneRef = useRef(false);

  const shop = useMemo(() => {
    if (propShop?.trim()) return propShop.trim();
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("shop")?.trim() || "";
    }
    return "";
  }, [propShop]);

  async function fetchStatus() {
    if (!shop) return null;
    try {
      const res = await fetch(`https://go.uppership.com/api/proxy/sync/status?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();
      setLastSyncAt(data.lastSyncAt);
      setMsLeft(data.msLeft ?? 0);
      return data as { lastSyncAt: number | null; msLeft: number };
    } catch {
      return null;
    }
  }

  // Idle 1s clock + local msLeft degrade
  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setNow(Date.now());
      setMsLeft(prev => (prev > 1000 ? prev - 1000 : prev > 0 ? 0 : 0));
    }, POLL_MS_IDLE);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, []);

  // Initial status fetch on mount/shop change
  useEffect(() => { void fetchStatus(); /* eslint-disable-next-line */ }, [shop]);

  // Start/stop active polling—used while a sync is in progress
  function startActivePolling() {
    stopActivePolling();
    pollRef.current = window.setInterval(async () => {
      const data = await fetchStatus();
      if (sawActiveWindowRef.current && !busy && (data?.msLeft ?? 0) === 0 && !firedDoneRef.current) {
        firedDoneRef.current = true;
        onDone?.();
        showTransientMessage("✅ Sync complete. Kanban refreshed.");
        stopActivePolling();
      }
    }, POLL_MS_ACTIVE);
  }
  function stopActivePolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Show + auto-hide (fade-out) message unless expanded
  function showTransientMessage(text: string) {
    setMsg(text);
    setMsgVisible(true);
    setMsgExpanded(false);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!msgExpanded) setMsgVisible(false);
    }, AUTO_HIDE_MS) as unknown as number;
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      stopActivePolling();
    };
  }, []);

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
    if (!shop) { showTransientMessage("⚠️ Missing shop parameter."); return; }
    if (!canSync) return;

    // reset tracking
    firedDoneRef.current = false;
    sawActiveWindowRef.current = false;

    setBusy(true);
    setMsg(null);
    setMsgVisible(false);

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 60_000);

    try {
      const url = `https://go.uppership.com/api/proxy/sync/now?shop=${encodeURIComponent(shop)}&force=1&orders=1&tracking=1`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: "{}",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      // Show the server response (collapsed) then start polling
      showTransientMessage(text || "✅ Sync kicked off successfully.");

      // Fetch status immediately, then watch the active window
      const first = await fetchStatus();
      if ((first?.msLeft ?? 0) > 0) {
        sawActiveWindowRef.current = true;
        startActivePolling();
      } else {
        // Edge: server finished instantly
        if (!firedDoneRef.current) {
          firedDoneRef.current = true;
          onDone?.();
          showTransientMessage("✅ Sync complete. Kanban refreshed.");
        }
      }
    } catch (err: unknown) {
      showTransientMessage(err instanceof Error ? `⚠️ ${err.message}` : "⚠️ Sync failed");
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

        <div className="flex-1 text-[11px] leading-none text-slate-400 flex items-center gap-2 min-w-0">
          <span className="shrink-0">Last sync: {isFinite(lastMs) ? fmtAgo(lastMs) : "never"}</span>
          {msLeft > 0 && <span className="shrink-0">• next in {fmtLeft(msLeft)}</span>}

          {/* Collapsible, auto-fading message */}
          {msg && (
            <div
              className={`ml-2 transition-opacity duration-700 ${msgVisible ? "opacity-100" : "opacity-0"}`}
              style={{ maxWidth: 680 }}
            >
              <div
                className={`relative text-slate-300 ${msgExpanded ? "max-h-64 overflow-auto" : "max-h-6 overflow-hidden"}`}
                style={
                  msgExpanded
                    ? {}
                    : {
                        maskImage: "linear-gradient(180deg, black 70%, transparent)",
                        WebkitMaskImage: "linear-gradient(180deg, black 70%, transparent)",
                      }
                }
                role="status"
                aria-live="polite"
              >
                {msg}
              </div>

              <div className="mt-1 flex gap-2">
                {!msgExpanded && msg.length > 120 && (
                  <button
                    className="text-[10px] underline text-slate-400 hover:text-slate-200"
                    onClick={() => { setMsgExpanded(true); setMsgVisible(true); }}
                  >
                    Show details
                  </button>
                )}
                {msgExpanded && (
                  <button
                    className="text-[10px] underline text-slate-400 hover:text-slate-200"
                    onClick={() => setMsgExpanded(false)}
                  >
                    Collapse
                  </button>
                )}
                <button
                  className="text-[10px] underline text-slate-400 hover:text-slate-200"
                  onClick={() => { setMsgVisible(false); setMsg(null); }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}