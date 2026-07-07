import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopBar } from "@/components/MobileTopBar";
import type { Profile } from "@/lib/types";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    // Auth user exists but no profile row (shouldn't happen via normal
    // provisioning) — safest thing is to sign out rather than render a
    // half-authorized shell.
    redirect("/login");
  }

  if (profile.status === "disabled") {
    redirect("/login");
  }

  if (profile.force_password_change) {
    redirect("/change-password");
  }

  return (
    <div className="min-h-screen bg-surface-sunk">
      <Sidebar profile={profile} />
      <MobileTopBar profile={profile} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
