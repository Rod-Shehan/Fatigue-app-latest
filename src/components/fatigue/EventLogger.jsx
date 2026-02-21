import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Coffee, Moon, Square, Clock, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

const EVENT_TYPES = {
  work:  { label: "Work",  icon: Briefcase, color: "bg-blue-500 hover:bg-blue-600",  badge: "bg-blue-100 text-blue-700",  text: "Working" },
  break: { label: "Break", icon: Coffee,    color: "bg-amber-500 hover:bg-amber-600", badge: "bg-amber-100 text-amber-700", text: "On Break" },
  rest:  { label: "Rest",  icon: Moon,      color: "bg-emerald-500 hover:bg-emerald-600", badge: "bg-emerald-100 text-emerald-700", text: "Resting" },
  stop:  { label: "End Shift",  icon: Square,    color: "bg-slate-400 hover:bg-slate-500",  badge: "bg-slate-100 text-slate-600",  text: "Stopped" },
};

const MIN_BREAK_MINUTES = 20; // WA OSH: ≥20 min break from driving per 5 hrs work
const MIN_BREAK_CONSECUTIVE = 10; // must include ≥10 consecutive minutes
const MAX_CONTINUOUS_WORK_MINS = 5 * 60; // WA OSH: 5 hrs work time

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getDurationMinutes(start, end) {
  return Math.floor((new Date(end) - new Date(start)) / 60000);
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getElapsedSeconds(isoString) {
  return Math.floor((Date.now() - new Date(isoString)) / 1000);
}

function useTimer(active) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, [active]);
  return tick;
}

// Derive the 48-slot grid arrays from events for a given day date string (YYYY-MM-DD)
export function deriveGridFromEvents(events, dateStr) {
  const work_time = Array(48).fill(false);
  const breaks = Array(48).fill(false);
  const non_work = Array(48).fill(false);

  if (!events || events.length === 0) return { work_time, breaks, non_work };

  const dayStart = new Date(dateStr + "T00:00:00");

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const nextEv = events[i + 1];
    if (ev.type === "stop") continue;

    const start = new Date(ev.time);
    const end = nextEv ? new Date(nextEv.time) : new Date();

    // clamp to day boundary
    const clampedStart = new Date(Math.max(start, dayStart));
    const clampedEnd = new Date(Math.min(end, new Date(dateStr + "T23:59:59")));

    const startSlot = Math.floor((clampedStart - dayStart) / (30 * 60 * 1000));
    const endSlot = Math.ceil((clampedEnd - dayStart) / (30 * 60 * 1000));

    for (let s = Math.max(0, startSlot); s < Math.min(48, endSlot); s++) {
      if (ev.type === "work") work_time[s] = true;
      else if (ev.type === "break") breaks[s] = true;
      else if (ev.type === "rest") non_work[s] = true;
    }
  }

  return { work_time, breaks, non_work };
}

export default function EventLogger({ dayData, dateStr, onUpdate, readOnly = false }) {
  useTimer(true);

  const events = dayData.events || [];
  const lastEvent = events[events.length - 1];
  const currentType = lastEvent && lastEvent.type !== "stop" ? lastEvent.type : null;

  const elapsedMinutes = lastEvent && currentType
    ? Math.floor(getElapsedSeconds(lastEvent.time) / 60)
    : 0;

  const deleteEvent = (idx) => {
    const newEvents = events.filter((_, i) => i !== idx);
    const derived = deriveGridFromEvents(newEvents, dateStr);
    onUpdate({ ...dayData, events: newEvents, ...derived });
  };

  if (events.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Current status */}
      {currentType && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${EVENT_TYPES[currentType].badge}`}>
            {React.createElement(EVENT_TYPES[currentType].icon, { className: "w-3 h-3" })}
            {EVENT_TYPES[currentType].text}
          </span>
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(elapsedMinutes)}
          </span>
          {currentType === "break" && elapsedMinutes < MIN_BREAK_MINUTES && (
            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {MIN_BREAK_MINUTES - elapsedMinutes}m until ≥20 min
            </span>
          )}
          {currentType === "break" && elapsedMinutes >= MIN_BREAK_MINUTES && (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Break valid (≥20 min)
            </span>
          )}
        </div>
      )}

      {/* Event log */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Event Log</p>
        {events.map((ev, idx) => {
          const nextEv = events[idx + 1];
          const dur = nextEv
            ? getDurationMinutes(ev.time, nextEv.time)
            : (ev.type !== "stop" ? elapsedMinutes : 0);
          const cfg = EVENT_TYPES[ev.type];
          return (
            <div key={idx} className="flex items-center gap-2 text-xs group">
              <span className="font-mono text-slate-400 w-10 shrink-0">{formatTime(ev.time)}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.badge}`}>
                {React.createElement(cfg.icon, { className: "w-2.5 h-2.5" })}
                {cfg.label}
              </span>
              {dur > 0 && ev.type !== "stop" && (
                <span className="text-slate-400 font-mono">{formatDuration(dur)}</span>
              )}
              {ev.type === "break" && nextEv && dur < MIN_BREAK_MINUTES && (
                <span className="text-amber-500 text-[10px]">⚠ &lt;20 min</span>
              )}
              {!readOnly && (
                <button
                  onClick={() => deleteEvent(idx)}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {currentType && (
          <div className="flex items-center gap-2 text-xs opacity-60">
            <span className="font-mono text-slate-400 w-10 shrink-0">now</span>
            <span className="text-slate-400 italic">ongoing…</span>
          </div>
        )}
      </div>
    </div>
  );
}