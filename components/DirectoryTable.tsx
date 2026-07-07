"use client";

import { useMemo, useState } from "react";
import { RolePill, StatusDot } from "@/components/StatusPill";
import { initials } from "@/lib/utils";
import type { Profile, Group } from "@/lib/types";

export function DirectoryTable({ people, groups }: { people: Profile[]; groups: Group[] }) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const filtered = useMemo(() => {
    return people.filter((p) => {
      const matchesQuery =
        !query ||
        p.full_name.toLowerCase().includes(query.toLowerCase()) ||
        p.email.toLowerCase().includes(query.toLowerCase());
      const matchesGroup = groupFilter === "all" || p.group_id === groupFilter;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesQuery && matchesGroup && matchesStatus;
    });
  }, [people, query, groupFilter, statusFilter]);

  return (
    <div className="rounded-md border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600/40"
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M13 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-sx border border-border-strong py-2 pl-9 pr-3 text-sm outline-none focus:border-signal-500"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-sx border border-border-strong px-3 py-2 text-sm text-ink-700 outline-none focus:border-signal-500"
        >
          <option value="all">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sx border border-border-strong px-3 py-2 text-sm text-ink-700 outline-none focus:border-signal-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-600/50">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Group</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-surface-sunk">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-sx bg-navy-50 text-xs font-semibold text-navy-700">
                      {initials(p.full_name)}
                    </div>
                    <span className="font-medium text-ink-900">{p.full_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-data text-ink-600/80">{p.email}</td>
                <td className="px-5 py-3 text-ink-700">{groupName.get(p.group_id ?? "") ?? "—"}</td>
                <td className="px-5 py-3">
                  <RolePill role={p.role} />
                </td>
                <td className="px-5 py-3">
                  <StatusDot active={p.status === "active"} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-600/50">
                  No one matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards instead of a squeezed table */}
      <ul className="divide-y divide-border sm:hidden">
        {filtered.map((p) => (
          <li key={p.id} className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-sx bg-navy-50 text-xs font-semibold text-navy-700">
                {initials(p.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink-900">{p.full_name}</div>
                <div className="truncate font-data text-xs text-ink-600/60">{p.email}</div>
              </div>
              <RolePill role={p.role} />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-ink-600/70">{groupName.get(p.group_id ?? "") ?? "No group"}</span>
              <StatusDot active={p.status === "active"} />
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-ink-600/50">No one matches those filters.</li>
        )}
      </ul>
    </div>
  );
}
