import { describe, it, expect } from "vitest";
import {
  getHours,
  findLongestContinuousBlock,
  countContinuousBlocksOfAtLeast,
  runComplianceChecks,
  type ComplianceDayData,
} from "./compliance";

/** Helper: 48 slots = 24h; true = 0.5h each. Fill first n half-hours as work. */
function workSlots(hours: number): boolean[] {
  const s = Array(48).fill(false);
  for (let i = 0; i < Math.min(48, hours * 2); i++) s[i] = true;
  return s;
}

function nonWorkSlots(hours: number, startSlot = 0): boolean[] {
  const s = Array(48).fill(false);
  for (let i = startSlot; i < Math.min(48, startSlot + hours * 2); i++) s[i] = true;
  return s;
}

/** One day with work only, no breaks/non-work */
function dayWorkOnly(hours: number): ComplianceDayData {
  return {
    work_time: workSlots(hours),
    breaks: Array(48).fill(false),
    non_work: Array(48).fill(false),
  };
}

/** Seven empty days */
function emptyWeek(): ComplianceDayData[] {
  return Array(7).fill(null).map(() => ({
    work_time: Array(48).fill(false),
    breaks: Array(48).fill(false),
    non_work: Array(48).fill(false),
  }));
}

describe("compliance helpers", () => {
  it("getHours counts half-hour slots", () => {
    expect(getHours(workSlots(5))).toBe(5);
    expect(getHours(undefined)).toBe(0);
    expect(getHours([])).toBe(0);
  });

  it("findLongestContinuousBlock finds longest run", () => {
    const slots = Array(48).fill(false);
    for (let i = 10; i < 24; i++) slots[i] = true; // 7h
    expect(findLongestContinuousBlock(slots)).toBe(7);
  });

  it("countContinuousBlocksOfAtLeast counts 7h blocks", () => {
    // 8h block + 8h block = 2 blocks
    const slots = [...Array(16).fill(true), ...Array(16).fill(false), ...Array(16).fill(true)];
    expect(countContinuousBlocksOfAtLeast(slots, 7)).toBe(2);
  });
});

describe("compliance scenarios — what the logic produces", () => {
  it("empty week: no violations or warnings", () => {
    const results = runComplianceChecks(emptyWeek(), { driverType: "solo" });
    expect(results).toHaveLength(0);
  });

  it("5h work in one day with no breaks: break warning (solo)", () => {
    const days = emptyWeek();
    days[0] = dayWorkOnly(5); // Sun 5h work, no break
    const results = runComplianceChecks(days, { driverType: "solo" });
    const breakWarning = results.find((r) => r.message.includes("20 min break") && r.type === "warning");
    expect(breakWarning).toBeDefined();
    expect(breakWarning!.day).toBe("Sun");
  });

  it("14-day work > 168h with prev week: violation", () => {
    const thisWeek = emptyWeek();
    for (let i = 0; i < 7; i++) thisWeek[i] = dayWorkOnly(14); // 98h this week
    const prevWeek = emptyWeek();
    for (let i = 0; i < 7; i++) prevWeek[i] = dayWorkOnly(14); // 98h prev = 196h total
    const results = runComplianceChecks(thisWeek, { driverType: "solo", prevWeekDays: prevWeek });
    const violation = results.find((r) => r.day === "14-day" && r.type === "violation");
    expect(violation).toBeDefined();
    expect(violation!.message).toContain("168");
  });

  it("14-day rule resets after ≥48h continuous non-work: no violation when each segment ≤168h", () => {
    const thisWeek = emptyWeek();
    for (let i = 0; i < 7; i++) thisWeek[i] = dayWorkOnly(14); // 98h this week
    const prevWeek = emptyWeek();
    for (let i = 0; i < 7; i++) prevWeek[i] = dayWorkOnly(14); // 98h prev; 196h total but split by 48h
    prevWeek[6] = { work_time: Array(48).fill(false), breaks: Array(48).fill(false), non_work: Array(48).fill(true) };
    thisWeek[0] = { work_time: Array(48).fill(false), breaks: Array(48).fill(false), non_work: Array(48).fill(true) };
    const results = runComplianceChecks(thisWeek, { driverType: "solo", prevWeekDays: prevWeek });
    const violation = results.find((r) => r.day === "14-day" && r.type === "violation");
    expect(violation).toBeUndefined();
  });

  it("solo: 12h recorded in a day but <7h continuous non-work: violation", () => {
    const days = emptyWeek();
    days[1] = {
      work_time: workSlots(12),
      breaks: Array(48).fill(false),
      non_work: Array(48).fill(false), // 0 non-work
    };
    const results = runComplianceChecks(days, { driverType: "solo" });
    const v = results.find((r) => r.message.includes("7 continuous hrs non-work") && r.type === "violation");
    expect(v).toBeDefined();
    expect(v!.day).toBe("Mon");
  });

  it("two-up: <7h non-work in 24h with 16h+ recorded: violation", () => {
    const days = emptyWeek();
    days[2] = {
      work_time: workSlots(16),
      breaks: Array(48).fill(false),
      non_work: nonWorkSlots(5), // only 5h non-work
    };
    const results = runComplianceChecks(days, { driverType: "two_up" });
    const v = results.find((r) => r.message.includes("7 hrs non-work") && r.message.includes("24 hrs") && r.type === "violation");
    expect(v).toBeDefined();
  });

  it("this week >84h and no prev week: 14-day warning", () => {
    const days = emptyWeek();
    for (let i = 0; i < 7; i++) days[i] = dayWorkOnly(13); // 91h
    const results = runComplianceChecks(days, { driverType: "solo" });
    const w = results.find((r) => r.day === "14-day" && r.type === "warning" && r.message.includes("no previous sheet"));
    expect(w).toBeDefined();
  });

  it("scenario: print sample results (manual inspection)", () => {
    const days = emptyWeek();
    days[0] = dayWorkOnly(6);  // Sun: 6h work, no break
    days[1] = { ...dayWorkOnly(10), breaks: workSlots(0.5) }; // Mon: 10h work, 30min break (invalid length)
    const results = runComplianceChecks(days, { driverType: "solo" });
    console.log("\n--- Sample compliance output ---");
    console.log("Scenario: Sun 6h work no break; Mon 10h work, 30min break (solo)");
    results.forEach((r) => console.log(`[${r.type}] ${r.day}: ${r.message}`));
    console.log("--------------------------------\n");
    expect(results.length).toBeGreaterThan(0);
  });
});
