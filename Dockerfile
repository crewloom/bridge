# Production-grade Dockerfile for AgentGram
# Pure Node.js with zero runtime dependencies
FROM node:24-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install a pinned OpenCode release; the build fails if the download or its checksum is wrong.
ARG OPENCODE_VERSION=1.19.6
ARG OPENCODE_SHA256_X64=47734e08968b30cc22a0bffb6d9feeed76ad4aa743213a12122040392d09a057
ARG OPENCODE_SHA256_ARM64=5b68c1f4c5e75b4134e664cc8f36d634d64208d4fcfe5bcf3b48bab699c2dbac
ARG TARGETARCH
RUN set -eu; \
    case "${TARGETARCH:-amd64}" in \
      amd64) asset=opencode-linux-x64.tar.gz; sha="$OPENCODE_SHA256_X64" ;; \
      arm64) asset=opencode-linux-arm64.tar.gz; sha="$OPENCODE_SHA256_ARM64" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o "/tmp/$asset" "https://github.com/anomalyco/opencode/releases/download/v${OPENCODE_VERSION}/$asset"; \
    echo "$sha  /tmp/$asset" | sha256sum -c -; \
    tar -xzf "/tmp/$asset" -C /usr/local/bin opencode; \
    rm "/tmp/$asset"; \
    opencode --version

WORKDIR /app

# Copy application files and build standalone bundle
COPY package.json package-lock.json tsconfig.json tsup.config.ts LICENSE README.md ./
COPY src/ ./src/
RUN npm ci && npm run build

RUN chmod +x dist/index.js

# Setup workspace and config directories
RUN mkdir -p /workspace /root/.config/agentgram
WORKDIR /workspace

VOLUME ["/workspace", "/root/.config/agentgram"]

ENTRYPOINT ["node", "/app/dist/index.js"]
CMD ["start", "--dir", "/workspace"]
