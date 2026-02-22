# Concurrent compliance: warn and report (do not prevent lodging)

## Principle: driver may always lodge

- **The driver must not be prevented from lodging a sheet or logging events.** All logic errs on the side of permitting the driver to lodge.
- The app **warns** when behaviour may be non-compliant and **reports** violations (e.g. to the Fatigue System Manager). It does **not** block completion or event logging.
- If there is a tension between rule enforcement and permitting the driver to lodge, **permit lodging** and use warnings and reporting instead.

---

## Permitting non-compliant lodgement with warning

- **Permit** completing and signing a sheet even when it has compliance issues or when the last 24h break is missing or older than 7 days.
- **Show a clear warning** before or at completion that:
  - The sheet has compliance issues / has not met the 24h break requirement (as applicable), and
  - Any violations may be reported to the Fatigue System Manager and may have consequences.
- The driver can still proceed to sign and lodge the sheet after seeing the warning.

---

## Suggested wording (for your review)

**Option A (signature / completion):**  
*"This sheet has compliance issues [or: has not had a 24-hour break recorded within the last 7 days]. You may still complete and sign. By signing, you acknowledge that any violations may be reported to the Fatigue System Manager and may have consequences under your organisation’s policy or applicable law."*

**Option B (shorter):**  
*"You may complete and sign. Any compliance issues may be reported to the Fatigue System Manager and may bring disciplinary actions."*

**Option C (explicit reporting):**  
*"Completing this sheet with the issues shown may result in this information being reported to the Fatigue System Manager. There may be consequences. You may still complete and sign if you choose."*

Use or adapt one of these in the completion/signature flow when the sheet has violations or when the last 24h break requirement is not met.

---

## Overall strategy (all rules) — no blocking of lodging

| Rule | Strategy (warn only; do not prevent lodging) |
|------|---------------------------------------------|
| **5h work → 20min break** | **Live:** LogBar shows work countdown (5h) and break countdown (20m). **Imminent warning:** When work time approaches 5h (e.g. &lt;30 min left), show: "Take a break within X minutes to avoid a violation." **At log:** Do **not** block logging work; driver may log. Optionally show an inline warning that the break rule was not met and may be reported. |
| **7h continuous rest (solo)** | **Prospective:** (Future) Warn when longest non-work block is &lt;7h. **At completion:** Compliance panel shows issue; do **not** block complete. |
| **17h between 7h rests (solo)** | **Prospective:** (Future) Warn when approaching 17h. **Retrospective:** Compliance panel reports. Do not block completion. |
| **72h rolling (solo)** | **Prospective:** (Future) Warn when 72h window is short. **Retrospective:** Compliance panel reports. Do not block completion. |
| **24h break (solo)** | **At completion:** Do **not** block. Recommend setting last 24h break when &gt;7 days or not set; show warning that issues may be reported to the Fatigue System Manager. **Carry-over:** If previous week's break is &lt;7 days, auto-fill to avoid re-entry. |
| **14-day 168h** | **Prospective:** (Future) Warn when approaching 168h. **Retrospective:** Compliance panel reports. Do not block completion. |
| **Two-Up** | **Prospective:** (Future) Imminent warnings. **Retrospective:** Compliance panel reports. Do not block completion. |

---

## Implementation principle

- **Never prevent** the driver from lodging a sheet or logging an event.
- **Warn** when behaviour may be non-compliant (imminent warnings, recommendations).
- **Report** after the fact (compliance panel; reporting to Fatigue System Manager as per policy).
- **Err on the side of the driver:** when in doubt, allow lodging and add or strengthen the warning instead of blocking.

---

## Current implementation

- **Completion:** Driver may always choose "Save & mark complete". When there are compliance violations or last 24h break is missing/old, the signature dialog shows a "Compliance notice" with wording that violations may be reported to the Fatigue System Manager and may have consequences; driver may still sign.
- **24h break banner:** Recommends setting last 24h break when &gt;7 days or not set; states they may still complete and that issues may be reported.
- **LogBar:** 5h/20min countdown and imminent warning (&lt;30 min left); no block on logging work.
- **Compliance panel:** Shows violations and warnings; explains that the driver may always lodge and that reporting is used instead of blocking.
