# Product Requirements Document
## AI Noise Reduction Tool — Browser-Based Video Denoiser
> 100% Client-Side · Up to 1 GB · No Backend

| Field | Detail |
|---|---|
| Document Version | v1.0 |
| Status | Draft — For Review |
| Prepared By | Product Team |
| Date | July 2026 |
| Target Release | Q3 2025 |
| Platform | Web (Browser-only, No Backend) |
| Max File Size | 1 GB per video |

---

## 1. Executive Summary

The AI Noise Reduction Tool is a fully browser-based web application that enables users to remove audio and visual noise from video files up to 1 GB — entirely on their own device, with zero server uploads and zero data leaving the browser.

The tool leverages WebAssembly (FFmpeg.wasm), the Web Audio API, and modern browser processing to deliver studio-quality denoising for creators, podcasters, remote workers, and educators — without requiring any account, backend, or cloud infrastructure.

> **Core Value Proposition:** Privacy-first, instant, free noise reduction: drop a video, choose a preset, download a clean file. Everything runs in the browser. Nothing is uploaded.

---

## 2. Problem Statement

### 2.1 User Pain Points

- Video recordings from webcams, microphones, and mobile devices are often polluted with background hum, wind, keyboard clicks, and room echo.
- Existing noise-reduction tools are either (a) expensive desktop software or (b) cloud-based SaaS that requires uploading sensitive footage.
- Privacy concerns prevent many users (journalists, therapists, legal professionals) from uploading recordings to third-party servers.
- Non-technical users struggle to install and configure desktop software like Audacity or DaVinci Resolve.

### 2.2 Gap in the Market

No consumer-grade, free, browser-based tool currently handles video noise reduction (both audio + visual) in a privacy-preserving, zero-upload manner for files up to 1 GB.

---

## 3. Goals & Objectives

| # | Objective | Success Metric |
|---|---|---|
| G1 | Support video files up to 1 GB | 100% of files ≤ 1 GB processed without error on modern hardware |
| G2 | Zero backend / no upload | Network monitor shows 0 bytes sent to server during processing |
| G3 | Audio noise reduction | SNR improvement ≥ 12 dB on standard test clips |
| G4 | Visual noise reduction (optional) | PSNR improvement ≥ 3 dB on grainy video samples |
| G5 | Fast time-to-clean | Audio-only processing < 2× video duration on a mid-range laptop |
| G6 | Accessible UX | Task completion rate ≥ 85% in usability tests with non-technical users |
| G7 | Cross-browser support | Works on Chrome, Edge, Firefox, and Safari (desktop) |

---

## 4. Scope

### 4.1 In-Scope (v1.0)

- Audio noise reduction from video files (background hum, hiss, fan noise, wind)
- Visual / grain noise reduction for video (temporal + spatial denoising)
- Support for MP4, MOV, MKV, WebM, AVI input formats
- Output download as MP4 (H.264 / AAC)
- File size up to 1 GB
- Preset profiles: Light, Standard, Aggressive, Voice-Only, Film Grain
- Real-time audio waveform preview (before / after)
- Progress bar with estimated time remaining
- Browser-based processing using FFmpeg.wasm + Web Workers

### 4.2 Out-of-Scope (v1.0)

- Mobile native app (iOS / Android)
- Batch processing of multiple files simultaneously
- Cloud storage integration (Google Drive, Dropbox)
- User accounts and saved history
- Real-time live stream denoising
- Server-side processing of any kind
- Video editing (trimming, merging, colour grading)

---

## 5. User Personas

| Persona | Description | Primary Need |
|---|---|---|
| 🎙️ Content Creator | YouTuber / podcaster recording at home with background noise from AC or traffic | Quick audio cleanup before publishing |
| 💼 Remote Worker | Professional on video calls with noisy environments | Clean recording before sharing meeting replays |
| 🎓 Educator | Teacher recording lecture videos on a laptop microphone | Remove keyboard/room noise, no cloud uploads |
| 🔒 Privacy-Sensitive User | Journalist, lawyer, therapist handling confidential footage | Zero upload — processing must stay on-device |
| 🎬 Indie Filmmaker | Low-budget filmmaker with shaky or grainy footage | Remove visual grain + audio hiss in one step |
| 🖥️ Developer / Power User | Tech-savvy user wanting fine control over FFmpeg parameters | Access to advanced settings panel |

---

## 6. Functional Requirements

### 6.1 File Input & Validation

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Accept video files via drag-and-drop or file picker | Must Have |
| FR-02 | Support MP4, MOV, MKV, WebM, AVI input formats | Must Have |
| FR-03 | Validate file size ≤ 1 GB; show error if exceeded | Must Have |
| FR-04 | Detect and display video duration, resolution, codec info | Should Have |
| FR-05 | Show thumbnail preview of the first frame | Should Have |
| FR-06 | Warn if file is audio-only (no video stream) | Should Have |
| FR-07 | Allow user to cancel/reset and upload a new file | Must Have |

### 6.2 Noise Reduction Engine

| ID | Requirement | Priority |
|---|---|---|
| FR-08 | Run FFmpeg.wasm in a dedicated Web Worker to keep UI responsive | Must Have |
| FR-09 | Apply audio noise reduction via FFmpeg `afftdn` filter (AI noise profile) | Must Have |
| FR-10 | Apply visual denoising via FFmpeg `hqdn3d` or `nlmeans` filter | Should Have |
| FR-11 | Support 5 built-in presets with pre-tuned FFmpeg parameters | Must Have |
| FR-12 | Provide an Advanced panel to manually tune FFmpeg filter params | Nice to Have |
| FR-13 | Preserve original audio channels (mono, stereo, 5.1) | Must Have |
| FR-14 | Maintain original video resolution and frame rate | Must Have |
| FR-15 | Process audio-only pass when visual denoising is disabled (faster) | Should Have |

### 6.3 Preview & Comparison

| ID | Requirement | Priority |
|---|---|---|
| FR-16 | Show waveform visualisation of original audio track | Should Have |
| FR-17 | Show waveform of processed audio after completion | Should Have |
| FR-18 | Provide audio playback player for before/after comparison | Must Have |
| FR-19 | Show a side-by-side video preview frame (visual noise only) | Nice to Have |
| FR-20 | Display SNR improvement estimate after processing | Nice to Have |

### 6.4 Processing & Progress

| ID | Requirement | Priority |
|---|---|---|
| FR-21 | Display real-time progress bar with percentage and ETA | Must Have |
| FR-22 | Show FFmpeg log output in collapsible debug panel | Nice to Have |
| FR-23 | Allow user to cancel processing at any point | Must Have |
| FR-24 | Prevent browser tab close during processing (warn user) | Should Have |
| FR-25 | Handle WebAssembly out-of-memory gracefully with clear error | Must Have |

### 6.5 Output & Download

| ID | Requirement | Priority |
|---|---|---|
| FR-26 | Export processed video as MP4 (H.264 video + AAC audio) | Must Have |
| FR-27 | Offer optional WebM (VP9 + Opus) as alternative export | Nice to Have |
| FR-28 | Auto-suggest filename: `original_name_denoised.mp4` | Must Have |
| FR-29 | Allow user to download immediately after processing | Must Have |
| FR-30 | Show file size comparison (original vs processed) | Should Have |
| FR-31 | Clear/delete all data from memory after download | Must Have |

---

## 7. Non-Functional Requirements

### 7.1 Performance

- Audio-only processing must complete in ≤ 2× video duration on a laptop with 8-core CPU.
- UI must remain interactive (≥ 30 fps) during background processing via Web Workers.
- Initial page load (including FFmpeg.wasm core) ≤ 5 seconds on a 50 Mbps connection.
- Memory usage must stay below 3 GB RAM for 1 GB source files.

### 7.2 Privacy & Security

- Zero data transmission: no video, audio, or metadata leaves the browser at any point.
- No analytics SDK that captures file content or names.
- Content-Security-Policy headers must block external script injection.
- No cookies or localStorage used for video/audio data.

### 7.3 Browser Compatibility

| Browser | Minimum Version | Notes |
|---|---|---|
| Chrome / Edge | 92+ | Full feature support; primary target |
| Firefox | 90+ | Full feature support |
| Safari | 15.4+ | SharedArrayBuffer requires COOP/COEP headers |
| Mobile Chrome/Safari | v1.1 target | Out-of-scope for v1.0 due to memory limits |

### 7.4 Reliability

- Processing engine must not crash on files up to 1 GB on systems with ≥ 8 GB RAM.
- Graceful error handling with user-friendly messages (no raw FFmpeg errors shown by default).
- No data loss — original file is never modified; only the copy in memory is processed.

### 7.5 Accessibility

- WCAG 2.1 AA compliance for all UI components.
- Keyboard-navigable upload, preset selection, process, and download actions.
- Sufficient colour contrast for all text (≥ 4.5:1).
- Progress updates announced via ARIA live regions.

---

## 8. Technical Architecture

> **Principle:** The application is a static site with no server-side component. All computation happens in the user's browser using WebAssembly and Web APIs.

### 8.1 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| UI Framework | React 18 + Vite | Component rendering, fast HMR, static build |
| Styling | Tailwind CSS | Utility-first responsive design |
| Video Processing | FFmpeg.wasm 0.12+ | Core noise reduction via WebAssembly |
| Threading | Web Workers + SharedArrayBuffer | Non-blocking background processing |
| Audio Waveform | WaveSurfer.js | Before/after audio visualisation |
| File Handling | Browser File API + Blob | Read input, generate download output |
| Hosting | CDN / Static hosting (Vercel, Cloudflare Pages) | No server needed |
| COOP/COEP Headers | Required for SharedArrayBuffer | Enables multi-threaded WASM |

### 8.2 Processing Pipeline

1. **File Load** — User drops file → FileReader reads into ArrayBuffer in memory.
2. **Validation** — Check MIME type, file size (≤ 1 GB), probe metadata via FFmpeg.
3. **Preset Selection** — User picks denoising preset or configures custom parameters.
4. **Processing** — Web Worker runs FFmpeg.wasm with selected filters. UI thread stays free.
5. **Output Assembly** — FFmpeg writes output to virtual file system (MEMFS).
6. **Download** — Output buffer transferred to main thread → Blob URL → browser download.
7. **Cleanup** — All buffers and MEMFS data cleared from memory.

### 8.3 FFmpeg Filter Presets

| Preset | Audio Filter | Video Filter | Use Case |
|---|---|---|---|
| Light | `afftdn=nf=-20` | `hqdn3d=1:1:2:2` | Minor hiss, clean environment |
| Standard | `afftdn=nf=-30` | `hqdn3d=3:3:6:6` | Typical webcam / microphone recording |
| Aggressive | `afftdn=nf=-50` | `hqdn3d=6:6:10:10` | Heavy background noise / grainy footage |
| Voice-Only | `afftdn=nf=-40:nt=w` | none (passthrough) | Podcast / voice recording |
| Film Grain | `afftdn=nf=-25` | `nlmeans=s=3:r=7:p=3` | Cinematic / vintage footage |

---

## 9. UI/UX Requirements

### 9.1 Page Structure

- Single-page application with three primary states: **Upload → Processing → Result**.
- Persistent header with product name, privacy badge ("100% On-Device"), and FAQ link.
- No login, no account, no modal gates.

### 9.2 Upload State

- Large drag-and-drop zone (min 300 px height) with dashed border and upload icon.
- File picker fallback button for users who cannot drag-and-drop.
- Accepted formats listed below the drop zone.
- Inline error if file > 1 GB or unsupported format (red border, clear message).

### 9.3 Configure & Process State

- Show file name, duration, resolution, and estimated processing time.
- Preset selector rendered as icon cards (not a dropdown).
- Toggle for "Visual Noise Reduction" (slower) with tooltip explanation.
- "Advanced" collapsible section for FFmpeg parameter overrides.
- Prominent "Start Cleaning" CTA button.
- Progress bar with animated fill, %, and "X min remaining" label.
- Cancel button clearly visible during processing.

### 9.4 Result State

- Success banner with checkmark icon.
- Before/after audio waveform viewer with playback controls.
- Original size vs. processed size comparison.
- Prominent "Download Cleaned Video" button.
- "Process Another File" reset button.

---

## 10. Memory & 1 GB File Handling Strategy

> **Challenge:** Browsers limit available heap memory. A 1 GB video file, when loaded alongside the processed output, can require 2–4 GB of RAM. This requires careful memory management.

### 10.1 Strategies

- **Chunked transfer** — Use FFmpeg.wasm's pipe API to read input in 64 MB chunks rather than loading the entire file at once.
- **MEMFS management** — Write FFmpeg output directly to MEMFS; do not keep both input and output as full ArrayBuffers simultaneously.
- **Progressive cleanup** — Free input buffer from memory as soon as FFmpeg has consumed it.
- **Memory check** — Read `navigator.deviceMemory` on page load; warn users with < 4 GB RAM that large files may fail.
- **SharedArrayBuffer** — Use shared memory for FFmpeg to eliminate copy overhead between main thread and worker.
- **Streaming download** — Use `createObjectURL(blob)` — do not base64-encode output (triples memory usage).

### 10.2 Expected Memory Footprint

| File Size | RAM Required (est.) | Recommended System RAM |
|---|---|---|
| 100 MB | ~300 MB | 4 GB+ |
| 500 MB | ~1.2 GB | 8 GB+ |
| 1 GB | ~2.4 GB | 16 GB recommended, 8 GB minimum |

---

## 11. Error Handling

| Error Condition | User-Facing Message | Recovery Action |
|---|---|---|
| File > 1 GB | "This file exceeds the 1 GB limit. Please trim or compress it first." | Reset to upload state |
| Unsupported format | "This format isn't supported. Please convert to MP4, MOV, or WebM." | Reset to upload state |
| Out of memory (WASM) | "Your device ran out of memory. Try a shorter clip or close other tabs." | Show retry with "Light" preset |
| SharedArrayBuffer blocked | "Multi-threading is unavailable. Processing will be slower." | Fall back to single-threaded mode |
| FFmpeg crash / timeout | "Something went wrong during processing. Please try again." | Show retry button |
| Browser unsupported | "Your browser doesn't support WebAssembly. Please use Chrome, Edge, or Firefox." | Block processing, show upgrade link |

---

## 12. Success Metrics (KPIs)

| Metric | Target (3 months post-launch) | Measurement Method |
|---|---|---|
| Monthly Active Users (MAU) | 10,000 MAU | Privacy-respecting page-view analytics (no PII) |
| Task Completion Rate | ≥ 85% | Usability studies, funnel analysis |
| Processing Success Rate | ≥ 95% for files ≤ 500 MB | Client-side error event logging |
| 1 GB File Success Rate | ≥ 75% on 16 GB RAM systems | Test environment benchmarks |
| Net Promoter Score (NPS) | ≥ 40 | Post-task survey (optional) |
| Page Load Time | < 5 seconds (P75) | Web Vitals / Lighthouse |
| Avg. Audio Processing Speed | < 2× video duration | Client-side timing logs |

---

## 13. Milestones & Timeline

| Phase | Milestone | Duration | Target |
|---|---|---|---|
| Phase 1 | Project setup, FFmpeg.wasm integration, file upload/validation | 2 weeks | Week 2 |
| Phase 2 | Audio noise reduction pipeline + Web Worker, progress UI | 2 weeks | Week 4 |
| Phase 3 | Preset system, before/after audio preview, download flow | 2 weeks | Week 6 |
| Phase 4 | Visual (video) denoising, 1 GB memory optimisation | 3 weeks | Week 9 |
| Phase 5 | Full UI polish, accessibility audit, cross-browser testing | 2 weeks | Week 11 |
| Phase 6 | Performance benchmarking, error handling hardening, beta | 1 week | Week 12 |
| **Launch** | **Public release on CDN with COOP/COEP headers** | — | **Week 13** |

---

## 14. Constraints & Assumptions

### 14.1 Constraints

- **No backend** — all processing must occur client-side. This is a hard constraint.
- 1 GB file size cap is the maximum; larger files are explicitly out-of-scope.
- COOP/COEP headers are required for SharedArrayBuffer and must be set at the hosting/CDN layer.
- FFmpeg.wasm binary is ~25 MB; must be cached via Service Worker after first load.
- Safari support for SharedArrayBuffer requires HTTPS + proper headers.

### 14.2 Assumptions

- Target users have modern desktop/laptop browsers (Chrome 92+, Firefox 90+, Edge 92+, Safari 15.4+).
- Target devices have at least 8 GB RAM for files up to 500 MB, 16 GB for files approaching 1 GB.
- Users have a stable internet connection for the initial ~25 MB FFmpeg.wasm download.
- After first load, the tool works fully offline (Service Worker caches WASM binary).

---

## 15. Open Questions

| # | Question | Owner | Target Resolution |
|---|---|---|---|
| Q1 | Should we support audio-only files (.mp3, .wav) in v1.0 as a bonus feature? | PM | Phase 1 kick-off |
| Q2 | Do we allow optional anonymous processing telemetry to help diagnose failures? | Legal / PM | Before Phase 5 |
| Q3 | Which CDN/hosting provider best supports the required COOP/COEP headers? | Engineering | Phase 1 |
| Q4 | Should the Advanced panel expose raw FFmpeg CLI input for power users? | UX / PM | Phase 3 |
| Q5 | What fallback do we offer for Safari users on macOS < 15.4 (no SharedArrayBuffer)? | Engineering | Phase 4 |
| Q6 | Can we use ONNX Runtime Web / Whisper.cpp for a superior AI noise model vs FFmpeg filters? | Engineering | v2.0 consideration |

---

## Appendix: Glossary

| Term | Definition |
|---|---|
| FFmpeg.wasm | A WebAssembly port of the FFmpeg multimedia framework, enabling browser-based video/audio processing. |
| afftdn | FFmpeg audio filter: "Adaptive Fast Fourier Transform Denoiser" — removes stationary noise from audio. |
| hqdn3d | FFmpeg video filter: "High Quality 3D Denoiser" — reduces temporal + spatial grain in video frames. |
| nlmeans | FFmpeg video filter: "Non-Local Means Denoiser" — higher quality visual denoising, more CPU-intensive. |
| SharedArrayBuffer | Browser API enabling shared memory between the main thread and Web Workers; required for multi-threaded WASM. |
| COOP/COEP | Cross-Origin Opener Policy / Cross-Origin Embedder Policy — HTTP headers required to unlock SharedArrayBuffer in browsers. |
| MEMFS | In-memory virtual filesystem used by FFmpeg.wasm to read/write files without touching disk. |
| SNR | Signal-to-Noise Ratio — higher is better; measures audio quality improvement. |
| PSNR | Peak Signal-to-Noise Ratio — used to measure video quality improvement after denoising. |
| Web Worker | Browser API that runs JavaScript in a background thread, keeping the UI responsive during heavy computation. |

---

*End of Document — v1.0*
