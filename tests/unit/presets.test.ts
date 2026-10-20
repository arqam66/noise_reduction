import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ACCEPTED_EXTENSIONS,
  detectMediaKind,
  formatDuration,
  formatFileSize,
  formatTimeRemaining,
  MAX_FILE_SIZE,
} from '../../src/lib/presets.ts'

describe('detectMediaKind', () => {
  it('recognises video extensions case-insensitively', () => {
    assert.equal(detectMediaKind({ name: 'clip.MP4', type: '' }), 'video')
    assert.equal(detectMediaKind({ name: 'clip.mkv', type: '' }), 'video')
    assert.equal(detectMediaKind({ name: 'clip.webm', type: '' }), 'video')
  })

  it('recognises audio extensions', () => {
    assert.equal(detectMediaKind({ name: 'voice.mp3', type: '' }), 'audio')
    assert.equal(detectMediaKind({ name: 'voice.WAV', type: '' }), 'audio')
    assert.equal(detectMediaKind({ name: 'voice.flac', type: '' }), 'audio')
  })

  it('falls back to MIME type for unknown extensions', () => {
    assert.equal(detectMediaKind({ name: 'recording', type: 'audio/mpeg' }), 'audio')
    assert.equal(detectMediaKind({ name: 'recording', type: 'video/mp4' }), 'video')
  })

  it('prefers a known extension over a conflicting MIME type', () => {
    assert.equal(detectMediaKind({ name: 'audio.mp4', type: 'audio/mp4' }), 'video')
  })

  it('returns null for unsupported files', () => {
    assert.equal(detectMediaKind({ name: 'notes.txt', type: 'text/plain' }), null)
    assert.equal(detectMediaKind({ name: 'archive.zip', type: 'application/zip' }), null)
  })
})

describe('formatFileSize', () => {
  it('formats each unit boundary', () => {
    assert.equal(formatFileSize(0), '0 B')
    assert.equal(formatFileSize(1023), '1023 B')
    assert.equal(formatFileSize(1024), '1.0 KB')
    assert.equal(formatFileSize(1024 * 1024), '1.0 MB')
    assert.equal(formatFileSize(MAX_FILE_SIZE), '1.00 GB')
  })

  it('handles invalid input', () => {
    assert.equal(formatFileSize(-1), '—')
    assert.equal(formatFileSize(Number.NaN), '—')
    assert.equal(formatFileSize(Number.POSITIVE_INFINITY), '—')
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    assert.equal(formatDuration(0), '0:00')
    assert.equal(formatDuration(59.9), '0:59')
    assert.equal(formatDuration(60), '1:00')
    assert.equal(formatDuration(3661), '1:01:01')
  })

  it('handles invalid input', () => {
    assert.equal(formatDuration(-5), '—')
    assert.equal(formatDuration(Number.NaN), '—')
  })
})

describe('formatTimeRemaining', () => {
  it('returns null for invalid values', () => {
    assert.equal(formatTimeRemaining(-1), null)
    assert.equal(formatTimeRemaining(Number.NaN), null)
  })

  it('formats short, medium and long estimates', () => {
    assert.equal(formatTimeRemaining(30_000), '< 1 min remaining')
    assert.equal(formatTimeRemaining(90_000), '~2 min remaining')
    assert.equal(formatTimeRemaining(3_600_000), '~1 h remaining')
    assert.equal(formatTimeRemaining(3_900_000), '~1 h 5 min remaining')
  })
})

describe('ACCEPTED_EXTENSIONS', () => {
  it('includes both video and audio formats', () => {
    assert.match(ACCEPTED_EXTENSIONS, /\.mp4/)
    assert.match(ACCEPTED_EXTENSIONS, /\.mp3/)
    assert.match(ACCEPTED_EXTENSIONS, /\.wav/)
  })
})
