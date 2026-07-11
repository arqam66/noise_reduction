import { useState, useCallback, useEffect } from 'react'
import type { AppStage, VideoFile, PresetId, ProcessingProgress, ProcessingResult, AdvancedSettings } from './types'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { ConfigPanel } from './components/ConfigPanel'
import { ProcessingView } from './components/ProcessingView'
import { ResultView } from './components/ResultView'
import { processVideo } from './lib/ffmpeg'
import { PRESETS, MAX_FILE_SIZE, ACCEPTED_FORMATS } from './lib/presets'

export default function App() {
  const [stage, setStage] = useState<AppStage>('upload')
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetId>('standard')
  const [enableVisual, setEnableVisual] = useState(true)
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings | null>(null)
  const [progress, setProgress] = useState<ProcessingProgress>({ percent: 0, phase: '', eta: null })
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingAborted, setProcessingAborted] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (file.size > MAX_FILE_SIZE) {
      setError('This file exceeds the 1 GB limit. Please trim or compress it first.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const isValidExt = ['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext || '')
    const isValidMime = ACCEPTED_FORMATS.includes(file.type) || file.type === ''

    if (!isValidExt && !isValidMime) {
      setError("This format isn't supported. Please convert to MP4, MOV, or WebM.")
      return
    }

    const video: VideoFile = {
      file,
      name: file.name,
      size: file.size,
      duration: null,
      resolution: null,
      codec: null,
      thumbnailUrl: null,
    }

    // Try to get video metadata via HTMLVideoElement
    try {
      const url = URL.createObjectURL(file)
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      await new Promise<void>((resolve, reject) => {
        vid.onloadedmetadata = () => {
          video.duration = vid.duration
          video.resolution = `${vid.videoWidth}x${vid.videoHeight}`
          URL.revokeObjectURL(url)
          resolve()
        }
        vid.onerror = () => {
          URL.revokeObjectURL(url)
          resolve() // don't block on metadata failure
        }
        vid.src = url
      })

      // Get thumbnail
      if (video.duration !== null && video.duration > 0) {
        const thumbUrl = URL.createObjectURL(file)
        video.thumbnailUrl = thumbUrl
      }
    } catch {
      // Metadata extraction is best-effort
    }

    setVideoFile(video)
    setStage('configuring')
  }, [])

  const handleProcess = useCallback(async () => {
    if (!videoFile) return

    setProcessingAborted(false)
    setStage('processing')
    setProgress({ percent: 0, phase: 'Starting...', eta: null })

    try {
      const preset = PRESETS.find(p => p.id === selectedPreset)!
      const startTime = performance.now()

      const { outputBlob, fileName } = await processVideo(
        videoFile.file,
        preset,
        enableVisual,
        advancedSettings,
        (p) => {
          if (!processingAborted) {
            setProgress(p)
          }
        }
      )

      if (processingAborted) {
        URL.revokeObjectURL(URL.createObjectURL(new Blob()))
        setStage('configuring')
        return
      }

      const blobUrl = URL.createObjectURL(outputBlob)
      const processingTimeMs = performance.now() - startTime

      setResult({
        originalSize: videoFile.size,
        processedSize: outputBlob.size,
        blobUrl,
        fileName,
        processingTimeMs,
      })
      setStage('result')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong during processing. Please try again.'
      setError(message)
      setStage('configuring')
    }
  }, [videoFile, selectedPreset, enableVisual, advancedSettings, processingAborted])

  const handleCancel = useCallback(() => {
    setProcessingAborted(true)
    setStage('configuring')
    setProgress({ percent: 0, phase: '', eta: null })
  }, [])

  const handleReset = useCallback(() => {
    if (result?.blobUrl) {
      URL.revokeObjectURL(result.blobUrl)
    }
    if (videoFile?.thumbnailUrl) {
      URL.revokeObjectURL(videoFile.thumbnailUrl)
    }
    setStage('upload')
    setVideoFile(null)
    setResult(null)
    setError(null)
    setProgress({ percent: 0, phase: '', eta: null })
  }, [result, videoFile])

  // Warn before unload during processing
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-200 flex items-start gap-3" role="alert">
            <span className="text-red-400 text-xl shrink-0">⚠</span>
            <div className="flex-1">
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 text-lg"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {stage === 'upload' && (
          <UploadZone onFile={handleFile} />
        )}

        {stage === 'configuring' && videoFile && (
          <ConfigPanel
            videoFile={videoFile}
            selectedPreset={selectedPreset}
            enableVisual={enableVisual}
            advancedSettings={advancedSettings}
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
            onCancel={handleCancel}
          />
        )}

        {stage === 'result' && result && (
          <ResultView
            result={result}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="text-center py-4 text-gray-500 text-sm border-t border-gray-800">
        <p>100% client-side · Zero uploads · Your files never leave this device</p>
      </footer>
    </div>
  )
}
