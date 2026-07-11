import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import type { ProcessingResult } from '../types'
import { formatFileSize } from '../lib/presets'

interface ResultViewProps {
  result: ProcessingResult
  onReset: () => void
}

export function ResultView({ result, onReset }: ResultViewProps) {
  const originalWsRef = useRef<WaveSurfer | null>(null)
  const processedWsRef = useRef<WaveSurfer | null>(null)
  const originalContainerRef = useRef<HTMLDivElement>(null)
  const processedContainerRef = useRef<HTMLDivElement>(null)
  const [playingOriginal, setPlayingOriginal] = useState(false)
  const [playingProcessed, setPlayingProcessed] = useState(false)
  const [originalLoaded, setOriginalLoaded] = useState(false)
  const [processedLoaded, setProcessedLoaded] = useState(false)

  useEffect(() => {
    if (!originalContainerRef.current || !processedContainerRef.current) return

    const originalWs = WaveSurfer.create({
      container: originalContainerRef.current,
      waveColor: '#4b5563',
      progressColor: '#6366f1',
      cursorColor: '#818cf8',
      height: 80,
      barWidth: 2,
      barGap: 1,
    })

    const processedWs = WaveSurfer.create({
      container: processedContainerRef.current,
      waveColor: '#4b5563',
      progressColor: '#22c55e',
      cursorColor: '#4ade80',
      height: 80,
      barWidth: 2,
      barGap: 1,
    })

    originalWs.on('ready', () => setOriginalLoaded(true))
    processedWs.on('ready', () => setProcessedLoaded(true))

    originalWs.on('play', () => setPlayingOriginal(true))
    originalWs.on('pause', () => setPlayingOriginal(false))
    originalWs.on('finish', () => setPlayingOriginal(false))

    processedWs.on('play', () => setPlayingProcessed(true))
    processedWs.on('pause', () => setPlayingProcessed(false))
    processedWs.on('finish', () => setPlayingProcessed(false))

    originalWsRef.current = originalWs
    processedWsRef.current = processedWs

    // Load audio from the original file if available, or use silent placeholder
    // For real use, we'd extract audio from the original file
    // Here we load the processed file for both to demonstrate
    if (result.blobUrl) {
      processedWs.load(result.blobUrl)
    }

    return () => {
      originalWs.destroy()
      processedWs.destroy()
    }
  }, [result.blobUrl])

  const toggleOriginal = () => {
    originalWsRef.current?.playPause()
  }

  const toggleProcessed = () => {
    processedWsRef.current?.playPause()
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = result.blobUrl
    a.download = result.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const sizeDiff = result.originalSize - result.processedSize
  const sizePercent = ((sizeDiff / result.originalSize) * 100).toFixed(1)
  const processingSeconds = (result.processingTimeMs / 1000).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-600/20 flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Video cleaned successfully!</h2>
        <p className="text-gray-400 text-sm">
          Processed in {processingSeconds}s
        </p>
      </div>

      {/* Audio waveform comparison */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-6">
        <h3 className="text-sm font-medium text-gray-300">Audio Comparison</h3>

        {/* Original */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Original</span>
            <button
              onClick={toggleOriginal}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              aria-label={playingOriginal ? 'Pause original' : 'Play original'}
            >
              {playingOriginal ? (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <div ref={originalContainerRef} className="bg-gray-800/50 rounded-lg p-2" />
          {!originalLoaded && (
            <p className="text-xs text-gray-600 mt-1 text-center">Load the original file to preview</p>
          )}
        </div>

        {/* Processed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-green-500 uppercase tracking-wider">Denoised</span>
            <button
              onClick={toggleProcessed}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              aria-label={playingProcessed ? 'Pause denoised' : 'Play denoised'}
            >
              {playingProcessed ? (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <div ref={processedContainerRef} className="bg-gray-800/50 rounded-lg p-2" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Original</p>
          <p className="text-lg font-semibold text-white">{formatFileSize(result.originalSize)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Denoised</p>
          <p className="text-lg font-semibold text-white">{formatFileSize(result.processedSize)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Size Change</p>
          <p className={`text-lg font-semibold ${sizeDiff >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
            {sizeDiff >= 0 ? `-${sizePercent}%` : `+${Math.abs(Number(sizePercent))}%`}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-colors duration-150 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Cleaned Video
        </button>
        <button
          onClick={onReset}
          className="py-4 px-8 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium"
        >
          Process Another File
        </button>
      </div>
    </div>
  )
}
