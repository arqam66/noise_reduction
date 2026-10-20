import type { AdvancedSettings, MediaKind, Preset } from '../types'

/**
 * Build the audio/video filter chains for a preset. Kept pure and free of
 * browser or FFmpeg imports so it can be unit tested in Node.
 */
export function buildFFmpegArgs(
  preset: Preset,
  enableVisual: boolean,
  advanced?: AdvancedSettings | null
): { audioFilter: string; videoFilter: string } {
  // Voice-Only always wins: the stored user preference is not mutated, but a
  // video filter must never run for an audio-only preset.
  const wantsVisual = enableVisual && !preset.isAudioOnly
  let audioFilter: string
  let videoFilter = ''

  if (advanced) {
    // `nt` (noise type) must come before the numeric options in afftdn.
    // Lower noise floors map to stronger reduction.
    const advNr = Math.min(
      97,
      Math.max(1, Math.round((-advanced.audioNoiseFloor / 60) * 97))
    )
    audioFilter = `highpass=f=80,afftdn=nt=${advanced.audioMethod}:nr=${advNr}:nf=${advanced.audioNoiseFloor}:tn=1`

    if (wantsVisual) {
      videoFilter = advanced.useNlmeans
        ? `nlmeans=s=${advanced.nlmeansS}:r=${advanced.nlmeansR}:p=${advanced.nlmeansP}`
        : `hqdn3d=${advanced.videoSpatial}:${advanced.videoTemporal}:${advanced.videoSpatial * 2}:${advanced.videoTemporal * 2}`
    }
  } else {
    audioFilter = preset.audioFilter
    if (wantsVisual) {
      videoFilter = preset.videoFilter
    }
  }

  return { audioFilter, videoFilter }
}

/**
 * H.264 with yuv420p requires even dimensions. Rounding here prevents failures
 * for recordings with odd widths/heights.
 */
export function ensureEvenDimensions(videoFilter: string): string {
  const scale = 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
  return videoFilter ? `${videoFilter},${scale}` : scale
}

/**
 * Preserve the real container extension for FFmpeg's demuxer. Characters are
 * restricted so a crafted filename cannot inject anything into the MEMFS path.
 */
export function getSafeExtension(name: string, mediaKind: MediaKind): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name)
  return match ? match[1].toLowerCase() : mediaKind === 'audio' ? 'audio' : 'mp4'
}

/**
 * Stream-copying into MP4 only works reliably when the source is already an
 * MP4-family container. WebM/AVI/MKV and ProRes MOV files must be re-encoded so
 * the downloaded file plays in browsers.
 */
export function canStreamCopyVideo(name: string): boolean {
  return /\.(mp4|m4v)$/i.test(name)
}
