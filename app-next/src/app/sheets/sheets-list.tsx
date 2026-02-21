"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type FatigueSheet } from "@/lib/api";
import { listSheetsOfflineFirst } from "@/lib/offline-api";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Plus, FileText, Loader2, Clock, ChevronRight, Truck } from "lucide-react";

function getTotalWorkHours(sheet: FatigueSheet) {
  if (!sheet.days) return 0;
  return sheet.days.reduce((total, day) => {
    const slots = (day.work_time || []).filter(Boolean).length;
    return total + slots * 0.5;
  }, 0);
}

export function SheetsList() {
  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => listSheetsOfflineFirst(),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Driver Fatigue Log
              </h1>
              <p className="text-sm text-slate-400">WA Commercial Vehicle Fatigue Management</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your Sheets</h2>
          <div className="flex gap-2 flex-wrap">
            <Link href="/sheets/new">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2">
                <Plus className="w-4 h-4" /> Start New Week
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Complete and sign the current week&apos;s sheet before starting a new one.
        </p>
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
        {!isLoading && sheets.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 mb-1">No fatigue sheets yet</p>
            <p className="text-sm text-slate-300">Create your first weekly record</p>
          </div>
        )}
        <div className="space-y-3">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className="bg-white rounded-xl border-2 border-slate-300 shadow-md hover:shadow-lg hover:border-slate-400 transition-all"
            >
              <Link href={`/sheets/${sheet.id}`} className="flex items-center justify-between p-4 md:p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{sheet.driver_name || "Unnamed Driver"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {sheet.week_starting && (
                        <span className="text-xs text-slate-400 font-mono">
                          Week of {format(new Date(sheet.week_starting), "dd MMM yyyy")}
                        </span>
                      )}
                      {sheet.destination && (
                        <span className="text-xs text-slate-400">→ {sheet.destination}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden md:inline text-sm font-mono text-slate-500">
                    {getTotalWorkHours(sheet)}h
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${
                      sheet.status === "completed"
                        ? "border-emerald-300 text-emerald-600"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    {sheet.status === "completed" ? "Done" : "Draft"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
