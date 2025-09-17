// src/pages/Dashboard.tsx
import React, { useState } from "react";
import SyncBar from "../components/SyncBar";
import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";
import SmartMatchScoreCard from "../components/SmartMatchScoreCard";
import useSmartMatch from "../hooks/useSmartMatch";

interface Props {
  shop: string;
}

const Dashboard: React.FC<Props> = ({ shop }) => {
  const [refreshToken, setRefreshToken] = useState(0);

  // Pull SmartMatch data for the header card
  const { summary, regions, loading, err } = useSmartMatch(shop, refreshToken);

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-3"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col gap-3">
          <a
            href="/"
            className="flex items-center gap-2"
            aria-label="Go to dashboard home"
          >
            <span className="text-sm sm:text-base font-semibold tracking-tight">
              Uppership
            </span>
          </a>

          <SyncBar
            shop={shop}
            onDone={() => setRefreshToken((t) => t + 1)}
            sticky={false}
          />
        </div>
      </header>

      <main
        className="transition-[padding-right] duration-200 ease-in-out px-4 sm:px-6 lg:px-8"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6 py-4">
          {/* ===== Top: SmartMatch Score + Insights ===== */}
          <section aria-label="SmartMatch insights">
            {loading ? (
              // skeleton
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
          </section>

          {/* ===== Kanban ===== */}
          <section aria-label="Operations board">
            <KanbanBoard shop={shop} refreshToken={refreshToken} />
          </section>
        </div>
      </main>

      {/* Chat docked on the right (your component controls width var) */}
      <ChatPanel shop={shop || "uppership-demo.myshopify.com"} />
    </>
  );
};

export default Dashboard;
