import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import type { Preset, AdvancedSettings, ProcessingProgress } from '../types'
import { formatTimeRemaining } from './presets'

let ffmpeg: FFmpeg | null = null

export async function loadFFmpeg(
  onProgress?: (p: { progress: number; time: number }) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()

  if (onProgress) {
    ffmpeg.on('progress', onProgress)
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

export function buildFFmpegArgs(
  preset: Preset,
  enableVisual: boolean,
  advanced?: AdvancedSettings | null
): { audioFilter: string; videoFilter: string } {
  let audioFilter: string
  let videoFilter = ''

  if (advanced) {
    // nt (noise type) must be specified before numeric params in afftdn or it is silently ignored.
    // nr scales with the noise floor: lower floor → higher reduction strength.
    const advNr = Math.min(97, Math.round((-advanced.audioNoiseFloor / 60) * 97))
    audioFilter = `highpass=f=80,afftdn=nt=${advanced.audioMethod}:nr=${advNr}:nf=${advanced.audioNoiseFloor}:tn=1`
    if (enableVisual) {
      if (advanced.useNlmeans) {
        videoFilter = `nlmeans=s=${advanced.nlmeansS}:r=${advanced.nlmeansR}:p=${advanced.nlmeansP}`
      } else {
        videoFilter = `hqdn3d=${advanced.videoSpatial}:${advanced.videoTemporal}:${advanced.videoSpatial * 2}:${advanced.videoTemporal * 2}`
      }
    }
  } else {
    audioFilter = preset.audioFilter
    if (enableVisual && !preset.isAudioOnly) {
      videoFilter = preset.videoFilter
    }
  }

  return { audioFilter, videoFilter }
}

export async function processVideo(
  file: File,
  preset: Preset,
  enableVisual: boolean,
  advanced: AdvancedSettings | null,
  onProgress: (progress: ProcessingProgress) => void,
  signal?: AbortSignal
): Promise<{ outputBlob: Blob; fileName: string }> {
  const ff = await loadFFmpeg()

  const inputName = 'input' + getExtension(file.name)
  const outputName = 'output.mp4'

  onProgress({ percent: 5, phase: 'Loading file into memory...', eta: null })

  const fileData = await fetchFile(file)
  if (signal?.aborted) {
    try { await ff.deleteFile(inputName) } catch { /* ignore */ }
    throw new Error('CANCELLED')
  }
  await ff.writeFile(inputName, fileData)
  if (signal?.aborted) {
    try { await ff.deleteFile(inputName) } catch { /* ignore */ }
    throw new Error('CANCELLED')
  }

  const { audioFilter, videoFilter } = buildFFmpegArgs(preset, enableVisual, advanced)

  onProgress({ percent: 15, phase: 'Applying noise reduction...', eta: null })

  // Build the filter chain
  const filterParts: string[] = []

  // Audio filter
  filterParts.push(`[0:a]${audioFilter}[aout]`)

  // Video filter
  let videoMap = '[0:v]'
  if (videoFilter) {
    filterParts.push(`${videoMap}${videoFilter}[vout]`)
    videoMap = '[vout]'
  }

  const args: string[] = [
    '-i', inputName,
    '-filter_complex', filterParts.join(';'),
  ]

  if (videoFilter) {
    args.push(
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23'
    )
  } else {
    args.push(
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy'
    )
  }

  args.push(
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y',
    outputName
  )

  const processingStartTime = performance.now()

  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    const percent = Math.min(95, 15 + progress * 80)
    let eta: string | null = null
    if (progress > 0 && progress < 1) {
      const elapsedMs = performance.now() - processingStartTime
      const totalEstimatedMs = elapsedMs / progress
      const remainingMs = totalEstimatedMs - elapsedMs
      eta = formatTimeRemaining(remainingMs)
    }
    onProgress({
      percent,
      phase: 'Denoising video...',
      eta,
    })
  }

  ff.on('progress', progressHandler)

  try {
    if (signal?.aborted) throw new Error('CANCELLED')
    await ff.exec(args, undefined, signal ? { signal } : undefined)
  } catch (err) {
    ff.off('progress', progressHandler)
    // Best-effort cleanup of virtual files on failure/cancellation.
    try { await ff.deleteFile(inputName) } catch { /* ignore */ }
    try { await ff.deleteFile(outputName) } catch { /* ignore */ }
    if (signal?.aborted) {
      throw new Error('CANCELLED')
    }
    throw new Error('Processing failed. The file may be corrupted or use an unsupported codec.')
  }

  ff.off('progress', progressHandler)

  onProgress({ percent: 96, phase: 'Preparing download...', eta: null })

  const data = await ff.readFile(outputName)
  const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data)
  const blob = new Blob([bytes], { type: 'video/mp4' })

  // Cleanup virtual filesystem
  try {
    await ff.deleteFile(inputName)
    await ff.deleteFile(outputName)
  } catch {
    // ignore cleanup errors
  }

  onProgress({ percent: 100, phase: 'Complete!', eta: null })

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return { outputBlob: blob, fileName: `${baseName}_denoised.mp4` }
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx) : '.mp4'
}
