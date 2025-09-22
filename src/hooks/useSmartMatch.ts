// hooks/useSmartMatch.ts
import { useEffect, useState } from "react";

export interface Summary {
  snapshot_date?: string | null;
  fulfillmentRate?: number; // percent 0–100
  monthlyOrders?: number | null;
  estimatedSavings?: number | null;
  savingsPerOrder?: number | null;
  costPerMovement?: number | null;
  improvementRate?: number | null;
}

export interface RegionMaps {
  regionLabels: string[];
  orderMap: Record<string, number>;
  inventoryMap: Record<string, number>;
}

interface InsightsResponse {
  summary: Summary;
  regions: RegionMaps;
}

type SmartMatchOpts = {
  /** Force-enable/disable fetching. Defaults to true, but requires a non-empty shop. */
  enabled?: boolean;
};

export default function useSmartMatch(
  shop?: string,
  refreshToken: number = 0,
  opts: SmartMatchOpts = {}
) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [regions, setRegions] = useState<RegionMaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isEnabled = (opts.enabled ?? true) && !!(shop && shop.trim());

  useEffect(() => {
    let alive = true;

    // If disabled (e.g., all-shops mode), clear and bail without fetching
    if (!isEnabled) {
      setSummary(null);
      setRegions(null);
      setErr(null);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `https://go.uppership.com/api/insights/${encodeURIComponent(shop!)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: InsightsResponse = await res.json();

        const s: Summary = {
          snapshot_date: data?.summary?.snapshot_date ?? null,
          fulfillmentRate:
            typeof data?.summary?.fulfillmentRate === "number"
              ? data.summary.fulfillmentRate
              : Number(data?.summary?.fulfillmentRate ?? 0),
          monthlyOrders: data?.summary?.monthlyOrders ?? null,
          estimatedSavings: data?.summary?.estimatedSavings ?? null,
          savingsPerOrder: data?.summary?.savingsPerOrder ?? null,
          costPerMovement: data?.summary?.costPerMovement ?? null,
          improvementRate: data?.summary?.improvementRate ?? null,
        };

        const r: RegionMaps = {
          regionLabels: data?.regions?.regionLabels ?? [],
          orderMap: data?.regions?.orderMap ?? {},
          inventoryMap: data?.regions?.inventoryMap ?? {},
        };

        if (!alive) return;
        setSummary(s);
        setRegions(r);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [shop, refreshToken, isEnabled]);

  return { summary, regions, loading, err };
}