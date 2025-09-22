// src/App.tsx
import Dashboard from "./pages/Dashboard";

function useShopFromQuery(defaultShop = "uppership-demo.myshopify.com") {
  const params = new URLSearchParams(window.location.search);
  const rawShop = (params.get("shop") || "").trim();
  const looksLikeDomain = /^[a-z0-9](?:[a-z0-9\-.]*[a-z0-9])?$/i;
  return rawShop && looksLikeDomain.test(rawShop) ? rawShop.toLowerCase() : defaultShop;
}

export default function App() {
  const shop = useShopFromQuery();
  return <Dashboard shop={shop} />;
}
