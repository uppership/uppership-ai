import KanbanBoard from "../components/KanbanBoard";

export default function Dashboard() {
  const shop = new URLSearchParams(window.location.search).get("shop") 
             || "uppership-demo.myshopify.com";

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100">
      <h1 className="text-xl font-bold p-4">Uppership.ai Kanban — {shop}</h1>
      <KanbanBoard shop={shop} />
    </div>
  );
}
