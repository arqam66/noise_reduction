import type { MediaKind, Preset } from '../types'

// ponytail: Minimalist and optimized presets enabling noise floor tracking (tn=1) and tuned noise reduction (nr) levels.
export const PRESETS: Preset[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Minor hiss, clean environment',
    icon: '🌤',
    audioFilter: 'highpass=f=80,afftdn=nr=15:nf=-45:tn=1',
    videoFilter: 'hqdn3d=1:1:2:2',
    isAudioOnly: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Typical webcam/mic recording',
    icon: '⚡',
    audioFilter: 'highpass=f=80,afftdn=nr=25:nf=-40:tn=1,lowpass=f=12000',
    videoFilter: 'hqdn3d=3:3:6:6',
    isAudioOnly: false,
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Heavy background noise / grain',
    icon: '🔥',
    audioFilter: 'highpass=f=100,afftdn=nr=35:nf=-35:tn=1,lowpass=f=10000',
    videoFilter: 'hqdn3d=6:6:10:10',
    isAudioOnly: false,
  },
  {
    id: 'voice-only',
    name: 'Voice-Only',
    description: 'Podcast / voice recording',
    icon: '🎙',
    audioFilter: 'highpass=f=100,afftdn=nt=w:nr=30:nf=-35:tn=1,lowpass=f=8000',
    videoFilter: '',
    isAudioOnly: true,
  },
  {
    id: 'film-grain',
    name: 'Film Grain',
    description: 'Cinematic / vintage footage',
    icon: '🎬',
    audioFilter: 'highpass=f=80,afftdn=nr=18:nf=-40:tn=1',
    videoFilter: 'nlmeans=s=3:r=7:p=3',
    isAudioOnly: false,
  },
]

export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi'] as const
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'] as const

export const ACCEPTED_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]
  .map((extension) => `.${extension}`)
  .join(',')

export const ACCEPTED_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/ogg',
  'audio/opus',
]

export const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024 // 1 GB
export const LARGE_FILE_THRESHOLD = 500 * 1024 * 1024 // 500 MB

export function getExtension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Resolve a dropped file to the pipeline it should use. The extension wins
 * when recognised so that mislabelled files (common with phone exports) still
 * take the correct path; the MIME type is a fallback for unusual extensions.
 */
export function detectMediaKind(file: Pick<File, 'name' | 'type'>): MediaKind | null {
  const extension = getExtension(file.name)

  if ((AUDIO_EXTENSIONS as readonly string[]).includes(extension)) return 'audio'
  if ((VIDEO_EXTENSIONS as readonly string[]).includes(extension)) return 'video'

  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'

  return null
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatTimeRemaining(ms: number): string | null {
  if (!Number.isFinite(ms) || ms < 0) return null

  const totalMinutes = Math.ceil(ms / 60_000)
  if (totalMinutes <= 1) return '< 1 min remaining'
  if (totalMinutes < 60) return `~${totalMinutes} min remaining`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `~${hours} h ${minutes} min remaining` : `~${hours} h remaining`
}
