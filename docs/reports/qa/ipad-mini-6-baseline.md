# iPad mini 6 Baseline Checklist

## Device + Build
- Device: iPad mini 6th gen (A15)
- OS: iPadOS 26.2
- Mode: Safari 26.2 or Home Screen
- Build: `Panda Violin 2.0.0` (update if changed)
- Date: 2026-02-03

## Build Output (Local, 2026-02-03)
- Initial JS (gzip): 4.3 KB
- Total JS (gzip): 100.0 KB
- Total CSS (gzip): 24.1 KB
- Total WASM (gzip): 67.4 KB
- Largest assets: `panda_core_bg.wasm` 45.0 KB (gzip), `panda_audio_bg.wasm` 22.4 KB (gzip), `game-metrics` 15.0 KB (gzip)

Note: These are local build outputs, not device runtime measurements.

## Cold Start TTI Proxy
- Clear Safari tabs
- Force close app (swipe away)
- Launch app
- Open Settings -> Performance -> Baseline metrics
- Tap `Record baseline snapshot`
- Tap `Export baseline JSON` (attach to issue log)
- Record `TTI proxy`, `LCP`, `Input max`, `Long task max`, `Frame max`, `Memory`

## Memory After 5 Minutes
- Start tuner
- Leave running 5 minutes
- Open Safari Web Inspector -> Memory
- Record JS heap / overall memory snapshot

## CPU During Pitch Detection
- Start tuner
- Play sustained notes for 30 seconds
- Open Settings -> Performance -> Baseline metrics
- Record `Audio budget avg/max` values and `Tuner start`
- Optional: Web Inspector CPU profile if available

## Audio Latency / Responsiveness
- Start tuner
- Pluck open A and observe UI response
- Subjective rating: Excellent / OK / Laggy
- Note any visible latency spikes

## Offline Readiness
- Open Settings -> Offline status
- Run Offline Self-Test
- Enable Airplane Mode
- Verify Home, Tuner, Metronome open
- Record missing assets or offline misses

## Notes
- Repro steps for any issues
- Screenshots if UI regressions
