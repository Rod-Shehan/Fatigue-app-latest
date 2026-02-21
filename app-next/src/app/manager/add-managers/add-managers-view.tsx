"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, Loader2, CheckCircle2 } from "lucide-react";

export function AddManagersView() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { email: string; name?: string }) => api.users.create(data),
    onSuccess: () => {
      setEmail("");
      setName("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    createMutation.mutate({ email: email.trim(), name: name.trim() || undefined });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 py-8 md:py-12">
        <Link href="/manager">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 mb-4">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-5 h-5 text-slate-500" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add Managers</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Create a user account. They can sign in on the login page with this email and the app
          password, then use &quot;Sign in as Manager&quot; to open the Manager page.
        </p>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="manager@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
              required
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold"
            >
              Name (optional)
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-600 font-medium" role="alert">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Failed to add manager"}
            </p>
          )}
          {createMutation.isSuccess && (
            <p className="text-sm text-green-600 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Manager added. They can sign in with this email.
            </p>
          )}
          <Button
            type="submit"
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2"
            disabled={createMutation.isPending || !email.trim()}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Add manager
          </Button>
        </form>
      </div>
    </div>
  );
}
