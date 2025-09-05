// KanbanBoard.tsx
import Column from "./Column";

const STATUSES = ["ordered", "shipped", "in_transit", "delivered", "exception"];

export default function KanbanBoard({ shop }: { shop: string }) {
  return (
    <div className="w-full h-full">
      <div className="grid gap-4 p-4 overflow-x-auto
                      grid-cols-[repeat(7,minmax(240px,1fr))]">
        {STATUSES.map((status) => (
          <Column key={status} shop={shop} status={status} />
        ))}
      </div>
    </div>
  );
}