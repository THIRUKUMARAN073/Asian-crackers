# Asian Crackers — Wholesale Store & Management System

Official wholesale cracker ordering platform and administrative management portal for **Asian Crackers (Balaji Crackers), Sivakasi**.

This platform is powered by:
- **Frontend**: Vanilla HTML5, Tailwind CSS, jsPDF, PDF AutoTable, and WhatsApp Cloud API integration.
- **Backend**: Node.js, Express, PostgreSQL (`pg`), JWT authentication, and bcryptjs.
- **Database**: PostgreSQL (persisting all 129 products across 19 categories).
- **Deployment**: Render (Web Service) + Hosted PostgreSQL (Render PostgreSQL, Supabase, Neon, or AWS RDS).

---

## 🏗️ System Architecture

```
[ Customer Storefront (index.html) ]
                │
                │ GET /api/products
                ▼
[ Express API Server (Render) ] ◄── PUT /api/products/:id ── [ Admin Portal (admin.html) ]
                │                                                    │
                │ SQL Queries                                        │ (JWT / HttpOnly Cookie)
                ▼                                                    ▼
[ PostgreSQL Database (129 Items) ]                      [ Admin Login (/api/admin/login) ]
```

1. **Storefront (`index.html`)**: Fetches the live, verified wholesale catalog directly from PostgreSQL on page load. Order totals, PDF invoice generator, and WhatsApp bill messages all compute using live database prices.
2. **Admin Portal (`admin.html`)**: Password-protected dashboard. Client-side credentials have been completely removed. Admins log in securely against bcrypt password hashes and edit product prices, names, descriptions, and packaging units with instant database persistence.
3. **Automated Migrations & Idempotent Seeding**: When the backend starts, it creates the required `products` table and automatically seeds all 129 catalog items if the database is empty. Once seeded, it never overwrites administrator modifications upon future restarts.
4. **Preserved WhatsApp Ordering**: The existing `POST /api/send-whatsapp-bill` endpoint remains fully functional, generating PDF documents and sending them through Meta's WhatsApp Cloud API.

---

## 🗄️ Database Schema

### Table: `products`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `VARCHAR(50) PRIMARY KEY` | Stable product identifier (e.g. `'1'`, `'2'`, `'130'`) |
| `catalog_key` | `VARCHAR(10) NOT NULL` | Category identifier (e.g. `'A'`, `'B'`, `'S'`) |
| `category_title` | `VARCHAR(255) NOT NULL` | Category name (e.g. `'A. SINGLE SOUND CRACKERS'`) |
| `name` | `VARCHAR(255) NOT NULL` | Product name in English |
| `tamil` | `VARCHAR(255) NOT NULL` | Tamil description / name |
| `price` | `NUMERIC(10, 2) NOT NULL` | Wholesale rate per unit |
| `per` | `VARCHAR(50) NOT NULL` | Unit packaging (e.g. `'1 PKT'`, `'1 BOX'`) |
| `tags` | `JSONB DEFAULT '[]'` | Search & recommendation tags (`["sound", "loud"]`) |
| `img` | `TEXT` | Local or remote image URL path |
| `sort_order` | `INT NOT NULL DEFAULT 0` | Original catalog sorting position |
| `is_active` | `BOOLEAN DEFAULT TRUE` | Active/visibility toggle |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | Record last modification timestamp |

---

## 🚀 Step-by-Step Render Deployment Guide

### Step 1: Create a PostgreSQL Database on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **PostgreSQL**.
3. Set the following fields:
   - **Name**: `asian-crackers-db`
   - **Database**: `asian_crackers`
   - **User**: `asian_crackers_user`
   - **Region**: Choose the same region as your Web Service (e.g., Singapore or Oregon).
   - **Plan**: Free or Starter.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (if your backend is also on Render) or the **External Database URL**.

---

### Step 2: Configure Environment Variables on Render
Navigate to your **Web Service** (`asian-crackers-api`) on Render:
1. Go to **Environment** tab.
2. Add or update the following environment variables:

| Variable Name | Example / Recommended Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:password@dpg-xxxx.render.com/asian_crackers` | Your Render PostgreSQL connection URL |
| `DATABASE_SSL` | `true` | Required for secure cloud database connections |
| `ADMIN_USERNAME` | `asianadmin` | Admin dashboard username |
| `ADMIN_PASSWORD_HASH` | `$2a$10$5rQkfw1kRy4JwjMoVjdqjOOGZaqp7T4ARlhPlWmxkO9Ha15xVoQiu` | Bcrypt hash for password `Asian@2026` |
| `JWT_SECRET` | `super_secret_asian_crackers_jwt_key_2026` | Random secure string for signing session JWTs |
| `FRONTEND_URL` | `https://your-custom-domain.in,https://asian-crackers.onrender.com` | Comma-separated list of allowed frontend origins |
| `PHONE_NUMBER_ID` | *(Keep your existing value)* | Meta WhatsApp Cloud API Phone Number ID |
| `WHATSAPP_TOKEN` | *(Keep your existing value)* | Meta WhatsApp Cloud API Access Token |
| `META_APP_ID` | `2122144138654490` | Meta App reference ID |
| `META_BUSINESS_ID` | `2917813931916911` | Meta Business reference ID |

> [!TIP]
> To generate a new hash for a custom admin password, run:
> ```bash
> cd backend
> npm run generate-hash "YourNewPasswordHere"
> ```

---

### Step 3: Deploy the Backend to Render
1. Commit and push your changes to your GitHub repository `main` branch:
   ```bash
   git add .
   git commit -m "Upgrade catalog to persistent PostgreSQL and secure admin authentication"
   git push origin main
   ```
2. Render will automatically detect the new commit and trigger a deployment.
3. On startup, the backend automatically runs:
   - Schema migration (`CREATE TABLE IF NOT EXISTS products`)
   - Initial catalog seed (129 products across 19 categories)
4. Check Render deployment logs. You should see:
   ```
   Connecting to PostgreSQL database...
   Running database migrations...
   Database schema verified / initialized successfully.
   Checking database seed status...
   Successfully seeded 129 products into PostgreSQL.
   Database initialized and ready.
   Asian Crackers Backend running at http://0.0.0.0:10000
   ```

---

### Step 4: Verify Deployment

1. **Health Check**:
   Open in your browser:
   ```
   https://asian-crackers-api.onrender.com/api/health
   ```
   Expected response: `{"success": true, "status": "ok", ...}`

2. **Catalog API**:
   Open in your browser:
   ```
   https://asian-crackers-api.onrender.com/api/products
   ```
   Expected response: Array of 19 categories with 129 items.

3. **Admin Dashboard**:
   Open `admin.html`:
   - Enter `asianadmin` and `Asian@2026`.
   - Edit a price (e.g. change ₹8.00 to ₹10.00) and click Save.
   - Refresh the page and verify that the updated price persists!

4. **Customer Storefront**:
   Open `index.html`:
   - Verify that all products display their latest database prices.
   - Add items to cart and check the PDF bill and WhatsApp ordering flow.

---

## 🛠️ Local Development Setup

1. **Clone and Install**:
   ```bash
   cd "Asian crackers/backend"
   npm install
   ```

2. **Setup Local Environment**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL=postgresql://localhost:5432/asian_crackers` (or your local Postgres database).

3. **Initialize and Seed Database Manually (Optional)**:
   ```bash
   npm run db:init
   npm run db:seed
   ```

4. **Run Server**:
   ```bash
   npm start
   ```

5. **Run Integration Tests**:
   ```bash
   npm test
   ```

---

## 🔒 Security Best Practices Implemented

- **No Secrets in Frontend**: `ADMIN_CREDENTIALS` completely removed from client JavaScript.
- **Bcrypt Password Storage**: Passwords are never stored or transmitted in plain text.
- **HttpOnly Cookies + Bearer Token**: Session tokens are protected against XSS and cross-origin leakage.
- **Scoped CORS Policy**: Replaced wildcard CORS with strict allowlist via `FRONTEND_URL`.
- **Database Credentials Safe**: `DATABASE_URL` is accessed exclusively by backend Node.js and excluded by `.gitignore`.
