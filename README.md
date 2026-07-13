# SafeX Intern Management Portal

A full-stack internal tool built for SafeX Solutions to manage interns, group leaders, weekly tasks, and anonymous feedback. Every permission is enforced in the database itself, not just hidden in the UI.

**Live app:** https://safexinterns-five.vercel.app

**Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Row Level Security), deployed on Vercel.

---

## What it does

Three roles, each with a genuinely different experience rather than the same screen with buttons hidden:

- **Admin** creates and manages every user, group, and task company-wide, and views aggregated feedback across all groups.
- **Group Leader** manages tasks for their own group only, and can assign work to individual interns or to the whole group at once.
- **Intern** sees their own assigned tasks, updates their own progress, and can submit anonymous weekly feedback about their group leader.

## How access control actually works

Every table that matters has Row Level Security enabled, and the policies in `supabase/schema.sql` are the real gate, not the app code. A leader who opens dev tools and queries `tasks` directly still only gets their own group's rows. An intern's task update still gets rejected at the database level if they touch anything besides status or progress.

Feedback anonymity is structural: the `feedback` table has no author column at all, so a submission cannot be traced back to an intern by anyone, including an admin with full table access.

## Notable design decisions

- **Group tasks are linked, not duplicated.** Assigning a task to a whole group creates one row per intern, but every copy shares a `batch_id`, so the UI shows one task with an "N/M complete" indicator, and editing the deadline once updates every copy.
- **Auth checks are request-memoized.** A single page load used to independently re-verify the signed-in user two to three times. `getCurrentProfile()` in `lib/supabase/server.ts` uses React's `cache()` so that check happens once per request instead.
- **Deleting a user never gets blocked by their history.** Tasks they created and notes they wrote survive account deletion; the reference just becomes null instead of Postgres refusing the delete.

## Bugs I found and fixed after launch

Getting the first version working was the easy part. The more useful part was going back in after real usage surfaced problems:

- Interns couldn't see their own group leader's name, traced to a database rule that only let leaders and admins see other profiles. Fixed by allowing anyone to see their own group's members, and no one outside it.
- Group task assignments created disconnected duplicates instead of one linked task, so editing one didn't update the rest. Fixed by linking every copy of a group assignment together.
- The mobile navigation menu overlapped page content on phones. Traced to how it was nested inside an element using a blur effect, which broke its full-screen positioning. Fixed by restructuring how it renders.
- Deleting a user account was blocked whenever they had ever created a task, since nothing was allowed to reference a deleted account. Fixed so deletion always succeeds and their past work simply stays in place, unattributed.

## Setup

1. Create a Supabase project. In SQL Editor, run the full contents of `supabase/schema.sql` (safe to re-run).
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL, anon key, and service role key.
3. `npm install && npm run dev`
4. Bootstrap the first admin:
```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-first-admin.mjs "Name" you@safexsolutions.com
```
5. Sign in with the printed temporary password, set a real one, and use User management to create everyone else.

## Deploying

Push to GitHub, import the repo on Vercel, add the same three environment variables, and deploy. Every future change flows through a pull request: Vercel builds a preview automatically, merging to `main` ships it live, and any failed deploy can be rolled back instantly from Vercel's Deployments tab.

---

Built by [Abisha Faisal](https://github.com/abisha-faisal) as part of an internship at SafeX Solutions.
