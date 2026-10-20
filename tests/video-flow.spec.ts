import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.resolve(__dirname, '../_qa/noisy.mp4')

// The clip is a local, gitignored QA fixture. Keep the suite green on fresh
// clones instead of failing on a missing input file.
test.skip(!fs.existsSync(FIXTURE), 'Local _qa/noisy.mp4 fixture is not available')

test('preset switching preserves the visual preference and cancel allows restart', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await page.goto('/')
  await page.setInputFiles('input[type="file"]', FIXTURE)

  const startButton = page.getByRole('button', { name: 'Start Cleaning' })
  await expect(startButton).toBeVisible({ timeout: 15_000 })

  const visualToggle = page.getByTestId('visual-toggle')
  await expect(visualToggle).toBeEnabled()
  await expect(visualToggle).toHaveAttribute('aria-checked', 'true')

  // Regression: choosing Voice-Only must disable visual processing without
  // overwriting the user's stored preference.
  await page.getByRole('button', { name: /Voice-Only/ }).click()
  await expect(visualToggle).toBeDisabled()
  await expect(visualToggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Unavailable with Voice-Only')).toBeVisible()

  await page.getByRole('button', { name: /Light/ }).click()
  await expect(visualToggle).toBeEnabled()
  await expect(visualToggle).toHaveAttribute('aria-checked', 'true')

  // Real cancellation terminates the FFmpeg worker; a second run must create a
  // fresh instance and still complete.
  await startButton.click()
  const cancelButton = page.getByRole('button', { name: 'Cancel' })
  await cancelButton.click()
  await expect(startButton).toBeVisible({ timeout: 15_000 })

  await startButton.click()
  await expect(page.getByText('Video cleaned successfully!')).toBeVisible({
    timeout: 180_000,
  })
})
