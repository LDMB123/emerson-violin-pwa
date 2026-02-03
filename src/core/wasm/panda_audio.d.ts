/* tslint:disable */
/* eslint-disable */

/**
 * Pitch detector using autocorrelation algorithm
 */
export class PitchDetector {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Analyze audio buffer and detect pitch
     *
     * # Arguments
     * * `buffer` - Audio samples as f32 array
     *
     * # Returns
     * PitchResult with detected frequency, note, cents, etc.
     */
    detect(buffer: Float32Array): PitchResult;
    /**
     * Check if a frequency matches a violin string (within tolerance)
     */
    get_nearest_string(frequency: number): string;
    /**
     * Create a new pitch detector
     *
     * # Arguments
     * * `sample_rate` - Audio sample rate (typically 48000)
     * * `buffer_size` - FFT buffer size (typically 2048 or 4096)
     */
    constructor(sample_rate: number, buffer_size: number);
    /**
     * Set tune tolerance in cents
     */
    set_tune_tolerance(cents: number): void;
    /**
     * Set volume threshold for pitch detection
     */
    set_volume_threshold(threshold: number): void;
}

/**
 * Pitch detection result
 */
export class PitchResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly cents: number;
    readonly confidence: number;
    readonly frequency: number;
    readonly in_tune: boolean;
    readonly note: string;
    readonly volume: number;
}

/**
 * Generate a reference tone at a specific frequency
 */
export function generate_tone_buffer(frequency: number, sample_rate: number, duration_ms: number): Float32Array;

export function init(): void;

/**
 * Get frequency for a given string name
 */
export function string_frequency(string: string): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_pitchdetector_free: (a: number, b: number) => void;
    readonly __wbg_pitchresult_free: (a: number, b: number) => void;
    readonly generate_tone_buffer: (a: number, b: number, c: number) => [number, number];
    readonly pitchdetector_detect: (a: number, b: number, c: number) => number;
    readonly pitchdetector_get_nearest_string: (a: number, b: number) => [number, number];
    readonly pitchdetector_new: (a: number, b: number) => number;
    readonly pitchdetector_set_tune_tolerance: (a: number, b: number) => void;
    readonly pitchdetector_set_volume_threshold: (a: number, b: number) => void;
    readonly pitchresult_cents: (a: number) => number;
    readonly pitchresult_confidence: (a: number) => number;
    readonly pitchresult_frequency: (a: number) => number;
    readonly pitchresult_in_tune: (a: number) => number;
    readonly pitchresult_note: (a: number) => [number, number];
    readonly pitchresult_volume: (a: number) => number;
    readonly string_frequency: (a: number, b: number) => number;
    readonly init: () => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
