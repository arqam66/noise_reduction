import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import type { Preset, AdvancedSettings, ProcessingProgress } from '../types'

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
    audioFilter = `afftdn=nt=${advanced.audioMethod}:nr=${advNr}:nf=${advanced.audioNoiseFloor}:tn=1`
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
  onProgress: (progress: ProcessingProgress) => void
): Promise<{ outputBlob: Blob; fileName: string }> {
  const ff = await loadFFmpeg()

  const inputName = 'input' + getExtension(file.name)
  const outputName = 'output.mp4'

  onProgress({ percent: 5, phase: 'Loading file into memory...', eta: null })

  const fileData = await fetchFile(file)
  await ff.writeFile(inputName, fileData)

  const { audioFilter, videoFilter } = buildFFmpegArgs(preset, enableVisual, advanced)

  onProgress({ percent: 15, phase: 'Applying noise reduction...', eta: null })

  const filterComplex: string[] = []

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
    '-map', videoMap,
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y',
    outputName,
  ]

  ff.on('progress', ({ progress, time }) => {
    const percent = Math.min(95, 15 + progress * 80)
    const eta = time > 0 ? estimateRemaining(progress, time) : null
    onProgress({
      percent,
      phase: 'Denoising video...',
      eta,
    })
  })

  try {
    await ff.exec(args)
  } catch (err) {
    throw new Error('Processing failed. The file may be corrupted or use an unsupported codec.')
  }

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

function estimateRemaining(progress: number, _currentTime: number): string | null {
  if (progress <= 0) return null
  return null
}

export async function probeFile(file: File): Promise<{
  duration: number | null
  resolution: string | null
  codec: string | null
}> {
  try {
    const ff = await loadFFmpeg()
    const name = 'probe' + getExtension(file.name)
    const data = await fetchFile(file)
    await ff.writeFile(name, data)

    // Use ffprobe-style output by running with -hide_banner
    const output = await ff.exec(['-i', name, '-f', 'null', '-'])
    // Cleanup
    try { await ff.deleteFile(name) } catch { /* ignore */ }
    return { duration: null, resolution: null, codec: null }
  } catch {
    return { duration: null, resolution: null, codec: null }
  }
}
