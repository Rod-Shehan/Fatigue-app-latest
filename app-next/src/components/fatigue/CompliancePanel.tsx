"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, Coffee, Moon, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  runComplianceChecks,
  getHours,
  type ComplianceDayData,
  type ComplianceCheckResult,
} from "@/lib/compliance";
import { getSheetDayDateString } from "@/lib/weeks";
import { ACTIVITY_THEME } from "@/lib/theme";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Turn compliance day label into a date the driver understands (e.g. "Tue 18 Feb"), not "prev+2". */
function whenLabel(
  day: string,
  weekStarting?: string,
  prevWeekStarting?: string
): string {
  if (day === "14-day") return "in the last 14 days";
  const prevMatch = prevWeekStarting && day.match(/^prev\+(\d+)$/);
  if (prevMatch) {
    const n = parseInt(prevMatch[1], 10);
    const dateStr = getSheetDayDateString(prevWeekStarting, 4 + n);
    return formatDateForDriver(dateStr);
  }
  const ci = DAY_LABELS.indexOf(day);
  if (ci >= 0 && weekStarting) {
    const dateStr = getSheetDayDateString(weekStarting, ci);
    return formatDateForDriver(dateStr);
  }
  return day;
}

function formatDateForDriver(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

const ICON_MAP = {
  Coffee,
  AlertTriangle,
  Moon,
  Clock,
  TrendingUp,
  CheckCircle2,
} as const;

export default function CompliancePanel({
  days,
  driverType,
  prevWeekDays,
  last24hBreak,
  weekStarting,
  prevWeekStarting,
}: {
  days: ComplianceDayData[];
  driverType?: string;
  prevWeekDays?: ComplianceDayData[] | null;
  last24hBreak?: string;
  weekStarting?: string;
  prevWeekStarting?: string;
}) {
  const checks = useMemo(
    () =>
      runComplianceChecks(days, {
        driverType,
        prevWeekDays,
        last24hBreak,
        weekStarting,
        prevWeekStarting,
      }),
    [days, driverType, prevWeekDays, last24hBreak, weekStarting, prevWeekStarting]
  );

  const violations = checks.filter((c) => c.type === "violation");
  const warnings = checks.filter((c) => c.type === "warning");
  const totalWork = days.reduce((s, d) => s + getHours(d.work_time), 0);
  const totalBreaks = days.reduce((s, d) => s + getHours(d.breaks), 0);
  const totalNonWork = days.reduce((s, d) => s + getHours(d.non_work), 0);
  const prevWeekWork = (prevWeekDays || []).reduce((s, d) => s + getHours(d.work_time), 0);
  const isTwoUp = driverType === "two_up";

  return (
    <div className="space-y-4">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isTwoUp ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
        {isTwoUp ? "👥 Two-Up Rules" : "👤 Solo Rules"}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={`rounded-lg p-3 text-center ${ACTIVITY_THEME.work.statsCard}`}>
          <p className={`text-[10px] uppercase tracking-wider font-semibold ${ACTIVITY_THEME.work.statsLabel}`}>Work</p>
          <p className={`text-xl font-bold font-mono ${ACTIVITY_THEME.work.statsValue}`}>{totalWork}h</p>
          {prevWeekDays && prevWeekDays.length > 0 && (
            <p className="text-[10px] text-blue-400 font-mono">14d: {totalWork + prevWeekWork}h</p>
          )}
        </div>
        <div className={`rounded-lg p-3 text-center ${ACTIVITY_THEME.break.statsCard}`}>
          <p className={`text-[10px] uppercase tracking-wider font-semibold ${ACTIVITY_THEME.break.statsLabel}`}>Breaks</p>
          <p className={`text-xl font-bold font-mono ${ACTIVITY_THEME.break.statsValue}`}>{totalBreaks}h</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${ACTIVITY_THEME.rest.statsCard}`}>
          <p className={`text-[10px] uppercase tracking-wider font-semibold ${ACTIVITY_THEME.rest.statsLabel}`}>Non-Work Time</p>
          <p className="text-[9px] text-slate-400 mt-0.5">all time not work or break</p>
          <p className={`text-xl font-bold font-mono ${ACTIVITY_THEME.rest.statsValue}`}>{totalNonWork}h</p>
        </div>
      </div>
      <div className={`rounded-lg p-2.5 ${ACTIVITY_THEME.rest.statsCard} border border-emerald-100 dark:border-emerald-800`}>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">Non-Work Time rules</p>
        <ul className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
          <li>• All time not logged as work or break is counted as non-work time.</li>
          <li>• Starts when no shift is live, but only after the 24 hour break is set, and only before the current date and time.</li>
          <li>• Retrospective only — never shown or recorded after the current time on any day or shift.</li>
          <li>• End Shift sets recording to non-work; no separate button needed.</li>
        </ul>
      </div>
      {prevWeekDays && prevWeekDays.length > 0 && (
        <p className="text-[10px] text-slate-400 italic">↑ Previous week's sheet linked for 14-day checks</p>
      )}
      {(!prevWeekDays || prevWeekDays.length === 0) && (
        <p className="text-[10px] text-slate-300 italic">No previous week sheet found — 14-day check is partial</p>
      )}
      {checks.length === 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-200">All compliant — no issues detected</span>
        </div>
      )}
      <AnimatePresence>
        {violations.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-red-500 dark:text-red-400 font-bold">Violations ({violations.length})</p>
            {violations.map((v, i) => {
                const Icon = ICON_MAP[v.iconKey];
                return (
              <div key={i} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2.5">
                {Icon && <Icon className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />}
                <p className="text-xs text-red-700 dark:text-red-200">{v.message} — {whenLabel(v.day, weekStarting, prevWeekStarting)}</p>
              </div>
                );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-amber-500 dark:text-amber-400 font-bold">Warnings ({warnings.length})</p>
            {warnings.map((w, i) => {
                const Icon = ICON_MAP[w.iconKey];
                return (
              <div key={i} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                {Icon && <Icon className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />}
                <p className="text-xs text-amber-700 dark:text-amber-200">{w.message} — {whenLabel(w.day, weekStarting, prevWeekStarting)}</p>
              </div>
                );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
          WA OSH Reg 3.132 — {isTwoUp ? "Two-Up" : "Solo"} Rules
        </p>
        {isTwoUp ? (
          <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li>• 20 min break for ea 5 hours work time - 10 min minimum x 2</li>
            <li>• ≥7 hrs non-work in any rolling 24 hrs (can be in moving vehicle)</li>
            <li>• ≥1 block of ≥7 continuous hrs non-work in any rolling 48 hrs (not in moving vehicle)</li>
            <li>• ≥48 hrs non-work per 7 days (incl. ≥24 continuous hrs)</li>
            <li>• Max 168 hrs work in any 14-day period (rolling; resets after ≥48h continuous non-work)</li>
          </ul>
        ) : (
          <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li>• 20 min break for ea 5 hours work time - 10 min minimum x 2</li>
            <li>• ≥7 continuous hrs non-work time required</li>
            <li>• Max 17 hrs elapsed time between 7-hr rest breaks (24h non-work resets)</li>
            <li>• ≥27 hrs non-work in any rolling 72 hrs (incl. 3× ≥7hr blocks; 24h non-work resets)</li>
            <li>• Max 168 hrs work in any 14-day period (rolling; resets after ≥48h continuous non-work)</li>
          </ul>
        )}
      </div>
    </div>
  );
}
