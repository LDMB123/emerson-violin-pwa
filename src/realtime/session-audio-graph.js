const safely = (operation) => {
    try {
        operation();
    } catch {
        // Ignore operation failures.
    }
};

const disconnectNode = (node, beforeDisconnect) => {
    if (!node) return null;
    if (typeof beforeDisconnect === 'function') {
        safely(() => beforeDisconnect(node));
    }
    safely(() => node.disconnect());
    return null;
};

export const createSessionAudioGraph = ({
    createAudioContext,
    onFeatureFrame,
    onFallbackReason,
}) => {
    let audioContext = null;
    let micStream = null;
    let workletNode = null;
    let sourceNode = null;
    let silenceGain = null;

    const closeAudioContextInstance = async () => {
        if (!audioContext) return;
        try {
            await audioContext.close();
        } catch {
            // Ignore close errors.
        }
        audioContext = null;
    };

    const stopMicStreamTracks = () => {
        if (!micStream) return;
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
    };

    const transition = async (shouldTransition, method) => {
        if (!audioContext || !shouldTransition(audioContext.state)) return;
        try {
            await audioContext[method]();
        } catch {
            // Ignore transition errors.
        }
    };

    const ensureMicrophoneSupport = async () => {
        if (navigator.mediaDevices?.getUserMedia) return;
        await onFallbackReason('mic-permission');
        throw new Error('Microphone not supported');
    };

    const bindWorkletMessageHandler = () => {
        if (!workletNode) return;
        workletNode.port.onmessage = (event) => {
            const data = event.data || {};
            if (data.ready) return;
            if (data.error) {
                onFallbackReason('system').catch(() => {});
                return;
            }
            onFeatureFrame(data);
        };
    };

    const initialize = async () => {
        await ensureMicrophoneSupport();
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
        });

        audioContext = createAudioContext({ latencyHint: 'interactive' });
        if (!audioContext || !audioContext.audioWorklet) {
            await onFallbackReason('system');
            throw new Error('AudioWorklet unavailable');
        }

        await audioContext.audioWorklet.addModule(new URL('../worklets/rt-audio-processor.js', import.meta.url));

        sourceNode = audioContext.createMediaStreamSource(micStream);
        workletNode = new AudioWorkletNode(audioContext, 'rt-audio-processor');
        silenceGain = audioContext.createGain();
        silenceGain.gain.value = 0;

        sourceNode.connect(workletNode).connect(silenceGain).connect(audioContext.destination);
        bindWorkletMessageHandler();

        await audioContext.resume();
    };

    const clear = async () => {
        workletNode = disconnectNode(workletNode, (node) => {
            node.port.onmessage = null;
        });
        sourceNode = disconnectNode(sourceNode);
        silenceGain = disconnectNode(silenceGain);
        await closeAudioContextInstance();
        stopMicStreamTracks();
    };

    return {
        initialize,
        clear,
        transition,
    };
};
