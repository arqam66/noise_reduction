import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  AppStage,
  MediaFile,
  MediaKind,
  PresetId,
  ProcessingProgress,
  ProcessingResult,
  AdvancedSettings,
} from './types'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { ConfigPanel } from './components/ConfigPanel'
import { ProcessingView } from './components/ProcessingView'
import { ResultView } from './components/ResultView'
import { processVideo } from './lib/ffmpeg'
import { PRESETS, LARGE_FILE_THRESHOLD, MAX_FILE_SIZE, detectMediaKind, formatFileSize } from './lib/presets'

const METADATA_TIMEOUT_MS = 6_000
const THUMBNAIL_TIMEOUT_MS = 4_000

/**
 * Chromium exposes an approximate device memory figure. Firefox and Safari do
 * not, so the warning is strictly best-effort.
 */
function getDeviceMemoryGb(): number | undefined {
  if (typeof navigator === 'undefined') return undefined
  const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return typeof value === 'number' && value > 0 ? value : undefined
}

const DEVICE_MEMORY_GB = getDeviceMemoryGb()

interface MediaMetadata {
  kind: MediaKind
  duration: number | null
  resolution: string | null
  thumbnailUrl: string | null
}

/**
 * Read duration, dimensions and a thumbnail from a local file before it enters
 * the processing pipeline. Everything is best-effort: metadata failures must
 * never stop a user from processing a file.
 */
function readMediaMetadata(file: File, initialKind: MediaKind): Promise<MediaMetadata> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const element = document.createElement(initialKind === 'audio' ? 'audio' : 'video')
    let settled = false
    let timer = 0

    const finish = (metadata: MediaMetadata) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      element.onloadedmetadata = null
      element.onseeked = null
      element.onerror = null
      element.removeAttribute('src')
      element.load()
      URL.revokeObjectURL(objectUrl)
      resolve(metadata)
    }

    timer = window.setTimeout(() => {
      finish({ kind: initialKind, duration: null, resolution: null, thumbnailUrl: null })
    }, METADATA_TIMEOUT_MS)

    element.preload = 'metadata'
    element.onerror = () => {
      finish({ kind: initialKind, duration: null, resolution: null, thumbnailUrl: null })
    }

    element.onloadedmetadata = () => {
      const video = element instanceof HTMLVideoElement ? element : null
      const width = video?.videoWidth ?? 0
      const height = video?.videoHeight ?? 0

      // Some audio-only files use a video container/extension (audio-only MP4).
      const kind: MediaKind = initialKind === 'video' && width === 0 ? 'audio' : initialKind
      const duration = Number.isFinite(element.duration) ? element.duration : null
      const resolution = kind === 'video' && width > 0 && height > 0 ? `${width}x${height}` : null

      if (!video || kind !== 'video' || width === 0 || height === 0) {
        finish({ kind, duration, resolution, thumbnailUrl: null })
        return
      }

      captureThumbnail(video)
        .then((thumbnailUrl) => finish({ kind, duration, resolution, thumbnailUrl }))
        .catch(() => finish({ kind, duration, resolution, thumbnailUrl: null }))
    }

    element.src = objectUrl
  })
}

function captureThumbnail(video: HTMLVideoElement): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false
    let timer = 0

    const done = (url: string | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.onseeked = null
      resolve(url)
    }

    timer = window.setTimeout(() => done(null), THUMBNAIL_TIMEOUT_MS)

    video.onseeked = () => {
      try {
        const width = video.videoWidth
        const height = video.videoHeight
        if (!width || !height) {
          done(null)
          return
        }

        const scale = Math.min(1, 320 / width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))

        const context = canvas.getContext('2d')
        if (!context) {
          done(null)
          return
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => done(blob ? URL.createObjectURL(blob) : null),
          'image/jpeg',
          0.8
        )
      } catch {
        done(null)
      }
    }

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    video.currentTime = Math.min(0.25, Math.max(0.01, duration / 2))
  })
}

export default function App() {
  const [stage, setStage] = useState<AppStage>('upload')
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetId>('standard')
  const [enableVisual, setEnableVisual] = useState(true)
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings | null>(null)
  const [progress, setProgress] = useState<ProcessingProgress>({ percent: 0, phase: '', eta: null })
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)

  // Guards stale async work (metadata reads and processing runs).
  const runIdRef = useRef(0)
  const fileLoadIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (file.size === 0) {
      setError('That file is empty. Please choose a different file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('This file exceeds the 1 GB limit. Please trim or compress it first.')
      return
    }

    const initialKind = detectMediaKind(file)
    if (!initialKind) {
      setError(
        "This format isn't supported. Upload MP4, MOV, MKV, WebM, AVI, MP3, WAV, M4A, FLAC, or OGG."
      )
      return
    }

    const loadId = ++fileLoadIdRef.current
    setIsReadingFile(true)

    try {
      const metadata = await readMediaMetadata(file, initialKind)
      if (fileLoadIdRef.current !== loadId) return

      setMediaFile({
        file,
        name: file.name,
        size: file.size,
        kind: metadata.kind,
        duration: metadata.duration,
        resolution: metadata.resolution,
        thumbnailUrl: metadata.thumbnailUrl,
      })
      setStage('configuring')
    } finally {
      if (fileLoadIdRef.current === loadId) {
        setIsReadingFile(false)
      }
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!mediaFile) return

    const preset = PRESETS.find((item) => item.id === selectedPreset)
    if (!preset) {
      setError('Please choose a cleaning preset.')
      return
    }

    const controller = new AbortController()
    const runId = ++runIdRef.current
    abortControllerRef.current = controller
    setError(null)
    setStage('processing')
    setProgress({ percent: 0, phase: 'Starting...', eta: null })

    const isCurrentRun = () => runIdRef.current === runId && !controller.signal.aborted

    try {
      const startTime = performance.now()
      const { outputBlob, fileName } = await processVideo(
        mediaFile.file,
        mediaFile.kind,
        preset,
        enableVisual,
        advancedSettings,
        (nextProgress) => {
          if (isCurrentRun()) setProgress(nextProgress)
        },
        controller.signal
      )

      if (!isCurrentRun()) return

      const blobUrl = URL.createObjectURL(outputBlob)
      const originalBlobUrl = URL.createObjectURL(mediaFile.file)
      const processingTimeMs = performance.now() - startTime

      setResult({
        mediaKind: mediaFile.kind,
        originalSize: mediaFile.size,
        processedSize: outputBlob.size,
        blobUrl,
        originalBlobUrl,
        fileName,
        processingTimeMs,
      })
      setStage('result')
    } catch (err) {
      if (!isCurrentRun()) return

      if (err instanceof Error && err.message === 'CANCELLED') {
        setStage('configuring')
        return
      }

      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong during processing. Please try again.'
      setError(message)
      setStage('configuring')
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [mediaFile, selectedPreset, enableVisual, advancedSettings])

  const handleCancel = useCallback(() => {
    runIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setStage('configuring')
    setProgress({ percent: 0, phase: '', eta: null })
  }, [])

  const handleReset = useCallback(() => {
    // Stop metadata reads and any in-flight FFmpeg job before clearing state.
    runIdRef.current += 1
    fileLoadIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    if (result?.blobUrl) {
      URL.revokeObjectURL(result.blobUrl)
    }
    if (result?.originalBlobUrl) {
      URL.revokeObjectURL(result.originalBlobUrl)
    }
    if (mediaFile?.thumbnailUrl) {
      URL.revokeObjectURL(mediaFile.thumbnailUrl)
    }

    setIsReadingFile(false)
    setStage('upload')
    setMediaFile(null)
    setResult(null)
    setError(null)
    setProgress({ percent: 0, phase: '', eta: null })
  }, [result, mediaFile])

  const handleFaqClick = useCallback(
    (e: React.MouseEvent) => {
      if (stage !== 'upload') {
        e.preventDefault()
        handleReset()
        setTimeout(() => {
          document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    },
    [stage, handleReset]
  )

  // Warn before unload during processing.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (stage === 'processing') {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [stage])

  const memoryWarning =
    mediaFile &&
    DEVICE_MEMORY_GB !== undefined &&
    DEVICE_MEMORY_GB < 4 &&
    mediaFile.size > 100 * 1024 * 1024
      ? `Your browser reports about ${DEVICE_MEMORY_GB} GB of RAM. This file may need more memory; close other tabs if processing fails.`
      : null

  const largeFileWarning =
    mediaFile && mediaFile.size > LARGE_FILE_THRESHOLD
      ? `Large file (${formatFileSize(mediaFile.size)}). Processing can need 2–4× the file size in RAM; keep this tab open and close other tabs.`
      : memoryWarning

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onFaqClick={handleFaqClick} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-700 flex items-start gap-3"
            role="alert"
          >
            <span className="text-red-500 text-xl shrink-0" aria-hidden="true">
              ⚠
            </span>
            <div className="flex-1">
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-lg"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {stage === 'upload' && (
          <>
            <UploadZone onFile={handleFile} busy={isReadingFile} />

            <section id="faq" className="mt-16 border-t border-gray-200 pt-12 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    Are my files uploaded to a server?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    No. NoiseGone processes everything 100% client-side using WebAssembly
                    (FFmpeg.wasm). Your media never leaves your computer.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    What is the maximum file size?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    You can process files up to <strong>1 GB</strong>. Because processing happens
                    in your browser&apos;s memory, practical limits depend on your RAM and CPU. Files
                    over 500 MB can require several GB of free memory.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    Can I clean audio-only files?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes. Audio files such as <strong>MP3, WAV, M4A, FLAC, and OGG</strong> are
                    denoised and exported as AAC in an <strong>M4A</strong> container. Visual
                    denoising is automatically skipped for audio-only media.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    Why is visual noise reduction slower?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Audio denoising is very fast. Visual denoising processes individual frames
                    spatially and temporally, which requires significantly more CPU inside a
                    browser sandbox. Turn it off to copy the video stream from MP4/M4V sources
                    untouched; other containers are re-encoded to MP4-compatible H.264.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    Can I cancel processing?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes. Cancelling terminates the WebAssembly worker immediately, discards the
                    partial output, and returns you to the settings screen. You can change the
                    preset and start again.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    Which formats are supported?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Video: <strong>MP4, MOV, MKV, WebM, AVI</strong>. Audio:{' '}
                    <strong>MP3, WAV, M4A, AAC, FLAC, OGG, Opus</strong>. Video is exported as
                    MP4 (H.264/AAC); audio is exported as M4A (AAC).
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm transition-all hover:border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                    Who created this tool?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    NoiseGone is an open-source tool developed by{' '}
                    <a
                      href="https://github.com/arqam66"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      @arqam66
                    </a>{' '}
                    to provide a fast, secure, and privacy-preserving denoiser for creators and
                    professionals.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {stage === 'configuring' && mediaFile && (
          <ConfigPanel
            mediaFile={mediaFile}
            selectedPreset={selectedPreset}
            enableVisual={enableVisual}
            advancedSettings={advancedSettings}
            largeFileWarning={largeFileWarning}
            onPresetChange={setSelectedPreset}
            onVisualToggle={setEnableVisual}
            onAdvancedChange={setAdvancedSettings}
            onStart={handleProcess}
            onBack={handleReset}
          />
        )}

        {stage === 'processing' && (
          <ProcessingView
            progress={progress}
            mediaKind={mediaFile?.kind ?? 'video'}
            onCancel={handleCancel}
          />
        )}

        {stage === 'result' && result && <ResultView result={result} onReset={handleReset} />}
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm border-t border-gray-200 flex flex-col gap-2 items-center bg-white">
        <p>100% client-side · Zero uploads · Your files never leave this device</p>
        <p className="text-gray-400">
          Developed by{' '}
          <a
            href="https://github.com/arqam66"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
          >
            @arqam66
          </a>
        </p>
      </footer>
    </div>
  )
}
