import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AdvancedSettings } from '../../src/types.ts'
import { PRESETS } from '../../src/lib/presets.ts'
import {
  buildFFmpegArgs,
  canStreamCopyVideo,
  ensureEvenDimensions,
  getSafeExtension,
} from '../../src/lib/ffmpegArgs.ts'

function preset(id: string) {
  const found = PRESETS.find((item) => item.id === id)
  assert.ok(found, `missing preset ${id}`)
  return found
}

const advanced: AdvancedSettings = {
  audioNoiseFloor: -30,
  audioMethod: 'w',
  videoSpatial: 4,
  videoTemporal: 5,
  nlmeansS: 6,
  nlmeansR: 9,
  nlmeansP: 3,
  useNlmeans: false,
}

describe('buildFFmpegArgs', () => {
  it('returns the preset audio filter and video filter when visual is enabled', () => {
    const result = buildFFmpegArgs(preset('standard'), true)
    assert.match(result.audioFilter, /afftdn=nr=25/)
    assert.equal(result.videoFilter, 'hqdn3d=3:3:6:6')
  })

  it('omits the video filter when visual is disabled', () => {
    const result = buildFFmpegArgs(preset('standard'), false)
    assert.equal(result.videoFilter, '')
  })

  it('never returns a video filter for the Voice-Only preset', () => {
    // Regression: choosing Voice-Only must not force the stored preference off,
    // but it must suppress visual processing while active.
    const result = buildFFmpegArgs(preset('voice-only'), true)
    assert.equal(result.videoFilter, '')
    assert.match(result.audioFilter, /afftdn=nt=w/)
  })

  it('builds advanced hqdn3d settings using doubled temporal values', () => {
    const result = buildFFmpegArgs(preset('standard'), true, advanced)
    assert.equal(result.audioFilter, 'highpass=f=80,afftdn=nt=w:nr=49:nf=-30:tn=1')
    assert.equal(result.videoFilter, 'hqdn3d=4:5:8:10')
  })

  it('builds NLMeans settings when requested', () => {
    const result = buildFFmpegArgs(preset('standard'), true, {
      ...advanced,
      useNlmeans: true,
    })
    assert.equal(result.videoFilter, 'nlmeans=s=6:r=9:p=3')
  })

  it('suppresses advanced video filters for Voice-Only', () => {
    const result = buildFFmpegArgs(preset('voice-only'), true, {
      ...advanced,
      useNlmeans: true,
    })
    assert.equal(result.videoFilter, '')
  })
})

describe('ensureEvenDimensions', () => {
  it('appends a scale filter to an existing chain', () => {
    assert.equal(
      ensureEvenDimensions('hqdn3d=3:3:6:6'),
      'hqdn3d=3:3:6:6,scale=trunc(iw/2)*2:trunc(ih/2)*2'
    )
  })

  it('returns just the scale filter for an empty chain', () => {
    assert.equal(ensureEvenDimensions(''), 'scale=trunc(iw/2)*2:trunc(ih/2)*2')
  })
})

describe('getSafeExtension', () => {
  it('lowercases a short extension', () => {
    assert.equal(getSafeExtension('clip.MP4', 'video'), 'mp4')
    assert.equal(getSafeExtension('voice.WAV', 'audio'), 'wav')
  })

  it('falls back by media kind when there is no usable extension', () => {
    assert.equal(getSafeExtension('recording', 'video'), 'mp4')
    assert.equal(getSafeExtension('recording', 'audio'), 'audio')
    assert.equal(getSafeExtension('clip.verylongextension', 'video'), 'mp4')
  })
})

describe('canStreamCopyVideo', () => {
  it('allows MP4-family sources to be remuxed', () => {
    assert.equal(canStreamCopyVideo('clip.mp4'), true)
    assert.equal(canStreamCopyVideo('clip.MP4'), true)
    assert.equal(canStreamCopyVideo('clip.m4v'), true)
  })

  it('requires re-encoding for other containers', () => {
    assert.equal(canStreamCopyVideo('clip.webm'), false)
    assert.equal(canStreamCopyVideo('clip.mkv'), false)
    assert.equal(canStreamCopyVideo('clip.avi'), false)
    assert.equal(canStreamCopyVideo('clip.mov'), false)
  })
})
