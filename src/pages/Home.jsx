import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  Clock,
  ChevronRight,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Home() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: sheets, isLoading } = useQuery({
    queryKey: ["fatigueSheets", currentUser?.email],
    queryFn: async () => {
      const user = currentUser || await base44.auth.me();
      if (!user) return [];
      if (user.role === "admin") {
        return base44.entities.FatigueSheet.list("-created_date", 50);
      }
      return base44.entities.FatigueSheet.filter({ created_by: user.email }, "-created_date", 50);
    },
    enabled: !!currentUser,
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FatigueSheet.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fatigueSheets"] }),
  });

  const getTotalWorkHours = (sheet) => {
    if (!sheet.days) return 0;
    return sheet.days.reduce((total, day) => {
      const slots = (day.work_time || []).filter(Boolean).length;
      return total + slots * 0.5;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Driver Fatigue Log
              </h1>
              <p className="text-sm text-slate-400">
                WA Commercial Vehicle Fatigue Management
              </p>
            </div>
          </div>
        </motion.div>

        {/* New sheet button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Your Sheets
          </h2>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Drivers")}>
              <Button variant="outline" className="gap-2 text-slate-600">
                <Users className="w-4 h-4" />
                Manage Drivers
              </Button>
            </Link>
            <Link to={createPageUrl("FatigueSheet")}>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2">
                <Plus className="w-4 h-4" />
                New Sheet
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && sheets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 mb-1">No fatigue sheets yet</p>
            <p className="text-sm text-slate-300">Create your first weekly record</p>
          </motion.div>
        )}

        {/* Sheet list */}
        <div className="space-y-3">
          <AnimatePresence>
            {sheets.map((sheet, i) => (
              <motion.div
                key={sheet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <Link
                    to={createPageUrl("FatigueSheet") + "?id=" + sheet.id}
                    className="flex items-center justify-between p-4 md:p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {sheet.driver_name || "Unnamed Driver"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {sheet.week_starting && (
                            <span className="text-xs text-slate-400 font-mono">
                              Week of{" "}
                              {format(new Date(sheet.week_starting), "dd MMM yyyy")}
                            </span>
                          )}
                          {sheet.destination && (
                            <span className="text-xs text-slate-400">
                              → {sheet.destination}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-sm font-mono text-slate-500">
                          {getTotalWorkHours(sheet)}h
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          sheet.status === "completed"
                            ? "border-emerald-300 text-emerald-600"
                            : "border-slate-200 text-slate-400"
                        }
                      >
                        {sheet.status === "completed" ? "Done" : "Draft"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </Link>
                  <div className="border-t border-slate-100 px-4 py-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-400 hover:text-red-500 gap-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("Delete this sheet?")) {
                          deleteMutation.mutate(sheet.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}