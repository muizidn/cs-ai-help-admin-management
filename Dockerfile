# Build stage
FROM oven/bun:1.2.10-alpine AS builder

# Accept version as build argument
ARG APP_VERSION=development
ENV APP_VERSION=$APP_VERSION

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code for building
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.2.10-alpine AS runner

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copy package files for production dependencies
COPY package.json bun.lock ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Copy built application from builder stage
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./package.json

# Copy static files if they exist
COPY --from=builder --chown=sveltekit:nodejs /app/static ./static

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Switch to non-root user
USER sveltekit

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application
CMD ["bun", "run", "build/index.js"]
