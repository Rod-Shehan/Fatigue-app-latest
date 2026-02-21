"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, type Rego } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { useState } from "react";

export function RegosAdmin() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");

  const { data: regos = [], isLoading } = useQuery({
    queryKey: ["regos"],
    queryFn: () => api.regos.list(),
  });

  const createMutation = useMutation({
    mutationFn: (label: string) => api.regos.create({ label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regos"] });
      setNewLabel("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.regos.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["regos"] }),
  });

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    createMutation.mutate(label);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <Link
            href="/sheets"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sheets
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Truck Rego List</h1>
              <p className="text-sm text-slate-400">Manage regos for the sheet dropdown (admin)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Add rego</h2>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1ABC 234"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 font-mono"
            />
            <Button
              onClick={handleAdd}
              disabled={!newLabel.trim() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-slate-100">
            Current regos ({regos.length})
          </h2>
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
          {!isLoading && regos.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">No regos yet. Add one above.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {regos.map((rego) => (
              <li key={rego.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-mono text-slate-800">{rego.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(rego.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
