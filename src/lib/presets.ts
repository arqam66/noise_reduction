import type { Preset } from '../types'

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

export const ACCEPTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-msvideo']
export const ACCEPTED_EXTENSIONS = '.mp4,.mov,.mkv,.webm,.avi'
export const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024 // 1 GB

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatTimeRemaining(ms: number): string {
  if (ms < 60_000) return '< 1 min remaining'
  const m = Math.floor(ms / 60_000)
  return `~${m} min remaining`
}
