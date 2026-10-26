# NutriRev Platform — Multi-Tenant Architecture & Quiet Luxury Clinic

NutriRev is a high-performance, multi-tenant web application featuring a **Rust backend** (Axum, SeaORM, Clean Architecture), a **React/Redux/SCSS frontend** (Vite, Yarn, Quiet Luxury Design System), and a **Flutter mobile app**.

---

## 🚀 Quick Start Guide (Run Locally)

### Prerequisites

- **Docker & Docker Compose**
- **Rust** (stable toolchain, Cargo)
- **Node.js** (v18+) & **Yarn** (`yarn --version`)

---

### Step 1: Start Infrastructure (MariaDB + LocalStack S3 & SQS)

From the project root:

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts two containers:
1. **MariaDB (`nutrirev-dev`)**: Database server listening on port `3306` (`nutrirev-dev` DB).

---

### Step 2: Start the Rust Backend API Server

From the project root:

```bash
cd backend
cargo run
```

The backend server will:
1. Connect to local MariaDB (`mysql://nutrirev:brutal@localhost:3306/nutrirev-dev`).
2. Run database migrations automatically via SeaORM (including customer photo & `user_id` columns).
3. Automatically seed the initial **SysAdmin** user if not present (configured in `backend/.env`).
4. Expose the REST API on `http://localhost:8080`.
5. Expose OpenAPI Swagger UI documentation at `http://localhost:8080/swagger-ui/index.html`.

#### Default Environment Configuration (`backend/.env`)

```env
HOST=0.0.0.0
PORT=8080
DATABASE_URL=mysql://nutrirev:brutal@localhost:3306/nutrirev-dev
SYSADMIN_EMAIL=sysadmin@nutrirev.com
SYSADMIN_PASSWORD=162354

# AWS S3 / LocalStack Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=nutrirev-media-dev
S3_ENDPOINT=http://localhost:4566
CLOUDFRONT_DOMAIN=http://localhost:4566/nutrirev-media-dev
```

#### Payment Provider Credentials

Provider credentials are **never** stored in the payment tables and never accepted
from an API request. A `payment_merchant` row holds only a `credentials_secret_ref`,
and that reference is resolved to environment variables at call time
(`backend/business/src/gateway/payment_secret_resolver.rs`). Replace that resolver
with the deployment secret manager before production.

A reference maps to a variable prefix by upper-casing it and replacing every
non-alphanumeric character: `asaas/clinic-a` becomes `PAYMENT_SECRET_ASAAS_CLINIC_A`.

```env
# e.Rede — credentials_secret_ref = "rede/clinic-a"
PAYMENT_SECRET_REDE_CLINIC_A_CLIENT_ID=...
PAYMENT_SECRET_REDE_CLINIC_A_CLIENT_SECRET=...

# Asaas — credentials_secret_ref = "asaas/clinic-a"
PAYMENT_SECRET_ASAAS_CLINIC_A_API_KEY=...
PAYMENT_SECRET_ASAAS_CLINIC_A_WEBHOOK_TOKEN=...
```

The deployment also chooses which provider environment is live. It defaults to
`sandbox`, so a missing variable can never mean "charge real cards":

```env
PAYMENT_ENVIRONMENT=sandbox   # or: production
```

Point the provider's webhook at `POST /v1/payments/webhooks/asaas` and set the
same value there as `PAYMENT_SECRET_ASAAS_<REF>_WEBHOOK_TOKEN`.

The webhook token is **per clinic, never one shared value**. A single global token
would be configured in every clinic's provider panel, so anyone holding it could
post a forged "payment received" naming another clinic's payment.

---

### Step 3: Start the React/Redux Frontend Application

From the project root:

```bash
cd frontend
yarn install
yarn dev
```

The frontend application will start on `http://localhost:5173`.

---

## 📸 Key Features & API Functionality

### Customer Profile Photos & CloudFront Signed URLs
- Mobile users can upload profile photos via `POST /customer/{id}/photo`.
- Images are saved to S3 (`uploads/customer-{id}/{uuid}.{ext}`).
- Secure **CloudFront signed URLs** (or local S3 URLs in dev mode) are returned to display images.

### Mobile Approval & User Linking
- Calling `POST /customer/{id}/enable-mobile` provisions a user account and links `user.id` into `customer.user_id`.
- Logged-in mobile users can fetch their customer profile using `GET /customer/me`.

---

## 🏢 Architecture & Sub-Crates

### Backend (Rust Clean Architecture)
- `entity`: SeaORM table mappings.
- `business`: Domain models, use cases (`CustomerUseCase`, `ImageStorageUseCase`, `TenantUseCase`, `UserUseCase`), gateways, and `Role` definitions.
- `application`: Axum HTTP controllers, JWT authentication middleware, Fluent i18n (`en`, `pt-BR`), and `utoipa` OpenAPI annotations.
- `migration`: SeaORM schema migration manager.

---

## 🧪 Testing & Building

### Backend Unit & Integration Tests
```bash
cd backend
cargo test --workspace
```

### Frontend Production Build
```bash
cd frontend
yarn build
```
