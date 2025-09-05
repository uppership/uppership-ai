import { useQuery } from "@tanstack/react-query";
import { fetchPackages } from "../api/packages";
import type { Package } from "../types/package";

export function usePackages(shop: string, status?: string) {
  return useQuery<Package[]>({
    queryKey: ["packages", shop, status],
    queryFn: () => fetchPackages(shop, status),
    enabled: !!shop,
    refetchInterval: 30_000,
  });
}
