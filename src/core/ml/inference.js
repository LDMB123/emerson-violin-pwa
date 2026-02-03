import { ensureBackendReady, getActiveBackend, getBackendState } from './backend-manager.js';
import { runWebGPUInference } from './webgpu-backend.js';
import { runWasmInference } from './wasm-backend.js';

const toFloat32Array = (features) => {
    if (features instanceof Float32Array) return features;
    if (Array.isArray(features)) return new Float32Array(features);
    if (features && typeof features === 'object' && Array.isArray(features.values)) {
        return new Float32Array(features.values);
    }
    return new Float32Array();
};

const summarize = (input) => {
    if (!input?.length) {
        return { min: null, max: null, mean: null, variance: null };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    for (const value of input) {
        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
    }
    const mean = sum / input.length;
    let variance = 0;
    for (const value of input) {
        const diff = value - mean;
        variance += diff * diff;
    }
    variance = variance / input.length;
    return { min, max, mean, variance };
};

export const runInference = async (features, options = {}) => {
    await ensureBackendReady();
    const input = toFloat32Array(features);
    const state = getBackendState();
    const preferredBackend = options.backend || state.backend || getActiveBackend();
    let backend = preferredBackend;
    let output = input;
    let notes = 'Inference summary computed.';

    if (preferredBackend === 'webgpu') {
        const powerPreference = options.powerPreference
            || (state.perfMode === 'high' ? 'high-performance' : 'low-power');
        const webgpuOutput = await runWebGPUInference(input, { ...options, powerPreference });
        if (webgpuOutput) {
            output = webgpuOutput;
            backend = 'webgpu';
        } else if (state.wasmAvailable) {
            output = await runWasmInference(input);
            backend = 'wasm';
            notes = 'WebGPU unavailable at runtime; fell back to WASM.';
        } else {
            backend = 'basic';
            notes = 'WebGPU unavailable at runtime; fell back to basic heuristics.';
        }
    } else if (preferredBackend === 'wasm') {
        output = await runWasmInference(input);
        backend = 'wasm';
    }

    return {
        backend,
        output,
        summary: summarize(output),
        features: input,
        notes,
    };
};
