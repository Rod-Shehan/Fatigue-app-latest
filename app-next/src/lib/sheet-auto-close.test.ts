import { describe, expect, it } from "vitest";
import { sheetEligibleForAutoClosePastWeek } from "./sheet-auto-close";

describe("sheetEligibleForAutoClosePastWeek", () => {
  const thisSun = "2026-03-23";

  it("past week, empty sheet → eligible", () => {
    expect(sheetEligibleForAutoClosePastWeek("2026-03-16", [], thisSun)).toBe(true);
  });

  it("current week → not eligible", () => {
    expect(sheetEligibleForAutoClosePastWeek("2026-03-23", [], thisSun)).toBe(false);
  });

  it("assume_idle_from → not eligible", () => {
    expect(
      sheetEligibleForAutoClosePastWeek(
        "2026-03-16",
        [{ assume_idle_from: "2026-03-17T12:00:00.000Z", events: [] }],
        thisSun
      )
    ).toBe(false);
  });

  it("grid work without events → not eligible", () => {
    const days = [{ events: [], work_time: Array(1440).fill(true), breaks: Array(1440).fill(false) }];
    expect(sheetEligibleForAutoClosePastWeek("2026-03-16", days, thisSun)).toBe(false);
  });

  it("last event stop → eligible", () => {
    const days = [
      {
        events: [
          { time: "2026-03-17T08:00:00.000Z", type: "work" },
          { time: "2026-03-17T16:00:00.000Z", type: "stop" },
        ],
      },
    ];
    expect(sheetEligibleForAutoClosePastWeek("2026-03-16", days, thisSun)).toBe(true);
  });

  it("last event work → not eligible", () => {
    const days = [{ events: [{ time: "2026-03-17T08:00:00.000Z", type: "work" }] }];
    expect(sheetEligibleForAutoClosePastWeek("2026-03-16", days, thisSun)).toBe(false);
  });
});
