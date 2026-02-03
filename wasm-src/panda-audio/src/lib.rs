//! Panda Audio - High-Performance Pitch Detection for Violin
//!
//! This WASM module provides real-time pitch detection using the
//! Autocorrelation algorithm, optimized for violin frequencies (196Hz - 1319Hz).
//!
//! # Features
//! - FFT-based autocorrelation pitch detection
//! - RMS volume calculation
//! - Note classification with cents deviation
//! - Optimized for 48kHz sample rate

use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Musical note names
const NOTE_NAMES: [&str; 12] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/// Violin string frequencies (standard tuning)
pub const VIOLIN_STRINGS: [(f32, &str); 4] = [
    (196.0, "G3"),
    (293.66, "D4"),
    (440.0, "A4"),
    (659.25, "E5"),
];

/// Pitch detection result
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct PitchResult {
    /// Detected frequency in Hz (0 if no pitch detected)
    frequency: f32,
    /// Closest note name (e.g., "A4")
    note: String,
    /// Deviation from perfect pitch in cents (-50 to +50)
    cents: i32,
    /// RMS volume level (0.0 to 1.0)
    volume: f32,
    /// Confidence of detection (0.0 to 1.0)
    confidence: f32,
    /// Whether the pitch is considered "in tune"
    in_tune: bool,
    /// Stable note name after smoothing
    stable_note: String,
    /// Stable cents offset when a note is locked
    stable_cents: i32,
    /// Stability ratio (0.0 to 1.0)
    stability: f32,
}

#[wasm_bindgen]
impl PitchResult {
    #[wasm_bindgen(getter)]
    pub fn frequency(&self) -> f32 {
        self.frequency
    }

    #[wasm_bindgen(getter)]
    pub fn note(&self) -> String {
        self.note.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn cents(&self) -> i32 {
        self.cents
    }

    #[wasm_bindgen(getter)]
    pub fn volume(&self) -> f32 {
        self.volume
    }

    #[wasm_bindgen(getter)]
    pub fn confidence(&self) -> f32 {
        self.confidence
    }

    #[wasm_bindgen(getter)]
    pub fn in_tune(&self) -> bool {
        self.in_tune
    }

    #[wasm_bindgen(getter)]
    pub fn stable_note(&self) -> String {
        self.stable_note.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn stable_cents(&self) -> i32 {
        self.stable_cents
    }

    #[wasm_bindgen(getter)]
    pub fn stability(&self) -> f32 {
        self.stability
    }
}

/// Pitch detector using autocorrelation algorithm
#[wasm_bindgen]
pub struct PitchDetector {
    sample_rate: f32,
    buffer_size: usize,
    /// Minimum frequency to detect (Hz) - slightly below G3
    min_freq: f32,
    /// Maximum frequency to detect (Hz) - slightly above E6
    max_freq: f32,
    /// Threshold for volume detection
    volume_threshold: f32,
    /// Tolerance for "in tune" detection (cents)
    tune_tolerance: i32,
    /// Previous valid frequency for smoothing
    prev_frequency: f32,
    /// Last detected note for stability tracking
    last_note: String,
    /// Stable note after threshold
    stable_note: String,
    /// Stable cents offset
    stable_cents: i32,
    /// How many consistent detections to lock the note
    stability_threshold: u32,
    /// Running count of stable detections
    note_streak: u32,
    /// Reusable buffers to avoid allocations
    downsampled: Vec<f32>,
    nsdf: Vec<f32>,
}

#[wasm_bindgen]
impl PitchDetector {
    /// Create a new pitch detector
    ///
    /// # Arguments
    /// * `sample_rate` - Audio sample rate (typically 48000)
    /// * `buffer_size` - FFT buffer size (typically 2048 or 4096)
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, buffer_size: usize) -> PitchDetector {
        // Prepare reusable buffers
        // Downsample factor 4 means buffer is 1/4 size
        let downsampled_size = buffer_size / 4 + 1;
        // Max lag is roughly buffer_size / 2 for safe detection
        let nsdf_size = buffer_size; 

        PitchDetector {
            sample_rate,
            buffer_size,
            min_freq: 180.0,
            max_freq: 1400.0,
            volume_threshold: 0.01,
            tune_tolerance: 10,
            prev_frequency: 0.0,
            last_note: String::new(),
            stable_note: String::new(),
            stable_cents: 0,
            stability_threshold: 3,
            note_streak: 0,
            downsampled: vec![0.0; downsampled_size],
            nsdf: vec![0.0; nsdf_size],
        }
    }

    /// Analyze audio buffer and detect pitch
    ///
    /// # Arguments
    /// * `buffer` - Audio samples as f32 array
    ///
    /// # Returns
    /// PitchResult with detected frequency, note, cents, etc.
    #[wasm_bindgen]
    pub fn detect(&mut self, buffer: &[f32]) -> PitchResult {
        // Calculate RMS volume (O(N))
        let volume = self.calculate_rms(buffer);

        // If volume is too low, return no pitch
        if volume < self.volume_threshold {
            self.note_streak = 0;
            self.last_note.clear();
            return PitchResult {
                frequency: 0.0,
                note: String::new(),
                cents: 0,
                volume,
                confidence: 0.0,
                in_tune: false,
                stable_note: String::new(),
                stable_cents: 0,
                stability: 0.0,
            };
        }

        // Perform optimized autocorrelation pitch detection
        let (frequency, confidence) = self.autocorrelate(buffer);

        // If no valid pitch found
        if frequency < self.min_freq || frequency > self.max_freq || confidence < 0.75 { // Slightly lower threshold for downsampled
            self.note_streak = 0;
            self.last_note.clear();
            return PitchResult {
                frequency: 0.0,
                note: String::new(),
                cents: 0,
                volume,
                confidence,
                in_tune: false,
                stable_note: String::new(),
                stable_cents: 0,
                stability: 0.0,
            };
        }

        // Apply smoothing
        let smoothed_freq = if self.prev_frequency > 0.0 {
            frequency * 0.7 + self.prev_frequency * 0.3
        } else {
            frequency
        };
        self.prev_frequency = smoothed_freq;

        // Convert frequency to note name and cents
        let (note, cents) = self.frequency_to_note(smoothed_freq);
        let in_tune = cents.abs() <= self.tune_tolerance;
        let mut stability = 0.0;
        let mut stable_note = String::new();
        let mut stable_cents = 0;

        if !note.is_empty() {
            if note == self.last_note {
                self.note_streak = self.note_streak.saturating_add(1);
            } else {
                self.note_streak = 1;
                self.last_note = note.clone();
            }
            stability = (self.note_streak as f32 / self.stability_threshold as f32).min(1.0);
            if self.note_streak >= self.stability_threshold {
                self.stable_note = note.clone();
                self.stable_cents = cents;
                stable_note = self.stable_note.clone();
                stable_cents = self.stable_cents;
            }
        }

        PitchResult {
            frequency: smoothed_freq,
            note,
            cents,
            volume,
            confidence,
            in_tune,
            stable_note,
            stable_cents,
            stability,
        }
    }

    /// Calculate RMS (Root Mean Square) volume
    fn calculate_rms(&self, buffer: &[f32]) -> f32 {
        let sum: f32 = buffer.iter().map(|&x| x * x).sum();
        (sum / buffer.len() as f32).sqrt()
    }

    /// Optimized Autocorrelation using Coarse-to-Fine Strategy
    /// 1. fast scan on downsampled data.
    /// 2. Precise refinement on original data.
    fn autocorrelate(&mut self, buffer: &[f32]) -> (f32, f32) {
        let n = buffer.len();
        let stride = 4;
        
        // 1. Better Downsampling (Average 4 samples)
        let ds_len = n / stride;
        if self.downsampled.len() < ds_len {
            self.downsampled.resize(ds_len, 0.0);
        }
        
        for i in 0..ds_len {
            let idx = i * stride;
            // Simple boxcar filter for anti-aliasing
            let mut sum = 0.0;
            for k in 0..stride {
                if idx + k < n {
                    sum += buffer[idx + k];
                }
            }
            self.downsampled[i] = sum / stride as f32;
        }

        // 2. Coarse Search on Downsampled Data
        let ds_sample_rate = self.sample_rate / stride as f32;
        let ds_min_lag = (ds_sample_rate / self.max_freq) as usize;
        let ds_max_lag = (ds_sample_rate / self.min_freq) as usize;
        
        // Safety bounds
        let ds_max_lag = ds_max_lag.min(ds_len / 2);
        if ds_min_lag >= ds_max_lag { return (0.0, 0.0); }

        // Prepare NSDF buffer
        let nsdf_len = ds_max_lag - ds_min_lag;
        if self.nsdf.len() < nsdf_len { self.nsdf.resize(nsdf_len, 0.0); }
        for x in self.nsdf.iter_mut() { *x = 0.0; }

        for tau in ds_min_lag..ds_max_lag {
            let mut acf = 0.0f32;
            let mut div = 0.0f32;
            let limit = ds_len - tau;
            
            // Vectorizable loop
            for j in 0..limit {
                let s1 = self.downsampled[j];
                let s2 = self.downsampled[j + tau];
                acf += s1 * s2;
                div += s1 * s1 + s2 * s2;
            }

            if div > 0.0 {
                self.nsdf[tau - ds_min_lag] = 2.0 * acf / div;
            }
        }

        // 3. Peak Picking (Coarse)
        let threshold = 0.6; // Lower threshold for downsampled data
        let mut best_lag_ds = 0;
        let mut best_val_ds = 0.0f32;
        let mut in_peak = false;
        
        for i in 0..nsdf_len {
            let val = self.nsdf[i];
            if val > threshold {
                 if val > best_val_ds {
                     best_val_ds = val;
                     best_lag_ds = i + ds_min_lag;
                 }
                 in_peak = true;
            } else if in_peak {
                 break; // Found the first strong peak
            }
        }

        if best_lag_ds == 0 { return (0.0, 0.0); }

        // 4. Fine Refinement (Deep Think Optimization)
        // Search in original resolution around the coarse peak
        let center_lag = best_lag_ds * stride;
        let search_radius = stride * 2; // Search +/- 2 coarse steps (8 samples)
        
        let fine_min_lag = center_lag.saturating_sub(search_radius).max((self.sample_rate / self.max_freq) as usize);
        let fine_max_lag = (center_lag + search_radius).min((self.sample_rate / self.min_freq) as usize).min(n/2);
        
        if fine_min_lag >= fine_max_lag { return (0.0, 0.0); }

        let mut best_fine_lag = 0;
        let mut best_fine_val = 0.0f32;
        // Re-use nsdf buffer for fine search (it's small)
        // We only calculate a few taps
        
        let mut fine_nsdf = vec![0.0; fine_max_lag - fine_min_lag + 1];

        // Only calculate NSDF for lags in the narrow refinement window
        for (i, tau) in (fine_min_lag..=fine_max_lag).enumerate() {
            let mut acf = 0.0f32;
            let mut div = 0.0f32;
            let limit = n - tau;

            // Full resolution autocorrelation for just this lag
            // Optimization: We could use SIMD here if enabled, but loop unrolling helps
            for j in 0..limit {
                let s1 = buffer[j];
                let s2 = buffer[j + tau];
                acf += s1 * s2;
                div += s1 * s1 + s2 * s2;
            }

            if div > 0.0 {
                let val = 2.0 * acf / div;
                fine_nsdf[i] = val;
                
                if val > best_fine_val {
                    best_fine_val = val;
                    best_fine_lag = tau;
                }
            }
        }

        if best_fine_lag == 0 { return (0.0, 0.0); }
        
        // 5. Parabolic Interpolation on Fine Data
        // Map best_fine_lag back to index in fine_nsdf
        let fine_idx = best_fine_lag - fine_min_lag;
        let fine_lag_f = self.parabolic_interpolation(&fine_nsdf, fine_idx);
        let true_lag = fine_lag_f + fine_min_lag as f32;

        let frequency = self.sample_rate / true_lag;
        
        // Use the fine confidence value
        (frequency, best_fine_val)
    }

    /// Parabolic interpolation for sub-sample accuracy
    fn parabolic_interpolation(&self, data: &[f32], peak_idx: usize) -> f32 {
        if peak_idx == 0 || peak_idx >= data.len() - 1 {
            return peak_idx as f32;
        }

        let s0 = data[peak_idx - 1];
        let s1 = data[peak_idx];
        let s2 = data[peak_idx + 1];

        // Parabolic interpolation formula
        let a = (s0 + s2) / 2.0 - s1;
        if a.abs() < 1e-10 {
            return peak_idx as f32;
        }

        let b = (s2 - s0) / 2.0;
        let offset = -b / (2.0 * a);

        peak_idx as f32 + offset.clamp(-1.0, 1.0)
    }

    /// Convert frequency to nearest note name and cents deviation
    fn frequency_to_note(&self, frequency: f32) -> (String, i32) {
        // A4 = 440 Hz reference
        let a4 = 440.0;

        // Calculate number of half steps from A4
        let half_steps = 12.0 * (frequency / a4).log2();

        // Round to nearest note
        let note_num = half_steps.round() as i32;
        let cents = ((half_steps - note_num as f32) * 100.0).round() as i32;

        // Calculate note index (A is index 9)
        let note_idx = ((note_num + 9) % 12 + 12) % 12;
        let octave = 4 + (note_num + 9) / 12;

        let note_name = format!("{}{}", NOTE_NAMES[note_idx as usize], octave);

        (note_name, cents)
    }

    /// Check if a frequency matches a violin string (within tolerance)
    #[wasm_bindgen]
    pub fn get_nearest_string(&self, frequency: f32) -> String {
        let mut closest = "";
        let mut min_diff = f32::MAX;

        for (string_freq, string_name) in VIOLIN_STRINGS.iter() {
            // Calculate difference in cents
            let cents_diff = (1200.0 * (frequency / string_freq).log2()).abs();
            if cents_diff < min_diff {
                min_diff = cents_diff;
                closest = string_name;
            }
        }

        closest.to_string()
    }

    /// Set volume threshold for pitch detection
    #[wasm_bindgen]
    pub fn set_volume_threshold(&mut self, threshold: f32) {
        self.volume_threshold = threshold.clamp(0.001, 0.5);
    }

    /// Set tune tolerance in cents
    #[wasm_bindgen]
    pub fn set_tune_tolerance(&mut self, cents: i32) {
        self.tune_tolerance = cents.clamp(1, 50);
    }

    /// Set stability threshold for note locking
    #[wasm_bindgen]
    pub fn set_stability_threshold(&mut self, threshold: u32) {
        self.stability_threshold = threshold.clamp(1, 8);
        if self.note_streak > self.stability_threshold {
            self.note_streak = self.stability_threshold;
        }
    }
}

/// Generate a reference tone at a specific frequency
#[wasm_bindgen]
pub fn generate_tone_buffer(frequency: f32, sample_rate: f32, duration_ms: u32) -> Vec<f32> {
    let num_samples = (sample_rate * duration_ms as f32 / 1000.0) as usize;
    let mut buffer = Vec::with_capacity(num_samples);

    for i in 0..num_samples {
        let t = i as f32 / sample_rate;
        // Sine wave with slight attack/release envelope
        let envelope = if i < 100 {
            i as f32 / 100.0
        } else if i > num_samples - 100 {
            (num_samples - i) as f32 / 100.0
        } else {
            1.0
        };
        buffer.push(envelope * (2.0 * PI * frequency * t).sin());
    }

    buffer
}

/// Get frequency for a given string name
#[wasm_bindgen]
pub fn string_frequency(string: &str) -> f32 {
    match string.to_uppercase().as_str() {
        "G" | "G3" => 196.0,
        "D" | "D4" => 293.66,
        "A" | "A4" => 440.0,
        "E" | "E5" => 659.25,
        _ => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frequency_to_note() {
        let detector = PitchDetector::new(48000.0, 2048);

        let (note, cents) = detector.frequency_to_note(440.0);
        assert_eq!(note, "A4");
        assert!(cents.abs() <= 1);

        let (note, _) = detector.frequency_to_note(261.63);
        assert_eq!(note, "C4");
    }

    #[test]
    fn test_rms_calculation() {
        let detector = PitchDetector::new(48000.0, 2048);

        // Test with silence
        let silence = vec![0.0f32; 1024];
        assert_eq!(detector.calculate_rms(&silence), 0.0);

        // Test with constant signal
        let constant = vec![0.5f32; 1024];
        assert!((detector.calculate_rms(&constant) - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_detects_a4_frequency() {
        let mut detector = PitchDetector::new(48000.0, 2048);
        let tone = generate_tone_buffer(440.0, 48000.0, 200);
        let slice = &tone[..2048];
        let result = detector.detect(slice);
        assert_eq!(result.note, "A4");
        assert!((result.frequency - 440.0).abs() < 6.0);
    }

    #[test]
    fn test_stable_note_tracking() {
        let mut detector = PitchDetector::new(48000.0, 2048);
        detector.set_stability_threshold(3);
        let tone = generate_tone_buffer(440.0, 48000.0, 200);
        let slice = &tone[..2048];
        let result1 = detector.detect(slice);
        assert!(result1.stable_note.is_empty());
        let result2 = detector.detect(slice);
        assert!(result2.stable_note.is_empty());
        let result3 = detector.detect(slice);
        assert_eq!(result3.stable_note, "A4");
        assert!(result3.stability >= 1.0);
    }
}
