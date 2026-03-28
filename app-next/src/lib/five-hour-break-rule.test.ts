import { describe, it, expect } from "vitest";
import {
  applyQualifyingBreakSegment,
  emptySlots,
  qualifyingRestComplete,
  restSlotsFromBreakMinutesInOrder,
  qualifyingRestMetForWorkAfterBreak,
  findWorkWindowStartMs,
  getMinutesBeforeDueFromSlots,
  getBreakSplitBarState,
} from "./five-hour-break-rule";

describe("five-hour-break-rule", () => {
  it("segments under 10 min do not fill slots", () => {
    const s = emptySlots();
    applyQualifyingBreakSegment(9, s);
    expect(qualifyingRestComplete(s)).toBe(false);
  });

  it("one 20 min segment fills both slots", () => {
    const s = emptySlots();
    applyQualifyingBreakSegment(20, s);
    expect(qualifyingRestComplete(s)).toBe(true);
  });

  it("two 10 min segments fill both slots", () => {
    expect(qualifyingRestComplete(restSlotsFromBreakMinutesInOrder([10, 10]))).toBe(true);
  });

  it("15 min then 5 min does not satisfy (5 min is not qualifying)", () => {
    expect(qualifyingRestComplete(restSlotsFromBreakMinutesInOrder([15, 5]))).toBe(false);
  });

  it("getMinutesBeforeDueFromSlots: none / one / both", () => {
    expect(getMinutesBeforeDueFromSlots(emptySlots())).toBe(20);
    expect(getMinutesBeforeDueFromSlots({ slot1: true, slot2: false })).toBe(10);
    expect(getMinutesBeforeDueFromSlots({ slot1: true, slot2: true })).toBe(0);
  });

  it("getBreakSplitBarState: no prior, 15 min elapsed — left full, right half", () => {
    const st = getBreakSplitBarState(emptySlots(), 15);
    expect(st.leftPct).toBe(100);
    expect(st.rightPct).toBe(50);
    expect(st.complete).toBe(false);
  });

  it("qualifyingRestMetForWorkAfterBreak: 10+10 in separate breaks in same 5h window", () => {
    const t0 = new Date("2026-06-01T00:00:00.000Z").getTime();
    const iso = (ms: number) => new Date(ms).toISOString();
    const work300 = 300 * 60 * 1000;
    const events = [
      { time: iso(t0), type: "work" },
      { time: iso(t0 + work300), type: "break" },
      { time: iso(t0 + work300 + 10 * 60 * 1000), type: "work" },
      { time: iso(t0 + work300 + 10 * 60 * 1000 + 60 * 60 * 1000), type: "break" },
    ];
    const lastBreakDurMin = 10;
    expect(qualifyingRestMetForWorkAfterBreak(events, [lastBreakDurMin])).toBe(true);
  });

  it("findWorkWindowStartMs ends at work now", () => {
    const t0 = new Date("2026-06-01T08:00:00.000Z").getTime();
    const iso = (ms: number) => new Date(ms).toISOString();
    const work120 = 120 * 60 * 1000;
    const events = [{ time: iso(t0), type: "work" }];
    const nowMs = t0 + work120;
    const ws = findWorkWindowStartMs(events, nowMs);
    expect(ws).toBe(t0);
  });
});
