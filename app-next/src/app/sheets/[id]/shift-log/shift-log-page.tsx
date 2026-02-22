"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSheetOfflineFirst } from "@/lib/offline-api";
import { PageHeader } from "@/components/PageHeader";
import { FileText, Loader2 } from "lucide-react";
import ShiftLogView from "@/components/fatigue/ShiftLogView";

export default function ShiftLogPage({ sheetId }: { sheetId: string }) {
  const { data: sheet, isLoading } = useQuery({
    queryKey: ["sheet", sheetId],
    queryFn: () => getSheetOfflineFirst(sheetId),
  });

  if (isLoading || !sheet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  const days = sheet.days ?? [];
  const weekStarting = sheet.week_starting ?? "";

  const subtitle = [
    sheet.driver_name,
    weekStarting && `Week starting ${new Date(weekStarting + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-6">
      <div className="max-w-[800px] mx-auto px-4 py-6">
        <PageHeader
          backHref={`/sheets/${sheetId}`}
          backLabel="Fatigue Record"
          title="Shift Log"
          subtitle={subtitle || undefined}
          icon={<FileText className="w-5 h-5" />}
        />
        <ShiftLogView days={days} weekStarting={weekStarting} />
      </div>
    </div>
  );
}
