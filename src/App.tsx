// src/App.tsx
import Dashboard from "./pages/Dashboard";

function useShopFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("shop") || "").trim();
  const looksLikeDomain = /^[a-z0-9](?:[a-z0-9\-.]*[a-z0-9])?$/i;
  return raw && looksLikeDomain.test(raw) ? raw.toLowerCase() : ""; // ← empty = all-stores
}

export default function App() {
  const shop = useShopFromQuery();
  return <Dashboard shop={shop} />; // Dashboard treats "" as all-stores
}
