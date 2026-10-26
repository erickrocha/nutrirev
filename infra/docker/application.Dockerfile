FROM rust:1.97.1-trixie AS builder
WORKDIR /build

# Copy manifest and code
COPY backend/Cargo.toml backend/Cargo.lock ./backend/
COPY backend/application ./backend/application
COPY backend/business ./backend/business
COPY backend/entity ./backend/entity
COPY backend/migration ./backend/migration
COPY backend/src ./backend/src

WORKDIR /build/backend
RUN cargo build --release -p backend

FROM debian:trixie-slim AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home nutrirev

COPY --from=builder /build/backend/target/release/backend /usr/local/bin/nutrirev-backend
USER 10001
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

ENTRYPOINT ["/usr/local/bin/nutrirev-backend"]
