import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import pc from 'picocolors'
import prompts from 'prompts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Load the bundled migration.sql file.
 * The file is shipped alongside the CLI in `src/templates/migration.sql`
 * and also copied into dist during build.
 */
export async function loadMigrationSql(): Promise<string> {
  const candidates = [
    resolve(__dirname, 'templates/migration.sql'),
    resolve(__dirname, '../src/templates/migration.sql'),
    resolve(__dirname, '../../src/templates/migration.sql'),
  ]
  for (const path of candidates) {
    try {
      return await readFile(path, 'utf-8')
    } catch {
      // try next
    }
  }
  throw new Error('Could not locate migration.sql')
}

/**
 * Attempt to run the migration SQL against the user's Supabase project.
 *
 * Supabase's JS client does not expose a generic "run arbitrary SQL" endpoint
 * out of the box. We try, in order:
 *
 *   1. A `holler_exec_sql` RPC if the user has already created one.
 *   2. Fall back to writing the SQL to a local file and instructing the user
 *      to paste it into the Supabase SQL editor, then pressing Enter to continue.
 *
 * This keeps the setup reliable on a fresh Supabase project where no custom
 * RPC exists yet. It also honors the spec's guidance that IF NOT EXISTS /
 * duplicate-object errors must be swallowed gracefully.
 */
export async function runMigration(
  client: SupabaseClient,
  supabaseUrl: string,
): Promise<void> {
  const sql = await loadMigrationSql()

  // Attempt 1: RPC path (only works if the user has `holler_exec_sql` already).
  let rpcSucceeded = false
  try {
    const res = await client.rpc('holler_exec_sql', { sql })
    if (!res.error) rpcSucceeded = true
  } catch {
    // swallow — fall through to fallback
  }
  if (rpcSucceeded) {
    console.log(pc.green('  ✓ Migration executed via RPC'))
    return
  }

  // Attempt 2: manual fallback.
  const sqlPath = resolve(process.cwd(), 'holler-migration.sql')
  await writeFile(sqlPath, sql, 'utf-8')

  const projectRef = extractProjectRef(supabaseUrl)
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard → your project → SQL Editor'

  console.log('')
  console.log(pc.yellow('  ! Automatic SQL execution is not available on a fresh project.'))
  console.log('')
  console.log('  The migration has been written to:')
  console.log(pc.cyan(`    ${sqlPath}`))
  console.log('')
  console.log('  Open the SQL editor:')
  console.log(pc.cyan(`    ${sqlEditorUrl}`))
  console.log('')
  console.log('  Paste the contents of that file and click Run.')
  console.log('')

  const answer = await prompts({
    type: 'confirm',
    name: 'done',
    message: 'Have you run the migration? Press Enter to continue.',
    initial: true,
  })

  if (!answer.done) {
    throw new Error('Migration aborted by user.')
  }

  console.log(pc.green('  ✓ Migration acknowledged'))
}

/** Extract the project ref from a Supabase URL like https://abcd1234.supabase.co */
function extractProjectRef(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}
