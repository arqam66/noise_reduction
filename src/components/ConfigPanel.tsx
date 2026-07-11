import { useState } from 'react'
import type { VideoFile, PresetId, AdvancedSettings } from '../types'
import { PRESETS, formatFileSize, formatDuration } from '../lib/presets'

interface ConfigPanelProps {
  videoFile: VideoFile
  selectedPreset: PresetId
  enableVisual: boolean
  advancedSettings: AdvancedSettings | null
  onPresetChange: (id: PresetId) => void
  onVisualToggle: (enabled: boolean) => void
  onAdvancedChange: (settings: AdvancedSettings | null) => void
  onStart: () => void
  onBack: () => void
}

export function ConfigPanel({
  videoFile,
  selectedPreset,
  enableVisual,
  advancedSettings,
  onPresetChange,
  onVisualToggle,
  onAdvancedChange,
  onStart,
  onBack,
}: ConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-6">
      {/* File info */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{videoFile.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span>{formatFileSize(videoFile.size)}</span>
              {videoFile.duration !== null && (
                <>
                  <span className="text-gray-700">·</span>
                  <span>{formatDuration(videoFile.duration)}</span>
                </>
              )}
              {videoFile.resolution && (
                <>
                  <span className="text-gray-700">·</span>
                  <span>{videoFile.resolution}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors px-3 py-1 rounded-lg hover:bg-gray-800"
          >
            Change file
          </button>
        </div>
      </div>

      {/* Preset selector */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Choose a denoising preset</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onPresetChange(preset.id)
                if (preset.isAudioOnly) {
                  onVisualToggle(false)
                }
              }}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-150
                ${selectedPreset === preset.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900'
                }
              `}
              aria-pressed={selectedPreset === preset.id}
            >
              <span className="text-2xl mb-2 block">{preset.icon}</span>
              <span className="font-medium text-white text-sm block">{preset.name}</span>
              <span className="text-xs text-gray-500 mt-1 block leading-tight">{preset.description}</span>
              {selectedPreset === preset.id && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Visual denoise toggle */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div>
          <label htmlFor="visual-toggle" className="font-medium text-white text-sm">
            Visual Noise Reduction
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Reduces grain and visual noise (processing will take longer)
          </p>
        </div>
        <button
          id="visual-toggle"
          role="switch"
          aria-checked={enableVisual}
          onClick={() => onVisualToggle(!enableVisual)}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${enableVisual ? 'bg-indigo-600' : 'bg-gray-700'}
          `}
          disabled={PRESETS.find(p => p.id === selectedPreset)?.isAudioOnly}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
              ${enableVisual ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Advanced settings */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
        >
          <span className="font-medium text-white text-sm">Advanced Settings</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-800 pt-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Audio Noise Floor: <span className="text-indigo-400">{advancedSettings?.audioNoiseFloor ?? -30} dB</span>
              </label>
              <input
                type="range"
                min={-60}
                max={-10}
                step={5}
                value={advancedSettings?.audioNoiseFloor ?? -30}
                onChange={(e) => onAdvancedChange({
                  ...(advancedSettings ?? defaultAdvanced),
                  audioNoiseFloor: Number(e.target.value),
                })}
                className="w-full accent-indigo-500"
              />
              <p className="text-xs text-gray-600 mt-0.5">Lower = more aggressive noise removal</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Use NLMeans (higher quality, slower)</span>
              <button
                role="switch"
                aria-checked={advancedSettings?.useNlmeans ?? false}
                onClick={() => onAdvancedChange({
                  ...(advancedSettings ?? defaultAdvanced),
                  useNlmeans: !(advancedSettings?.useNlmeans ?? false),
                })}
                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200
                  ${(advancedSettings?.useNlmeans ?? false) ? 'bg-indigo-600' : 'bg-gray-700'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
                    ${(advancedSettings?.useNlmeans ?? false) ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {enableVisual && !(advancedSettings?.useNlmeans ?? false) && (
              <>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Spatial Denoise: <span className="text-indigo-400">{advancedSettings?.videoSpatial ?? 3}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={advancedSettings?.videoSpatial ?? 3}
                    onChange={(e) => onAdvancedChange({
                      ...(advancedSettings ?? defaultAdvanced),
                      videoSpatial: Number(e.target.value),
                    })}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Temporal Denoise: <span className="text-indigo-400">{advancedSettings?.videoTemporal ?? 3}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={advancedSettings?.videoTemporal ?? 3}
                    onChange={(e) => onAdvancedChange({
                      ...(advancedSettings ?? defaultAdvanced),
                      videoTemporal: Number(e.target.value),
                    })}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </>
            )}

            {enableVisual && (advancedSettings?.useNlmeans ?? false) && (
              <>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    NLMeans S (filter strength): <span className="text-indigo-400">{advancedSettings?.nlmeansS ?? 3}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={advancedSettings?.nlmeansS ?? 3}
                    onChange={(e) => onAdvancedChange({
                      ...(advancedSettings ?? defaultAdvanced),
                      nlmeansS: Number(e.target.value),
                    })}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    NLMeans R (patch radius): <span className="text-indigo-400">{advancedSettings?.nlmeansR ?? 7}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={2}
                    value={advancedSettings?.nlmeansR ?? 7}
                    onChange={(e) => onAdvancedChange({
                      ...(advancedSettings ?? defaultAdvanced),
                      nlmeansR: Number(e.target.value),
                    })}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </>
            )}

            <button
              onClick={() => onAdvancedChange(null)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-colors duration-150 shadow-lg shadow-indigo-500/25"
      >
        Start Cleaning
      </button>
    </div>
  )
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
