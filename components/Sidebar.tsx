import Link from "next/link";
import { LogoLockup } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { SignOutButton } from "@/components/SignOutButton";
import { initials } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function Sidebar({ profile }: { profile: Profile }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/dashboard">
          <LogoLockup />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <NavLinks role={profile.role} />
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sx bg-navy-700 text-xs font-semibold text-white">
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink-900">{profile.full_name}</div>
            <div className="truncate text-xs text-ink-600/60">{ROLE_LABEL[profile.role]}</div>
          </div>
        </div>
        <SignOutButton className="mt-1 w-full justify-start px-2 text-ink-600/70 hover:bg-surface-muted hover:text-ink-900" />
      </div>
    </aside>
  );
}
