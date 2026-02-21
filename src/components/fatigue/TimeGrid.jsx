import React from "react";

const ROWS = [
  { key: "work_time", label: "Work", color: "#3b82f6" },
  { key: "breaks",    label: "Breaks", color: "#f59e0b" },
  { key: "non_work",  label: "Rest", color: "#10b981" },
];

const TOTAL_MINUTES = 24 * 60;

// Build minute-resolution segments from events
function buildSegments(events, dateStr) {
  const segments = { work_time: [], breaks: [], non_work: [] };
  if (!events || events.length === 0) return segments;

  const dayStart = new Date(dateStr + "T00:00:00");
  const dayEnd   = new Date(dateStr + "T23:59:59");

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type === "stop") continue;

    const start = new Date(ev.time);
    const end   = events[i + 1] ? new Date(events[i + 1].time) : new Date();

    const clampedStart = Math.max(start, dayStart);
    const clampedEnd   = Math.min(end, dayEnd);
    if (clampedStart >= clampedEnd) continue;

    const startMin = Math.floor((clampedStart - dayStart) / 60000);
    const endMin   = Math.ceil((clampedEnd - dayStart) / 60000);

    const rowKey = ev.type === "work" ? "work_time" : ev.type === "break" ? "breaks" : "non_work";
    segments[rowKey].push({ startMin, endMin });
  }
  return segments;
}

function getTotalMinutes(segments) {
  return segments.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TimeGrid({ dayData }) {
  const events  = dayData.events || [];
  const dateStr = dayData.date || new Date().toISOString().split("T")[0];

  const segments = buildSegments(events, dateStr);

  // Hour tick marks — show every 2 hours to avoid clutter
  const ticks = Array.from({ length: 13 }, (_, i) => i * 2); // 0,2,4,...24

  return (
    <div className="select-none">
      {/* Hour ruler */}
      <div className="relative h-4 mb-1" style={{ marginLeft: 72 }}>
        {ticks.map(h => (
          <span
            key={h}
            className="absolute text-[9px] font-mono text-slate-300 -translate-x-1/2"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {ROWS.map(row => {
          const segs = segments[row.key];
          const totalMins = getTotalMinutes(segs);
          return (
            <div key={row.key} className="flex items-center gap-2">
              {/* Label */}
              <span className="w-[68px] shrink-0 text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right">
                {row.label}
              </span>
              {/* Bar track */}
              <div className="relative flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                {segs.map((seg, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full rounded-sm opacity-90"
                    style={{
                      left:  `${(seg.startMin / TOTAL_MINUTES) * 100}%`,
                      width: `${Math.max(((seg.endMin - seg.startMin) / TOTAL_MINUTES) * 100, 0.2)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                ))}
                {/* Hour grid lines */}
                {ticks.slice(1, -1).map(h => (
                  <div
                    key={h}
                    className="absolute top-0 h-full border-l border-white/40 pointer-events-none"
                    style={{ left: `${(h / 24) * 100}%` }}
                  />
                ))}
              </div>
              {/* Total */}
              <span className="w-14 shrink-0 text-right text-[11px] font-bold font-mono text-slate-600">
                {totalMins > 0 ? formatHours(totalMins) : <span className="text-slate-300">—</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}