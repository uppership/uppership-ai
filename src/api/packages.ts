import api from "./client";

export async function fetchPackages(shop: string, status?: string) {
  const res = await api.get("/packages", {
    params: { shop, status, limit: 100 },
  });
  return res.data.packages;
}
