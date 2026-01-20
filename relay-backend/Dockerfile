# Backend Dockerfile for Express.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build the source code
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Install all dependencies (including dev dependencies) for building
RUN npm ci
COPY . .

# Build the TypeScript application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 express

# Copy built application
COPY --from=builder --chown=express:nodejs /app/dist ./dist
COPY --from=builder --chown=express:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs /app/package.json ./package.json

# Copy any additional files needed at runtime
COPY --from=builder --chown=express:nodejs /app/sql ./sql
COPY --from=builder --chown=express:nodejs /app/migrations ./migrations

USER express

EXPOSE 5000

ENV PORT 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health').on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"] 