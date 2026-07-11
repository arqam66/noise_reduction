import type { ProcessingProgress } from '../types'

interface ProcessingViewProps {
  progress: ProcessingProgress
  onCancel: () => void
}

export function ProcessingView({ progress, onCancel }: ProcessingViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Animated icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-indigo-600/20 flex items-center justify-center animate-pulse-progress">
          <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Processing your video</h2>
          <p className="text-gray-400 text-sm">{progress.phase}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{Math.round(progress.percent)}%</span>
            {progress.eta && (
              <span className="text-sm text-gray-500">{progress.eta}</span>
            )}
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-left">
          <p className="text-xs text-gray-500">
            <span className="text-gray-400 font-medium">Tip:</span> You can switch to another tab while processing. 
            Closing this tab will cancel the process.
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
