"use client";

import { useState } from "react";
import { LogoLockup } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { SignOutButton } from "@/components/SignOutButton";
import { initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function MobileTopBar({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
      <LogoLockup />
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-sx border border-border text-ink-700"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-popover">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <LogoLockup />
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-sx text-ink-600"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-5">
              <NavLinks role={profile.role} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sx bg-navy-700 text-xs font-semibold text-white">
                  {initials(profile.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-900">{profile.full_name}</div>
                  <div className="truncate text-xs text-ink-600/60">{profile.email}</div>
                </div>
              </div>
              <SignOutButton className="mt-1 w-full justify-start px-2 text-ink-600/70" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
