# Security Review: Fatigue App

This document summarizes a code security review focused on **reverse engineering**, **IP protection**, and **theft prevention**, plus general security hardening. Recommendations are ordered by priority.

---

## 1. Executive Summary

| Area | Risk level | Notes |
|------|------------|--------|
| **Secrets & env** | Medium | `.env` not committed; dev backdoor (`NEXTAUTH_CREDENTIALS_PASSWORD`) must be disabled in production |
| **Authorization** | **High** | Any logged-in user can read/update **any** sheet; no per-driver or per-sheet ownership checks |
| **IP / reverse engineering** | **High** | Full compliance logic (WA OSH Reg 3.132) is in the **client bundle**; easily extractable |
| **Build & bundle** | Medium | Source maps and no obfuscation make client code easy to inspect |
| **Auth & session** | Low | NextAuth with JWT, scrypt + timing-safe compare for passwords; session checks on API routes |
| **Infrastructure** | Medium | No middleware, no rate limiting, no explicit security headers |

---

## 2. Critical: Authorization (Data Access Control)

**Finding:** Any authenticated user can list all sheets and read or update any sheet by ID. There is no check that the sheet “belongs” to the current user (e.g. driver or manager scope).

- **`GET /api/sheets`** – Returns up to 50 sheets for the whole system; no filter by driver or `created_by`.
- **`GET /api/sheets/[id]`** – Returns any sheet if the user is logged in.
- **`PATCH /api/sheets/[id]`** – Updates any sheet if the user is logged in.
- **`GET /api/sheets/[id]/export`** – Same as GET; any user can export any sheet PDF.

**Recommendations:**

1. **Define access model**
   - Drivers: only see/edit sheets they created (e.g. `createdById === session.user.id`) or that are explicitly shared to them.
   - Managers: can see all sheets (and optionally edit/delete as today).

2. **Enforce in API**
   - **GET /api/sheets**  
     - Drivers: `where: { createdById: session.user.id }` (and any shared-to logic).  
     - Managers: keep current behaviour (all sheets).
   - **GET /api/sheets/[id]** and **PATCH /api/sheets/[id]**  
     - Resolve sheet, then: if user is not manager, require `sheet.createdById === session.user.id` (or shared); else 403.
   - **GET /api/sheets/[id]/export**  
     - Same ownership check as GET by id.

3. **Optional:** Add a “driver id” (or similar) on the sheet and derive “can access” from role + that id so managers can act on behalf of drivers without storing `createdById` as the only source of truth.

---

## 3. Critical: IP Protection & Reverse Engineering

**Finding:** The WA OSH Reg 3.132 compliance logic in `src/lib/compliance.ts` is imported by client components (`sheet-detail.tsx`, `CompliancePanel.tsx`). That code is bundled and sent to the browser, so:

- Rules, thresholds, and algorithms can be extracted from the JS bundle.
- Competitors or bad actors can reuse or clone the logic.

**Recommendations:**

1. **Move compliance to server-only (preferred)**
   - Add an API route, e.g. `POST /api/compliance/check`, that accepts the same inputs the client currently has (e.g. sheet payload + week context).
   - Implement `runComplianceChecks` (and any helpers it needs) only on the server:
     - Either keep `compliance.ts` as server-only (e.g. under `src/lib/server/` or used only from API routes / server components), or
     - Duplicate a minimal “display-only” subset on the client if you need instant UI feedback, and treat the server as the source of truth for violations.
   - Client calls the API for compliance results; do not ship the full compliance algorithm in the client bundle.

2. **If compliance must stay in the client**
   - Build with minification (Next.js default) and **disable production source maps** (see below).
   - Consider a dedicated obfuscation step for the compliance module (e.g. javascript-obfuscator) to raise the bar; note that determined reverse engineering can still succeed, so server-side compliance is stronger.

3. **Export route**
   - The PDF export in `src/app/api/sheets/[id]/export/route.ts` contains a lot of layout/segment logic. It’s server-only, which is good. Ensure it’s protected by the same authorization as GET/PATCH (see Section 2).

---

## 4. High: Build & Bundle Hardening

**Finding:** Production builds are easier to reverse-engineer when source maps are available and there is no obfuscation.

**Recommendations:**

1. **Disable production source maps**
   - In `next.config.js` (or `next.config.mjs`), set:
     - `productionBrowserSourceMaps: false` (default in many setups, but set explicitly).
     - So that `.map` files are not emitted for production client bundles.

2. **Keep minification enabled**
   - Next.js minifies by default; do not disable it for production.

3. **Optional: Obfuscate high-value client code**
   - If any sensitive logic remains on the client, run a step (e.g. javascript-obfuscator) only on selected chunks or entry points. Prefer moving that logic to the server instead.

---

## 5. High: Dev Backdoor in Production

**Finding:** In `src/lib/auth.ts`, when a user has no stored password hash, the code falls back to:

```ts
const devPass = process.env.NEXTAUTH_CREDENTIALS_PASSWORD;
if (devPass && password === devPass) { ... }
```

If `NEXTAUTH_CREDENTIALS_PASSWORD` is set in production, anyone who discovers or guesses it can sign in as any existing user (or create one) without a real password.

**Recommendations:**

1. **Never set `NEXTAUTH_CREDENTIALS_PASSWORD` in production.** Use it only in local `.env` for development.
2. **Guard in code (defence in depth):**
   - In `auth.ts`, only allow the dev password when `process.env.NODE_ENV === "development"` (or a dedicated env like `ALLOW_DEV_CREDENTIALS=true` that is never set in prod).
3. **Document** in `.env.example` and in runbooks that this variable must not be set in production.

---

## 6. Medium: Security Headers & Middleware

**Finding:** There is no `middleware.ts`; security headers (CSP, X-Frame-Options, etc.) are not set centrally. Session checks are done per route, which is correct but could be complemented by middleware.

**Recommendations:**

1. **Add middleware** (`src/middleware.ts`) to:
   - Enforce auth for protected paths (e.g. `/sheets`, `/drivers`, `/manager`, `/admin`) and redirect unauthenticated users to `/login`.
   - Set security headers for all responses, e.g.:
     - `X-Frame-Options: DENY` or `SAMEORIGIN`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - Optional: Content-Security-Policy (CSP) once you’ve audited scripts and inline styles.

2. **Keep API auth as-is** (session check in each route); middleware can add a second layer (e.g. reject unauthenticated requests to `/api/*` except `/api/auth/*`).

---

## 7. Medium: Rate Limiting & Brute Force

**Finding:** No rate limiting on login or on API routes. Credentials provider is vulnerable to brute-force and credential stuffing if exposed.

**Recommendations:**

1. **Rate limit sign-in attempts** (e.g. by IP and/or by email) using:
   - Vercel KV / Upstash Redis, or
   - In-memory store per process (simpler but not shared across instances), or
   - A dedicated rate-limit middleware.
2. **Optionally rate limit sensitive API routes** (e.g. create user, create sheet) to mitigate abuse and scraping.

---

## 8. Lower Priority: Other Hardening

- **CSRF:** Next.js and same-origin cookies with SameSite reduce risk; if you add non-cookie auth or custom forms that change state, consider CSRF tokens.
- **Dependencies:** Run `npm audit` (and fix critical/high) and keep NextAuth and Prisma updated.
- **Error messages:** Ensure API and login responses do not leak whether an email exists; your current “Invalid email or password” is good.
- **Logging:** Avoid logging passwords or session tokens; ensure Prisma logs (e.g. in development) do not expose sensitive fields.

---

## 9. Checklist Summary

| # | Action | Priority |
|---|--------|----------|
| 1 | Enforce sheet access control (list/read/update/export) by role and ownership | Critical |
| 2 | Move compliance logic to server-only API; client calls API for results | Critical |
| 3 | Disable production source maps in Next.js config | High |
| 4 | Restrict `NEXTAUTH_CREDENTIALS_PASSWORD` to development only in code | High |
| 5 | Add middleware for auth redirects and security headers | Medium |
| 6 | Add rate limiting for login (and optionally sensitive APIs) | Medium |
| 7 | Document that `NEXTAUTH_CREDENTIALS_PASSWORD` must not be set in production | Medium |

Implementing **1** and **2** addresses the largest security and IP risks; **3** and **4** are quick wins that reduce exposure to reverse engineering and misuse of the dev backdoor.

---

## 10. Implementation status (all recommendations implemented)

| # | Action | Status |
|---|--------|--------|
| 1 | Sheet access control (list/read/update/export) by role and ownership | Done: `getSessionForSheetAccess`, `canAccessSheet` in auth; all sheet API routes enforce driver vs manager |
| 2 | Compliance logic server-only; client calls POST /api/compliance/check | Done: `src/app/api/compliance/check/route.ts`; client uses `api.compliance.check()`; `lib/hours.ts` for display totals only |
| 3 | Production source maps disabled | Done: `next.config.js` `productionBrowserSourceMaps: false` |
| 4 | NEXTAUTH_CREDENTIALS_PASSWORD development-only | Done: guarded by `NODE_ENV === "development"` in `auth.ts` |
| 5 | Middleware: auth redirects + security headers | Done: `src/middleware.ts` protects /sheets, /drivers, /manager, /admin and /api/*; sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| 6 | Rate limiting: login + sensitive APIs | Done: `lib/rate-limit.ts`; login rate limit in auth route POST; sensitive API rate limit on POST /api/users and POST /api/sheets |
| 7 | Document dev credentials | Done: `.env.example` and this doc |
