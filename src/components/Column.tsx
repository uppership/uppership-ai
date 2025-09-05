import { usePackages } from "../hooks/usePackages";
import Card from "./Card";
import type { Package } from "../types/package";

export default function Column({ shop, status }: { shop: string; status: string }) {
  const { data, isLoading } = usePackages(shop, status);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 flex flex-col h-[80vh]">
      <h2 className="text-sm font-bold px-3 py-2 border-b border-slate-700">
        {status.toUpperCase()} {data ? `(${data.length})` : ""}
      </h2>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
        {data?.map((pkg: Package) => (
          <Card key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
