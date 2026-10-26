FROM rust:1.97.1-trixie AS builder
WORKDIR /build/backend
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/application ./application
COPY backend/business ./business
COPY backend/entity ./entity
COPY backend/integration ./integration
COPY backend/migration ./migration
RUN cargo build --locked --release -p myfit-integration

FROM debian:trixie-slim AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home myfit
COPY --from=builder /build/backend/target/release/myfit-integration /usr/local/bin/myfit-integration
USER 10001
EXPOSE 50051
ENTRYPOINT ["/usr/local/bin/myfit-integration"]

