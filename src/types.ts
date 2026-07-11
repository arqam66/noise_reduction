export type AppStage = 'upload' | 'configuring' | 'processing' | 'result'

export type PresetId = 'light' | 'standard' | 'aggressive' | 'voice-only' | 'film-grain'

export interface Preset {
  id: PresetId
  name: string
  description: string
  icon: string
  audioFilter: string
  videoFilter: string
  isAudioOnly: boolean
}

export interface VideoFile {
  file: File
  name: string
  size: number
  duration: number | null
  resolution: string | null
  codec: string | null
  thumbnailUrl: string | null
}

export interface ProcessingProgress {
  percent: number
  phase: string
  eta: string | null
}

export interface ProcessingResult {
  originalSize: number
  processedSize: number
  blobUrl: string
  fileName: string
  processingTimeMs: number
}

export interface AdvancedSettings {
  audioNoiseFloor: number
  audioMethod: 'w' | 'v'
  videoSpatial: number
  videoTemporal: number
  nlmeansS: number
  nlmeansR: number
  nlmeansP: number
  useNlmeans: boolean
}
