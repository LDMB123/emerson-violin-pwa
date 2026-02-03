import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    initSync,
    PitchDetector,
    generate_tone_buffer,
    string_frequency,
} from '@core/wasm/panda_audio.js';

let wasmInitialized = false;

const ensureWasm = () => {
    if (wasmInitialized) {
        return;
    }

    const wasmPath = resolve(process.cwd(), 'src/core/wasm/panda_audio_bg.wasm');
    let bytes;
    try {
        bytes = readFileSync(wasmPath);
    } catch (error) {
        throw new Error('Missing panda-audio WASM binary. Run `npm run wasm:prepare` before tests.');
    }

    initSync({ module: bytes });
    wasmInitialized = true;
};

test('panda-audio string_frequency matches violin tuning', () => {
    ensureWasm();
    expect(string_frequency('G')).toBeCloseTo(196.0, 1);
    expect(string_frequency('D')).toBeCloseTo(293.66, 1);
    expect(string_frequency('A')).toBeCloseTo(440.0, 1);
    expect(string_frequency('E')).toBeCloseTo(659.25, 1);
});

test('panda-audio detects A4 from generated tone buffer', () => {
    ensureWasm();
    const sampleRate = 48000;
    const bufferSize = 2048;
    const detector = new PitchDetector(sampleRate, bufferSize);
    const tone = generate_tone_buffer(440.0, sampleRate, 120);
    const buffer = tone.subarray(0, bufferSize);
    const result = detector.detect(buffer);

    expect(result.note).toBe('A4');
    expect(result.frequency).toBeGreaterThan(430);
    expect(result.frequency).toBeLessThan(450);
    expect(detector.get_nearest_string(result.frequency)).toBe('A4');

    result.free();
    detector.free();
});
