# SafeX Intern Management Portal

An internal tool for SafeX Solutions to manage interns, group leaders, weekly
tasks, and anonymous feedback — with role-based access enforced in the
database, not just hidden in the UI.

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Row Level Security)
- **Hosting:** Vercel (or any Next.js-compatible host)

---

## 1. How access control actually works (read this first)

There are three roles — `admin`, `leader`, `intern` — stored in a `profiles`
table that mirrors `auth.users` 1:1. **Every table that matters has Row Level
Security (RLS) enabled**, and the policies in `supabase/schema.sql` are the
real gate. The Next.js app never has a "backdoor" query path — every request
the browser makes, whether through a Server Component or a Route Handler,
still goes through Supabase as that signed-in user, and Postgres enforces
who can see or touch what.

**Concretely:**

- A **Group Leader's** session can only ever `SELECT`/`UPDATE`/`DELETE` rows in
  `tasks` where `group_id` equals the group they lead — enforced by the
  `tasks_select`/`tasks_update`/`tasks_delete` policies calling
  `current_profile_group()`. If a leader opens dev tools and calls
  `supabase.from('tasks').select('*')` directly, Postgres still only returns
  their own group's rows — there's no separate "hidden" scope to route
  around.
- An **Intern** can `UPDATE` their own task row (RLS allows it), but a
  database trigger (`enforce_task_update_scope`) rejects the statement
  outright if anything besides `status`/`progress` changed — so even a
  hand-crafted API call can't sneak past the "status and progress only" rule.
- **Only admins** can create, delete, or role/group-reassign a user. User
  creation and deletion require the Supabase **service role key**, which only
  exists in `app/api/admin/**` Route Handlers (server-only, via
  `lib/supabase/admin.ts`, guarded by `import "server-only"`) — it is never
  sent to the browser, and every one of those routes re-checks
  `profiles.role === 'admin'` for the caller's *own* session before doing
  anything.
- **Feedback anonymity is structural, not a permission setting.** The
  `feedback` table has no author column at all — it is architecturally
  impossible to trace a row back to an intern, even for an admin with full
  table access. The only write path is a `SECURITY DEFINER` function,
  `submit_feedback()`, which checks the caller is an intern in that group,
  rate-limits to one submission per week via a *separate* tracking table
  (`feedback_weeks`) that has **zero** RLS policies granted to any client
  role — it's reachable only from inside that function.

If you take one thing away: **the frontend hides buttons for convenience; the
database is what actually stops people.** You can verify this yourself by
signing in as an intern, opening the browser console, and trying
`supabase.from('tasks').update({status:'completed'}).eq('id', someOtherPersonsTaskId)`
— it will affect zero rows.

### Permission matrix

| Action | Admin | Leader | Intern |
|---|---|---|---|
| Create/delete any user | ✅ | ❌ | ❌ |
| Change a user's role or group | ✅ | ❌ | ❌ |
| Create/delete groups, assign leaders | ✅ | ❌ | ❌ |
| View all groups/interns/tasks company-wide | ✅ | ❌ | ❌ |
| Create tasks for their own group's interns | ✅ | ✅ | ❌ |
| View/manage tasks in their own group only | ✅ | ✅ | ❌ |
| View another group's data | ✅ | ❌ | ❌ |
| Update status/progress on their own task | ✅ | ✅ | ✅ (own only) |
| Add notes on a task they're involved in | ✅ | ✅ | ✅ (own tasks) |
| Submit anonymous weekly feedback | — | — | ✅ |
| View aggregated feedback for a group | ✅ (all) | ✅ (own group) | ❌ |

---

## 2. Project structure

```
safex-portal/
├── app/
│   ├── login/page.tsx              # Public: sign-in only, no sign-up
│   ├── change-password/page.tsx    # Forced on first login (temp password)
│   ├── (portal)/                   # Everything behind auth
│   │   ├── layout.tsx              # Fetches profile, renders sidebar/topbar
│   │   ├── dashboard/page.tsx
│   │   ├── directory/page.tsx      # Admin + Leader
│   │   ├── groups/page.tsx
│   │   ├── groups/[id]/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── tasks/[id]/page.tsx
│   │   ├── feedback/page.tsx
│   │   └── users/page.tsx          # Admin only
│   └── api/
│       ├── admin/users/            # Privileged: service-role key lives here
│       ├── admin/groups/
│       ├── tasks/
│       └── feedback/
├── components/                     # UI building blocks + design tokens usage
├── lib/
│   ├── supabase/client.ts          # Browser client (anon key)
│   ├── supabase/server.ts          # Server Components/Route Handlers (anon key + session)
│   ├── supabase/admin.ts           # Service-role client — server-only, import "server-only"
│   ├── types.ts
│   └── utils.ts
├── supabase/schema.sql             # Tables, RLS policies, triggers, functions
├── scripts/create-first-admin.mjs  # Bootstraps account #1
├── middleware.ts                   # Refreshes the Supabase session cookie
└── tailwind.config.ts              # Design tokens (color/type/spacing/shadow scale)
```

---

## 3. Setup from an empty machine

### 3.1 Prerequisites
- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)
- Git and a GitHub account

### 3.2 Create the Supabase project
1. Go to supabase.com → **New project**. Pick a name (e.g. `safex-portal`),
   a database password (save it somewhere safe), and a region close to your
   users.
2. Wait for provisioning (~2 minutes).
3. In the left sidebar, go to **SQL Editor** → **New query**.
4. Paste the entire contents of `supabase/schema.sql` from this project and
   click **Run**. This creates every table, RLS policy, trigger, and
   function described above.
5. Go to **Project Settings → API**. You'll need three values in the next
   step:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click "Reveal" — keep this one secret)

### 3.3 Configure the app locally
```bash
git clone <your-repo-url> safex-portal
cd safex-portal
npm install
cp .env.example .env.local
```
Edit `.env.local` and fill in the three values from step 3.2.5:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3.4 Create the first Admin account
There's no sign-up page anywhere in this app — on purpose. Bootstrap the
first account from your terminal:
```bash
SUPABASE_URL=https://xxxxxxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/create-first-admin.mjs "Your Name" you@safexsolutions.com
```
This prints a temporary password. Save it — you'll use it to sign in once,
then you'll be asked to set a permanent password.

### 3.5 Run it locally
```bash
npm run dev
```
Visit `http://localhost:3000`, sign in with the email + temporary password
from step 3.4, set a new password, and you're in as Admin. From here, use
**User management** in the sidebar to create Leader and Intern accounts —
never the terminal script again.

---

## 4. Deploying to Vercel

1. Push this project to a GitHub repository (see §5 if you're new to Git).
2. Go to [vercel.com/new](https://vercel.com/new) and import that repository.
3. Vercel auto-detects Next.js — you don't need to change any build settings.
4. Under **Environment Variables**, add the same three values from
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**. In a couple of minutes you'll get a live URL like
   `safex-portal.vercel.app`.
6. (Optional) Add a custom domain under **Project Settings → Domains**.

That's it — the same schema and the first Admin account you created in §3.4
work against the live site immediately, since it's the same Supabase
project.

---

## 5. Making future changes (for non-developers)

This app follows the standard **GitHub → Vercel** workflow: whatever is on
your repository's default branch (usually `main`) is what's live.

**To make a change:**
1. Ask a developer (or an AI coding assistant) to make the change in the
   code and open a **Pull Request** on GitHub.
2. Vercel automatically builds a **preview deployment** for that pull
   request — a temporary URL where you can click around and confirm it looks
   right, without affecting the live site.
3. Once you're happy, **merge** the pull request into `main` on GitHub.
4. Vercel automatically redeploys the live site with the change — usually
   within a couple of minutes. No manual steps required.

**If the change involves the database** (e.g. a new field), the developer
will give you a small `.sql` snippet — paste it into Supabase's **SQL
Editor** and click **Run** before or right after the code deploys, depending
on what they tell you.

**Rolling back:** if a deploy causes a problem, go to your project on
Vercel → **Deployments**, find the last good one, and click **Promote to
Production**. This reverts the live site instantly while you sort out the
issue in a new pull request.

---

## 6. Security notes & honest tradeoffs

- Passwords are never stored or logged in plaintext — Supabase Auth hashes
  them, and the only place a plaintext temporary password ever appears is in
  the one-time API/script response handed to the admin who created the
  account.
- Sessions live in secure, httpOnly cookies managed by `@supabase/ssr` and
  refreshed by `middleware.ts` — not in `localStorage`.
- All privileged mutations (user create/delete/role-change) are re-validated
  server-side in `app/api/admin/**`, independent of RLS, so a bug in either
  layer alone doesn't expose an escalation path.
- All Route Handlers validate and sanitize input themselves (length limits,
  enum checks, email format) rather than trusting the client — RLS is the
  backstop, not the only check.
- **Feedback rate-limiting tradeoff:** the `feedback_weeks` table is needed
  to enforce "one submission per intern per week," and it does contain an
  `intern_id` column. It has no RLS policies granted to any client role, so
  it's unreachable through the normal API — the only theoretical way to see
  it is direct database access with the Supabase project's own credentials
  (i.e., the project owner), which is a different trust boundary than
  "an Admin or Leader using the app." This is documented rather than hidden:
  perfect anonymity and abuse-prevention are in tension, and this design
  picks a defensible middle ground.
