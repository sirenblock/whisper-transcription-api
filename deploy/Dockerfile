# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY backend/package*.json ./
RUN npm ci

# Copy application code
COPY backend ./

# Generate Prisma Client
RUN npx prisma generate

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 whisperapi

# Copy necessary files from previous stages
COPY --from=deps --chown=whisperapi:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=whisperapi:nodejs /app ./

# Switch to non-root user
USER whisperapi

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
