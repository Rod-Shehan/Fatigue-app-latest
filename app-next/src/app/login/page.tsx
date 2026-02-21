"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LayoutDashboard } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/sheets";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent, redirectTo: string = callbackUrl) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4 shadow-sm">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Driver Fatigue Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            WA Commercial Vehicle Fatigue Management
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
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
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
              required
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 font-medium" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Button
              type="submit"
              className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 border-slate-300 text-slate-600 font-medium gap-2"
              disabled={loading}
              onClick={(e) => onSubmit(e, "/manager")}
            >
              <LayoutDashboard className="w-4 h-4" /> Sign in as Manager
            </Button>
          </div>
        </form>
        <p className="text-xs text-center text-slate-400">
          Set NEXTAUTH_CREDENTIALS_PASSWORD in .env to use password sign-in.
        </p>
      </div>
    </div>
  );
}
