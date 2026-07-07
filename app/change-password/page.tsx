"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup } from "@/components/Logo";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.rpc("mark_password_changed");

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
          <h1 className="font-display text-xl font-semibold text-ink-900">Set a new password</h1>
          <p className="mt-1 text-sm text-ink-600/70">
            You're signing in with a temporary password. Choose a permanent one to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sx border border-border-strong px-3 py-2 text-sm outline-none focus:border-signal-500"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-sx border border-border-strong px-3 py-2 text-sm outline-none focus:border-signal-500"
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
              {loading ? "Saving…" : "Save and continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
