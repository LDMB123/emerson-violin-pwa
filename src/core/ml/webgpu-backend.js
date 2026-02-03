const WORKGROUP_SIZE = 64;
const PARAM_SIZE = 16;
const SHADER_CODE = `
struct Params {
    length: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
};

@group(0) @binding(0) var<storage, read> inputBuffer: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputBuffer: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx < params.length) {
        outputBuffer[idx] = inputBuffer[idx];
    }
}
`;

let adapterCache = {
    adapter: null,
    powerPreference: null,
    promise: null,
};

let backendState = {
    device: null,
    pipeline: null,
    bindGroup: null,
    buffers: null,
    powerPreference: null,
};

const resetBackend = () => {
    backendState = {
        device: null,
        pipeline: null,
        bindGroup: null,
        buffers: null,
        powerPreference: null,
    };
};

const requestAdapter = async (powerPreference, force = false) => {
    if (!navigator.gpu?.requestAdapter) return null;
    if (!force && adapterCache.adapter && adapterCache.powerPreference === powerPreference) {
        return adapterCache.adapter;
    }
    if (!force && adapterCache.promise && adapterCache.powerPreference === powerPreference) {
        return adapterCache.promise;
    }
    adapterCache.powerPreference = powerPreference;
    adapterCache.promise = navigator.gpu
        .requestAdapter({ powerPreference })
        .then((adapter) => {
            adapterCache.adapter = adapter;
            return adapter;
        })
        .catch(() => {
            adapterCache.adapter = null;
            return null;
        })
        .finally(() => {
            adapterCache.promise = null;
        });
    return adapterCache.promise;
};

export const isWebGPUAvailable = async ({ powerPreference = 'low-power', force = false } = {}) => {
    const adapter = await requestAdapter(powerPreference, force);
    return Boolean(adapter);
};

const ensureBuffers = (state, length) => {
    if (!state.device) return null;
    const device = state.device;
    const byteLength = length * Float32Array.BYTES_PER_ELEMENT;
    if (state.buffers?.length === length && state.bindGroup) {
        return state.buffers;
    }

    if (state.buffers) {
        state.buffers.input?.destroy();
        state.buffers.output?.destroy();
        state.buffers.read?.destroy();
        state.buffers.params?.destroy();
    }

    const input = device.createBuffer({
        size: byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const output = device.createBuffer({
        size: byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const read = device.createBuffer({
        size: byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const params = device.createBuffer({
        size: PARAM_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: state.pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: input } },
            { binding: 1, resource: { buffer: output } },
            { binding: 2, resource: { buffer: params } },
        ],
    });

    const buffers = {
        length,
        input,
        output,
        read,
        params,
    };
    state.bindGroup = bindGroup;
    state.buffers = buffers;
    return buffers;
};

export const initWebGPUBackend = async ({ powerPreference = 'low-power', force = false } = {}) => {
    const adapter = await requestAdapter(powerPreference, force);
    if (!adapter) return null;
    if (backendState.device && backendState.powerPreference === powerPreference) {
        return backendState;
    }
    try {
        const device = await adapter.requestDevice();
        device.lost?.then(() => {
            resetBackend();
        });
        const module = device.createShaderModule({ code: SHADER_CODE });
        const pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: { module, entryPoint: 'main' },
        });

        backendState = {
            device,
            pipeline,
            bindGroup: null,
            buffers: null,
            powerPreference,
        };
        return backendState;
    } catch {
        resetBackend();
        return null;
    }
};

export const runWebGPUInference = async (features, options = {}) => {
    const input = features instanceof Float32Array ? features : new Float32Array(features || []);
    if (!input.length) return new Float32Array();
    const state = await initWebGPUBackend({ powerPreference: options.powerPreference });
    if (!state?.device || !state?.pipeline) return null;

    const buffers = ensureBuffers(state, input.length);
    if (!buffers) return null;
    const device = state.device;

    device.queue.writeBuffer(buffers.input, 0, input);
    device.queue.writeBuffer(buffers.params, 0, new Uint32Array([input.length, 0, 0, 0]));

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(state.pipeline);
    pass.setBindGroup(0, state.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(input.length / WORKGROUP_SIZE));
    pass.end();
    encoder.copyBufferToBuffer(buffers.output, 0, buffers.read, 0, input.byteLength);
    device.queue.submit([encoder.finish()]);

    await buffers.read.mapAsync(GPUMapMode.READ);
    const mapped = buffers.read.getMappedRange();
    const output = new Float32Array(mapped).slice();
    buffers.read.unmap();
    return output;
};
