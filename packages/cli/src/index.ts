import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import pc from 'picocolors'
import {
  promptCredentials,
  promptSiteName,
  confirmCreateFirstSite,
  saveRcFile,
  readRcFile,
} from './prompts.js'
import { runMigration } from './migrate.js'

// ──────────────────────────────────────────────────
// Arg parsing
// ──────────────────────────────────────────────────

type Command = 'init' | 'add-site' | 'list-comments' | 'resolve' | 'comment' | 'agent-setup'

interface ParsedArgs {
  command: Command
  name?: string
  url?: string
  serviceKey?: string
  json?: boolean
  // list-comments filters
  siteId?: string
  page?: string
  status?: 'resolved' | 'unresolved' | 'all'
  // resolve
  commentId?: string
  unresolve?: boolean
  // comment
  body?: string
  x?: number
  y?: number
  author?: string
  parentId?: string
}

const COMMANDS: Command[] = ['init', 'add-site', 'list-comments', 'resolve', 'comment', 'agent-setup']

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  let command: Command = 'init'

  if (args[0] && COMMANDS.includes(args[0] as Command)) {
    command = args[0] as Command
  }

  const flags: ParsedArgs = { command }
  const start = command === 'init' ? 0 : 1

  for (let i = start; i < args.length; i++) {
    const flag = args[i]
    const next = args[i + 1]
    if (flag === '--name' && next) { flags.name = next; i++ }
    else if (flag === '--url' && next) { flags.url = next; i++ }
    else if ((flag === '--service-key' || flag === '--key') && next) { flags.serviceKey = next; i++ }
    else if (flag === '--site-id' && next) { flags.siteId = next; i++ }
    else if (flag === '--page' && next) { flags.page = next; i++ }
    else if (flag === '--status' && next) { flags.status = next as ParsedArgs['status']; i++ }
    else if (flag === '--comment-id' && next) { flags.commentId = next; i++ }
    else if (flag === '--unresolve') { flags.unresolve = true }
    else if (flag === '--body' && next) { flags.body = next; i++ }
    else if (flag === '--x' && next) { flags.x = parseFloat(next); i++ }
    else if (flag === '--y' && next) { flags.y = parseFloat(next); i++ }
    else if (flag === '--author' && next) { flags.author = next; i++ }
    else if (flag === '--parent-id' && next) { flags.parentId = next; i++ }
    else if (flag === '--json') { flags.json = true }
  }

  // Fall back to environment variables for credentials
  flags.url = flags.url ?? process.env.HOLLER_URL
  flags.serviceKey = flags.serviceKey ?? process.env.HOLLER_KEY
  flags.siteId = flags.siteId ?? process.env.HOLLER_SITE_ID

  return flags
}

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function header(): void {
  console.log('')
  console.log(pc.bold('  Holler Setup'))
  console.log('  ─────────────────')
  console.log('')
}

function decodeKeyRole(key: string): string | null {
  try {
    const payload = JSON.parse(atob(key.split('.')[1]))
    return (payload.role as string) ?? null
  } catch {
    return null
  }
}

function makeClient(url: string, serviceKey: string): SupabaseClient {
  const role = decodeKeyRole(serviceKey)
  if (role === 'anon') {
    console.error('')
    console.error(pc.red('  ✗ You passed the anon/public key, not the service role key.'))
    console.error('')
    console.error('  The CLI needs the service_role key to create tables and sites.')
    console.error('  In Supabase → Settings → API, it\'s the one labeled:')
    console.error(pc.bold('    service_role  secret'))
    console.error('')
    process.exit(1)
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function requireFlags(flags: ParsedArgs, ...names: (keyof ParsedArgs)[]): void {
  for (const name of names) {
    if (!flags[name]) {
      throw new Error(`Missing required flag: --${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`)
    }
  }
}

async function createSite(
  client: SupabaseClient,
  name: string,
): Promise<{ id: string; name: string }> {
  const { data, error } = await client
    .from('holler_sites')
    .insert({ name })
    .select('id, name')
    .single()

  if (error) throw new Error(`Failed to create site: ${error.message}`)
  return data as { id: string; name: string }
}

function snippetText(supabaseUrl: string, siteId: string): string {
  return `<script
  src="./holler.umd.js"
  data-supabase-url="${supabaseUrl}"
  data-supabase-anon-key="YOUR_ANON_KEY"
  data-site-id="${siteId}"
></script>`
}

function printSnippet(supabaseUrl: string, siteId: string): void {
  console.log('')
  console.log('  ─────────────────')
  console.log('  Add this to your prototype:')
  console.log('')
  console.log(
    pc.yellow('  [!] @holler/sdk is NOT yet published to npm.'),
  )
  console.log(
    pc.yellow('      Copy the built UMD file into your prototype:'),
  )
  console.log('')
  console.log(pc.cyan('      ' + snippetText(supabaseUrl, siteId).replace(/\n/g, '\n      ')))
  console.log('')
  console.log(pc.dim('      (Copy from: packages/sdk/dist/holler.umd.js in this repo.)'))
  console.log('')
  console.log(
    pc.yellow('  Reminder: use your Supabase ANON key above, NOT the service role key.'),
  )
  console.log('')
}

function printSiteJson(supabaseUrl: string, site: { id: string; name: string }): void {
  console.log(JSON.stringify({
    site_id: site.id,
    site_name: site.name,
    supabase_url: supabaseUrl,
    snippet: snippetText(supabaseUrl, site.id),
    local_umd_path: 'packages/sdk/dist/holler.umd.js',
    instructions: [
      'Copy holler.umd.js into your prototype.',
      'Replace YOUR_ANON_KEY with the anon/public key from Supabase Settings > API.',
      'Add the <script> tag before </body> in your HTML.',
    ],
  }, null, 2))
}

// ──────────────────────────────────────────────────
// Commands
// ──────────────────────────────────────────────────

async function runInit(flags: ParsedArgs): Promise<void> {
  const isNonInteractive = !!(flags.url && flags.serviceKey)
  if (!isNonInteractive) header()

  const creds = isNonInteractive
    ? { url: flags.url!, serviceRoleKey: flags.serviceKey! }
    : await promptCredentials()

  const client = makeClient(creds.url, creds.serviceRoleKey)

  if (!isNonInteractive) {
    console.log('')
    console.log('  Running migrations...')
  }
  await runMigration(client, creds.url)
  if (!isNonInteractive) {
    console.log(pc.green('  ✓ Schema ready'))
    console.log('')
  }
  await saveRcFile(creds.url)

  const shouldCreate = isNonInteractive ? !!flags.name : await confirmCreateFirstSite()
  if (shouldCreate) {
    const name = flags.name ?? (isNonInteractive ? 'Default Site' : await promptSiteName())
    const site = await createSite(client, name)
    if (flags.json) {
      printSiteJson(creds.url, site)
    } else {
      console.log('')
      console.log(pc.green(`  ✓ Site created: ${site.name}`))
      console.log(`    Site ID: ${pc.bold(site.id)}`)
      printSnippet(creds.url, site.id)
      console.log(pc.green('  Done! Comments are live.'))
      console.log('')
    }
  } else {
    console.log('')
    console.log('  Skipped site creation. Run:')
    console.log(pc.cyan('    npx @holler/init add-site --name "My Site"'))
    console.log('  to create one later.')
    console.log('')
  }
}

async function runAddSite(flags: ParsedArgs): Promise<void> {
  const isNonInteractive = !!(flags.url && flags.serviceKey && flags.name)
  if (!isNonInteractive) header()

  const rc = await readRcFile()
  let url: string
  let serviceRoleKey: string

  if (isNonInteractive) {
    url = flags.url!
    serviceRoleKey = flags.serviceKey!
  } else if (rc) {
    console.log(pc.dim(`  Using Supabase URL from .hollerrc: ${rc.url}`))
    const creds = await promptCredentials()
    url = creds.url
    serviceRoleKey = creds.serviceRoleKey
  } else {
    const creds = await promptCredentials()
    url = creds.url
    serviceRoleKey = creds.serviceRoleKey
    await saveRcFile(url)
  }

  const client = makeClient(url, serviceRoleKey)
  const name = flags.name ?? (await promptSiteName())
  const site = await createSite(client, name)

  if (flags.json) {
    printSiteJson(url, site)
  } else {
    console.log('')
    console.log(pc.green(`  ✓ Site created: ${site.name}`))
    console.log(`    Site ID: ${pc.bold(site.id)}`)
    printSnippet(url, site.id)
  }
}

// ──────────────────────────────────────────────────
// Agent commands: list-comments, resolve, comment
// ──────────────────────────────────────────────────

interface CommentRow {
  id: string
  site_id: string
  page_path: string
  x_percent: number
  y_percent: number
  body: string
  author_display_name: string | null
  parent_id: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  element_selector: string | null
  created_at: string
  updated_at: string
}

/** Parse element_selector JSON into a human-readable location string. */
function describeElement(raw: string | null): string | null {
  if (!raw) return null
  try {
    const ctx = JSON.parse(raw) as {
      selector?: string; tag?: string; text?: string;
      region?: string; attributes?: Record<string, string>
    }
    const parts: string[] = []
    if (ctx.tag) parts.push(`<${ctx.tag}>`)
    if (ctx.attributes?.['aria-label']) parts.push(`"${ctx.attributes['aria-label']}"`)
    else if (ctx.text) parts.push(`"${ctx.text.slice(0, 60)}${ctx.text.length > 60 ? '…' : ''}"`)
    if (ctx.region) parts.push(`(${ctx.region})`)
    if (ctx.selector) parts.push(`→ ${ctx.selector}`)
    return parts.join(' ') || null
  } catch {
    return raw.slice(0, 80)
  }
}

/** Parse element_selector JSON into a structured object for the JSON output. */
function parseElementContext(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { raw }
  }
}

async function runListComments(flags: ParsedArgs): Promise<void> {
  requireFlags(flags, 'url', 'serviceKey', 'siteId')
  const client = makeClient(flags.url!, flags.serviceKey!)
  const status = flags.status ?? 'all'

  let query = client
    .from('holler_comments')
    .select('*')
    .eq('site_id', flags.siteId!)
    .order('created_at', { ascending: true })

  if (flags.page) {
    query = query.eq('page_path', flags.page)
  }
  if (status === 'resolved') {
    query = query.eq('resolved', true)
  } else if (status === 'unresolved') {
    query = query.eq('resolved', false)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch comments: ${error.message}`)

  const rows = (data ?? []) as CommentRow[]

  if (flags.json) {
    // Group by page for easier agent consumption
    const pages = new Map<string, CommentRow[]>()
    for (const row of rows) {
      const list = pages.get(row.page_path) ?? []
      list.push(row)
      pages.set(row.page_path, list)
    }

    const topLevel = rows.filter((r) => !r.parent_id)
    const replies = rows.filter((r) => !!r.parent_id)

    const output = {
      total: rows.length,
      top_level: topLevel.length,
      replies: replies.length,
      unresolved: topLevel.filter((r) => !r.resolved).length,
      resolved: topLevel.filter((r) => r.resolved).length,
      pages: Object.fromEntries(
        [...pages.entries()].map(([path, comments]) => {
          const threads = comments.filter((c) => !c.parent_id)
          return [path, {
            total: comments.length,
            threads: threads.map((t) => ({
              id: t.id,
              body: t.body,
              author: t.author_display_name ?? 'Anonymous',
              resolved: t.resolved,
              x_percent: t.x_percent,
              y_percent: t.y_percent,
              element: parseElementContext(t.element_selector),
              created_at: t.created_at,
              reply_count: comments.filter((c) => c.parent_id === t.id).length,
              replies: comments
                .filter((c) => c.parent_id === t.id)
                .map((r) => ({
                  id: r.id,
                  body: r.body,
                  author: r.author_display_name ?? 'Anonymous',
                  created_at: r.created_at,
                })),
            })),
          }]
        }),
      ),
    }
    console.log(JSON.stringify(output, null, 2))
  } else {
    // Human-readable output
    if (rows.length === 0) {
      console.log(pc.dim('  No comments found.'))
      return
    }

    const topLevel = rows.filter((r) => !r.parent_id)
    const grouped = new Map<string, CommentRow[]>()
    for (const row of topLevel) {
      const list = grouped.get(row.page_path) ?? []
      list.push(row)
      grouped.set(row.page_path, list)
    }

    console.log('')
    for (const [path, threads] of grouped) {
      console.log(pc.bold(`  ${path}`))
      for (const t of threads) {
        const badge = t.resolved ? pc.green('[resolved]') : pc.yellow('[open]')
        const author = t.author_display_name ?? 'Anonymous'
        const replyCount = rows.filter((r) => r.parent_id === t.id).length
        const replyLabel = replyCount > 0 ? pc.dim(` (${replyCount} ${replyCount === 1 ? 'reply' : 'replies'})`) : ''
        console.log(`    ${badge} ${pc.dim(t.id.slice(0, 8))} ${author} ${pc.dim(timeAgo(t.created_at))}: ${t.body.slice(0, 80)}${t.body.length > 80 ? '…' : ''}${replyLabel}`)
        const elDesc = describeElement(t.element_selector)
        if (elDesc) console.log(pc.dim(`      📍 ${elDesc}`))

        // Show replies indented
        const threadReplies = rows.filter((r) => r.parent_id === t.id)
        for (const r of threadReplies) {
          const rAuthor = r.author_display_name ?? 'Anonymous'
          console.log(pc.dim(`      └─ ${rAuthor} ${timeAgo(r.created_at)}: ${r.body.slice(0, 70)}${r.body.length > 70 ? '…' : ''}`))
        }
      }
      console.log('')
    }
  }
}

async function runResolve(flags: ParsedArgs): Promise<void> {
  requireFlags(flags, 'url', 'serviceKey', 'commentId')
  const client = makeClient(flags.url!, flags.serviceKey!)
  const resolved = !flags.unresolve

  const { data, error } = await client
    .from('holler_comments')
    .update({
      resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq('id', flags.commentId!)
    .select('id, body, resolved')
    .single()

  if (error) throw new Error(`Failed to ${resolved ? 'resolve' : 'unresolve'} comment: ${error.message}`)

  const row = data as { id: string; body: string; resolved: boolean }

  if (flags.json) {
    console.log(JSON.stringify({
      id: row.id,
      resolved: row.resolved,
      body: row.body,
    }, null, 2))
  } else {
    const action = resolved ? 'Resolved' : 'Unresolved'
    console.log(pc.green(`  ✓ ${action}: ${row.id}`))
    console.log(pc.dim(`    "${row.body.slice(0, 80)}${row.body.length > 80 ? '…' : ''}"`))
  }
}

async function runComment(flags: ParsedArgs): Promise<void> {
  requireFlags(flags, 'url', 'serviceKey', 'siteId', 'body')
  const client = makeClient(flags.url!, flags.serviceKey!)

  let pagePath = flags.page ?? '/'
  let xPercent = flags.x ?? 50
  let yPercent = flags.y ?? 5
  const authorName = flags.author ?? 'AI Agent'

  // When replying, inherit the parent's page_path and position so the
  // reply lands on the correct page and the SDK's subscription picks it up.
  if (flags.parentId) {
    const { data: parent, error: parentErr } = await client
      .from('holler_comments')
      .select('page_path, x_percent, y_percent')
      .eq('id', flags.parentId)
      .single()

    if (parentErr) throw new Error(`Failed to fetch parent comment: ${parentErr.message}`)
    const p = parent as { page_path: string; x_percent: number; y_percent: number }
    pagePath = flags.page ?? p.page_path
    xPercent = flags.x ?? p.x_percent
    yPercent = flags.y ?? p.y_percent
  }

  const row = {
    site_id: flags.siteId!,
    page_path: pagePath,
    x_percent: xPercent,
    y_percent: yPercent,
    body: flags.body!,
    author_id: null,
    author_display_name: authorName,
    author_avatar_url: null,
    parent_id: flags.parentId ?? null,
    viewport_width: null,
  }

  const { data, error } = await client
    .from('holler_comments')
    .insert(row)
    .select('id, page_path, body, author_display_name, parent_id, x_percent, y_percent, created_at')
    .single()

  if (error) throw new Error(`Failed to create comment: ${error.message}`)

  const result = data as {
    id: string; page_path: string; body: string
    author_display_name: string; parent_id: string | null
    x_percent: number; y_percent: number; created_at: string
  }

  if (flags.json) {
    console.log(JSON.stringify({
      id: result.id,
      page_path: result.page_path,
      body: result.body,
      author: result.author_display_name,
      parent_id: result.parent_id,
      x_percent: result.x_percent,
      y_percent: result.y_percent,
      created_at: result.created_at,
    }, null, 2))
  } else {
    const kind = result.parent_id ? 'Reply' : 'Comment'
    console.log(pc.green(`  ✓ ${kind} posted as "${result.author_display_name}"`))
    console.log(`    ID: ${pc.bold(result.id)}`)
    console.log(`    Page: ${result.page_path}`)
    console.log(`    Position: (${result.x_percent}%, ${result.y_percent}%)`)
    console.log(pc.dim(`    "${result.body.slice(0, 80)}${result.body.length > 80 ? '…' : ''}"`))
  }
}

// ──────────────────────────────────────────────────
// Agent setup: generate a HOLLER.md for any project
// ──────────────────────────────────────────────────

async function runAgentSetup(flags: ParsedArgs): Promise<void> {
  requireFlags(flags, 'url', 'serviceKey', 'siteId')

  // Auto-detect CLI path from the running process
  const cliPath = process.argv[1].replace(/\\/g, '/')

  const content = `# Holler — Agent Instructions

This project uses [Holler](https://github.com/YOUR_USERNAME/holler) for
Figma-style commenting. Comments are stored in Supabase and visible as
pins overlaid on the running app.

## Environment

Set these in your shell or \`.env\` to avoid passing flags every time:

\`\`\`bash
export HOLLER_URL="${flags.url}"
export HOLLER_KEY="${flags.serviceKey}"
export HOLLER_SITE_ID="${flags.siteId}"
\`\`\`

Or pass them as \`--url\`, \`--key\`, \`--site-id\` flags to any command below.

## CLI path

\`\`\`
CLI="${cliPath}"
\`\`\`

## Commands

### See all unresolved comments
\`\`\`bash
node "$CLI" list-comments --status unresolved --json
\`\`\`

### See comments on a specific page
\`\`\`bash
node "$CLI" list-comments --page "/about" --status unresolved --json
\`\`\`

### Resolve a comment (after fixing the issue)
\`\`\`bash
node "$CLI" resolve --comment-id "COMMENT_UUID" --json
\`\`\`

### Reply to a comment thread
\`\`\`bash
node "$CLI" comment \\
  --body "Fixed — updated the color to match the design" \\
  --parent-id "PARENT_COMMENT_UUID" \\
  --author "Claude" \\
  --json
\`\`\`

### Leave a new comment
\`\`\`bash
node "$CLI" comment \\
  --page "/" \\
  --body "The spacing between these cards is inconsistent" \\
  --x 50 --y 40 \\
  --author "Claude" \\
  --json
\`\`\`

## Understanding comment context

Each comment in the JSON output includes an \`element\` field with details
about what the user clicked on:

\`\`\`json
{
  "element": {
    "selector": "main > section.hero > button.cta-primary",
    "tag": "button",
    "text": "Get Started",
    "region": "middle-right",
    "attributes": { "class": "cta-primary", "type": "button" }
  }
}
\`\`\`

Use the \`selector\`, \`tag\`, \`text\`, and \`region\` fields to understand
which part of the UI the feedback is about, then locate the corresponding
code to fix it.

## Workflow

1. Run \`list-comments --status unresolved --json\`
2. Read each thread's \`body\` (what the user said) and \`element\` (where they said it)
3. Fix the issue in code
4. Reply: \`comment --parent-id "..." --body "Fixed in ..." --author "Claude" --json\`
5. Resolve: \`resolve --comment-id "..." --json\`
`

  const { writeFile } = await import('node:fs/promises')
  const outPath = flags.name ?? 'HOLLER.md'
  await writeFile(outPath, content, 'utf-8')

  if (flags.json) {
    console.log(JSON.stringify({ path: outPath, site_id: flags.siteId }))
  } else {
    console.log('')
    console.log(pc.green(`  ✓ Generated ${outPath}`))
    console.log('')
    console.log('  Drop this file into any project root. Agents will read it')
    console.log('  and know how to check, reply to, and resolve comments.')
    console.log('')
    console.log(pc.dim('  Tip: if you use CLAUDE.md, append the contents of HOLLER.md to it.'))
    console.log('')
  }
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────

async function main(): Promise<void> {
  const flags = parseArgs(process.argv)

  try {
    switch (flags.command) {
      case 'add-site':      await runAddSite(flags); break
      case 'list-comments': await runListComments(flags); break
      case 'resolve':       await runResolve(flags); break
      case 'comment':       await runComment(flags); break
      case 'agent-setup':   await runAgentSetup(flags); break
      default:              await runInit(flags); break
    }
  } catch (err) {
    if (flags.json) {
      console.log(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
    } else {
      console.error('')
      console.error(pc.red('  Error: ') + (err instanceof Error ? err.message : String(err)))
      console.error('')
    }
    process.exit(1)
  }
}

main()
