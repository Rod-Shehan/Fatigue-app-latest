import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, ArrowLeft, Loader2, CheckCircle2, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

import SheetHeader from "../components/fatigue/SheetHeader";
import DayEntry from "../components/fatigue/DayEntry";
import CompliancePanel from "../components/fatigue/CompliancePanel";
import SignatureDialog from "../components/fatigue/SignatureDialog";
import LogBar from "../components/fatigue/LogBar";
import { deriveGridFromEvents } from "../components/fatigue/EventLogger";

const EMPTY_DAY = () => ({
  day_label: "",
  date: "",
  truck_rego: "",
  start_kms: null,
  end_kms: null,
  work_time: Array(48).fill(false),
  breaks: Array(48).fill(false),
  non_work: Array(48).fill(false),
});

export default function FatigueSheet() {
  const urlParams = new URLSearchParams(window.location.search);
  const sheetId = urlParams.get("id");
  const queryClient = useQueryClient();

  // Default week_starting to the most recent Sunday
  const getThisWeekSunday = () => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    return sunday.toISOString().split("T")[0];
  };

  const [sheetData, setSheetData] = useState({
    driver_name: "",
    second_driver: "",
    driver_type: "solo",
    destination: "",
    week_starting: getThisWeekSunday(),
    days: Array(7).fill(null).map(() => EMPTY_DAY()),
    status: "draft",
  });

  const [savedSheetId, setSavedSheetId] = useState(sheetId);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay()); // default to today
  const autoSaveTimer = useRef(null);

  const { data: allSheets, isLoading } = useQuery({
    queryKey: ["fatigueSheet", sheetId],
    queryFn: () => base44.entities.FatigueSheet.list("-week_starting", 50),
    enabled: true,
  });

  useEffect(() => {
    if (sheetId && allSheets) {
      const found = allSheets.find((s) => s.id === sheetId);
      if (found) {
        setSheetData({
          ...found,
          days: (found.days || []).map((d) => ({
            ...EMPTY_DAY(),
            ...d,
            work_time: d.work_time || Array(48).fill(false),
            breaks: d.breaks || Array(48).fill(false),
            non_work: d.non_work || Array(48).fill(false),
          })),
        });
      }
    }
  }, [sheetId, allSheets]);

  // Find the previous week's sheet for the same driver (for 14-day / boundary checks)
  const prevWeekSheet = useMemo(() => {
    if (!allSheets || !sheetData.driver_name || !sheetData.week_starting) return null;
    const currentStart = new Date(sheetData.week_starting);
    const expectedPrevStart = new Date(currentStart);
    expectedPrevStart.setDate(expectedPrevStart.getDate() - 7);
    const prevDateStr = expectedPrevStart.toISOString().split("T")[0];
    return allSheets.find(
      (s) => s.id !== (savedSheetId || sheetId) &&
             s.driver_name?.toLowerCase() === sheetData.driver_name?.toLowerCase() &&
             s.week_starting === prevDateStr
    ) || null;
  }, [allSheets, sheetData.driver_name, sheetData.week_starting, sheetId, savedSheetId]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const currentId = savedSheetId || new URLSearchParams(window.location.search).get("id");
      if (currentId) {
        return base44.entities.FatigueSheet.update(currentId, data);
      } else {
        return base44.entities.FatigueSheet.create(data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fatigueSheet"] });
      setIsDirty(false);
      setLastSaved(new Date());
      if (result?.id && !savedSheetId) {
        setSavedSheetId(result.id);
        window.history.replaceState(null, "", createPageUrl("FatigueSheet") + "?id=" + result.id);
      }
    },
  });

  // Auto-save 30s after last change (only if there's a driver name)
  useEffect(() => {
    if (!isDirty || !sheetData.driver_name) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate({
        driver_name: sheetData.driver_name,
        second_driver: sheetData.second_driver,
        driver_type: sheetData.driver_type || "solo",
        destination: sheetData.destination,
        week_starting: sheetData.week_starting,
        days: sheetData.days,
        status: sheetData.status,
      });
    }, 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [sheetData, isDirty]);

  const handleHeaderChange = useCallback((updates) => {
    setSheetData((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const handleDayUpdate = useCallback((dayIndex, dayData) => {
    setSheetData((prev) => {
      const newDays = [...prev.days];
      newDays[dayIndex] = dayData;
      return { ...prev, days: newDays };
    });
    setIsDirty(true);
  }, []);

  const handleLogEvent = useCallback((dayIndex, type) => {
    setSheetData((prev) => {
      const newDays = [...prev.days];
      const day = newDays[dayIndex];
      const events = day.events || [];
      const newEvent = { time: new Date().toISOString(), type };
      const newEvents = [...events, newEvent];
      const isoDate = (() => {
        if (!prev.week_starting) return new Date().toISOString().split("T")[0];
        const d = new Date(prev.week_starting);
        d.setDate(d.getDate() + dayIndex);
        return d.toISOString().split("T")[0];
      })();
      const derived = deriveGridFromEvents(newEvents, isoDate);
      newDays[dayIndex] = { ...day, events: newEvents, ...derived };
      return { ...prev, days: newDays };
    });
    setIsDirty(true);
  }, []);

  const handleSave = (overrides = {}) => {
    const payload = {
      driver_name: sheetData.driver_name,
      second_driver: sheetData.second_driver,
      driver_type: sheetData.driver_type || "solo",
      destination: sheetData.destination,
      week_starting: sheetData.week_starting,
      days: sheetData.days,
      status: sheetData.status,
      signature: sheetData.signature || null,
      signed_at: sheetData.signed_at || null,
      ...overrides,
    };
    saveMutation.mutate(payload);
  };

  const handleExportPDF = async () => {
    if (!savedSheetId) return;
    setIsExporting(true);
    const response = await base44.functions.invoke('exportFatigueSheet', { sheetId: savedSheetId });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatigue-sheet-${sheetData.driver_name?.replace(/\s+/g, '-') || 'sheet'}-${sheetData.week_starting || 'draft'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    setIsExporting(false);
  };

  const handleSignatureConfirm = (signatureDataUrl) => {
    const signedAt = new Date().toISOString();
    setSheetData(prev => ({ ...prev, status: "completed", signature: signatureDataUrl, signed_at: signedAt }));
    setShowSignatureDialog(false);
    // Save immediately with signature
    const payload = {
      driver_name: sheetData.driver_name,
      second_driver: sheetData.second_driver,
      driver_type: sheetData.driver_type || "solo",
      destination: sheetData.destination,
      week_starting: sheetData.week_starting,
      days: sheetData.days,
      status: "completed",
      signature: signatureDataUrl,
      signed_at: signedAt,
    };
    saveMutation.mutate(payload);
  };

  if (isLoading && sheetId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <div className="max-w-[1400px] mx-auto px-4 py-6 pt-28">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Fatigue Record Sheet
              </h1>
              <p className="text-xs text-slate-400">WA Commercial Driver Fatigue Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {lastSaved && !isDirty && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Saved {lastSaved.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            )}
            {isDirty && !saveMutation.isPending && (
              <span className="text-[10px] text-amber-500">Unsaved changes</span>
            )}
            {savedSheetId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="text-xs gap-1"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export PDF
              </Button>
            )}
            {sheetData.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignatureDialog(true)}
                className="text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50 gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Complete
              </Button>
            )}
            {sheetData.status === "completed" && (
              <Badge variant="outline" className="border-emerald-300 text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Header fields */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5"
            >
              <SheetHeader sheetData={sheetData} onChange={handleHeaderChange} />
            </motion.div>

            {/* Day entries */}
            {sheetData.days.map((day, idx) => (
              <DayEntry
                key={idx}
                dayIndex={idx}
                dayData={day}
                onUpdate={handleDayUpdate}
                weekStart={sheetData.week_starting}
              />
            ))}
          </div>

          {/* Compliance sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-6 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
              >
                <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                  Compliance Check
                </h2>
                <CompliancePanel
                  days={sheetData.days}
                  driverType={sheetData.driver_type || "solo"}
                  prevWeekDays={prevWeekSheet?.days || null}
                />
              </motion.div>

              {/* Signature display */}
              {sheetData.signature && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4"
                >
                  <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Driver Signature
                  </h2>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={sheetData.signature}
                      alt="Driver signature"
                      className="w-full h-auto"
                    />
                  </div>
                  {sheetData.signed_at && (
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Signed {new Date(sheetData.signed_at).toLocaleString("en-AU", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit", hour12: false
                      })}
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {sheetData.status !== "completed" && (
        <LogBar
          days={sheetData.days}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onLogEvent={handleLogEvent}
        />
      )}

      <SignatureDialog
        open={showSignatureDialog}
        onConfirm={handleSignatureConfirm}
        onCancel={() => setShowSignatureDialog(false)}
        driverName={sheetData.driver_name}
      />
    </div>
  );
}