import Column from "./Column";

const STATUSES = ["ordered", "shipped", "in_transit", "delivered", "exception"];

export default function KanbanBoard({ shop }: { shop: string }) {
  return (
    <div className="grid grid-cols-7 gap-4 p-4 overflow-x-auto">
      {STATUSES.map(status => (
        <Column key={status} shop={shop} status={status} />
      ))}
    </div>
  );
}
