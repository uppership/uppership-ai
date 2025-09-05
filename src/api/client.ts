import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "https://go.uppership.com/public",
  headers: {
    "x-api-key": import.meta.env.VITE_PUBLIC_API_KEY || "",
  },
});

export default api;
