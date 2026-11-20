# IRONHUB — Gym Management System

IRONHUB is a web-based gym management platform for daily front-desk operations, member administration, client self-service QR check-in passes, over-the-counter payment recording, and business reporting.

## Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase PostgreSQL + Prisma ORM
- **Charts & Tables:** Recharts, Lucide React
- **QR Credentials:** Client self-service QR generation (`/portal`) with opaque SHA-256 hashed tokens + `@zxing/browser` front-desk camera scanner (`/check-in`) with manual fallback
- **Validation & Auth:** Zod, `bcryptjs`, HTTP-only signed sessions (`jose`), server-enforced RBAC

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

Copy `.env.example` to `.env` and add your Supabase PostgreSQL connection strings (`DATABASE_URL` transaction pooler and `DIRECT_URL` direct connection) plus a 32-byte `AUTH_SECRET`.

3. Push schema & seed initial data:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

## Seeded Accounts

### Staff Workspace (`/login`)
- **Owner (Full Access):** `owner@ironhub.ph` / `IronHub@2026!`
- **Admin (Operations & Staff Management):** `admin@ironhub.ph` / `Admin@2026!`
- **Front Desk (Members, Check-In, OTC Payments):** `desk@ironhub.ph` / `FrontDesk@2026!`
- **Trainer (Dashboard, Members, Check-In):** `trainer@ironhub.ph` / `Trainer@2026!`

### Client QR Pass Portal (`/portal/login`)
- **Sample Active Member:** `IH-1001` (or `juan@ironhub.ph`) / `Member@2026!`
