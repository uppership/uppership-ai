import KanbanBoard from "../components/KanbanBoard";
import ChatPanel from "../components/ChatPanel";

export default function Dashboard({ shop }: { shop: string }) {
  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Kanban spans 2 columns on large screens */}
      <div className="lg:col-span-2">
        <KanbanBoard shop={shop} />
      </div>

      {/* Right: Chat */}
      <div className="lg:col-span-1">
        <ChatPanel shop={shop || "uppership-demo.myshopify.com"} />
      </div>
    </div>
  );
}
