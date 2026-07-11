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

  const handleFaqClick = useCallback((e: React.MouseEvent) => {
    if (stage !== 'upload') {
      e.preventDefault()
      handleReset()
      setTimeout(() => {
        const el = document.getElementById('faq')
        el?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [stage, handleReset])

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
      <Header onFaqClick={handleFaqClick} />
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
          <>
            <UploadZone onFile={handleFile} />
            
            <section id="faq" className="mt-16 border-t border-gray-900 pt-12 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="bg-gray-900/20 border border-gray-800/60 p-5 rounded-xl transition-all hover:border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-indigo-400 mb-2">Are my videos uploaded to a server?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    No. NoiseGone processes everything 100% client-side using WebAssembly (FFmpeg.wasm). 
                    Your video never leaves your computer, ensuring complete privacy.
                  </p>
                </div>
                
                <div className="bg-gray-900/20 border border-gray-800/60 p-5 rounded-xl transition-all hover:border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-indigo-400 mb-2">What is the maximum file size?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    You can process files up to <strong>1 GB</strong>. Because processing happens in your 
                    browser's memory, actual performance depends on your computer's RAM and CPU power.
                  </p>
                </div>

                <div className="bg-gray-900/20 border border-gray-800/60 p-5 rounded-xl transition-all hover:border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-indigo-400 mb-2">Why is visual noise reduction slower?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Audio denoising is very fast. However, visual denoising processes individual frames spatially 
                    and temporally. This frame-by-frame filtering requires significant CPU overhead when run inside a browser sandbox.
                  </p>
                </div>

                <div className="bg-gray-900/20 border border-gray-800/60 p-5 rounded-xl transition-all hover:border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-indigo-400 mb-2">Which formats are supported?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    We support common video formats including <strong>MP4, MOV, MKV, WebM, and AVI</strong>. The output 
                    file is optimized as an MP4 container (H.264/AAC).
                  </p>
                </div>

                <div className="bg-gray-900/20 border border-gray-800/60 p-5 rounded-xl transition-all hover:border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-indigo-400 mb-2">Who created this tool?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    NoiseGone is an open-source tool developed by <a href="https://github.com/arqam66" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">@arqam66</a> to provide a fast, secure, and privacy-preserving denoiser for creators and professionals.
                  </p>
                </div>
              </div>
            </section>
          </>
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

      <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-800 flex flex-col gap-2 items-center bg-gray-950">
        <p>100% client-side · Zero uploads · Your files never leave this device</p>
        <p className="text-gray-600">
          Developed by{' '}
          <a
            href="https://github.com/arqam66"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            @arqam66
          </a>
        </p>
      </footer>
    </div>
  )
}
