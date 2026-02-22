"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type FatigueSheet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutDashboard, Save, Loader2, CheckCircle2, FileEdit, Truck, Users, Trash2, UserPlus } from "lucide-react";

function formatSheetLabel(sheet: FatigueSheet): string {
  const driver = sheet.driver_name || "Draft";
  const week = sheet.week_starting
    ? new Date(sheet.week_starting + "T12:00:00").toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  return `${driver} — week of ${week}`;
}

export function ManagerView() {
  const queryClient = useQueryClient();
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [form, setForm] = useState<{
    last_24h_break: string;
    driver_type: string;
    week_starting: string;
    destination: string;
    driver_name: string;
    second_driver: string;
  }>({
    last_24h_break: "",
    driver_type: "solo",
    week_starting: "",
    destination: "",
    driver_name: "",
    second_driver: "",
  });

  const { data: sheets = [], isLoading: sheetsLoading } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => api.sheets.list(),
  });

  const { data: selectedSheet, isLoading: sheetLoading } = useQuery({
    queryKey: ["sheet", selectedSheetId],
    queryFn: () => api.sheets.get(selectedSheetId),
    enabled: !!selectedSheetId,
  });

  useEffect(() => {
    if (!selectedSheet || selectedSheet.id !== selectedSheetId) return;
    setForm({
      last_24h_break: selectedSheet.last_24h_break ?? "",
      driver_type: selectedSheet.driver_type ?? "solo",
      week_starting: selectedSheet.week_starting ?? "",
      destination: selectedSheet.destination ?? "",
      driver_name: selectedSheet.driver_name ?? "",
      second_driver: selectedSheet.second_driver ?? "",
    });
  }, [selectedSheet, selectedSheetId]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<FatigueSheet>) =>
      api.sheets.update(selectedSheetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet", selectedSheetId] });
      queryClient.invalidateQueries({ queryKey: ["sheets"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.sheets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheets"] });
      queryClient.invalidateQueries({ queryKey: ["sheet", selectedSheetId] });
      setSelectedSheetId("");
    },
  });

  const handleDelete = () => {
    if (!selectedSheetId) return;
    if (!confirm("Delete this sheet? This cannot be undone.")) return;
    deleteMutation.mutate(selectedSheetId);
  };

  const handleSave = () => {
    if (!selectedSheetId) return;
    saveMutation.mutate({
      last_24h_break: form.last_24h_break || undefined,
      driver_type: form.driver_type,
      week_starting: form.week_starting || undefined,
      destination: form.destination || undefined,
      driver_name: form.driver_name || undefined,
      second_driver: form.second_driver || undefined,
    });
  };

  const hasChanges =
    selectedSheet &&
    (form.last_24h_break !== (selectedSheet.last_24h_break ?? "") ||
      form.driver_type !== (selectedSheet.driver_type ?? "solo") ||
      form.week_starting !== (selectedSheet.week_starting ?? "") ||
      form.destination !== (selectedSheet.destination ?? "") ||
      form.driver_name !== (selectedSheet.driver_name ?? "") ||
      form.second_driver !== (selectedSheet.second_driver ?? ""));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <PageHeader
          backHref="/sheets"
          backLabel="Your Sheets"
          title="Manager"
          subtitle="View sheets and compliance across drivers"
          icon={<LayoutDashboard className="w-5 h-5" />}
        />

        <div className="flex gap-2 flex-wrap mb-6">
          <Link href="/manager/add-managers">
            <Button variant="outline" className="gap-2 text-slate-600 dark:text-slate-300">
              <UserPlus className="w-4 h-4" /> Add Managers
            </Button>
          </Link>
          <Link href="/admin/regos">
            <Button variant="outline" className="gap-2 text-slate-600 dark:text-slate-300">
              <Truck className="w-4 h-4" /> Manage Regos
            </Button>
          </Link>
          <Link href="/drivers">
            <Button variant="outline" className="gap-2 text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4" /> Manage Drivers
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileEdit className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Edit sheet inputs
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Select a sheet to edit driver-entered fields such as last 24 hour
              break date, driver type, week starting, and destination.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Sheet
                </Label>
                <Select
                  value={selectedSheetId}
                  onValueChange={(id) => setSelectedSheetId(id)}
                  disabled={sheetsLoading}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a sheet…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {formatSheetLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSheetId && (
                <>
                  {sheetLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading sheet…
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Last 24 hour break
                        </Label>
                        <Input
                          type="date"
                          value={form.last_24h_break}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              last_24h_break: e.target.value,
                            }))
                          }
                          className="h-9 font-mono max-w-xs"
                        />
                        <p className="text-xs text-slate-400">
                          Date of last 24h rest; resets 17h and 72h rules. Leave
                          empty if not set.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Driver type
                        </Label>
                        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden w-fit">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, driver_type: "solo" }))
                            }
                            className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                              form.driver_type === "solo"
                                ? "bg-slate-900 dark:bg-slate-600 text-white dark:text-slate-100"
                                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                          >
                            Solo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                driver_type: "two_up",
                              }))
                            }
                            className={`px-4 py-1.5 text-xs font-bold transition-colors border-l border-slate-200 dark:border-slate-600 ${
                              form.driver_type === "two_up"
                                ? "bg-slate-900 dark:bg-slate-600 text-white dark:text-slate-100"
                                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                          >
                            Two-Up
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Week starting
                        </Label>
                        <Input
                          type="date"
                          value={form.week_starting}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              week_starting: e.target.value,
                            }))
                          }
                          className="h-9 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Driver name
                        </Label>
                        <Input
                          value={form.driver_name}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              driver_name: e.target.value,
                            }))
                          }
                          placeholder="Driver name"
                          className="h-9 max-w-xs"
                        />
                      </div>
                      {form.driver_type === "two_up" && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            Second driver
                          </Label>
                          <Input
                            value={form.second_driver}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                second_driver: e.target.value,
                              }))
                            }
                            placeholder="Second driver name"
                            className="h-9 max-w-xs"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Destination
                        </Label>
                        <Input
                          value={form.destination}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              destination: e.target.value,
                            }))
                          }
                          placeholder="Destination"
                          className="h-9 max-w-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                        <Button
                          onClick={handleSave}
                          disabled={!hasChanges || saveMutation.isPending}
                          className="gap-2"
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : saveMutation.isSuccess ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save changes
                        </Button>
                        {saveMutation.isSuccess && (
                          <span className="text-sm text-green-600">
                            Saved.
                          </span>
                        )}
                        {saveMutation.isError && (
                          <span className="text-sm text-red-600">
                            {saveMutation.error instanceof Error
                              ? saveMutation.error.message
                              : "Save failed"}
                          </span>
                        )}
                        <Link href={selectedSheetId ? `/sheets/${selectedSheetId}` : "/sheets"}>
                          <Button variant="outline" size="sm">
                            Open sheet
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-300 dark:hover:border-red-700 gap-1"
                          disabled={deleteMutation.isPending}
                          onClick={handleDelete}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete sheet
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">
              Manager dashboard and reporting will appear here.
            </p>
            <p className="text-xs mt-2">
              Use the back button to return to your sheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
