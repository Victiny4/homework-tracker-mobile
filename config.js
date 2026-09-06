// Flip this to true to show the sample assignment set instead of your own entries.
const USE_MOCK_DATA = false;

// ══════════════════════════════════════════════════════════════════
//  SHARED HOMEWORK LIST (optional) — powered by Supabase
// ══════════════════════════════════════════════════════════════════
// Fill in SUPABASE_URL and SUPABASE_ANON_KEY at the bottom of this file
// to turn "Add an assignment" into a SHARED list: everyone who has this
// folder, pointed at the same project, adds to and sees ONE homework
// list together, live — no login needed for them.
//
// Leave both blank (as they are by default) to keep using only this
// device's local storage. Nothing else to set up in that case.
//
// ── One-time setup — about 5 minutes, completely free ───────────────
//
// STEP 1 — Create a free Supabase account and project
//   a. Go to https://supabase.com and click "Start your project"
//   b. Sign up with any personal email or GitHub account
//      (this is separate from your school account — that's the point)
//   c. Click "New project"
//   d. Give it any name, set a database password (Supabase asks for
//      one — just save it somewhere, you won't need it again for this),
//      pick the region closest to you, then click "Create new project"
//   e. Wait about 1-2 minutes while Supabase sets it up
//
// STEP 2 — Create the assignments table
//   a. In the left sidebar, click the "SQL Editor" icon
//   b. Click "New query"
//   c. Open the file setup.sql (right next to this file), select all
//      of its text, copy it, and paste it into the query editor
//   d. Click "Run" in the bottom right
//   e. You should see "Success. No rows returned" — that means it worked
//
// STEP 3 — Turn on live updates
//   This is already handled by setup.sql — its last line
//   ("alter publication supabase_realtime add table assignments;")
//   is what turns on instant updates for everyone. As long as you ran
//   the whole file in Step 2, there's nothing else to do here.
//   (Ignore Supabase's "Database -> Replication" page in the dashboard —
//   they've repurposed it for a different, unrelated feature.)
//
// STEP 4 — Copy your project's URL and key into this file
//   a. In the left sidebar, click the gear icon for "Project Settings"
//   b. Click "API"
//   c. Find "Project URL" — copy it, paste it as SUPABASE_URL below
//      (between the quotes, e.g. 'https://abcdefgh.supabase.co')
//   d. Find "Project API keys" -> the "anon" "public" key — copy it,
//      paste it as SUPABASE_ANON_KEY below
//   e. Save this file
//
// STEP 5 — Share it with classmates
//   Send them this ENTIRE classroom-dashboard folder, not just
//   index.html — it needs config.js, app.js, styles.css, data-*.js
//   alongside it to work. Once they open index.html from that folder,
//   they're automatically pointed at the same project as you, and see
//   the same shared list.
//
// ── Security note — please read before turning this on ─────────────
// The anon key you paste below travels inside this file. setup.sql's
// rules let ANYONE who has the file read, add, edit, or delete rows —
// with no login of any kind. That's exactly what makes "everyone with
// the file, zero accounts" possible, but it also means anyone who gets
// a copy of this folder could wipe or vandalize the shared list, on
// purpose or by accident. That's an acceptable risk for a low-stakes
// class homework board — just don't reuse this pattern for anything
// you'd actually mind a stranger deleting.

const SUPABASE_URL = 'https://fklmuyjwtrwobfopnxcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbG11eWp3dHJ3b2Jmb3BueGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjQ4MDgsImV4cCI6MjEwNDI0MDgwOH0.FAHjbOXZUHjAcD8PMl21dWc5h16IFs0wvEXca7vahGw';
