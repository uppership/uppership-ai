// Dashboard.tsx
import { useState } from "react";
import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";
import SyncBar from "../components/SyncBar";

export default function Dashboard({ shop }: { shop: string }) {
  const [refreshToken, setRefreshToken] = useState(0); // renamed

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

          <SyncBar
            shop={shop}
            onDone={() => setRefreshToken(t => t + 1)}
            sticky={false} // if you added this prop
          />
        </div>
      </header>

      <main
        className="transition-[padding-right] duration-200 ease-in-out px-0"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}
      >
        {/* ✅ pass refreshToken; ❌ do NOT use key to remount */}
        <KanbanBoard shop={shop} refreshToken={refreshToken} />
      </main>

      <ChatPanel shop={shop || "uppership-demo.myshopify.com"} />
    </>
  );
}
