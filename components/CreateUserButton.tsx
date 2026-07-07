"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button, Field, inputClass } from "@/components/ui";
import type { Group, Role } from "@/lib/types";

export function CreateUserButton({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("intern");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setRole("intern");
    setGroupId("");
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, email, role, group_id: groupId || null }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create user");
      return;
    }

    setResult({ email, password: data.temporaryPassword });
    router.refresh();
  }

  return (
    <>
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        + New user
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={result ? "Account created" : "Create user"}
      >
        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Share these credentials with <strong>{result.email}</strong> directly (Slack DM, in
              person, etc.) — not over an insecure channel. They'll be required to set a new
              password on first login.
            </p>
            <div className="rounded-sx border border-border-strong bg-surface-sunk p-3">
              <div className="text-xs uppercase tracking-wide text-ink-600/50">Temporary password</div>
              <div className="font-data mt-1 select-all text-sm font-medium text-ink-900">{result.password}</div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name">
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Work email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                <option value="intern">Intern</option>
                <option value="leader">Group Leader</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            {(role === "intern" || role === "leader") && (
              <Field label={role === "leader" ? "Group to lead" : "Group"}>
                <select required value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputClass}>
                  <option value="">Select a group…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {error && <div className="rounded-sx bg-status-blockedBg px-3 py-2 text-sm text-status-blocked">{error}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create account"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
