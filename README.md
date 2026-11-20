# IRONHUB — Gym Management System

IRONHUB is a web-based gym management platform for daily front-desk operations, member administration, QR-based check-in, over-the-counter payment recording, and business reporting.

## Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase PostgreSQL + Prisma ORM
- **Charts & Tables:** Recharts, Lucide React
- **QR Credentials:** Server-side `qrcode` generation (opaque hashed tokens) + `@zxing/browser` camera scanner with manual fallback
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
npx prisma generate
npx prisma db push
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

## Seeded Staff Accounts

- **Owner:** `owner@ironhub.ph` / `IronHub@2026!`
- **Front Desk:** `desk@ironhub.ph` / `FrontDesk@2026!`
