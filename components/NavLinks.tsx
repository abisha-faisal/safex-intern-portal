"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ALL_LINKS = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "leader", "intern"] },
  { href: "/directory", label: "Directory", roles: ["admin", "leader"] },
  { href: "/groups", label: "Groups", roles: ["admin", "leader", "intern"] },
  { href: "/tasks", label: "Tasks", roles: ["admin", "leader", "intern"] },
  { href: "/feedback", label: "Feedback", roles: ["admin", "leader", "intern"] },
  { href: "/users", label: "User management", roles: ["admin"] },
] as const;

export function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => (l.roles as readonly string[]).includes(role));

  return (
    <ul className="space-y-0.5">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-sx px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-700 text-white"
                  : "text-ink-600/75 hover:bg-surface-muted hover:text-ink-900"
              )}
            >
              <NavIcon label={link.label} active={active} />
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavIcon({ label, active }: { label: string; active: boolean }) {
  const stroke = active ? "#FFFFFF" : "#16233F";
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none" };
  switch (label) {
    case "Dashboard":
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
          <rect x="8.5" y="1.5" width="6" height="9" rx="1" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
          <rect x="1.5" y="8.5" width="6" height="6" rx="1" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
        </svg>
      );
    case "Directory":
      return (
        <svg {...common}>
          <circle cx="8" cy="5.2" r="2.2" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
          <path d="M2.5 14c0-2.5 2.4-4 5.5-4s5.5 1.5 5.5 4" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
        </svg>
      );
    case "Groups":
      return (
        <svg {...common}>
          <path d="M8 1.5l5 3v3l-5 3-5-3v-3l5-3z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" opacity={active ? 1 : 0.55} />
          <path d="M3 8v3l5 3 5-3V8" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" opacity={active ? 1 : 0.55} />
        </svg>
      );
    case "Tasks":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="12" height="12" rx="1.5" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
          <path d="M4.8 8l2 2 4-4.2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.55} />
        </svg>
      );
    case "Feedback":
      return (
        <svg {...common}>
          <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H6l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" opacity={active ? 1 : 0.55} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="5" r="2.3" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
          <path d="M3 13.5c.5-2.8 2.4-4.3 5-4.3s4.5 1.5 5 4.3" stroke={stroke} strokeWidth="1.3" opacity={active ? 1 : 0.55} />
          <path d="M11.5 3l1 1 2-2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.55} />
        </svg>
      );
  }
}
