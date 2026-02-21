"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getSheetOfflineFirst } from "@/lib/offline-api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import ShiftLogView from "@/components/fatigue/ShiftLogView";

export default function ShiftLogPage({ sheetId }: { sheetId: string }) {
  const { data: sheet, isLoading } = useQuery({
    queryKey: ["sheet", sheetId],
    queryFn: () => getSheetOfflineFirst(sheetId),
  });

  if (isLoading || !sheet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const days = sheet.days ?? [];
  const weekStarting = sheet.week_starting ?? "";

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <div className="max-w-[800px] mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/sheets/${sheetId}`} className="flex shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full min-w-12 min-h-12 w-12 h-12 md:min-w-9 md:min-h-9 md:w-9 md:h-9">
              <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Shift Log
            </h1>
            <p className="text-xs text-slate-400">
              {sheet.driver_name}
              {weekStarting && ` · Week starting ${new Date(weekStarting + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
        </div>
        <ShiftLogView days={days} weekStarting={weekStarting} />
      </div>
    </div>
  );
}
