<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/backend-Supabase-3ecf8e.svg" alt="Supabase">
</p>

<h1 align="center">
  <br>
  <img width="40" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Crect x='2' y='2' width='24' height='19' rx='5' fill='%23FFE14D'/%3E%3Cpolygon points='5,21 5,27 12,21' fill='%23FFE14D'/%3E%3C/svg%3E" alt="Holler">
  <br>
  Holler
</h1>

<p align="center">
  <strong>Figma-style comments for any web app.</strong><br>
  One script tag. Your own Supabase backend. CLI for AI agents.
</p>

---

## What it does

Holler adds a comment overlay to any web page. Click anywhere to drop a pin, leave feedback, reply in threads, and resolve issues. Comments are stored in your own Supabase project — you own your data.

Your AI coding agent (Claude Code, Cursor, etc.) can read comments, reply, and resolve them from the terminal via the CLI. Each comment includes the CSS selector and text of the element that was clicked, so the agent knows exactly what to fix.

## Quick start

### 1. Set up Supabase (once)

Create a free project at [supabase.com](https://supabase.com). Then run:

```bash
npx @holler/init
```

This walks you through connecting to your Supabase project and creating the database tables. It takes about 2 minutes.

> **Not published to npm yet.** For now, clone this repo and run `pnpm install && pnpm build`, then use `node packages/cli/dist/index.js` instead of `npx`.

### 2. Add to your page

Copy `packages/sdk/dist/holler.umd.js` into your project and add before `</body>`:

```html
<script
  src="./holler.umd.js"
  data-supabase-url="https://your-project.supabase.co"
  data-supabase-anon-key="your-anon-key"
  data-site-id="your-site-uuid"
></script>
```

That's it. A comment button appears on your page.

### 3. Configure auth redirects

In Supabase, go to **Authentication > URL Configuration** and add your app's URL (e.g. `http://localhost:5173`) to both **Site URL** and **Redirect URLs**. This lets magic-link sign-in work.

## Using with an AI agent

The CLI lets any AI agent read, write, and resolve comments without a browser.

**List open comments:**
```bash
node packages/cli/dist/index.js list-comments \
  --url "https://your-project.supabase.co" \
  --key "your-service-role-key" \
  --site-id "your-site-uuid" \
  --status unresolved --json
```

**Reply to a comment:**
```bash
node packages/cli/dist/index.js comment \
  --url "..." --key "..." --site-id "..." \
  --parent-id "comment-uuid" \
  --body "Fixed the button size" \
  --author "Claude" --json
```

**Resolve a comment:**
```bash
node packages/cli/dist/index.js resolve \
  --url "..." --key "..." \
  --comment-id "comment-uuid" --json
```

**Generate agent instructions for a project:**
```bash
node packages/cli/dist/index.js agent-setup \
  --url "..." --key "..." --site-id "..."
```

This writes a `HOLLER.md` file you drop into any project root. Any agent working there can read it and knows exactly how to interact with comments. See [AGENTS.md](./AGENTS.md) for full details.

### Environment variables

Set these to avoid passing flags every time:

```bash
export HOLLER_URL="https://your-project.supabase.co"
export HOLLER_KEY="your-service-role-key"
export HOLLER_SITE_ID="your-site-uuid"
```

## Configuration

Options via `data-*` attributes or `initHoller()`:

| Option | Attribute | Default | Description |
|--------|-----------|---------|-------------|
| `supabaseUrl` | `data-supabase-url` | *required* | Supabase project URL |
| `supabaseAnonKey` | `data-supabase-anon-key` | *required* | Supabase anon key (safe for client) |
| `siteId` | `data-site-id` | *required* | Site UUID from `add-site` |
| `theme` | `data-theme` | `auto` | `light`, `dark`, or `auto` |
| `position` | `data-position` | `bottom-center` | `bottom-center`, `bottom-right`, `bottom-left` |
| `emoji` | `data-emoji` | `💭` | Toolbar button emoji |

### JavaScript API

```ts
import { initHoller } from '@holler/sdk'

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

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close composer or exit comment mode |
| `Alt+C` | Hide/show toolbar |
| `Ctrl+Enter` | Submit comment or reply |

## Multiple sites

Each prototype gets its own site ID. Comments stay isolated per site. Add more sites without re-running the migration:

```bash
node packages/cli/dist/index.js add-site --name "My Other App" --json
```

## How it works

- **SDK**: Vanilla TypeScript, no framework dependencies. Renders UI in a Shadow DOM so styles never conflict with your app. Pins render outside the shadow root so they align with page content. Uses Supabase Realtime for live updates.
- **CLI**: Node.js tool that talks directly to Supabase with the service role key. Supports interactive and non-interactive (agent-friendly `--json`) modes.
- **Database**: Three tables (`holler_sites`, `holler_comments`, `holler_reactions`) with Row Level Security. The anon key can only do what RLS allows. The service role key (CLI only, never in client code) bypasses RLS for admin operations.
- **Identity**: Each user gets a deterministic animal emoji + color based on their auth ID. No two users look the same.
- **SPA support**: Detects route changes via `popstate` + polling (no history patching, no conflicts with analytics tools).
- **Element context**: When placing a comment, the SDK captures the CSS selector, tag, text content, and page region of the clicked element. Agents use this to understand what the feedback is about.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Toolbar doesn't appear | Check browser Network tab — is `holler.umd.js` loading (200)? |
| `typeof initHoller` is `undefined` | Make sure you're loading the UMD file via `<script>`, not importing the ESM |
| "Invalid API key" | You're using the service role key in the script tag — use the anon key |
| Magic link email doesn't arrive | Enable Email provider in Supabase > Authentication > Providers |
| Magic link redirects to wrong URL | Set Site URL + Redirect URLs in Authentication > URL Configuration |
| "relation does not exist" | The migration SQL hasn't been run — paste it into the Supabase SQL editor |
| Agent replies don't appear | Update to latest CLI — older versions posted replies with wrong `page_path` |

## License

[MIT](./LICENSE)
