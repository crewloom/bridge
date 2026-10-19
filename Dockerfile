# Production-grade Dockerfile for AgentGram
# Pure Node.js with zero runtime dependencies
FROM node:20-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install OpenCode CLI globally
RUN curl -fsSL https://opencode.ai/install.sh | bash || true

WORKDIR /app

# Copy application files and build standalone bundle
COPY package.json tsconfig.json tsup.config.ts LICENSE README.md ./
COPY src/ ./src/
RUN npm install && npm run build

RUN chmod +x dist/index.js

# Setup workspace and config directories
RUN mkdir -p /workspace /root/.config/agentgram
WORKDIR /workspace

VOLUME ["/workspace", "/root/.config/agentgram"]

ENTRYPOINT ["node", "/app/dist/index.js"]
CMD ["start", "--dir", "/workspace"]
