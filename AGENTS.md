# Holler — Agent Setup Instructions

All commands below use the CLI via `npx @holler-vibe/cli`. Add `--json` to
any command for machine-readable output.

Shorthand for examples below:
```
CLI="npx @holler-vibe/cli"
URL="https://xxx.supabase.co"
KEY="eyJ_SERVICE_ROLE_KEY"
SITE="your-site-uuid"
```

## Prerequisites
The user must have a Supabase project. If they don't have one:
1. Direct them to https://supabase.com to create a free project
2. They need the project URL and anon key from Settings > API

## First-Time Setup (run once per Supabase project)
```bash
$CLI --url "$URL" --key "$KEY" --name "My Site" --json
```
Follow the prompts (or pass all flags for non-interactive mode). This creates
the database tables and the first site.

## Adding Comments to a Prototype

### Option A: Script tag (any HTML page)
Add before `</body>` — the UMD bundle is served from unpkg:
```html
<script
  src="https://unpkg.com/@holler-vibe/sdk/dist/holler.umd.js"
  data-supabase-url="SUPABASE_URL"
  data-supabase-anon-key="SUPABASE_ANON_KEY"
  data-site-id="SITE_ID"
></script>
```

### Option B: npm package (React, Vue, etc.)
```bash
npm install @holler-vibe/sdk
```
```js
import { initHoller } from '@holler-vibe/sdk'
initHoller({
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  siteId: process.env.VITE_VIBECOMMENT_SITE_ID,
})
```

## Creating Additional Sites
```bash
$CLI add-site --name "New Prototype" --url "$URL" --key "$KEY" --json
```
Returns JSON with `site_id` and a ready-to-insert `snippet`.

## Listing Comments

View all comments across pages for a site:
```bash
$CLI list-comments --url "$URL" --key "$KEY" --site-id "$SITE" --json
```

Filter by page path:
```bash
$CLI list-comments --url "$URL" --key "$KEY" --site-id "$SITE" --page "/" --json
```

Filter by status (`resolved`, `unresolved`, or `all`):
```bash
$CLI list-comments --url "$URL" --key "$KEY" --site-id "$SITE" --status unresolved --json
```

JSON output includes:
```json
{
  "total": 12,
  "top_level": 5,
  "replies": 7,
  "unresolved": 3,
  "resolved": 2,
  "pages": {
    "/": {
      "total": 8,
      "threads": [
        {
          "id": "uuid",
          "body": "The header is misaligned",
          "author": "Nathan",
          "resolved": false,
          "x_percent": 45.2,
          "y_percent": 3.1,
          "reply_count": 2,
          "replies": [
            { "id": "uuid", "body": "Fixed in latest push", "author": "AI Agent" }
          ]
        }
      ]
    }
  }
}
```

## Resolving Comments

Resolve a comment by ID:
```bash
$CLI resolve --url "$URL" --key "$KEY" --comment-id "uuid-here" --json
```

Unresolve:
```bash
$CLI resolve --url "$URL" --key "$KEY" --comment-id "uuid-here" --unresolve --json
```

## Leaving Comments as an Agent

Post a comment without needing an auth account. The service role key bypasses
RLS, and the comment is attributed to whatever `--author` name you provide.

```bash
$CLI comment \
  --url "$URL" --key "$KEY" --site-id "$SITE" \
  --page "/" \
  --body "The button color doesn't match the design spec" \
  --x 72 --y 34 \
  --author "Claude" \
  --json
```

Reply to an existing thread:
```bash
$CLI comment \
  --url "$URL" --key "$KEY" --site-id "$SITE" \
  --page "/" \
  --body "Fixed — updated the color to match Figma" \
  --parent-id "uuid-of-parent-comment" \
  --author "Claude" \
  --json
```

Flags:
- `--page` — the page path (default: `/`)
- `--x`, `--y` — position as percentages of the page (default: 50, 5 = top center)
- `--author` — display name (default: `"AI Agent"`)
- `--parent-id` — reply to an existing thread

The comment appears as a pin in real time for anyone viewing the page in a
browser with the SDK loaded. The identity system assigns the author a
deterministic emoji + color based on the `--author` name.

## Typical Agent Workflow

1. **User reports a bug** via a Holler pin
2. Agent reads comments: `list-comments --status unresolved --json`
3. Agent fixes the code
4. Agent replies to the thread: `comment --parent-id "..." --body "Fixed in commit abc123" --author "Claude"`
5. Agent resolves the comment: `resolve --comment-id "..."`

## Environment Variables
- `SUPABASE_URL`: The project URL from Supabase dashboard
- `SUPABASE_ANON_KEY`: The anon/public key (safe to expose in client)
- `VIBECOMMENT_SITE_ID`: UUID for this specific prototype
