// Dashboard.tsx
import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";

export default function Dashboard({ shop }: { shop: string }) {
  return (
    <>
      {/* This main container expands full width.
          On large screens, when chat opens, we add right padding equal
          to var(--chat-panel-width) so content never hides behind the panel. */}
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