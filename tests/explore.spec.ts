import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.resolve(__dirname, '../_qa/noisy.mp4')

test('full flow exploration', async ({ page }) => {
  const consoleLogs: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []

  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => pageErrors.push(String(err)))
  page.on('requestfailed', (req) =>
    failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`)
  )

  await page.goto('/')

  // --- upload ---
  await page.setInputFiles('input[type="file"]', FIXTURE)

  // --- configuring stage ---
  const startBtn = page.getByRole('button', { name: 'Start Cleaning' })
  await expect(startBtn).toBeVisible({ timeout: 15000 })
  console.log('STAGE: configuring reached')

  // file info shown?
  console.log('FILEINFO:', await page.locator('h3').first().innerText())

  // --- preset interactions ---
  await page.getByRole('button', { name: /Voice-Only/ }).click()
  const visualToggle = page.locator('#visual-toggle')
  console.log('voice-only visual disabled =', await visualToggle.isDisabled())
  console.log('voice-only visual aria-checked =', await visualToggle.getAttribute('aria-checked'))

  await page.getByRole('button', { name: /Light/ }).click()
  console.log('after Light: visual disabled =', await visualToggle.isDisabled())
  console.log('after Light: visual aria-checked =', await visualToggle.getAttribute('aria-checked'))

  // --- advanced settings ---
  await page.getByRole('button', { name: 'Advanced Settings' }).click()
  await expect(page.getByText('Audio Noise Floor:')).toBeVisible()
  const floor = page.locator('input[type="range"]').first()
  await floor.fill('-55')
  console.log('floor label:', await page.getByText(/Audio Noise Floor:/).innerText())

  // --- run processing ---
  const t0 = Date.now()
  await startBtn.click()

  const resultHeading = page.getByText('Video cleaned successfully!')
  const errAlert = page.locator('[role="alert"]')

  const winner = await Promise.race([
    resultHeading
      .waitFor({ timeout: 180000 })
      .then(() => 'result' as const)
      .catch(() => null),
    errAlert
      .waitFor({ timeout: 180000 })
      .then(() => 'error' as const)
      .catch(() => null),
  ])

  console.log('OUTCOME:', winner ?? 'TIMEOUT/UNKNOWN', `${Date.now() - t0}ms`)
  if (winner === 'error') {
    console.log('ERROR TEXT:', await errAlert.innerText())
  }
  if (winner === 'result') {
    console.log('WAVEFORMS:', await page.locator('.bg-gray-50.rounded-lg').count())
    console.log('ORIGINAL LOADED HINT:', await page
      .getByText('Load the original file to preview')
      .count())
  }

  console.log('--- PAGE ERRORS ---')
  pageErrors.forEach((e) => console.log(e))
  console.log('--- FAILED REQUESTS ---')
  failedRequests.forEach((e) => console.log(e))
  console.log('--- CONSOLE (last 40) ---')
  consoleLogs.slice(-40).forEach((l) => console.log(l))
})
