FROM node:18-alpine

# Install pnpm and curl for health checks
RUN npm install -g pnpm@10.0.0 && \
    apk add --no-cache curl

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml osiris.json ./
COPY . ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Clean up dev dependencies but preserve workspace structure
RUN pnpm prune --prod

# Expose all MCP server ports 
EXPOSE 3000

# Default command - will be overridden in docker-compose
CMD ["node"]