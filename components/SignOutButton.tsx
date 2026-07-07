"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 rounded-sx px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        className
      )}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M10.5 11l3-3-3-3M13.3 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
