import { test, expect } from '@playwright/test'
import fs from 'node:fs'

/**
 * Build a small PCM WAV entirely in Node so the audio flow can be tested
 * without shipping a binary fixture in the repository.
 */
function createWav(seconds: number): Buffer {
  const sampleRate = 44_100
  const channels = 1
  const bitsPerSample = 16
  const frames = sampleRate * seconds
  const dataSize = frames * channels * (bitsPerSample / 8)
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28)
  buffer.writeUInt16LE((channels * bitsPerSample) / 8, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)

  let offset = 44
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / sampleRate
    const tone = Math.sin(2 * Math.PI * 440 * t) * 0.4
    const hiss = (Math.random() - 0.5) * 0.03
    const sample = Math.max(-1, Math.min(1, tone + hiss))
    buffer.writeInt16LE(Math.round(sample * 32_767), offset)
    offset += 2
  }

  return buffer
}

test('cleans an audio-only file and downloads an M4A', async ({ page }) => {
  test.setTimeout(180_000)

  const wavPath = test.info().outputPath('tone.wav')
  fs.writeFileSync(wavPath, createWav(2))

  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  await page.goto('/')
  await page.setInputFiles('input[type="file"]', wavPath)

  const startButton = page.getByRole('button', { name: 'Start Cleaning' })
  await expect(startButton).toBeVisible({ timeout: 15_000 })

  // Metadata should identify this as audio, not video.
  await expect(page.getByTestId('media-kind')).toHaveText('audio')
  await expect(
    page.getByText('Audio-only file: visual denoising is skipped automatically.')
  ).toBeVisible()
  await expect(page.getByTestId('visual-toggle')).toHaveCount(0)

  await page.getByRole('button', { name: /Voice-Only/ }).click()
  await startButton.click()

  await expect(page.getByText('Audio cleaned successfully!')).toBeVisible({
    timeout: 120_000,
  })
  await expect(page.getByRole('button', { name: 'Download Cleaned Audio' })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Cleaned Audio' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('tone_denoised.m4a')
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()

  const bytes = fs.readFileSync(downloadPath!)
  expect(bytes.length).toBeGreaterThan(1_000)
  // MP4/M4A containers start with a box length followed by the `ftyp` brand.
  expect(bytes.subarray(4, 8).toString('ascii')).toBe('ftyp')
  expect(pageErrors).toEqual([])
})
