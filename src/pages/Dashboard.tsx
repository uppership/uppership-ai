// Dashboard.tsx
import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";

export default function Dashboard({ shop }: { shop: string }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#1d2733] bg-[#0e141b] px-4 py-3"
        style={{ paddingRight: "var(--chat-panel-width, 0px)" }}>
      <a href="/" className="flex items-center" aria-label="Uppership">
        <img
          src="/uppership-logo-dark.png"
          alt="Uppership"
          width={1200}           // intrinsic size for correct aspect ratio
          height={630}
          className="h-7 sm:h-8 w-auto"  // 28px (mobile), 32px (sm+)
          decoding="async"
          fetchPriority="high"           // it’s in the header; load early
        />
      </a>
    </header>

      <main
        className="transition-[padding-right] duration-200 ease-in-out
                   px-0"
        style={{
          // Mobile keeps full width; desktop uses the CSS var (0px when closed)
          paddingRight: "var(--chat-panel-width, 0px)",
        }}
      >
        <KanbanBoard shop={shop} />
      </main>

      {/* Floating chat (bubble + panel).
          No need to lift state: it sets --chat-panel-width & data-chat-open. */}
      <ChatPanel shop={shop || "uppership-demo.myshopify.com"} />
    </>
  );
}