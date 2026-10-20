import { useId, useState } from 'react'
import type { AdvancedSettings, MediaFile, PresetId } from '../types'
import { PRESETS, formatDuration, formatFileSize } from '../lib/presets'

interface ConfigPanelProps {
  mediaFile: MediaFile
  selectedPreset: PresetId
  enableVisual: boolean
  advancedSettings: AdvancedSettings | null
  largeFileWarning: string | null
  onPresetChange: (id: PresetId) => void
  onVisualToggle: (enabled: boolean) => void
  onAdvancedChange: (settings: AdvancedSettings | null) => void
  onStart: () => void
  onBack: () => void
}

const defaultAdvanced: AdvancedSettings = {
  audioNoiseFloor: -30,
  audioMethod: 'w',
  videoSpatial: 3,
  videoTemporal: 3,
  nlmeansS: 3,
  nlmeansR: 7,
  nlmeansP: 3,
  useNlmeans: false,
}

export function ConfigPanel({
  mediaFile,
  selectedPreset,
  enableVisual,
  advancedSettings,
  largeFileWarning,
  onPresetChange,
  onVisualToggle,
  onAdvancedChange,
  onStart,
  onBack,
}: ConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const ids = useId()

  const preset = PRESETS.find((item) => item.id === selectedPreset) ?? PRESETS[1]
  const isVideo = mediaFile.kind === 'video'
  const visualAvailable = isVideo && !preset.isAudioOnly
  // The stored preference is preserved; this only reflects what will actually
  // run. Selecting Voice-Only must not overwrite the user's choice.
  const visualEnabled = enableVisual && visualAvailable
  const settings = advancedSettings ?? defaultAdvanced

  const updateAdvanced = (patch: Partial<AdvancedSettings>) => {
    onAdvancedChange({ ...settings, ...patch })
  }

  return (
    <div className="space-y-6">
      {/* File info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
              {mediaFile.thumbnailUrl ? (
                <img
                  src={mediaFile.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-7 h-7 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900 truncate max-w-full">
                  {mediaFile.name}
                </h3>
                <span data-testid="media-kind" className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium uppercase tracking-wide">
                  {mediaFile.kind}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span>{formatFileSize(mediaFile.size)}</span>
                {mediaFile.duration !== null && (
                  <>
                    <span className="text-gray-300" aria-hidden="true">·</span>
                    <span>{formatDuration(mediaFile.duration)}</span>
                  </>
                )}
                {mediaFile.resolution && (
                  <>
                    <span className="text-gray-300" aria-hidden="true">·</span>
                    <span>{mediaFile.resolution}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            Change file
          </button>
        </div>

        {largeFileWarning && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {largeFileWarning}
          </p>
        )}
      </div>

      {/* Preset selector */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Choose a denoising preset</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESETS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onPresetChange(item.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-150
                ${selectedPreset === item.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 shadow-sm'
                }
              `}
              aria-pressed={selectedPreset === item.id}
            >
              <span className="text-2xl mb-2 block" aria-hidden="true">{item.icon}</span>
              <span className="font-medium text-gray-900 text-sm block">{item.name}</span>
              <span className="text-xs text-gray-400 mt-1 block leading-tight">{item.description}</span>
              {selectedPreset === item.id && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Visual denoise toggle */}
      {isVideo ? (
        <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div>
            <label htmlFor={`${ids}-visual`} className="font-medium text-gray-900 text-sm">
              Visual Noise Reduction
            </label>
            <p id={`${ids}-visual-help`} className="text-xs text-gray-400 mt-0.5">
              {preset.isAudioOnly
                ? 'Unavailable with Voice-Only, which cleans audio only.'
                : 'Reduces grain and visual noise (processing will take longer).'}
            </p>
          </div>
          <button
            type="button"
            id={`${ids}-visual`}
            data-testid="visual-toggle"
            role="switch"
            aria-checked={visualEnabled}
            aria-describedby={`${ids}-visual-help`}
            onClick={() => onVisualToggle(!enableVisual)}
            className={`
              relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200
              ${visualEnabled ? 'bg-indigo-600' : 'bg-gray-200'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            disabled={!visualAvailable}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                ${visualEnabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
          Audio-only file: visual denoising is skipped automatically.
        </div>
      )}

      {/* Advanced settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          aria-expanded={showAdvanced}
          aria-controls={`${ids}-advanced`}
        >
          <span className="font-medium text-gray-900 text-sm">Advanced Settings</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div id={`${ids}-advanced`} className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label htmlFor={`${ids}-noise-floor`} className="block text-sm text-gray-700 mb-1">
                Audio Noise Floor:{' '}
                <span className="text-indigo-600">{settings.audioNoiseFloor} dB</span>
              </label>
              <input
                id={`${ids}-noise-floor`}
                type="range"
                min={-60}
                max={-10}
                step={5}
                value={settings.audioNoiseFloor}
                onChange={(e) => updateAdvanced({ audioNoiseFloor: Number(e.target.value) })}
                className="w-full accent-indigo-600"
                aria-describedby={`${ids}-noise-floor-help`}
              />
              <p id={`${ids}-noise-floor-help`} className="text-xs text-gray-400 mt-0.5">
                Lower = more aggressive noise removal
              </p>
            </div>

            {visualAvailable && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor={`${ids}-nlmeans`} className="text-sm text-gray-700">
                    Use NLMeans (higher quality, slower)
                  </label>
                  <button
                    type="button"
                    id={`${ids}-nlmeans`}
                    role="switch"
                    aria-checked={settings.useNlmeans}
                    onClick={() => updateAdvanced({ useNlmeans: !settings.useNlmeans })}
                    className={`
                      relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200
                      ${settings.useNlmeans ? 'bg-indigo-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                        ${settings.useNlmeans ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>

                {!settings.useNlmeans ? (
                  <>
                    <div>
                      <label htmlFor={`${ids}-spatial`} className="block text-sm text-gray-700 mb-1">
                        Spatial Denoise:{' '}
                        <span className="text-indigo-600">{settings.videoSpatial}</span>
                      </label>
                      <input
                        id={`${ids}-spatial`}
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={settings.videoSpatial}
                        onChange={(e) => updateAdvanced({ videoSpatial: Number(e.target.value) })}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${ids}-temporal`} className="block text-sm text-gray-700 mb-1">
                        Temporal Denoise:{' '}
                        <span className="text-indigo-600">{settings.videoTemporal}</span>
                      </label>
                      <input
                        id={`${ids}-temporal`}
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={settings.videoTemporal}
                        onChange={(e) => updateAdvanced({ videoTemporal: Number(e.target.value) })}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor={`${ids}-nlmeans-s`} className="block text-sm text-gray-700 mb-1">
                        NLMeans S (filter strength):{' '}
                        <span className="text-indigo-600">{settings.nlmeansS}</span>
                      </label>
                      <input
                        id={`${ids}-nlmeans-s`}
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={settings.nlmeansS}
                        onChange={(e) => updateAdvanced({ nlmeansS: Number(e.target.value) })}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${ids}-nlmeans-r`} className="block text-sm text-gray-700 mb-1">
                        NLMeans R (patch radius):{' '}
                        <span className="text-indigo-600">{settings.nlmeansR}</span>
                      </label>
                      <input
                        id={`${ids}-nlmeans-r`}
                        type="range"
                        min={1}
                        max={15}
                        step={2}
                        value={settings.nlmeansR}
                        onChange={(e) => updateAdvanced({ nlmeansR: Number(e.target.value) })}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => onAdvancedChange(null)}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={onStart}
        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg transition-colors duration-150 shadow-md shadow-indigo-200"
      >
        Start Cleaning
      </button>
    </div>
  )
}
