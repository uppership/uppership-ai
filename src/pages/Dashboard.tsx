// Dashboard.tsx
import { useState } from "react";
import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";
import SyncBar from "../components/SyncBar";

export default function Dashboard({ shop }: { shop: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-3"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col gap-3">
          <a href="/" className="flex items-center gap-2" aria-label="Go to dashboard home">
            <span className="text-sm sm:text-base font-semibold tracking-tight">Uppership</span>
          </a>

          {/* Sync controls */}
          <SyncBar shop={shop} onDone={() => setRefreshKey(k => k + 1)} />
        </div>
      </header>

      <main
        className="transition-[padding-right] duration-200 ease-in-out px-0"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        {/* key forces remount so Kanban refetches after sync */}
        <KanbanBoard shop={shop} key={refreshKey} />
      </main>

      {/* Floating chat (bubble + panel). */}
      <ChatPanel shop={shop || "uppership-demo.myshopify.com"} />
    </>
  );
}
