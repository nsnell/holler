import prompts from 'prompts'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface SupabaseCredentials {
  url: string
  serviceRoleKey: string
  anonKey: string
}

const RC_FILE = '.hollerrc'

function decodeKeyRole(key: string): string | null {
  try {
    const payload = JSON.parse(atob(key.split('.')[1]))
    return (payload.role as string) ?? null
  } catch {
    return null
  }
}

/**
 * Prompt the user for Supabase credentials.
 * If `.hollerrc` exists in the current directory, the URL and anon key
 * are preloaded as defaults. The service role key is never persisted.
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
        validate: (v: string) => {
          const trimmed = v.trim()
          if (trimmed.length <= 20) return 'Key looks too short'
          const role = decodeKeyRole(trimmed)
          if (role === 'anon') return 'That looks like the anon key — paste the service_role key'
          return true
        },
      },
      {
        type: 'text',
        name: 'anonKey',
        message: 'Enter your Supabase anon/public key (embedded in the site snippet):',
        initial: existing?.anonKey ?? '',
        validate: (v: string) => {
          const trimmed = v.trim()
          if (trimmed.length <= 20) return 'Key looks too short'
          const role = decodeKeyRole(trimmed)
          if (role === 'service_role') return 'That looks like the service_role key — paste the anon key'
          return true
        },
      },
    ],
    { onCancel: () => process.exit(1) },
  )

  return {
    url: answers.url.trim(),
    serviceRoleKey: answers.serviceRoleKey.trim(),
    anonKey: answers.anonKey.trim(),
  }
}

/**
 * Save the Supabase URL and anon key to a local rc file so `add-site`
 * can reuse them. The anon key is safe to persist (it ships in the public
 * site snippet). The service role key is never written to disk.
 */
export async function saveRcFile(url: string, anonKey?: string): Promise<void> {
  const path = resolve(process.cwd(), RC_FILE)
  const payload: { url: string; anonKey?: string } = { url }
  if (anonKey) payload.anonKey = anonKey
  const body = JSON.stringify(payload, null, 2) + '\n'
  await writeFile(path, body, 'utf-8')
}

export async function readRcFile(): Promise<{ url: string; anonKey?: string } | null> {
  try {
    const text = await readFile(resolve(process.cwd(), RC_FILE), 'utf-8')
    const parsed = JSON.parse(text) as { url?: string; anonKey?: string }
    if (!parsed.url) return null
    return parsed.anonKey ? { url: parsed.url, anonKey: parsed.anonKey } : { url: parsed.url }
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
