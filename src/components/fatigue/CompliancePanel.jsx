import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, Coffee, Moon, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getHours(slots) {
  return (slots || []).filter(Boolean).length * 0.5;
}

function findLongestContinuousBlock(slots) {
  let max = 0, current = 0;
  for (let i = 0; i < (slots || []).length; i++) {
    if (slots[i]) { current++; max = Math.max(max, current); }
    else { current = 0; }
  }
  return max * 0.5;
}

function countContinuousBlocksOfAtLeast(slots, minHours) {
  let count = 0, current = 0;
  const minSlots = minHours * 2;
  for (let i = 0; i < (slots || []).length; i++) {
    if (slots[i]) { current++; }
    else { if (current >= minSlots) count++; current = 0; }
  }
  if (current >= minSlots) count++;
  return count;
}

function checkBreakFromDriving(days, results) {
  // Both solo and two-up: ≥20 min break per 5 hrs work (incl. ≥10 consecutive)
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  days.forEach((day, idx) => {
    const dayLabel = dayLabels[idx];
    const workHrs = getHours(day.work_time);
    const breakHrs = getHours(day.breaks);
    const nonWorkHrs = getHours(day.non_work);
    const totalRecorded = workHrs + breakHrs + nonWorkHrs;
    if (totalRecorded === 0) return;

    const events = day.events || [];
    if (events.length > 1) {
      let workMinsSinceBreak = 0;
      let pendingBreakStart = null;
      let pendingBreakAccum = 0;
      let pendingBreakMaxConsec = 0;
      let pendingBreakCurrentConsec = 0;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const nextEv = events[i + 1];
        if (!nextEv) continue;
        const dur = Math.floor((new Date(nextEv.time) - new Date(ev.time)) / 60000);

        if (ev.type === "work") {
          if (pendingBreakAccum > 0) {
            const valid = pendingBreakAccum >= 20 && pendingBreakMaxConsec >= 10;
            if (!valid) {
              results.push({
                type: "violation", icon: Coffee, day: dayLabel,
                message: `Break at ${new Date(pendingBreakStart).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })} was ${pendingBreakAccum}m — need ≥20 min (incl. ≥10 consecutive)`,
              });
            } else {
              workMinsSinceBreak = 0;
            }
            pendingBreakAccum = 0; pendingBreakMaxConsec = 0; pendingBreakCurrentConsec = 0; pendingBreakStart = null;
          }
          workMinsSinceBreak += dur;
          if (workMinsSinceBreak > 5 * 60) {
            results.push({
              type: "violation", icon: AlertTriangle, day: dayLabel,
              message: `More than 5 hrs work without a valid break from driving (≥20 min incl. ≥10 consecutive)`,
            });
            workMinsSinceBreak = 0;
          }
        } else if (ev.type === "break") {
          if (!pendingBreakStart) pendingBreakStart = ev.time;
          pendingBreakAccum += dur;
          pendingBreakCurrentConsec += dur;
          pendingBreakMaxConsec = Math.max(pendingBreakMaxConsec, pendingBreakCurrentConsec);
        } else {
          pendingBreakAccum = 0; pendingBreakMaxConsec = 0; pendingBreakCurrentConsec = 0; pendingBreakStart = null;
          workMinsSinceBreak = 0;
        }
      }
    } else {
      if (workHrs >= 5 && breakHrs === 0) {
        results.push({
          type: "warning", icon: Coffee, day: dayLabel,
          message: `Need ≥20 min break from driving (incl. ≥10 consecutive min) for every 5 hrs work`,
        });
      }
    }
  });
}

function checkSoloRules(days, results, prevCount = 0) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  days.forEach((day, idx) => {
    if (idx < prevCount) return; // skip prev-week days for per-day checks
    const currentIdx = idx - prevCount;
    const dayLabel = dayLabels[currentIdx] || `Day${currentIdx + 1}`;
    const workHrs = getHours(day.work_time);
    const breakHrs = getHours(day.breaks);
    const nonWorkHrs = getHours(day.non_work);
    const totalRecorded = workHrs + breakHrs + nonWorkHrs;
    if (totalRecorded === 0) return;

    // ≥7 continuous hrs non-work time required per day
    const longestNonWork = findLongestContinuousBlock(day.non_work);
    if (totalRecorded >= 12 && longestNonWork < 7) {
      results.push({
        type: "violation", icon: Moon, day: dayLabel,
        message: `Need ≥7 continuous hrs non-work time (longest recorded: ${longestNonWork}h)`,
      });
    }

    // Max 17 hrs elapsed time between 7-hr rest breaks
    const elapsedHrs = workHrs + breakHrs;
    if (elapsedHrs > 17) {
      results.push({
        type: "violation", icon: Clock, day: dayLabel,
        message: `More than 17 hrs elapsed between 7-hr rest breaks (recorded: ${elapsedHrs}h)`,
      });
    }
  });

  // 72-hr rolling: ≥27 hrs non-work + 3× ≥7hr blocks (includes prev-week boundary days)
  for (let start = 0; start <= days.length - 3; start++) {
    const threeDays = days.slice(start, start + 3);
    const hasData = threeDays.some(d =>
      getHours(d.work_time) > 0 || getHours(d.breaks) > 0 || getHours(d.non_work) > 0
    );
    if (!hasData) continue;

    const totalNonWork = threeDays.reduce((sum, d) => sum + getHours(d.non_work), 0);
    const combined = threeDays.flatMap(d => d.non_work || Array(48).fill(false));
    const sevenHrBlocks = countContinuousBlocksOfAtLeast(combined, 7);

    // Label: if window spans prev week, show "prev–Mon" style
    const getLabel = (i) => {
      const ci = i - prevCount;
      return ci < 0 ? `prev+${i + 1}` : (dayLabels[ci] || `D${ci + 1}`);
    };
    const range = `${getLabel(start)}–${getLabel(start + 2)}`;

    if (totalNonWork < 27) {
      results.push({
        type: "warning", icon: TrendingUp, day: range,
        message: `Need ≥27 hrs non-work in any 72hr period (current: ${totalNonWork}h)`,
      });
    }
    if (sevenHrBlocks < 3) {
      results.push({
        type: "warning", icon: Moon, day: range,
        message: `Need ≥3 blocks of ≥7 continuous hrs non-work in 72hrs (found: ${sevenHrBlocks})`,
      });
    }
  }
}

function checkTwoUpRules(days, results, prevCount = 0) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  days.forEach((day, idx) => {
    if (idx < prevCount) return;
    const currentIdx = idx - prevCount;
    const dayLabel = dayLabels[currentIdx] || `Day${currentIdx + 1}`;
    const workHrs = getHours(day.work_time);
    const breakHrs = getHours(day.breaks);
    const nonWorkHrs = getHours(day.non_work);
    const totalRecorded = workHrs + breakHrs + nonWorkHrs;
    if (totalRecorded === 0) return;

    // Two-Up: ≥7 hrs non-work in any 24 hrs (can be in moving vehicle)
    if (nonWorkHrs < 7 && totalRecorded >= 16) {
      results.push({
        type: "violation", icon: Moon, day: dayLabel,
        message: `Need ≥7 hrs non-work time in any 24 hrs (recorded: ${nonWorkHrs}h)`,
      });
    }
  });

  // Two-Up 48-hr rolling (includes prev-week boundary days)
  for (let start = 0; start <= days.length - 2; start++) {
    const twoDays = days.slice(start, start + 2);
    const hasData = twoDays.some(d =>
      getHours(d.work_time) > 0 || getHours(d.breaks) > 0 || getHours(d.non_work) > 0
    );
    if (!hasData) continue;

    const combined = twoDays.flatMap(d => d.non_work || Array(48).fill(false));
    const sevenHrBlocks = countContinuousBlocksOfAtLeast(combined, 7);
    const getLabel = (i) => { const ci = i - prevCount; return ci < 0 ? `prev+${i + 1}` : (dayLabels[ci] || `D${ci + 1}`); };
    const range = `${getLabel(start)}–${getLabel(start + 1)}`;

    if (sevenHrBlocks < 1) {
      results.push({
        type: "warning", icon: Moon, day: range,
        message: `Need ≥1 block of ≥7 continuous hrs non-work in any 48 hrs (Two-Up rule)`,
      });
    }
  }

  // Two-Up 7-day: only current week days
  const currentDays = days.slice(prevCount);
  const totalWeekNonWork = currentDays.reduce((sum, d) => sum + getHours(d.non_work), 0);
  const allSlots = currentDays.flatMap(d => d.non_work || Array(48).fill(false));
  const longestBlock = findLongestContinuousBlock(allSlots);
  if (totalWeekNonWork > 0 && totalWeekNonWork < 48) {
    results.push({
      type: "warning", icon: TrendingUp, day: "7-day",
      message: `Need ≥48 hrs non-work in 7 days (current: ${totalWeekNonWork}h) — Two-Up rule`,
    });
  }
  if (totalWeekNonWork >= 48 && longestBlock < 24) {
    results.push({
      type: "warning", icon: Moon, day: "7-day",
      message: `48hrs non-work must include ≥24 continuous hrs (longest: ${longestBlock}h) — Two-Up rule`,
    });
  }
}

export default function CompliancePanel({ days, driverType = "solo", prevWeekDays = null }) {
  const checks = useMemo(() => {
    const results = [];
    checkBreakFromDriving(days, results);

    // For rolling window rules, prepend last 2 days of prev week to catch boundary violations
    const prevDays = (prevWeekDays || []).map(d => ({
      ...d,
      work_time: d.work_time || Array(48).fill(false),
      breaks: d.breaks || Array(48).fill(false),
      non_work: d.non_work || Array(48).fill(false),
    }));
    const extendedDays = [...prevDays.slice(-2), ...days];

    if (driverType === "two_up") {
      checkTwoUpRules(extendedDays, results, prevDays.length);
    } else {
      checkSoloRules(extendedDays, results, prevDays.length);
    }

    // 14-day work limit — use prev week if available
    const thisWeekWork = days.reduce((sum, d) => sum + getHours(d.work_time), 0);
    const prevWeekWork = prevDays.reduce((sum, d) => sum + getHours(d.work_time), 0);
    const total14dayWork = thisWeekWork + prevWeekWork;
    const has14dayData = prevDays.length > 0;

    if (has14dayData) {
      if (total14dayWork > 168) {
        results.push({
          type: "violation", icon: TrendingUp, day: "14-day",
          message: `${total14dayWork}h work across 14 days — exceeds 168h limit (prev week: ${prevWeekWork}h + this week: ${thisWeekWork}h)`,
        });
      } else if (total14dayWork > 140) {
        results.push({
          type: "warning", icon: TrendingUp, day: "14-day",
          message: `${total14dayWork}h work across 14 days — approaching 168h limit (prev week: ${prevWeekWork}h + this week: ${thisWeekWork}h)`,
        });
      }
    } else {
      // No prev week — check current week only, show note
      if (thisWeekWork > 168) {
        results.push({
          type: "violation", icon: TrendingUp, day: "14-day",
          message: `${thisWeekWork}h work this week alone exceeds 168h/14-day limit`,
        });
      } else if (thisWeekWork > 84) {
        results.push({
          type: "warning", icon: TrendingUp, day: "14-day",
          message: `${thisWeekWork}h this week — no previous sheet found to check full 14-day total`,
        });
      }
    }

    return results;
  }, [days, driverType, prevWeekDays]);

  const violations = checks.filter((c) => c.type === "violation");
  const warnings   = checks.filter((c) => c.type === "warning");

  const totalWork    = days.reduce((s, d) => s + getHours(d.work_time), 0);
  const totalBreaks  = days.reduce((s, d) => s + getHours(d.breaks), 0);
  const totalNonWork = days.reduce((s, d) => s + getHours(d.non_work), 0);
  const prevWeekWork = (prevWeekDays || []).reduce((s, d) => s + getHours(d.work_time), 0);

  const isTwoUp = driverType === "two_up";

  return (
    <div className="space-y-4">
      {/* Driver type badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        isTwoUp ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
      }`}>
        {isTwoUp ? "👥 Two-Up Rules" : "👤 Solo Rules"}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold">Work</p>
          <p className="text-xl font-bold font-mono text-blue-700">{totalWork}h</p>
          {prevWeekDays && <p className="text-[10px] text-blue-400 font-mono">14d: {totalWork + prevWeekWork}h</p>}
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold">Breaks</p>
          <p className="text-xl font-bold font-mono text-amber-700">{totalBreaks}h</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Rest</p>
          <p className="text-xl font-bold font-mono text-emerald-700">{totalNonWork}h</p>
        </div>
      </div>
      {prevWeekDays && (
        <p className="text-[10px] text-slate-400 italic">↑ Previous week's sheet linked for 14-day checks</p>
      )}
      {!prevWeekDays && (
        <p className="text-[10px] text-slate-300 italic">No previous week sheet found — 14-day check is partial</p>
      )}

      {/* Status badge */}
      {checks.length === 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-700">
            All compliant — no issues detected
          </span>
        </div>
      )}

      {/* Violations */}
      <AnimatePresence>
        {violations.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-red-500 font-bold">
              Violations ({violations.length})
            </p>
            {violations.map((v, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                <v.icon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-red-400 uppercase">{v.day}</span>
                  <p className="text-xs text-red-700">{v.message}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warnings */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-amber-500 font-bold">
              Warnings ({warnings.length})
            </p>
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <w.icon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase">{w.day}</span>
                  <p className="text-xs text-amber-700">{w.message}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
          WA OSH Reg 3.132 — {isTwoUp ? "Two-Up" : "Solo"} Rules
        </p>
        {isTwoUp ? (
          <ul className="space-y-1 text-[11px] text-slate-500">
            <li>• ≥20 min break from driving every 5 hrs (incl. ≥10 consecutive min)</li>
            <li>• ≥7 hrs non-work in any 24 hrs (can be in moving vehicle)</li>
            <li>• ≥1 block of ≥7 continuous hrs non-work per 48 hrs (not in moving vehicle)</li>
            <li>• ≥48 hrs non-work per 7 days (incl. ≥24 continuous hrs)</li>
            <li>• Max 168 hrs work in any 14-day period</li>
          </ul>
        ) : (
          <ul className="space-y-1 text-[11px] text-slate-500">
            <li>• ≥20 min break from driving every 5 hrs (incl. ≥10 consecutive min)</li>
            <li>• ≥7 continuous hrs non-work time required</li>
            <li>• Max 17 hrs elapsed time between 7-hr rest breaks</li>
            <li>• ≥27 hrs non-work in any 72 hrs (incl. 3× ≥7hr blocks)</li>
            <li>• Max 168 hrs work in any 14-day period</li>
          </ul>
        )}
      </div>
    </div>
  );
}