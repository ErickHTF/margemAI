# Multi-stage Dockerfile para o Frontend React + Vite (MargemAI)
# Stage 1: Build dos assets estáticos com Node.js 20 Alpine
FROM node:20-alpine AS builder

WORKDIR /app

# Cache das dependências npm
COPY package*.json ./
RUN npm ci

# Build de produção do Vite
COPY . .
RUN npm run build

# Stage 2: Servidor HTTP de alta performance Nginx Alpine (~25MB)
FROM nginx:1.25-alpine AS runner

# Configuração customizada do Nginx com suporte a SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cópia dos arquivos estáticos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
