"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, Users, MapPin, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function formatLast24hBreakDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

type SheetData = {
  driver_name?: string;
  second_driver?: string;
  driver_type?: string;
  destination?: string;
  last_24h_break?: string;
  week_starting?: string;
};

export default function SheetHeader({
  sheetData,
  onChange,
  readOnly = false,
}: {
  sheetData: SheetData;
  onChange: (s: SheetData) => void;
  readOnly?: boolean;
}) {
  const last24hDateInputRef = useRef<HTMLInputElement>(null);
  const [confirmLast24hOpen, setConfirmLast24hOpen] = useState(false);
  const [pendingLast24hDate, setPendingLast24hDate] = useState<string>("");

  const handleChange = (field: string, value: unknown) => {
    onChange({ ...sheetData, [field]: value });
  };
  const driverType = sheetData.driver_type || "solo";
  const last24hSet = !!sheetData.last_24h_break?.trim();

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.drivers.list(),
  });
  const activeDrivers = drivers.filter((d) => d.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mr-2">Driver Type</Label>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleChange("driver_type", "solo")}
            className={`px-4 py-1.5 text-xs font-bold transition-colors ${
              driverType === "solo"
                ? "bg-slate-900 dark:bg-slate-600 text-white dark:text-slate-100"
                : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600"
            }`}
          >
            Solo
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleChange("driver_type", "two_up")}
            className={`px-4 py-1.5 text-xs font-bold transition-colors border-l border-slate-200 dark:border-slate-600 ${
              driverType === "two_up"
                ? "bg-slate-900 dark:bg-slate-600 text-white dark:text-slate-100"
                : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600"
            }`}
          >
            Two-Up
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <User className="w-3 h-3" /> Driver Name
          </Label>
          {activeDrivers.length > 0 ? (
            <Select
              value={sheetData.driver_name || ""}
              onValueChange={(val) => handleChange("driver_name", val)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 font-medium">
                <SelectValue placeholder="Select driver…" />
              </SelectTrigger>
              <SelectContent>
                {activeDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={sheetData.driver_name || ""}
              onChange={(e) => handleChange("driver_name", e.target.value)}
              placeholder="Full name (no drivers added yet)"
              className="h-9 font-medium"
              disabled={readOnly}
            />
          )}
        </div>
        {driverType === "two_up" && (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Second Driver *
            </Label>
            {activeDrivers.length > 0 ? (
              <Select
                value={sheetData.second_driver === "" || sheetData.second_driver == null ? "__none__" : sheetData.second_driver}
                onValueChange={(val) => handleChange("second_driver", val === "__none__" ? "" : val)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-9 border-amber-300">
                  <SelectValue placeholder="Required for Two-Up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {activeDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={sheetData.second_driver || ""}
                onChange={(e) => handleChange("second_driver", e.target.value)}
                placeholder="Required for Two-Up"
                className="h-9 border-amber-300 focus:border-amber-400"
                disabled={readOnly}
              />
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Destination
          </Label>
          <Input
            value={sheetData.destination || ""}
            onChange={(e) => handleChange("destination", e.target.value)}
            placeholder="Destination"
            className="h-9"
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Last 24 Hour Break</Label>
          {last24hSet ? (
            <div className="h-9 flex flex-col justify-center rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
                {formatLast24hBreakDate(sheetData.last_24h_break!)}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Locked for this sheet</p>
            </div>
          ) : (
            <div className="relative">
              <input
                ref={last24hDateInputRef}
                type="date"
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                aria-hidden
                defaultValue={sheetData.week_starting || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    setPendingLast24hDate(v);
                    setConfirmLast24hOpen(true);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={readOnly}
                onClick={() => last24hDateInputRef.current?.showPicker?.() ?? last24hDateInputRef.current?.click()}
                className="h-9 w-full justify-start gap-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/50 hover:border-amber-400 dark:hover:border-amber-600 font-medium"
              >
                <Calendar className="w-4 h-4 text-amber-600" />
                Set last 24h break
              </Button>
              <Dialog
                open={confirmLast24hOpen}
                onOpenChange={(open) => {
                  setConfirmLast24hOpen(open);
                  if (!open) setPendingLast24hDate("");
                }}
              >
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Confirm last 24 hour break</DialogTitle>
                    <DialogDescription>
                      Set this date as your last 24 hour break? Once set, it cannot be changed for this sheet.
                    </DialogDescription>
                  </DialogHeader>
                  {pendingLast24hDate && (
                    <p className="text-sm font-medium text-slate-800 font-mono">
                      {formatLast24hBreakDate(pendingLast24hDate)}
                    </p>
                  )}
                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfirmLast24hOpen(false);
                        setPendingLast24hDate("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleChange("last_24h_break", pendingLast24hDate);
                        setConfirmLast24hOpen(false);
                        setPendingLast24hDate("");
                      }}
                      className="bg-slate-900 hover:bg-slate-800"
                    >
                      Confirm
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Week Starting</Label>
          <Input
            type="date"
            value={sheetData.week_starting || ""}
            onChange={(e) => handleChange("week_starting", e.target.value)}
            className="h-9 font-mono"
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
