# ============================================
# Stage 1: Build the client
# ============================================
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ============================================
# Stage 2: Build the server
# ============================================
FROM node:20-alpine AS server-build

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Install only production server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built client into the location the server expects
COPY --from=client-build /app/client/dist ./client/dist

# Expose the port
ENV PORT=3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/stats || exit 1

# Start the server
WORKDIR /app/server
CMD ["node", "dist/index.js"]
