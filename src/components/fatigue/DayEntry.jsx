import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import TimeGrid from "./TimeGrid";
import EventLogger from "./EventLogger";
import { motion } from "framer-motion";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DayEntry({ dayIndex, dayData, onUpdate, weekStart, readOnly = false }) {
  const handleFieldChange = (field, value) => {
    onUpdate(dayIndex, { ...dayData, [field]: value });
  };



    const handleEventUpdate = (updatedDay) => {
    onUpdate(dayIndex, updatedDay);
    };

  const getDateStr = () => {
    if (!weekStart) return "";
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getISODate = () => {
    if (!weekStart) return new Date().toISOString().split("T")[0];
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayIndex);
    return d.toISOString().split("T")[0];
  };

  const kmsTotal = (dayData.end_kms && dayData.start_kms) 
    ? Math.max(0, dayData.end_kms - dayData.start_kms) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: dayIndex * 0.04 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 md:p-5"
    >
      {/* Day header */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
            {DAY_NAMES[dayIndex]?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{DAY_NAMES[dayIndex]}</p>
            <p className="text-[11px] text-slate-400 font-mono">{getDateStr()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Rego"
              value={dayData.truck_rego || ""}
              onChange={(e) => handleFieldChange("truck_rego", e.target.value)}
              className="w-24 h-7 text-xs font-mono"
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] text-slate-400 uppercase">Start km</Label>
            <Input
              type="number"
              placeholder="0"
              value={dayData.start_kms ?? ""}
              onChange={(e) => handleFieldChange("start_kms", e.target.value ? Number(e.target.value) : null)}
              className="w-20 h-7 text-xs font-mono"
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[10px] text-slate-400 uppercase">End km</Label>
            <Input
              type="number"
              placeholder="0"
              value={dayData.end_kms ?? ""}
              onChange={(e) => handleFieldChange("end_kms", e.target.value ? Number(e.target.value) : null)}
              className="w-20 h-7 text-xs font-mono"
              disabled={readOnly}
            />
          </div>
          {kmsTotal > 0 && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
              {kmsTotal} km
            </span>
          )}
        </div>
      </div>

      {/* Event logger */}
      <div className="mb-3 pb-3 border-b border-slate-100">
        <EventLogger
          dayData={dayData}
          dateStr={getISODate()}
          onUpdate={handleEventUpdate}
          readOnly={readOnly}
        />
      </div>

      {/* Minute-accurate timeline */}
      <TimeGrid dayData={{ ...dayData, date: getISODate() }} />
    </motion.div>
  );
}