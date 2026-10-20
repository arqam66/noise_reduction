import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type { AdvancedSettings, MediaKind, Preset, ProcessingProgress } from '../types'
import { formatTimeRemaining } from './presets'
import { buildFFmpegArgs, canStreamCopyVideo, ensureEvenDimensions, getSafeExtension } from './ffmpegArgs'

const CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
const CORE_FETCH_ATTEMPTS = 3
const CORE_RETRY_DELAY_MS = 750
const OUTPUT_MIME: Record<MediaKind, string> = {
  video: 'video/mp4',
  audio: 'audio/mp4',
}

let ffmpeg: FFmpeg | null = null
let pendingLoad: Promise<FFmpeg> | null = null

/**
 * Terminate the shared worker and forget it. `exec(..., { signal })` only
 * rejects the JavaScript promise; the FFmpeg worker keeps running until it is
 * terminated. A fresh instance is created by the next `loadFFmpeg` call.
 */
export function resetFFmpeg(): void {
  const instance = ffmpeg
  ffmpeg = null
  pendingLoad = null
  if (!instance) return

  try {
    instance.terminate()
  } catch {
    // The worker may already be gone (for example after a failed load).
  }
}

export async function loadFFmpeg(signal?: AbortSignal): Promise<FFmpeg> {
  if (signal?.aborted) throw new Error('CANCELLED')
  if (ffmpeg) return ffmpeg

  if (!pendingLoad) {
    const loadPromise = createFFmpeg(signal)
    pendingLoad = loadPromise

    // Clear the shared promise once it settles so a failed load can be retried.
    void loadPromise.finally(() => {
      if (pendingLoad === loadPromise) pendingLoad = null
    }).catch(() => {
      // The rejection is surfaced to the caller that awaits the promise.
    })
  }

  return pendingLoad
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch a core asset into a blob URL. Unlike `@ffmpeg/util`'s `toBlobURL`,
 * this accepts an AbortSignal so cancelling a run also cancels the (large)
 * engine download instead of leaving it to compete with the next attempt.
 */
async function fetchBlobURL(
  url: string,
  mimeType: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }

  const blob = await response.blob()
  return URL.createObjectURL(new Blob([blob], { type: mimeType }))
}

async function fetchCoreAsset(
  url: string,
  mimeType: string,
  signal?: AbortSignal
): Promise<string> {
  let lastError: unknown

  for (let attempt = 1; attempt <= CORE_FETCH_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new Error('CANCELLED')

    try {
      return await fetchBlobURL(url, mimeType, signal)
    } catch (error) {
      if (signal?.aborted) throw new Error('CANCELLED')
      lastError = error
      console.warn(`NoiseGone: core asset attempt ${attempt} failed`, error)

      if (attempt < CORE_FETCH_ATTEMPTS) {
        await delay(CORE_RETRY_DELAY_MS * attempt)
      }
    }
  }

  throw lastError
}

async function createFFmpeg(signal?: AbortSignal): Promise<FFmpeg> {
  const instance = new FFmpeg()
  ffmpeg = instance

  const handleAbort = () => resetFFmpeg()
  signal?.addEventListener('abort', handleAbort, { once: true })

  let coreURL: string | null = null
  let wasmURL: string | null = null

  try {
    ;[coreURL, wasmURL] = await Promise.all([
      fetchCoreAsset(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript', signal),
      fetchCoreAsset(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm', signal),
    ])

    if (signal?.aborted) throw new Error('CANCELLED')

    await instance.load({ coreURL, wasmURL }, { signal })
    if (signal?.aborted) throw new Error('CANCELLED')

    return instance
  } catch (error) {
    if (ffmpeg === instance) resetFFmpeg()
    if (signal?.aborted) throw new Error('CANCELLED')

    console.error('NoiseGone: failed to load FFmpeg', error)
    throw new Error(
      'Could not load the denoising engine. Check your internet connection, then try again.'
    )
  } finally {
    signal?.removeEventListener('abort', handleAbort)

    // The worker has consumed both assets by now; release the blob copies.
    if (coreURL) URL.revokeObjectURL(coreURL)
    if (wasmURL) URL.revokeObjectURL(wasmURL)
  }
}

export async function processVideo(
  file: File,
  mediaKind: MediaKind,
  preset: Preset,
  enableVisual: boolean,
  advanced: AdvancedSettings | null,
  onProgress: (progress: ProcessingProgress) => void,
  signal?: AbortSignal
): Promise<{ outputBlob: Blob; fileName: string }> {
  if (signal?.aborted) throw new Error('CANCELLED')

  onProgress({ percent: 2, phase: 'Loading denoising engine...', eta: null })
  const ff = await loadFFmpeg(signal)
  if (signal?.aborted) throw new Error('CANCELLED')

  const inputName = `input.${getSafeExtension(file.name, mediaKind)}`
  const outputName = mediaKind === 'audio' ? 'output.m4a' : 'output.mp4'

  const logs: string[] = []
  const logHandler = ({ message }: { message: string }) => {
    logs.push(message)
    if (logs.length > 80) logs.shift()
  }
  ff.on('log', logHandler)

  // Terminate the worker instead of only rejecting the promise. The next run
  // transparently loads a fresh instance.
  const handleAbort = () => resetFFmpeg()
  signal?.addEventListener('abort', handleAbort, { once: true })

  let progressHandler: ((event: { progress: number; time: number }) => void) | null = null

  try {
    onProgress({ percent: 5, phase: 'Reading file into memory...', eta: null })

    const fileData = await fetchFile(file)
    if (signal?.aborted) throw new Error('CANCELLED')

    await ff.writeFile(inputName, fileData)
    if (signal?.aborted) throw new Error('CANCELLED')

    const { audioFilter, videoFilter } = buildFFmpegArgs(preset, enableVisual, advanced)
    const shouldProcessVideo = mediaKind === 'video' && videoFilter.length > 0
    const shouldCopyVideo =
      mediaKind === 'video' && !shouldProcessVideo && canStreamCopyVideo(file.name)
    // A WebM/AVI/MKV stream cannot be copied into an MP4 container reliably, so
    // encode H.264 even when visual denoising is off.
    const mustEncodeVideo = mediaKind === 'video' && !shouldProcessVideo && !shouldCopyVideo
    const needsVideoEncoding = shouldProcessVideo || mustEncodeVideo
    const processingPhase = shouldProcessVideo
      ? 'Denoising video...'
      : mustEncodeVideo
        ? 'Encoding video...'
        : 'Denoising audio...'

    const filterParts = [`[0:a]${audioFilter}[aout]`]
    if (needsVideoEncoding) {
      const videoChain = shouldProcessVideo
        ? ensureEvenDimensions(videoFilter)
        : ensureEvenDimensions('')
      filterParts.push(`[0:v]${videoChain}[vout]`)
    }

    const args: string[] = [
      '-i', inputName,
      '-filter_complex', filterParts.join(';'),
    ]

    if (mediaKind === 'audio') {
      args.push('-map', '[aout]', '-vn')
    } else if (needsVideoEncoding) {
      args.push(
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p'
      )
    } else if (shouldCopyVideo) {
      args.push(
        '-map', '0:v:0',
        '-map', '[aout]',
        '-c:v', 'copy'
      )
    }

    args.push(
      '-map_metadata', '0',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      '-y',
      outputName
    )

    onProgress({
      percent: 15,
      phase: processingPhase,
      eta: null,
    })

    const processingStart = performance.now()
    progressHandler = ({ progress }: { progress: number; time: number }) => {
      const ratio = Math.max(0, Math.min(1, progress))
      const percent = 15 + ratio * 80
      const eta =
        ratio > 0.02 && ratio < 0.99
          ? formatTimeRemaining(((performance.now() - processingStart) / ratio) * (1 - ratio))
          : null

      onProgress({
        percent,
        phase: processingPhase,
        eta,
      })
    }
    ff.on('progress', progressHandler)

    const exitCode = await ff.exec(args, undefined, signal ? { signal } : undefined)
    if (exitCode !== 0) throw new Error(`FFMPEG_EXIT_${exitCode}`)
    if (signal?.aborted) throw new Error('CANCELLED')

    onProgress({ percent: 96, phase: 'Preparing download...', eta: null })

    const data = await ff.readFile(outputName)
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data)
    if (bytes.byteLength === 0) throw new Error('FFMPEG_EMPTY_OUTPUT')

    // Copy into a plain ArrayBuffer-backed view: TypeScript's DOM types reject
    // a Uint8Array that may be backed by a SharedArrayBuffer as a BlobPart.
    const outputBytes = new Uint8Array(bytes.byteLength)
    outputBytes.set(bytes)

    const outputBlob = new Blob([outputBytes], { type: OUTPUT_MIME[mediaKind] })
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'output'
    const extension = mediaKind === 'audio' ? 'm4a' : 'mp4'

    onProgress({ percent: 100, phase: 'Complete!', eta: null })

    return {
      outputBlob,
      fileName: `${baseName}_denoised.${extension}`,
    }
  } catch (error) {
    if (signal?.aborted) throw new Error('CANCELLED')
    if (error instanceof Error && error.message === 'CANCELLED') throw error
    console.error('NoiseGone: FFmpeg processing failed', error, logs.slice(-20))
    throw new Error(friendlyProcessingError(error, logs))
  } finally {
    signal?.removeEventListener('abort', handleAbort)
    ff.off('log', logHandler)
    if (progressHandler) ff.off('progress', progressHandler)

    // Best-effort cleanup; the worker may already be terminated after cancel.
    try {
      await ff.deleteFile(inputName)
    } catch {
      // ignore
    }
    try {
      await ff.deleteFile(outputName)
    } catch {
      // ignore
    }
  }
}

function friendlyProcessingError(error: unknown, logs: string[]): string {
  const message = error instanceof Error ? error.message : String(error)
  const details = [message, ...logs].join('\n')

  if (
    /matches no streams|does not contain any stream|Cannot find a matching stream/i.test(details)
  ) {
    return 'This file has no audio track that NoiseGone can clean. Try a recording with sound.'
  }

  if (
    /out of memory|Cannot enlarge memory|memory access out of bounds|allocation failed|Array buffer allocation failed/i.test(details)
  ) {
    return 'Your device ran out of memory while processing this file. Try a shorter clip, a lower resolution, or close other tabs and try again.'
  }

  if (
    /Unknown encoder|Encoder .* not found|Decoder .* not found|Unsupported codec|could not find codec|Could not find tag for codec|codec not currently supported in container/i.test(details)
  ) {
    return 'This file uses a codec the browser build cannot decode. Try converting it to MP4 (H.264/AAC) first.'
  }

  if (/Invalid data found|moov atom not found|End of file|corrupt/i.test(details)) {
    return 'This file appears to be damaged or incomplete. Try another copy of the file.'
  }

  return 'Processing failed. The file may be corrupted or use an unsupported codec.'
}
