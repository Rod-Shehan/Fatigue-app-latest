import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, UserCheck, UserX, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Drivers() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newLicence, setNewLicence] = useState("");

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setNewName("");
      setNewLicence("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Driver.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Driver.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), licence_number: newLicence.trim(), is_active: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Approved Drivers</h1>
            <p className="text-xs text-slate-400">Manage the driver roster</p>
          </div>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Full name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
            required
          />
          <Input
            placeholder="Licence no. (optional)"
            value={newLicence}
            onChange={(e) => setNewLicence(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={createMutation.isPending || !newName.trim()} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shrink-0">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Driver
          </Button>
        </form>

        {/* Driver list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}
          {!isLoading && drivers.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10">No drivers added yet.</p>
          )}
          <AnimatePresence>
            {drivers.map((driver) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{driver.name}</p>
                  {driver.licence_number && (
                    <p className="text-[11px] text-slate-400 font-mono">{driver.licence_number}</p>
                  )}
                </div>
                <Badge className={driver.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}>
                  {driver.is_active ? "Active" : "Inactive"}
                </Badge>
                <button
                  onClick={() => toggleMutation.mutate({ id: driver.id, is_active: !driver.is_active })}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title={driver.is_active ? "Deactivate" : "Activate"}
                >
                  {driver.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(driver.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}