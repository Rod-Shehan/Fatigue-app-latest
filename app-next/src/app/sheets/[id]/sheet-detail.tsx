"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, type ComplianceCheckResult, type FatigueSheet, type DayData } from "@/lib/api";
import {
  getSheetOfflineFirst,
  updateSheetOfflineFirst,
  listSheetsOfflineFirst,
  listRegosOfflineFirst,
} from "@/lib/offline-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FileText, Loader2, CheckCircle2, ScrollText, ChevronDown, XCircle, Download, LayoutDashboard, Square } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import SheetHeader from "@/components/fatigue/SheetHeader";
import DayEntry from "@/components/fatigue/DayEntry";
import CompliancePanel from "@/components/fatigue/CompliancePanel";
import SignatureDialog from "@/components/fatigue/SignatureDialog";
import LogBar from "@/components/fatigue/LogBar";
import { deriveDaysWithRollover, applyLast24hBreakNonWorkRule } from "@/components/fatigue/EventLogger";
import { getSheetDayDateString, getTodayLocalDateString } from "@/lib/weeks";
import { getProspectiveWorkWarnings } from "@/lib/compliance";
import { getCurrentPosition, BEST_EFFORT_OPTIONS } from "@/lib/geo";
import { validateDayKms, getMinAllowedStartKms, validateSheetKms } from "@/lib/rego-kms-validation";

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
  const [endShiftDialog, setEndShiftDialog] = useState<{ dayIndex: number } | null>(null);
  const [endShiftEndKms, setEndShiftEndKms] = useState("");
  const [endShiftError, setEndShiftError] = useState<string | null>(null);
  const sheetDataRef = useRef(sheetData);
  sheetDataRef.current = sheetData;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const dayCardsRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sheetId) {
      try {
        sessionStorage.setItem("fatigue-last-sheet-id", sheetId);
      } catch {
        /* ignore */
      }
    }
  }, [sheetId]);
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

  const compliancePayload = useMemo(
    () => ({
      days: sheetData.days,
      driverType: sheetData.driver_type,
      prevWeekDays: prevWeekSheet?.days ?? null,
      last24hBreak: sheetData.last_24h_break || undefined,
      weekStarting: sheetData.week_starting || undefined,
      prevWeekStarting: prevWeekSheet?.week_starting ?? undefined,
    }),
    [sheetData.days, sheetData.driver_type, sheetData.last_24h_break, sheetData.week_starting, prevWeekSheet]
  );
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["compliance", sheetId, compliancePayload],
    queryFn: () => api.compliance.check(compliancePayload),
    enabled: !!sheetData.days?.length,
  });
  const complianceResults: ComplianceCheckResult[] = complianceData?.results ?? [];
  const hasComplianceViolations = complianceResults.some((r) => r.type === "violation");

  const prospectiveWorkWarnings = useMemo(() => {
    if (!sheetData.days?.length || sheetData.status === "completed") return [];
    return getProspectiveWorkWarnings(
      sheetData.days,
      currentDayIndex,
      sheetData.week_starting,
      {
        driverType: sheetData.driver_type,
        prevWeekDays: prevWeekSheet?.days ?? null,
        last24hBreak: sheetData.last_24h_break || undefined,
        prevWeekStarting: prevWeekSheet?.week_starting ?? undefined,
      }
    );
  }, [
    sheetData.days,
    sheetData.week_starting,
    sheetData.driver_type,
    sheetData.last_24h_break,
    sheetData.status,
    currentDayIndex,
    prevWeekSheet?.days,
    prevWeekSheet?.week_starting,
  ]);

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

  const handleEndShiftRequest = useCallback(async (dayIndex: number) => {
    const days = sheetDataRef.current.days;
    const day = days[dayIndex];
    const startKms = day?.start_kms;
    if (startKms == null || (typeof startKms === "number" && Number.isNaN(startKms))) {
      window.alert("Please enter start km for today before ending the shift.");
      return;
    }
    const rego = (day?.truck_rego ?? "").trim();
    let serverMaxEndKms: number | null = null;
    if (rego) {
      try {
        const res = await api.sheets.regoMaxEndKms(rego);
        serverMaxEndKms = res.maxEndKms;
      } catch {
        // Offline: validate with local data only when confirming
      }
    }
    const minAllowed = getMinAllowedStartKms(days, dayIndex, rego, serverMaxEndKms);
    if (minAllowed != null && startKms < minAllowed) {
      window.alert(
        `Start km (${startKms}) cannot be lower than the last recorded end km for this rego (${minAllowed}). Please correct start km on the day card first.`
      );
      return;
    }
    setEndShiftError(null);
    setEndShiftEndKms(String(sheetDataRef.current.days[dayIndex]?.end_kms ?? ""));
    setEndShiftDialog({ dayIndex });
  }, []);

  const handleEndShiftConfirm = useCallback(async () => {
    if (endShiftDialog == null) return;
    setEndShiftError(null);
    const dayIndex = endShiftDialog.dayIndex;
    const trimmed = endShiftEndKms.trim();
    if (trimmed === "") {
      setEndShiftError("End km is required.");
      return;
    }
    const endKmsParsed = Number(trimmed);
    if (Number.isNaN(endKmsParsed) || endKmsParsed < 0) {
      setEndShiftError("Enter a valid end km (0 or greater).");
      return;
    }
    const days = sheetDataRef.current.days;
    const day = days[dayIndex];
    const startKms = day?.start_kms ?? null;
    const rego = (day?.truck_rego ?? "").trim();
    let serverMaxEndKms: number | null = null;
    if (rego) {
      try {
        const res = await api.sheets.regoMaxEndKms(rego);
        serverMaxEndKms = res.maxEndKms;
      } catch {
        // Offline or error: validate with local data only
      }
    }
    const validation = validateDayKms(days, dayIndex, rego, startKms, endKmsParsed, serverMaxEndKms);
    if (!validation.valid) {
      setEndShiftError(validation.message ?? "Invalid km.");
      return;
    }
    setSheetData((prev) => {
      const newDays = [...prev.days];
      const d = newDays[dayIndex];
      const events = d.events || [];
      const newEvent = { time: new Date().toISOString(), type: "stop" };
      const newEvents = [...events, newEvent];
      newDays[dayIndex] = { ...d, end_kms: endKmsParsed, events: newEvents };
      const withGrids = deriveDaysWithRollover(newDays, prev.week_starting);
      return { ...prev, days: applyLast24hBreakNonWorkRule(withGrids, prev.week_starting, prev.last_24h_break || undefined) };
    });
    setIsDirty(true);
    setEndShiftDialog(null);
    setEndShiftEndKms("");
    getCurrentPosition(BEST_EFFORT_OPTIONS).then((loc) => {
      if (!loc) return;
      setSheetData((prev) => {
        const newDays = [...prev.days];
        const d = newDays[dayIndex];
        const events = [...(d.events || [])];
        const last = events[events.length - 1];
        if (last) events[events.length - 1] = { ...last, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy };
        newDays[dayIndex] = { ...d, events };
        return { ...prev, days: newDays };
      });
      setIsDirty(true);
    });
  }, [endShiftDialog, endShiftEndKms]);

  const handleSave = () => {
    setShowSaveMenu(false);
    const kmError = validateSheetKms(sheetData.days);
    if (kmError) {
      window.alert(kmError);
      return;
    }
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
    const kmError = validateSheetKms(sheetData.days);
    if (kmError) {
      window.alert(kmError);
      return;
    }
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

  const handleExportPdf = useCallback(() => {
    setShowSaveMenu(false);
    window.open(api.exportPdfUrl(sheetId), "_blank");
  }, [sheetId]);

  if (isLoading || !sheet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-6">
      {sheetData.status !== "completed" && (
        <LogBar
          days={sheetData.days}
          currentDayIndex={currentDayIndex}
          weekStarting={sheetData.week_starting}
          onLogEvent={handleLogEvent}
          onEndShiftRequest={handleEndShiftRequest}
          leadingIcon={<FileText className="w-5 h-5" />}
          workRelevantComplianceMessages={prospectiveWorkWarnings}
        />
      )}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <PageHeader
          backHref="/sheets"
          backLabel="Your Sheets"
          title="Fatigue Record"
          subtitle="WA Commercial Driver Fatigue Management"
          actions={
          <>
            <Link
              href="/manager"
              className="inline-flex items-center justify-center gap-1.5 shrink-0 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 sm:px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Manager
            </Link>
            <Link
              href={`/sheets/${sheetId}/shift-log`}
              className="inline-flex items-center justify-center gap-1.5 shrink-0 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 sm:px-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Shift Log
            </Link>
            {lastSaved && !isDirty && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Saved {lastSaved.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              </span>
            )}
            {isDirty && !saveMutation.isPending && (
              <span className="text-[10px] text-amber-500 font-medium shrink-0">Unsaved changes</span>
            )}
            {sheetData.status === "completed" && (
              <Badge variant="outline" className="border-emerald-300 text-emerald-600 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </Badge>
            )}
            <div className="relative inline-flex shrink-0" ref={saveMenuRef}>
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
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Save className="w-3.5 h-3.5" /> Save draft
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndComplete}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save & mark complete
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleExportPdf();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-200 dark:border-slate-600"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export PDF
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 text-xs"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </Button>
                  <Button
                    type="button"
                    onClick={handleExportPdf}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-slate-300 dark:border-slate-600"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                  </Button>
                </>
              )}
            </div>
            <div className="w-full basis-full h-0" aria-hidden />
            <button
              type="button"
              onClick={scrollToCompliance}
              className={`inline-flex items-center gap-1.5 shrink-0 h-8 sm:h-9 rounded-md border px-2.5 sm:px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
                hasComplianceViolations
                  ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/50"
                  : "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800/50"
              }`}
              title={hasComplianceViolations ? "View compliance — issues found" : "View compliance — OK"}
              aria-label={hasComplianceViolations ? "Compliance: issues found — jump to details" : "Compliance: OK — jump to details"}
            >
              {hasComplianceViolations ? (
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              )}
              <span>Compliance</span>
              <span className="font-medium">
                {hasComplianceViolations ? "Issues" : "OK"}
              </span>
            </button>
          </>
          }
        />

        {saveMutation.isError &&
          (saveMutation.error as Error & { body?: { code?: string; sheet_id?: string } }).body?.code ===
            "PREVIOUS_WEEK_INCOMPLETE" && (
            <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-amber-800">
                {saveMutation.error instanceof Error ? saveMutation.error.message : "Save failed."}
              </p>
              {(saveMutation.error as Error & { body?: { sheet_id?: string } }).body?.sheet_id && (
                <Link
                  href={`/sheets/${(saveMutation.error as Error & { body?: { sheet_id?: string } }).body!.sheet_id}`}
                >
                  <Button variant="outline" size="sm" className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                    Open that sheet
                  </Button>
                </Link>
              )}
            </div>
          )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div ref={dayCardsRef} className="flex-1 space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-5">
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase tracking-wider">Compliance Check</h2>
                <CompliancePanel
                  days={sheetData.days}
                  driverType={sheetData.driver_type}
                  prevWeekDays={prevWeekSheet?.days || null}
                  last24hBreak={sheetData.last_24h_break || undefined}
                  weekStarting={sheetData.week_starting || undefined}
                  prevWeekStarting={prevWeekSheet?.week_starting ?? undefined}
                  complianceResults={complianceData?.results ?? null}
                  complianceLoading={complianceLoading}
                />
              </motion.div>
              {sheetData.signature && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm p-4">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Driver Signature
                  </h2>
                  <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
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
      <Dialog open={!!endShiftDialog} onOpenChange={(open) => !open && setEndShiftDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="w-5 h-5" />
              End shift
            </DialogTitle>
            <DialogDescription>
              Enter end odometer. This will log End Shift for today and switch to non-work time. Start km and end km are required; end km must not be lower than any previous entry for this rego.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Label htmlFor="end-shift-kms" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              End km (required)
            </Label>
            <Input
              id="end-shift-kms"
              type="number"
              min={0}
              placeholder="e.g. 12345"
              value={endShiftEndKms}
              onChange={(e) => { setEndShiftEndKms(e.target.value); setEndShiftError(null); }}
              className="font-mono"
              aria-invalid={!!endShiftError}
              aria-describedby={endShiftError ? "end-shift-error" : undefined}
            />
            {endShiftError && (
              <p id="end-shift-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
                {endShiftError}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setEndShiftDialog(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleEndShiftConfirm} className="gap-1.5">
                <Square className="w-3.5 h-3.5" />
                End shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
