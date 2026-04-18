<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/backend-Supabase-3ecf8e.svg" alt="Supabase">
</p>

<h1 align="center">
  <img width="36" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Crect x='2' y='2' width='24' height='19' rx='5' fill='%23FFE14D'/%3E%3Cpolygon points='5,21 5,27 12,21' fill='%23FFE14D'/%3E%3C/svg%3E" alt="">
  holler
</h1>

<p align="center">
  <strong>Figma-style comments for your app prototypes.</strong><br>
  One script tag. Your own Supabase backend. CLI for AI agents.
</p>

---

## What it does

Your ideas start as code now, not designs. Teams go straight to prototypes with Cursor, Claude Code, or Bolt — but you lost the ability to click anywhere and leave a comment.

Holler brings it back. Drop a `<script>` tag into any web page and your team can pin comments directly on the UI, thread replies, and resolve feedback — just like Figma, but on a live prototype. Your AI coding agent reads those same comments from the terminal and can act on them: fix the issue, reply, and resolve the thread. Same conversation, humans and agents side by side.

Comments are stored in your own [Supabase](https://supabase.com) project. You own your data. No shared servers.

---

## Quick start

### Step 1 — Set up Supabase

Create a free project at [supabase.com](https://supabase.com). From **Settings > API**, copy your **Project URL**, **anon key**, and **service role key**.

### Step 2 — Run the CLI

```bash
npx @holler-vibe/cli
```

The CLI connects to your Supabase project, creates the database tables, and gives you a **site ID**.

### Step 3 — Add the script tag

Add this before `</body>` — the UMD bundle is served from unpkg:

```html
<script
  src="https://unpkg.com/@holler-vibe/sdk/dist/holler.umd.js"
  data-supabase-url="https://your-project.supabase.co"
  data-supabase-anon-key="your-anon-key"
  data-site-id="your-site-uuid"
></script>
```

A comment button appears on your page. Click it, click anywhere, and leave feedback.

Using a bundler (React, Vue, etc.)? Install the SDK instead: `npm install @holler-vibe/sdk` — see [JavaScript API](#javascript-api) below.

### Step 4 (optional) — Set up your AI agent

Generate a `HOLLER.md` file with agent instructions pre-filled for your project:

```bash
npx @holler-vibe/cli agent-setup \
  --url "https://your-project.supabase.co" \
  --key "your-service-role-key" \
  --site-id "your-site-uuid"
```

Drop the generated `HOLLER.md` into any project root. Any AI agent (Claude Code, Cursor, etc.) working in that project can read it and immediately knows how to list comments, reply, and resolve threads from the terminal. See [AGENTS.md](./AGENTS.md) for the full agent reference.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close composer or exit comment mode |
| `Alt+C` | Hide/show the toolbar |
| `Ctrl+Enter` / `Cmd+Enter` | Submit a comment or reply |

---

## AI agent CLI

The CLI lets any coding agent interact with comments without a browser.

**List open comments:**
```bash
npx @holler-vibe/cli list-comments \
  --url "..." --key "..." --site-id "..." \
  --status unresolved --json
```

**Reply to a comment:**
```bash
npx @holler-vibe/cli comment \
  --parent-id "comment-uuid" \
  --body "Fixed the button size" \
  --author "Claude" --json
```

**Resolve a comment:**
```bash
npx @holler-vibe/cli resolve \
  --comment-id "comment-uuid" --json
```

**Delete a comment (soft delete):**
```bash
npx @holler-vibe/cli delete-comment \
  --comment-id "comment-uuid" --json
```

### Environment variables

Set these to skip passing `--url`, `--key`, and `--site-id` on every command:

```bash
export HOLLER_URL="https://your-project.supabase.co"
export HOLLER_KEY="your-service-role-key"
export HOLLER_SITE_ID="your-site-uuid"
```

---

## Configuration

Options via `data-*` attributes on the script tag or passed to `initHoller()`:

| Option | Attribute | Default | Description |
|--------|-----------|---------|-------------|
| `supabaseUrl` | `data-supabase-url` | *required* | Supabase project URL |
| `supabaseAnonKey` | `data-supabase-anon-key` | *required* | Supabase anon key (safe for client) |
| `siteId` | `data-site-id` | *required* | Site UUID from the CLI |
| `theme` | `data-theme` | `auto` | `light`, `dark`, or `auto` |
| `position` | `data-position` | `bottom-center` | `bottom-center`, `bottom-right`, `bottom-left` |
| `emoji` | `data-emoji` | `💭` | Toolbar button emoji |

### JavaScript API

```ts
import { initHoller } from '@holler-vibe/sdk'

const holler = initHoller({
  supabaseUrl: '...',
  supabaseAnonKey: '...',
  siteId: '...',
})

holler.toggle()              // Enter/exit comment mode
holler.hide() / holler.show() // Toggle toolbar visibility
holler.setPinsVisible(false)  // Hide pins
holler.setPagePath('/new')    // Manual SPA route sync
holler.getComments()          // Fetch comments
holler.destroy()              // Clean up everything
```

### Multiple sites

Each prototype gets its own site ID. Comments stay isolated per site:

```bash
npx @holler-vibe/cli add-site --name "My Other App" --json
```

---

## How it works

- **SDK** — Vanilla TypeScript, no framework dependencies. UI renders in a Shadow DOM so styles never conflict with your app. Pins overlay the page content directly. Uses Supabase Realtime for live updates across browsers.
- **CLI** — Node.js tool that talks to Supabase with the service role key. Supports interactive prompts and non-interactive `--json` mode for agents.
- **Identity** — Each user gets a deterministic animal emoji and color based on their auth ID. No two users look the same.
- **Element context** — When placing a comment, the SDK captures the CSS selector, tag, text content, and page region of the clicked element. Agents use this to understand what the feedback is about without seeing the page.
- **SPA support** — Detects route changes via `popstate` + polling. No history patching, no conflicts with analytics tools.
- **Security** — Row Level Security on all tables. The anon key (in the script tag) can only do what RLS allows. The service role key (CLI only) is never in client code.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Toolbar doesn't appear | Check Network tab — is `holler.umd.js` loading (200)? |
| `typeof initHoller` is `undefined` | Load the UMD file via `<script>`, not as an ESM import |
| "Invalid API key" | Use the **anon** key in the script tag, not the service role key |
| Magic link email doesn't arrive | Check Supabase > Authentication > Providers > Email is enabled |
| Magic link goes to wrong URL | Set Site URL + Redirect URLs in Supabase > Authentication > URL Configuration |
| "relation does not exist" | Migration SQL hasn't been run — paste it into the Supabase SQL editor |

## License

[MIT](./LICENSE)
