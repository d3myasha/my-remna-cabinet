# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_APP_NAME=Cabinet Frontend
ARG VITE_APP_LOGO=C

# Set environment variables for build
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_LOGO=$VITE_APP_LOGO

# Build the application
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD caddy version || exit 1
