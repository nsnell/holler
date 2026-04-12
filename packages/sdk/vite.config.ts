import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Dual-build config:
 *   - `--mode esm` → ESM build, @supabase/supabase-js externalized.
 *   - `--mode umd` → self-contained UMD bundle with Supabase inlined.
 *
 * Run both via `pnpm build` (see package.json scripts).
 */
export default defineConfig(({ mode }) => {
  const isUmd = mode === 'umd'

  return {
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'Holler',
        formats: isUmd ? ['umd'] : ['es'],
        fileName: (format) =>
          format === 'umd' ? 'holler.umd.js' : 'holler.esm.js',
      },
      rollupOptions: {
        external: isUmd ? [] : ['@supabase/supabase-js'],
        output: isUmd
          ? {
              globals: {},
              inlineDynamicImports: true,
            }
          : {
              globals: {
                '@supabase/supabase-js': 'supabaseJs',
              },
            },
      },
      sourcemap: false,
      minify: isUmd ? 'esbuild' : false,
      target: 'es2019',
    },
  }
})
