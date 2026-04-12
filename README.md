![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![Supabase](https://img.shields.io/badge/backend-Supabase-3ecf8e.svg)

# 💭 Holler

**Drop-in, Figma-style commenting for any web app. Bring your own Supabase.**

Holler layers a commenting overlay on top of any web page — click anywhere to leave a pin, thread replies, and resolve feedback. It's designed for prototypes, staging sites, and internal tools where you want lightweight, contextual feedback without building a whole system.

Each user connects their own [Supabase](https://supabase.com) project as the backend. You own your data. No shared servers. No accounts to create with us.

---

## How it works

```
┌─────────────────────────────────────────────────┐
│  Your web app (any page, any framework)         │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  <script> tag or npm import               │  │
│  │  Holler SDK (~60KB gzipped UMD)      │  │
│  │                                           │  │
│  │  • Floating toolbar (💭 button)           │  │
│  │  • Pin placement with crosshair           │  │
│  │  • Threaded replies                       │  │
│  │  • Real-time updates via Supabase         │  │
│  │  • Magic-link auth (email sign-in)        │  │
│  │  • Deterministic animal avatars 🐼🦊🐻   │  │
│  └────────────────────┬──────────────────────┘  │
│                       │                          │
└───────────────────────┼──────────────────────────┘
                        │ HTTPS + WebSocket
                        ▼
┌───────────────────────────────────────────────────┐
│  Your Supabase Project                            │
│  • Postgres (comments, sites, reactions tables)   │
│  • Auth (magic link email)                        │
│  • Real-time (live comment updates)               │
│  • RLS (row-level security policies)              │
└───────────────────────────────────────────────────┘
```

---

## Features

- **Zero config for the host app** — one `<script>` tag, no framework required
- **Figma-style UX** — click to pin, thread replies, resolve threads
- **Real-time** — comments appear instantly across all open browsers
- **SPA-aware** — automatically detects route changes (History API, popstate)
- **Isolated** — Shadow DOM for chrome, hardened CSS for pins, no conflicts with your app's styles or scripts
- **Cute identity system** — each user gets a deterministic animal emoji (🐼🦊🐨🐯) + color based on their auth ID. No two users look the same.
- **Keyboard shortcuts** — `Esc` exits comment mode, `Alt+C` hides/shows the toolbar
- **Agent-friendly** — CLI supports `--json` output for non-interactive setup by AI coding agents
- **Bring your own backend** — your Supabase project, your data, your RLS policies

---

## Quick start

### Prerequisites

You need a [Supabase](https://supabase.com) project (free tier works). From your project's **Settings → API** page, grab:
- **Project URL** — `https://abcdefgh.supabase.co`
- **anon / public key** — starts with `eyJ...` (safe to use in client code)
- **service_role key** — starts with `eyJ...` (used once by the CLI, never stored)

### Step 1: Set up the database (once per Supabase project)

```bash
git clone https://github.com/YOUR_USERNAME/holler.git
cd holler
pnpm install && pnpm build
node packages/cli/dist/index.js
```

The CLI will:
1. Ask for your Supabase URL and service role key
2. Generate the migration SQL file
3. Point you to the Supabase SQL editor to paste and run it (one-time step)
4. Ask to create your first site
5. Print a site ID and a ready-to-use `<script>` snippet

### Step 2: Add to your app

**Option A: Script tag (any HTML page, no build step)**

Copy `packages/sdk/dist/holler.umd.js` into your project, then add before `</body>`:

```html
<script
  src="./holler.umd.js"
  data-supabase-url="https://abcdefgh.supabase.co"
  data-supabase-anon-key="eyJ..."
  data-site-id="your-site-uuid"
></script>
```

**Option B: npm import (React, Vue, Svelte, etc.)**

```bash
npm install @holler/sdk
```

```ts
import { initHoller } from '@holler/sdk'

const vc = initHoller({
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'eyJ...',
  siteId: 'your-site-uuid',
})

// Later, to tear down:
vc.destroy()
```

> **Important:** Use the **anon / public** key, never the service role key, in client-side code.

### Step 3: Configure auth redirect

In Supabase → **Authentication → URL Configuration**:
- Set **Site URL** to your app's URL (e.g. `http://localhost:5173`)
- Add the same URL under **Redirect URLs**

This is required for magic-link sign-in to redirect back correctly.

---

## Adding more sites

Each prototype/project gets its own site ID. Comments are isolated per site. To add a new site to an existing Supabase project:

```bash
node packages/cli/dist/index.js add-site --name "My Other Prototype"
```

Or non-interactively (useful for scripts and agents):

```bash
node packages/cli/dist/index.js add-site \
  --name "My Other Prototype" \
  --url "https://abcdefgh.supabase.co" \
  --service-key "eyJ..." \
  --json
```

---

## Configuration

All options can be set via `data-*` attributes on the script tag or passed to `initHoller()`:

| Option | Script attribute | Default | Description |
|--------|-----------------|---------|-------------|
| `supabaseUrl` | `data-supabase-url` | *required* | Your Supabase project URL |
| `supabaseAnonKey` | `data-supabase-anon-key` | *required* | Your Supabase anon/public key |
| `siteId` | `data-site-id` | *required* | UUID from `add-site` |
| `theme` | `data-theme` | `'auto'` | `'light'`, `'dark'`, or `'auto'` (follows system preference) |
| `position` | `data-position` | `'bottom-center'` | `'bottom-center'`, `'bottom-right'`, or `'bottom-left'` |
| `emoji` | `data-emoji` | `'💭'` | Emoji shown on the toolbar button |
| `requireAuth` | — | `true` | If false, allows anonymous viewing |
| `debug` | `data-debug` | `false` | Logs SDK events to the console |
| `toggleShortcut` | — | `Alt+C` | Keyboard shortcut to hide/show toolbar. Pass `false` to disable. |

### Instance API

```ts
const vc = initHoller({ ... })

vc.toggle()              // Enter/exit comment mode
vc.hide()                // Hide the toolbar
vc.show()                // Show the toolbar
vc.setPinsVisible(false) // Hide all pins
vc.setPagePath('/new')   // Manually set the page path (for non-standard SPA routing)
vc.getComments()         // Fetch all comments for current page
vc.destroy()             // Remove all UI and clean up listeners
```

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close composer, or exit comment mode |
| `Alt+C` | Hide/show the toolbar (configurable) |

---

## Architecture

### Monorepo structure

```
holler/
├── packages/
│   ├── sdk/          # Core SDK (TypeScript → UMD + ESM via Vite)
│   │   ├── src/
│   │   │   ├── index.ts          # Init, auto-init, public API
│   │   │   ├── client.ts         # Supabase client wrapper
│   │   │   ├── auth.ts           # Magic-link auth, session management
│   │   │   ├── comments.ts       # CRUD + real-time subscriptions
│   │   │   ├── positioning.ts    # %-based pin placement
│   │   │   ├── identity.ts       # Deterministic emoji + color per user
│   │   │   ├── types.ts          # Public TypeScript interfaces
│   │   │   └── ui/
│   │   │       ├── overlay.ts    # Shadow DOM host + tint overlay
│   │   │       ├── toolbar.ts    # Floating 💭 button
│   │   │       ├── pin.ts        # Comment pin markers
│   │   │       ├── thread.ts     # Thread popover (replies, resolve)
│   │   │       ├── composer.ts   # New comment input
│   │   │       ├── menu.ts       # Toolbar context menu
│   │   │       ├── unresolved.ts # Unresolved comments list
│   │   │       ├── auth-modal.ts # Sign-in modal
│   │   │       ├── styles.ts     # All CSS (shadow DOM + pin layer)
│   │   │       └── dom.ts        # Tiny DOM helpers
│   │   └── dist/
│   │       ├── holler.umd.js   # Self-contained (Supabase bundled)
│   │       └── holler.esm.js   # Tree-shakeable (Supabase external)
│   │
│   └── cli/          # Setup CLI (TypeScript → Node via tsup)
│       └── src/
│           ├── index.ts            # init + add-site commands
│           ├── migrate.ts          # SQL migration runner
│           ├── prompts.ts          # Interactive prompts
│           └── templates/
│               └── migration.sql   # Full database schema
│
├── AGENTS.md         # Agent-specific setup instructions
├── LICENSE           # MIT
└── README.md         # This file
```

### How isolation works

- **Shadow DOM** — the toolbar, thread panel, composer, auth modal, and menu all render inside a shadow root. Host page CSS cannot affect them.
- **Pin layer** — pins render outside the shadow DOM (so they can overlay page content precisely) but use `[data-holler-pins]` attribute selectors with `!important` on structural properties to resist host CSS.
- **Tint overlay** — during comment mode, a transparent overlay sits above the page but below pins and chrome. Clicks on buttons/links are naturally blocked (they never receive the event). No `stopPropagation` gymnastics.
- **No history patching** — SPA route detection uses `popstate` + lightweight polling instead of monkey-patching `history.pushState`. Zero conflicts with analytics libraries.
- **Double-init guard** — calling `initHoller()` twice auto-destroys the previous instance.

### Database schema

The migration creates three tables:
- `holler_sites` — one row per registered prototype
- `holler_comments` — pins with x/y percentages, threading, resolve status
- `holler_reactions` — emoji reactions (Phase 2)

Plus indexes, RLS policies (public read, authenticated write), and real-time publication.

---

## Designed for AI agents

Holler is built to be set up and configured by AI coding agents (Claude, Cursor, Copilot, etc.) with minimal friction.

### How an agent adds Holler to a new project

**If the Supabase project + migration is already set up** (the common case — you set up Supabase once, then add commenting to many prototypes):

1. **Create a new site** (non-interactive, JSON output):
   ```bash
   node /path/to/holler/packages/cli/dist/index.js add-site \
     --name "Client Dashboard" \
     --url "https://abcdefgh.supabase.co" \
     --service-key "eyJ..." \
     --json
   ```
   Returns:
   ```json
   {
     "site_id": "a1b2c3d4-...",
     "snippet": "<script src=\"./holler.umd.js\" ...></script>",
     "local_umd_path": "packages/sdk/dist/holler.umd.js"
   }
   ```

2. **Copy the UMD file** into the target project's `public/` folder (or next to its HTML).

3. **Insert the snippet** before `</body>` in the target project's HTML, replacing `YOUR_ANON_KEY` with the actual anon key.

That's it. Three steps, all automatable, no interactive prompts.

### What to put in your agent's system prompt or project instructions

If you want an agent to be able to add Holler to any of your projects, include something like this in your project's `CLAUDE.md`, `.cursorrules`, or equivalent:

```markdown
## Holler (commenting overlay)

To add Figma-style commenting to this project:

1. Create a new site:
   node /absolute/path/to/holler/packages/cli/dist/index.js add-site \
     --name "THIS_PROJECT_NAME" \
     --url "https://abcdefgh.supabase.co" \
     --service-key "eyJ_SERVICE_ROLE_KEY" \
     --json

2. Copy holler.umd.js from /absolute/path/to/holler/packages/sdk/dist/
   into this project's public/ folder.

3. Add before </body> in index.html:
   <script
     src="/holler.umd.js"
     data-supabase-url="https://abcdefgh.supabase.co"
     data-supabase-anon-key="eyJ_ANON_KEY"
     data-site-id="SITE_ID_FROM_STEP_1"
   ></script>

Supabase credentials:
  - URL: https://abcdefgh.supabase.co
  - Anon key: eyJ... (safe for client)
  - Service role key: eyJ... (CLI only, never in client code)
```

> **Security note:** Including the service role key in agent instructions means any agent with access to those instructions can create new sites. This is by design — creating a site is a low-risk operation (it just inserts a row into `holler_sites`). The service role key cannot read or modify comments beyond what RLS allows, and the key is never embedded in client-side code.

### See also

- [`AGENTS.md`](./AGENTS.md) — condensed agent-facing setup instructions (also published to npm)

---

## Manual setup (step by step)

For humans who prefer to do things themselves without an agent:

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Pick a name, set a database password, choose a region
3. Wait for provisioning (~1 minute)
4. Go to **Settings → API** and copy the **Project URL**, **anon key**, and **service_role key**

### 2. Run the CLI

```bash
cd holler
node packages/cli/dist/index.js
```

Enter your Supabase URL and service role key when prompted. The CLI generates a `holler-migration.sql` file and links you to your Supabase SQL editor.

### 3. Run the migration

1. Open the SQL editor link the CLI printed
2. Copy the contents of `holler-migration.sql` → paste → click **Run**
3. You should see "Success. No rows returned."
4. Go back to the terminal and press Enter

### 4. Create a site

The CLI asks if you want to create your first site. Say yes, give it a name, and it prints a site ID.

### 5. Add the script tag

Copy `packages/sdk/dist/holler.umd.js` into your project. Add the `<script>` tag from the CLI output before `</body>`, replacing `YOUR_ANON_KEY` with your anon key.

### 6. Configure auth

In Supabase → **Authentication → URL Configuration**, set the **Site URL** and add it to **Redirect URLs**.

### 7. Test it

1. Open your page in a browser
2. Click the 💭 button → **Start commenting**
3. Click anywhere → sign in via magic link → post a comment
4. Open the page in another browser → comments appear in real time

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Toolbar doesn't appear | SDK file not loading (404 or wrong path) | Check Network tab in DevTools for the .js file |
| `typeof initHoller` is `undefined` | Script loaded but didn't execute | Make sure you're loading the UMD file, not the ESM file, via `<script>` |
| "Invalid API key" in console | Using the wrong key | Use the **anon** key, not the service role key |
| Magic link email never arrives | Auth not configured | Check Supabase → Authentication → Providers → Email is enabled |
| Magic link goes to wrong URL | Redirect URL not set | Set Site URL + Redirect URLs in Authentication → URL Configuration |
| "relation does not exist" | Migration wasn't run | Paste `holler-migration.sql` into the SQL editor and run it |
| Comments don't appear in real time | Realtime not enabled for the table | Check Database → Replication → `holler_comments` is in the publication |
| Pins don't show up after navigation (SPA) | Route change not detected | The SDK polls `location.pathname` every 300ms — if you use hash routing, call `vc.setPagePath(path)` manually |
| Two instances appear | `initHoller()` called twice | The SDK auto-destroys the previous instance, but check for duplicate `<script>` tags |

---

## Roadmap

- [x] Phase 1: Core commenting (pins, threads, real-time, auth, CLI)
- [ ] Phase 2: React wrapper, dark mode toggle, reactions, keyboard navigation
- [ ] Phase 3: MCP server, comment export, webhooks

---

## License

[MIT](./LICENSE)
