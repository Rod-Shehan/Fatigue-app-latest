# Roadside PDF & QR snapshot (S6)

## PDF export

`GET /api/sheets/[id]/export` (authenticated) now includes a **Roadside compliance summary** after the title block:

- Driver name, week starting, fatigue rules label  
- Violation / warning counts and lists (same engine as the app)  
- **Disclaimer** (`ROADSIDE_PDF_DISCLAIMER` in `src/lib/roadside-pdf.ts`) — not legal advice; not an NHVR-approved EWD  

The Chromium HTML path and the **jsPDF fallback** both include this block.

## Optional QR (read-only JSON)

When all of the following are true, a **QR code** is embedded in the PDF pointing at a **time-limited** public API:

1. `ROADSIDE_QR_IN_PDF_ENABLED=true`  
2. A signing secret is configured: `ROADSIDE_SNAPSHOT_SECRET` (preferred) or `NEXTAUTH_SECRET`  
3. `NEXT_PUBLIC_APP_URL` (or `VERCEL_URL`) resolves to the correct public origin for the link  

**Endpoint:** `GET /api/sheets/[id]/roadside-snapshot?t=<token>`  

- No session cookie; **token required** (HMAC, default TTL 14 days).  
- Response: JSON with violations, warnings, disclaimer, and expiry.  

**Security:** Treat the token like a **capability**: anyone with the QR can read that snapshot until expiry. Rotate `ROADSIDE_SNAPSHOT_SECRET` to invalidate old links.

## Related

- `docs/product/positioning.md`  
- `docs/roadmap/approval-gates.md` — S6  
