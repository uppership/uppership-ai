// src/hooks/usePackages.ts
import { useQuery } from "@tanstack/react-query";
import type { Package } from "../types/package";

export type PackageStatus =
  | "ordered"
  | "pre_transit"
  | "in_transit"
  | "delivered"
  | "exception";

type UsePackagesOpts = {
  /** When true, fetch across all tenants (omit shop in request) */
  allShops?: boolean;
  /** Extra query params to append (e.g., { flagged: 1, ignored: 0 }) */
  filters?: Record<string, string | number | boolean | null | undefined>;
  /** Override polling interval (ms). Default: 30s */
  refetchIntervalMs?: number;
  /** Force-enable/disable the query */
  enabled?: boolean;
};

// If you already have fetchPackages, add the new signature below.
// Otherwise keep using your existing one—this hook remains compatible.
export type FetchPackagesParams = {
  shop?: string;
  status?: PackageStatus;
  allShops?: boolean;
  filters?: Record<string, string | number | boolean | null | undefined>;
};

export async function fetchPackages(params: FetchPackagesParams): Promise<Package[]> {
  const { shop, status, allShops, filters } = params;

  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (!allShops && shop) qs.set("shop", shop);

  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }

  const url = `https://go.uppership.com/public/packages?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch packages (${res.status})`);
  return res.json();
}

/**
 * usePackages — works for both single-shop and all-shops.
 * - Pass opts.allShops=true with shop="" (or undefined) to aggregate across tenants.
 */
export function usePackages(
  shop?: string,
  status?: PackageStatus,
  opts: UsePackagesOpts = {}
) {
  const allShops = !!opts.allShops;
  const enabled = opts.enabled ?? (allShops || !!shop);
  const refetchInterval = opts.refetchIntervalMs ?? 30_000;

  return useQuery<Package[]>({
    queryKey: [
      "packages",
      allShops ? "ALL" : (shop ?? ""),
      status ?? "all",
      opts.filters ?? {},
    ],
    queryFn: () =>
      fetchPackages({
        shop: allShops ? undefined : shop,
        status,
        allShops,
        filters: opts.filters,
      }),
    enabled,
    refetchInterval,
    staleTime: 15_000, // reduce jitter between columns
  });
}
