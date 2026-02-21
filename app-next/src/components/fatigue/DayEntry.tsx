"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, MapPin } from "lucide-react";
import TimeGrid from "./TimeGrid";
import { motion } from "framer-motion";
import type { Rego } from "@/lib/api";
import { getSheetDayDateString, getTodayLocalDateString } from "@/lib/weeks";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayData = {
  truck_rego?: string;
  destination?: string;
  start_kms?: number | null;
  end_kms?: number | null;
  work_time?: boolean[];
  breaks?: boolean[];
  non_work?: boolean[];
  events?: { time: string; type: string }[];
  date?: string;
};

export default function DayEntry({
  dayIndex,
  dayData,
  onUpdate,
  weekStart,
  regos = [],
  readOnly = false,
}: {
  dayIndex: number;
  dayData: DayData;
  onUpdate: (idx: number, d: DayData) => void;
  weekStart: string;
  regos?: Rego[];
  readOnly?: boolean;
}) {
  const handleFieldChange = (field: string, value: unknown) => {
    onUpdate(dayIndex, { ...dayData, [field]: value });
  };

  const getDateStr = () => {
    if (!weekStart) return "";
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const getISODate = () => (weekStart ? getSheetDayDateString(weekStart, dayIndex) : getTodayLocalDateString());

  const kmsTotal =
    dayData.end_kms != null && dayData.start_kms != null ? Math.max(0, dayData.end_kms - dayData.start_kms) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: dayIndex * 0.04 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 md:p-5"
    >
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
            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Select
              value={dayData.truck_rego?.trim() || "__none__"}
              onValueChange={(value) =>
                handleFieldChange("truck_rego", value === "__none__" ? "" : value)
              }
              disabled={readOnly}
            >
              <SelectTrigger className="w-28 h-7 text-xs font-mono px-2 [&>span]:line-clamp-1">
                <SelectValue placeholder="Rego" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-slate-400 font-mono">
                  — Select rego —
                </SelectItem>
                {(() => {
                  const labels = regos.map((r) => r.label);
                  const current = dayData.truck_rego?.trim();
                  if (current && !labels.includes(current)) labels.unshift(current);
                  return labels.map((label) => (
                    <SelectItem key={label} value={label} className="font-mono">
                      {label}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Destination"
              value={dayData.destination || ""}
              onChange={(e) => handleFieldChange("destination", e.target.value)}
              className="w-32 min-w-[8rem] h-7 text-xs"
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
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{kmsTotal} km</span>
          )}
        </div>
      </div>
      <TimeGrid dayData={{ ...dayData, date: getISODate() }} />
    </motion.div>
  );
}
