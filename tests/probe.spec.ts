import { test, expect } from '@playwright/test'

// Verifies the FFmpeg.wasm core loads and executes inside the browser.
//
// The core is pulled through the app's own module graph (`/src/lib/ffmpeg.ts`)
// rather than a bare `import('@ffmpeg/ffmpeg')`. A bare specifier inside
// `page.evaluate` is not part of Vite's module graph, so the browser cannot
// resolve it (and `@ffmpeg/ffmpeg` is excluded from `optimizeDeps`). Importing
// the app's module lets Vite rewrite the bare specifiers to served URLs.
test('ffmpeg core loads and executes', async ({ page }) => {
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)))
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const { loadFFmpeg } = await import('/src/lib/ffmpeg.ts')
    const out: Record<string, unknown> = {}
    try {
      const ff = await loadFFmpeg()
      out.loaded = true
      out.hasExec = typeof ff.exec === 'function'
      out.hasFfprobe = typeof (ff as unknown as { ffprobe?: unknown }).ffprobe === 'function'
      // exec()/ffprobe() resolve to 0 on success, non-zero on error.
      out.versionRet = await ff.exec(['-version'])
      out.ffprobeRet = await ff.ffprobe(['-version'])
    } catch (e) {
      out.error = String(e)
    }
    return out
  })

  console.log(JSON.stringify(result, null, 2))

  expect(result.loaded).toBe(true)
  expect(result.hasExec).toBe(true)
  expect(result.hasFfprobe).toBe(true)
  expect(result.versionRet).toBe(0)
  expect(result.ffprobeRet).toBe(0)
})
