"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RolePill, StatusDot } from "@/components/StatusPill";
import { initials } from "@/lib/utils";
import { inputClass } from "@/components/ui";
import type { Profile, Group, Role } from "@/lib/types";

export function UserManagementTable({
  people,
  groups,
  currentUserId,
}: {
  people: Profile[];
  groups: Group[];
  currentUserId: string;
}) {
  const router = useRouter();
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function updateUser(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json();
      setErrors((e) => ({ ...e, [id]: data.error ?? "Update failed" }));
      return;
    }
    router.refresh();
  }

  async function handleRoleChange(person: Profile, role: Role) {
    if (role === "leader") {
      // Need a group to lead — default to their current group if set,
      // otherwise the first available group.
      const groupId = person.group_id ?? groups[0]?.id;
      if (!groupId) {
        setErrors((e) => ({ ...e, [person.id]: "Create a group first." }));
        return;
      }
      await updateUser(person.id, { role, group_id: groupId });
    } else if (role === "intern") {
      const groupId = person.group_id ?? groups[0]?.id ?? null;
      await updateUser(person.id, { role, group_id: groupId });
    } else {
      await updateUser(person.id, { role });
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json();
      setErrors((e) => ({ ...e, [id]: data.error ?? "Could not delete" }));
      return;
    }
    setConfirmDeleteId(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-600/50">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium">Group</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {people.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sx bg-navy-50 text-xs font-semibold text-navy-700">
                    {initials(p.full_name)}
                  </div>
                  <div>
                    <div className="font-medium text-ink-900">
                      {p.full_name} {p.id === currentUserId && <span className="text-xs text-ink-600/40">(you)</span>}
                    </div>
                    <div className="font-data text-xs text-ink-600/50">{p.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                {p.id === currentUserId ? (
                  <RolePill role={p.role} />
                ) : (
                  <select
                    value={p.role}
                    disabled={busyId === p.id}
                    onChange={(e) => handleRoleChange(p, e.target.value as Role)}
                    className={inputClass + " py-1.5 text-xs"}
                  >
                    <option value="intern">Intern</option>
                    <option value="leader">Group Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </td>
              <td className="px-5 py-3">
                {p.role === "admin" || p.id === currentUserId ? (
                  <span className="text-ink-600/50">{p.group_id ? groupName.get(p.group_id) : "—"}</span>
                ) : (
                  <select
                    value={p.group_id ?? ""}
                    disabled={busyId === p.id}
                    onChange={(e) => updateUser(p.id, { group_id: e.target.value || null })}
                    className={inputClass + " py-1.5 text-xs"}
                  >
                    <option value="">No group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td className="px-5 py-3">
                <button
                  disabled={p.id === currentUserId || busyId === p.id}
                  onClick={() => updateUser(p.id, { status: p.status === "active" ? "disabled" : "active" })}
                  className="disabled:opacity-40"
                >
                  <StatusDot active={p.status === "active"} />
                </button>
              </td>
              <td className="px-5 py-3">
                {p.id === currentUserId ? (
                  <span className="text-xs text-ink-600/40">—</span>
                ) : confirmDeleteId === p.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={busyId === p.id}
                      className="text-xs font-medium text-status-blocked hover:underline"
                    >
                      Confirm delete
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-ink-600/50 hover:underline">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="text-xs font-medium text-ink-600/60 hover:text-status-blocked"
                  >
                    Delete
                  </button>
                )}
                {errors[p.id] && <div className="mt-1 text-xs text-status-blocked">{errors[p.id]}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
