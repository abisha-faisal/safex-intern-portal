import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Profile } from "@/lib/types";

// Server Components / Route Handlers use this. It forwards the caller's
// session cookies to Supabase, so every query still runs AS THAT USER and
// is subject to the RLS policies in supabase/schema.sql — this client can
// never see more than the signed-in user is allowed to.
//
// Not parameterized with Database — see the note in supabase/client.ts.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session instead, so this can be safely ignored.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

// Every Server Component on a page (the shared layout AND the page
// itself) used to independently call supabase.auth.getUser() and then
// re-fetch the caller's own profiles row — meaning a single navigation
// fired that auth check + query twice (once from the layout, once from
// the page), on top of middleware.ts already doing its own getUser().
// Wrapping this in React's cache() means every call during the same
// request (layout + page) shares one result instead of re-hitting
// Supabase's servers, which is most of what was making navigation feel
// slow. This does NOT persist across requests/navigations — it's scoped
// to a single render, so it can never serve stale auth state.
export const getCurrentProfile = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { user, profile };
});