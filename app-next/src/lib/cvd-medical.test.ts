import { describe, it, expect } from "vitest";
import { daysFromTodayToYmd, getCvdMedicalBannerKind } from "./cvd-medical";

describe("cvd-medical", () => {
  it("getCvdMedicalBannerKind returns none for empty", () => {
    expect(getCvdMedicalBannerKind(null)).toBe("none");
    expect(getCvdMedicalBannerKind("")).toBe("none");
  });

  it("getCvdMedicalBannerKind expired when date in past", () => {
    expect(getCvdMedicalBannerKind("1990-01-01")).toBe("expired");
  });

  it("daysFromTodayToYmd is negative for past", () => {
    expect(daysFromTodayToYmd("1990-01-01")).toBeLessThan(0);
  });
});
