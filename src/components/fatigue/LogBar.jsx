import React from "react";
import { Briefcase, Coffee, Moon, Square } from "lucide-react";

const EVENT_TYPES = {
  work:  { label: "Work",      icon: Briefcase, color: "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300" },
  break: { label: "Break",     icon: Coffee,    color: "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300" },
  rest:  { label: "Rest",      icon: Moon,      color: "bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300" },
  stop:  { label: "End Shift", icon: Square,    color: "bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MIN_BREAK_MINUTES = 20;

function getDurationMinutes(start, end) {
  return Math.floor((new Date(end) - new Date(start)) / 60000);
}

export default function LogBar({ days, selectedDay, onSelectDay, onLogEvent }) {
  const day = days[selectedDay];
  const events = day?.events || [];
  const lastEvent = events[events.length - 1];
  const currentType = lastEvent && lastEvent.type !== "stop" ? lastEvent.type : null;

  const getBreakWarning = (newType) => {
    if (newType !== "work") return null;
    const rev = [...events].reverse();
    const lastBreakIdx = rev.findIndex(e => e.type === "break");
    if (lastBreakIdx < 0) return null;
    const lastBreak = rev[lastBreakIdx];
    const breakEnd = lastBreakIdx > 0 ? new Date(rev[lastBreakIdx - 1].time) : new Date();
    const breakDur = getDurationMinutes(new Date(lastBreak.time), breakEnd);
    if (breakDur < MIN_BREAK_MINUTES) return `Break was only ${breakDur} min — minimum is 20 min`;
    return null;
  };

  const handleLog = (type) => {
    if (type === currentType) return;
    const warning = getBreakWarning(type);
    if (warning && !window.confirm(`⚠️ ${warning}\n\nLog work anyway?`)) return;
    onLogEvent(selectedDay, type);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-md px-4 py-3">
      <div className="max-w-[1400px] mx-auto space-y-2">
        {/* Row 1: Day selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mr-1">Day</span>
          {DAY_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`w-9 h-8 rounded-lg text-xs font-bold transition-colors ${
                selectedDay === idx
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {name}
            </button>
          ))}
          {currentType && (
            <span className="ml-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{DAY_NAMES[selectedDay]}</span> — currently <span className="font-semibold">{currentType}</span>
            </span>
          )}
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex gap-2">
          {Object.entries(EVENT_TYPES).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => handleLog(type)}
              disabled={currentType === type}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${cfg.color}`}
            >
              {React.createElement(cfg.icon, { className: "w-4 h-4" })}
              {cfg.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}