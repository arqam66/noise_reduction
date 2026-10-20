import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { ACCEPTED_EXTENSIONS } from '../lib/presets'

interface UploadZoneProps {
  onFile: (file: File) => void
  busy?: boolean
}

const FORMAT_BADGES = ['MP4', 'MOV', 'MKV', 'WebM', 'AVI', 'MP3', 'WAV', 'M4A', 'FLAC', 'OGG']

export function UploadZone({ onFile, busy = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // dragleave fires for every child element, so track nesting depth instead of
  // toggling on a single leave event.
  const dragDepthRef = useRef(0)

  const openPicker = useCallback(() => {
    if (busy) return
    inputRef.current?.click()
  }, [busy])

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    dragDepthRef.current += 1
    setIsDragging(true)
  }, [busy])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!busy) e.dataTransfer.dropEffect = 'copy'
  }, [busy])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setIsDragging(false)

    if (busy) return
    const files = e.dataTransfer.files
    if (files.length > 0) onFile(files[0])
  }, [busy, onFile])

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFile(files[0])
    }
    // Reset input so the same file can be re-selected.
    e.target.value = ''
  }, [onFile])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }, [openPicker])

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Clean your videos and audio, instantly
        </h2>
        <p className="text-gray-500 text-lg max-w-lg mx-auto">
          Remove background noise, hiss, hum, and visual grain — entirely in your browser. Nothing is uploaded.
        </p>
      </div>

      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label="Upload a video or audio file"
        aria-busy={busy}
        aria-disabled={busy}
        className={`
          w-full max-w-2xl min-h-[320px] rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4 p-8
          transition-all duration-200 cursor-pointer
          ${busy ? 'cursor-wait opacity-80' : ''}
          ${isDragging
            ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
      >
        <div className={`
          w-20 h-20 rounded-full flex items-center justify-center
          transition-colors duration-200
          ${isDragging ? 'bg-indigo-100' : 'bg-white border border-gray-200 shadow-sm'}
        `}>
          {busy ? (
            <svg
              className="w-9 h-9 text-indigo-500 motion-safe:animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg
              className={`w-10 h-10 transition-colors duration-200 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        <div className="text-center" aria-live="polite">
          <p className="text-gray-800 font-medium text-lg">
            {busy
              ? 'Reading file details…'
              : isDragging
                ? 'Drop your file here'
                : 'Drag & drop a video or audio file'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {busy ? 'This only takes a moment' : (
              <>or <span className="text-indigo-600 underline">browse files</span></>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
          {FORMAT_BADGES.map((format) => (
            <span key={format} className="px-2 py-1 rounded bg-white border border-gray-200">
              {format}
            </span>
          ))}
          <span className="mx-1 text-gray-300" aria-hidden="true">·</span>
          <span className="text-gray-400">Max 1 GB</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleInputChange}
          onClick={(e) => e.stopPropagation()}
          disabled={busy}
          aria-label="Choose a video or audio file"
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            No upload
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            No account
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            100% free
          </span>
        </div>
      </div>
    </div>
  )
}
