import type { Package } from "../types/package";

export default function Card({ pkg }: { pkg: Package }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-sm">
      <p className="text-lg font-bold text-white">{pkg.order_name}</p>
    </div>
  );
}
