import type { Package } from "../types/package";

export default function Card({ pkg }: { pkg: Package }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-sm text-sm">
      <p className="font-semibold">{pkg.order_name}</p>
      <p className="text-slate-400">{pkg.customer_name}</p>
      <p className="text-slate-500 text-xs">
        {pkg.carrier || "No carrier"} — {pkg.tracking_number || "No tracking"}
      </p>
    </div>
  );
}
