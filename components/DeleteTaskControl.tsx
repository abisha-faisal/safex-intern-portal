"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DeleteTaskControl({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not delete task");
      setLoading(false);
      return;
    }
    router.push("/tasks");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-status-blocked">Delete this task?</span>
        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          {loading ? "Deleting…" : "Confirm"}
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Delete task
      </Button>
      {error && <p className="mt-1.5 text-xs text-status-blocked">{error}</p>}
    </div>
  );
}
