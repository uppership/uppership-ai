// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";
import SyncBar from "../components/SyncBar";
import SmartMatchScoreCard from "../components/SmartMatchScoreCard";
import useSmartMatch from "../hooks/useSmartMatch";

interface Props {
  shop: string;
}

const STORAGE_KEY = "smartmatch_expanded";

const Dashboard: React.FC<Props> = ({ shop }) => {
  const [refreshToken, setRefreshToken] = useState(0);     // ⬅️ only for Kanban
  const [expanded, setExpanded] = useState<boolean>(false);

  // restore persisted preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved != null) setExpanded(saved === "1");
    } catch {
      console.warn("localStorage unavailable");
    }
  }, []);

  // persist preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
    } catch {
      console.warn("localStorage unavailable");
    }
  }, [expanded]);

  // ⬇️ SmartMatch fetch does NOT follow Kanban sync
  const { summary, regions, loading, err } = useSmartMatch(shop, 0);

  const toggle = () => setExpanded((v) => !v);

  const percent =
    summary?.fulfillmentRate != null
      ? Number(summary.fulfillmentRate).toFixed(2)
      : undefined;

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-3"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" aria-label="Go to dashboard home">
            <img
              src="/uppership-logo-dark.png"             // put your file in frontend/public/logo.png
              alt="Uppership"
              className="h-10 w-auto"      // tweak size as needed
            />
          </a>
        </div>
      </header>


      <main
        className="transition-[padding-right] duration-200 ease-in-out px-4 sm:px-6 lg:px-8"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6 py-4">

          {/* ===== SmartMatch ABOVE the Sync button ===== */}
          <section aria-label="SmartMatch insights">
            <div className="rounded-xl border border-white/10 bg-[#0e141b]">
              <button
                type="button"
                onClick={toggle}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={expanded}
                aria-controls="smartmatch-panel"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">📦 SmartMatch</span>
                  {!loading && !err && percent && (
                    <span className="text-lg font-semibold rounded-full bg-white/10 px-3 py-1 text-white/90">
                    {percent}%
                    </span> 
                  )}
                </div>
                <svg
                  className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.192l3.71-3.96a.75.75 0 111.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div
                id="smartmatch-panel"
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                  expanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 pb-4">
                  {loading ? (
                    <div className="rounded-xl border border-white/10 bg-[#0e141b] p-4">
                      <div className="h-5 w-48 bg-white/10 rounded mb-3" />
                      <div className="space-y-3">
                        <div className="h-4 w-3/4 bg-white/10 rounded" />
                        <div className="h-10 w-28 bg-white/10 rounded" />
                        <div className="h-[260px] w-full bg-white/5 rounded" />
                      </div>
                    </div>
                  ) : err ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                      Failed to load SmartMatch: {err}
                    </div>
                  ) : summary && regions ? (
                    <SmartMatchScoreCard summary={summary} regions={regions} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-[#0e141b] p-4 text-white/60">
                      No SmartMatch insights available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ===== Sync button now only affects Kanban ===== */}
          <section aria-label="Operations sync">
            <SyncBar
              shop={shop}
              onDone={() => setRefreshToken((t) => t + 1)}
              sticky={false}
            />
          </section>

          {/* ===== Kanban board ===== */}
          <section aria-label="Operations board">
            <KanbanBoard shop={shop} refreshToken={refreshToken} />
          </section>
        </div>
      </main>

      <ChatPanel shop={shop || "uppership-demo.myshopify.com"} />
    </>
  );
};

export default Dashboard;