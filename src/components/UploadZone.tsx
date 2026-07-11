import { useState, useCallback, useRef, type DragEvent } from 'react'
import { ACCEPTED_EXTENSIONS } from '../lib/presets'

interface UploadZoneProps {
  onFile: (file: File) => void
}

export function UploadZone({ onFile }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFile(files[0])
    }
  }, [onFile])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFile(files[0])
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [onFile])

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Clean your videos, instantly
        </h2>
        <p className="text-gray-500 text-lg max-w-lg mx-auto">
          Remove background noise, hiss, hum, and visual grain — entirely in your browser. Nothing is uploaded.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a video file"
        className={`
          w-full max-w-2xl min-h-[320px] rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4 p-8
          transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <div className={`
          w-20 h-20 rounded-full flex items-center justify-center
          transition-colors duration-200
          ${isDragging ? 'bg-indigo-100' : 'bg-white border border-gray-200 shadow-sm'}
        `}>
          <svg
            className={`w-10 h-10 transition-colors duration-200 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-gray-800 font-medium text-lg">
            {isDragging ? 'Drop your video here' : 'Drag & drop a video file'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            or <span className="text-indigo-600 underline">browse files</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-1 rounded bg-white border border-gray-200">MP4</span>
          <span className="px-2 py-1 rounded bg-white border border-gray-200">MOV</span>
          <span className="px-2 py-1 rounded bg-white border border-gray-200">MKV</span>
          <span className="px-2 py-1 rounded bg-white border border-gray-200">WebM</span>
          <span className="px-2 py-1 rounded bg-white border border-gray-200">AVI</span>
          <span className="mx-1 text-gray-300">·</span>
          <span className="text-gray-400">Max 1 GB</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleInputChange}
          aria-label="Choose a video file"
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            No upload
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            No account
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            100% free
          </span>
        </div>
      </div>
    </div>
  )
}
