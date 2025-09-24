# syntax=docker/dockerfile:1

# --- Build stage ------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Runtime stage ----------------------------------------------------------
FROM nginx:1.27-bookworm

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
