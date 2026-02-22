# Driver Fatigue Log (Next.js – no Base44)

This is the same app converted to **Next.js 14 + TypeScript + Prisma + NextAuth**, with no Base44 dependency.

## Quick start

1. **Install and set up env**
   ```bash
   cd app-next
   npm install
   cp .env.example .env
   ```
   Edit `.env`: set `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`) and optionally `NEXTAUTH_CREDENTIALS_PASSWORD` for password sign-in.

2. **Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign in with any email and the password you set in `NEXTAUTH_CREDENTIALS_PASSWORD`.

## Stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind**
- **Prisma** + **SQLite** (dev) or **PostgreSQL** (prod via `DATABASE_URL`)
- **NextAuth.js** (Credentials provider; add Google etc. in `src/lib/auth.ts`)
- **TanStack Query** for client data

## Fatigue Sheet UI

The sheet **list** and **drivers** pages are fully wired. The single-sheet **editor** (time grid, compliance panel, signature) lives in `src/components/fatigue/`. Use `api.sheets.get(id)`, `api.sheets.update(id, data)`, and `api.sheets.exportPdfUrl(id)` from `@/lib/api.ts`.

See **MIGRATION.md** in the repo root for the full conversion guide.
