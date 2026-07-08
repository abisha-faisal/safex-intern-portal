"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message); // TEMP DEBUG: showing raw Supabase error, revert after fixing
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunk px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          <LogoLockup />
        </div>

        <div className="rounded-md border border-border bg-surface p-7 shadow-panel">
          <h1 className="font-display text-xl font-semibold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-600/70">
            Access to the Intern Portal is provisioned by a SafeX admin. If you don't have
            credentials yet, ask your admin to create your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sx border border-border-strong px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-signal-500"
                placeholder="you@safexsolutions.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sx border border-border-strong px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-signal-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-sx bg-status-blockedBg px-3 py-2 text-sm text-status-blocked">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sx bg-navy-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-600/50">
          SafeX Solutions · Internal use only
        </p>
      </div>
    </div>
  );
}