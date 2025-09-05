import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE || "https://go.uppership.com/public";
const API_KEY = process.env.PRIVATE_PUBLIC_API_KEY || "";

// Proxy /api -> public backend (with x-api-key set server-side)
app.use(
  "/api",
  createProxyMiddleware({
    target: PUBLIC_API_BASE,
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
    onProxyReq(proxyReq) {
      if (API_KEY) proxyReq.setHeader("x-api-key", API_KEY);
    },
  })
);

// Healthcheck (Railway)
app.get("/healthz", (_, res) => res.status(200).send("ok"));

// Serve static files from Vite build
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("*", (_, res) => res.sendFile(path.join(dist, "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ uppership-ai running on :${PORT}`));