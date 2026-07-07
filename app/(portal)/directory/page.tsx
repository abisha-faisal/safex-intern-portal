import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DirectoryTable } from "@/components/DirectoryTable";
import type { Profile, Group } from "@/lib/types";

export default async function DirectoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();

  if (me?.role === "intern") {
    redirect("/dashboard");
  }

  // RLS scopes this automatically: an admin gets every profile, a leader
  // gets only their own group's interns plus themselves.
  const [{ data: people }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    supabase.from("groups").select("*").order("name").returns<Group[]>(),
  ]);

  return (
    <div>
      <PageHeader
        title="Directory"
        description={
          me?.role === "admin"
            ? "Every person across every group at SafeX."
            : "Members of your group."
        }
      />
      <DirectoryTable people={people ?? []} groups={groups ?? []} />
    </div>
  );
}
