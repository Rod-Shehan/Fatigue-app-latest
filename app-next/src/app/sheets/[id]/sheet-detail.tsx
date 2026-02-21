"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, type FatigueSheet, type DayData } from "@/lib/api";
import {
  getSheetOfflineFirst,
  updateSheetOfflineFirst,
  listSheetsOfflineFirst,
  listRegosOfflineFirst,
} from "@/lib/offline-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, ArrowLeft, Loader2, CheckCircle2, ScrollText, ChevronDown, XCircle, Download, LayoutDashboard } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import SheetHeader from "@/components/fatigue/SheetHeader";
import DayEntry from "@/components/fatigue/DayEntry";
import CompliancePanel from "@/components/fatigue/CompliancePanel";
import SignatureDialog from "@/components/fatigue/SignatureDialog";
import LogBar from "@/components/fatigue/LogBar";
import { deriveDaysWithRollover, applyLast24hBreakNonWorkRule } from "@/components/fatigue/EventLogger";
import { runComplianceChecks } from "@/lib/compliance";
import { getSheetDayDateString, getTodayLocalDateString } from "@/lib/weeks";
import { getCurrentPosition, BEST_EFFORT_OPTIONS } from "@/lib/geo";

const EMPTY_DAY = (): DayData => ({
  day_label: "",
  date: "",
  truck_rego: "",
  destination: "",
  start_kms: null,
  end_kms: null,
  work_time: Array(48).fill(false),
  breaks: Array(48).fill(false),
  non_work: Array(48).fill(false),
});

function getThisWeekSunday() {
  const today = new Date();
  const day = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  return sunday.toISOString().split("T")[0];
}

/** Current day index (0–6) for the sheet week from device date; not user-selectable. */
function getCurrentDayIndex(weekStarting: string): number {
  if (!weekStarting) return new Date().getDay();
  const [y, m, d] = weekStarting.split("-").map(Number);
  const weekStart = new Date(y, m - 1, d);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((todayStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(6, diffDays));
}

export function SheetDetail({ sheetId }: { sheetId: string }) {
  const queryClient = useQueryClient();
  const [sheetData, setSheetData] = useState<{
    driver_name: string;
    second_driver: string;
    driver_type: string;
    destination: string;
    last_24h_break: string;
    week_starting: string;
    days: DayData[];
    status: string;
    signature?: string;
    signed_at?: string;
  }>({
    driver_name: "",
    second_driver: "",
    driver_type: "solo",
    destination: "",
    last_24h_break: "",
    week_starting: getThisWeekSunday(),
    days: Array(7)
      .fill(null)
      .map(() => EMPTY_DAY()),
    status: "draft",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const dayCardsRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const currentDayIndex = useMemo(
    () => getCurrentDayIndex(sheetData.week_starting),
    [sheetData.week_starting, now]
  );

  const { data: sheet, isLoading } = useQuery({
    queryKey: ["sheet", sheetId],
    queryFn: () => getSheetOfflineFirst(sheetId),
  });

  const { data: allSheets = [] } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => listSheetsOfflineFirst(),
  });

  const { data: regos = [] } = useQuery({
    queryKey: ["regos"],
    queryFn: () => listRegosOfflineFirst(),
  });

  useEffect(() => {
    if (sheet) {
      const weekStart = sheet.week_starting || getThisWeekSunday();
      setSheetData({
        driver_name: sheet.driver_name || "",
        second_driver: sheet.second_driver || "",
        driver_type: sheet.driver_type || "solo",
        destination: sheet.destination || "",
        last_24h_break: sheet.last_24h_break || "",
        week_starting: weekStart,
        days: applyLast24hBreakNonWorkRule(
          deriveDaysWithRollover(
            (sheet.days || []).map((d) => ({ ...EMPTY_DAY(), ...d })),
            weekStart
          ),
          weekStart,
          sheet.last_24h_break || undefined
        ),
        status: sheet.status || "draft",
        signature: sheet.signature,
        signed_at: sheet.signed_at,
      });
    }
  }, [sheet]);

  const prevWeekSheet = useMemo(() => {
    if (!sheetData.driver_name || !sheetData.week_starting) return null;
    const currentStart = new Date(sheetData.week_starting);
    const expectedPrevStart = new Date(currentStart);
    expectedPrevStart.setDate(expectedPrevStart.getDate() - 7);
    const prevDateStr = expectedPrevStart.toISOString().split("T")[0];
    return (
      allSheets.find(
        (s) =>
          s.id !== sheetId &&
          s.driver_name?.toLowerCase() === sheetData.driver_name?.toLowerCase() &&
          s.week_starting === prevDateStr
      ) || null
    );
  }, [allSheets, sheetData.driver_name, sheetData.week_starting, sheetId]);

  const complianceResults = useMemo(
    () =>
      runComplianceChecks(sheetData.days, {
        driverType: sheetData.driver_type,
        prevWeekDays: prevWeekSheet?.days || null,
        last24hBreak: sheetData.last_24h_break || undefined,
        weekStarting: sheetData.week_starting || undefined,
        prevWeekStarting: prevWeekSheet?.week_starting ?? undefined,
      }),
    [sheetData.days, sheetData.driver_type, sheetData.last_24h_break, sheetData.week_starting, prevWeekSheet]
  );
  const hasComplianceViolations = complianceResults.some((r) => r.type === "violation");

  const scrollToCompliance = useCallback(() => {
    document.getElementById("compliance-check")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FatigueSheet>) => {
      return updateSheetOfflineFirst(sheetId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet", sheetId] });
      queryClient.invalidateQueries({ queryKey: ["sheets"] });
      setIsDirty(false);
      setLastSaved(new Date());
    },
  });

  useEffect(() => {
    if (!isDirty || !sheetData.driver_name) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate({
        driver_name: sheetData.driver_name,
        second_driver: sheetData.second_driver,
        driver_type: sheetData.driver_type,
        destination: sheetData.destination,
        last_24h_break: sheetData.last_24h_break || undefined,
        week_starting: sheetData.week_starting,
        days: sheetData.days,
        status: sheetData.status,
      });
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [sheetData, isDirty]);

  const handleHeaderChange = useCallback((updates: Partial<typeof sheetData>) => {
    setSheetData((prev) => {
      const next = { ...prev, ...updates };
      return { ...next, days: applyLast24hBreakNonWorkRule(next.days, next.week_starting, next.last_24h_break || undefined) };
    });
    setIsDirty(true);
  }, []);

  const handleDayUpdate = useCallback((dayIndex: number, dayData: DayData) => {
    setSheetData((prev) => {
      const newDays = [...prev.days];
      newDays[dayIndex] = dayData;
      const withGrids = deriveDaysWithRollover(newDays, prev.week_starting);
      return { ...prev, days: applyLast24hBreakNonWorkRule(withGrids, prev.week_starting, prev.last_24h_break || undefined) };
    });
    setIsDirty(true);
  }, []);

  const handleLogEvent = useCallback((dayIndex: number, type: string) => {
    setSheetData((prev) => {
      const newDays = [...prev.days];
      const day = newDays[dayIndex];
      const events = day.events || [];
      const newEvent = { time: new Date().toISOString(), type };
      const newEvents = [...events, newEvent];
      newDays[dayIndex] = { ...day, events: newEvents };
      const withGrids = deriveDaysWithRollover(newDays, prev.week_starting);
      return { ...prev, days: applyLast24hBreakNonWorkRule(withGrids, prev.week_starting, prev.last_24h_break || undefined) };
    });
    setIsDirty(true);
    getCurrentPosition(BEST_EFFORT_OPTIONS).then((loc) => {
      if (!loc) return;
      setSheetData((prev) => {
        const newDays = [...prev.days];
        const day = newDays[dayIndex];
        const events = [...(day.events || [])];
        const last = events[events.length - 1];
        if (last) events[events.length - 1] = { ...last, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy };
        newDays[dayIndex] = { ...day, events };
        return { ...prev, days: newDays };
      });
      setIsDirty(true);
    });
  }, []);

  const handleSave = () => {
    setShowSaveMenu(false);
    saveMutation.mutate({
      driver_name: sheetData.driver_name,
      second_driver: sheetData.second_driver,
      driver_type: sheetData.driver_type,
      destination: sheetData.destination,
      last_24h_break: sheetData.last_24h_break || undefined,
      week_starting: sheetData.week_starting,
      days: sheetData.days,
      status: sheetData.status,
      signature: sheetData.signature || undefined,
      signed_at: sheetData.signed_at || undefined,
    });
  };

  const handleSaveAndComplete = () => {
    setShowSaveMenu(false);
    setShowSignatureDialog(true);
  };

  useEffect(() => {
    if (!showSaveMenu) return;
    const close = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) setShowSaveMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showSaveMenu]);

  const handleExportPDF = async () => {
    const el = dayCardsRef.current;
    if (!el) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
      });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const usableW = pageW - 2 * margin;
      const usableH = pageH - 2 * margin;
      const pxPerMm = 96 / 25.4;
      const pageWpx = Math.round(usableW * pxPerMm);
      const pageHpx = Math.round(usableH * pxPerMm);
      const scale = pageWpx / img.naturalWidth;
      const scaledHpx = img.naturalHeight * scale;
      if (scaledHpx <= pageHpx) {
        const wMm = usableW;
        const hMm = scaledHpx / pxPerMm;
        pdf.addImage(dataUrl, "PNG", margin, margin, wMm, hMm);
      } else {
        const numPages = Math.ceil(scaledHpx / pageHpx);
        const sliceHpx = pageHpx;
        const sliceSrcH = sliceHpx / scale;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = Math.ceil(sliceSrcH);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2d not available");
        for (let i = 0; i < numPages; i++) {
          if (i > 0) pdf.addPage();
          const sy = i * sliceSrcH;
          const sh = Math.min(sliceSrcH, img.naturalHeight - sy);
          canvas.height = Math.ceil(sh);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, img.naturalWidth, sh);
          const pageDataUrl = canvas.toDataURL("image/png");
          const hMm = (sh * scale) / pxPerMm;
          pdf.addImage(pageDataUrl, "PNG", margin, margin, usableW, hMm);
        }
      }
      const timeStamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(/:/g, "");
      pdf.save(`fatigue-day-tiles-${(sheetData.driver_name || "sheet").replace(/\s+/g, "-")}-${timeStamp}.pdf`);
    } catch (err) {
      console.error("Export PDF failed:", err);
      alert("Could not export PDF. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignatureConfirm = (signatureDataUrl: string) => {
    const signedAt = new Date().toISOString();
    setSheetData((prev) => ({ ...prev, status: "completed", signature: signatureDataUrl, signed_at: signedAt }));
    setShowSignatureDialog(false);
    saveMutation.mutate({
      driver_name: sheetData.driver_name,
      second_driver: sheetData.second_driver,
      driver_type: sheetData.driver_type,
      destination: sheetData.destination,
      last_24h_break: sheetData.last_24h_break || undefined,
      week_starting: sheetData.week_starting,
      days: sheetData.days,
      status: "completed",
      signature: signatureDataUrl,
      signed_at: signedAt,
    });
  };

  if (isLoading || !sheet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      {sheetData.status !== "completed" && (
        <LogBar days={sheetData.days} currentDayIndex={currentDayIndex} weekStarting={sheetData.week_starting} onLogEvent={handleLogEvent} />
      )}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/sheets">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 shrink-0" />
                Fatigue Record
              </h1>
              <p className="text-xs text-slate-400">WA Commercial Driver Fatigue Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={scrollToCompliance}
              className={`inline-flex items-center gap-2 h-9 rounded-md border px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
                hasComplianceViolations
                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
              title={hasComplianceViolations ? "View compliance — issues found" : "View compliance — OK"}
              aria-label={hasComplianceViolations ? "Compliance: issues found — jump to details" : "Compliance: OK — jump to details"}
            >
              {hasComplianceViolations ? (
                <XCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>Compliance</span>
              <span className="font-medium">
                {hasComplianceViolations ? "Issues" : "OK"}
              </span>
            </button>
            {lastSaved && !isDirty && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Saved {lastSaved.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            )}
            {isDirty && !saveMutation.isPending && (
              <span className="text-[10px] text-amber-500 font-medium">Unsaved changes</span>
            )}
            <Link
              href="/manager"
              className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Manager
            </Link>
            <Link
              href={`/sheets/${sheetId}/shift-log`}
              className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Shift Log
            </Link>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting} className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50">
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </Button>
            {sheetData.status === "completed" && (
              <Badge variant="outline" className="border-emerald-300 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </Badge>
            )}
            <div className="relative inline-flex" ref={saveMenuRef}>
              {sheetData.status !== "completed" ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 text-xs rounded-r-none border-r border-slate-700"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowSaveMenu((v) => !v)}
                    className="bg-slate-900 hover:bg-slate-800 text-white h-8 w-8 p-0 rounded-l-none border-slate-700"
                    aria-label="Save options"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSaveMenu ? "rotate-180" : ""}`} />
                  </Button>
                  {showSaveMenu && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Save className="w-3.5 h-3.5" /> Save draft
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndComplete}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save & mark complete
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 text-xs"
                >
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              )}
            </div>
          </div>
        </div>

        {saveMutation.isError &&
          (saveMutation.error as Error & { body?: { code?: string; sheet_id?: string } }).body?.code ===
            "PREVIOUS_WEEK_INCOMPLETE" && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-amber-800">
                {saveMutation.error instanceof Error ? saveMutation.error.message : "Save failed."}
              </p>
              {(saveMutation.error as Error & { body?: { sheet_id?: string } }).body?.sheet_id && (
                <Link
                  href={`/sheets/${(saveMutation.error as Error & { body?: { sheet_id?: string } }).body!.sheet_id}`}
                >
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                    Open that sheet
                  </Button>
                </Link>
              )}
            </div>
          )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div ref={dayCardsRef} className="flex-1 space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
              <SheetHeader sheetData={sheetData} onChange={handleHeaderChange} />
            </motion.div>
            {sheetData.days.map((day, idx) => (
                <div key={idx} className={sheetData.status !== "completed" ? "scroll-mt-48" : "scroll-mt-6"}>
                  <DayEntry
                    dayIndex={idx}
                    dayData={day}
                    onUpdate={handleDayUpdate}
                    weekStart={sheetData.week_starting}
                    regos={regos}
                  />
                </div>
              ))}
          </div>
          <div id="compliance-check" className="w-full lg:w-80 shrink-0 scroll-mt-24">
            <div className="lg:sticky lg:top-6 space-y-4">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Compliance Check</h2>
                <CompliancePanel
                  days={sheetData.days}
                  driverType={sheetData.driver_type}
                  prevWeekDays={prevWeekSheet?.days || null}
                  last24hBreak={sheetData.last_24h_break || undefined}
                  weekStarting={sheetData.week_starting || undefined}
                  prevWeekStarting={prevWeekSheet?.week_starting ?? undefined}
                />
              </motion.div>
              {sheetData.signature && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4">
                  <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Driver Signature
                  </h2>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img src={sheetData.signature} alt="Driver signature" className="w-full h-auto" />
                  </div>
                  {sheetData.signed_at && (
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Signed{" "}
                      {new Date(sheetData.signed_at).toLocaleString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SignatureDialog
        open={showSignatureDialog}
        onConfirm={handleSignatureConfirm}
        onCancel={() => setShowSignatureDialog(false)}
        driverName={sheetData.driver_name}
      />
    </div>
  );
}
