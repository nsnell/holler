import prompts from 'prompts'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface SupabaseCredentials {
  url: string
  serviceRoleKey: string
}

const RC_FILE = '.hollerrc'

/**
 * Prompt the user for Supabase credentials.
 * If `.hollerrc` exists in the current directory, the URL (not the key)
 * is preloaded as the default.
 */
export async function promptCredentials(): Promise<SupabaseCredentials> {
  const existing = await readRcFile()

  const answers = await prompts(
    [
      {
        type: 'text',
        name: 'url',
        message: 'Enter your Supabase project URL:',
        initial: existing?.url ?? '',
        validate: (v: string) =>
          /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(v.trim())
            ? true
            : 'Must be a valid https://<ref>.supabase.co URL',
      },
      {
        type: 'password',
        name: 'serviceRoleKey',
        message: 'Enter your Supabase service role key (used only for migration, not stored):',
        validate: (v: string) => (v.trim().length > 20 ? true : 'Key looks too short'),
      },
    ],
    { onCancel: () => process.exit(1) },
  )

  return { url: answers.url.trim(), serviceRoleKey: answers.serviceRoleKey.trim() }
}

/**
 * Save only the Supabase URL to a local rc file so `add-site` can reuse it.
 * The service role key is never persisted to disk.
 */
export async function saveRcFile(url: string): Promise<void> {
  const path = resolve(process.cwd(), RC_FILE)
  const body = JSON.stringify({ url }, null, 2) + '\n'
  await writeFile(path, body, 'utf-8')
}

export async function readRcFile(): Promise<{ url: string } | null> {
  try {
    const text = await readFile(resolve(process.cwd(), RC_FILE), 'utf-8')
    const parsed = JSON.parse(text) as { url?: string }
    return parsed.url ? { url: parsed.url } : null
  } catch {
    return null
  }
}

export async function promptSiteName(defaultName?: string): Promise<string> {
  const { name } = await prompts(
    {
      type: 'text',
      name: 'name',
      message: 'Site name:',
      initial: defaultName ?? 'My Prototype',
      validate: (v: string) => (v.trim().length >= 1 ? true : 'Required'),
    },
    { onCancel: () => process.exit(1) },
  )
  return name.trim()
}

export async function confirmCreateFirstSite(): Promise<boolean> {
  const { yes } = await prompts(
    {
      type: 'confirm',
      name: 'yes',
      message: 'Create your first site now?',
      initial: true,
    },
    { onCancel: () => process.exit(1) },
  )
  return !!yes
}
