import RegionBarChart from "./RegionBarChart";

export interface SmartMatchSummary {
  fulfillmentRate?: number | string;
  snapshot_date?: string | null;
}

export interface RegionMaps {
  regionLabels: string[];
  orderMap: Record<string, number>;
  inventoryMap: Record<string, number>;
}

interface Props {
  summary: SmartMatchSummary | null;
  regions: RegionMaps | null;
}

function SmartMatchScoreCard({ summary, regions }: Props) {
  if (!summary || !regions) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-red-300">
        Error loading SmartMatch data
      </div>
    );
  }

  const rateNum = Number(summary.fulfillmentRate ?? 0);
  const matchRate = rateNum.toFixed(2);

  const snapshotDate = summary.snapshot_date
    ? new Date(summary.snapshot_date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString();

  // Status styling (success | warning | critical)
  let status: "success" | "warning" | "critical" = "critical";
  let bg = "bg-red-500/5";
  let border = "border-red-500/30";
  let emoji = "🔴";
  let message =
    "Most shipments are sub-optimal. Rebalancing strongly recommended.";

  if (rateNum > 84) {
    status = "success";
    bg = "bg-emerald-500/5";
    border = "border-emerald-500/30";
    emoji = "✅";
    message = "Great job! Your fulfillment is running efficiently.";
  } else if (rateNum > 50) {
    status = "warning";
    bg = "bg-amber-500/5";
    border = "border-amber-500/30";
    emoji = "⚠️";
    message = "Some regions need better alignment. Consider rebalancing.";
  }

  const badgeClasses =
    status === "success"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : status === "warning"
      ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
      : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30";

  return (
    <div
      className={[
        "rounded-xl border p-4 sm:p-5",
        bg,
        border,
        "shadow-sm",
      ].join(" ")}
    >
      <h2 className="text-lg font-semibold mb-2">📦 Uppership SmartMatch</h2>

      <p className="text-sm text-slate-400 mb-4">
        This score shows how well your inventory aligns with actual order demand
        across regions. A higher SmartMatch means fewer split shipments, faster
        deliveries, and lower shipping costs.
      </p>

      <div className="text-center mb-2">
        <div className="text-3xl font-bold tracking-tight">{matchRate}%</div>
        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${badgeClasses}`}>
          {emoji} SmartMatch Score
        </span>
      </div>

      <p className="text-center text-sm text-slate-400 mt-3 mb-4">{message}</p>

      {/* Chart */}
      <div className="w-full" style={{ height: 260 }}>
        <RegionBarChart
          regionLabels={regions.regionLabels}
          orderMap={regions.orderMap}
          inventoryMap={regions.inventoryMap}
        />
      </div>

      <p className="text-center text-xs text-slate-500 mt-3">
        All stats updated as of {snapshotDate}.
      </p>
    </div>
  );
}

export default SmartMatchScoreCard;
