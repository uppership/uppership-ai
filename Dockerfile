# syntax=docker/dockerfile:1.7-labs

# ---------- Build stage (Node) ----------
    FROM node:22.12.0-alpine AS build
    WORKDIR /app
    
    # Install deps
    COPY package*.json ./
    RUN npm ci
    
    # Copy source and build
    COPY . .
    RUN npm run build   # => outputs to /app/dist
    
    # ---------- Run stage (Nginx) ----------
    FROM nginx:1.27-alpine AS run
    # (Optional) SPA fallback: uncomment COPY line after you add nginx.conf
    # COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Serve the built app
    COPY --from=build /app/dist /usr/share/nginx/html
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    