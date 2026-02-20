const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const p95 = (values) => {
    if (!Array.isArray(values) || !values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[index];
};

export const createSessionMetricsProfile = ({
    state,
    getJSON,
    setJSON,
    profileKey,
    qualityWindow,
    profilePersistIntervalMs,
}) => {
    let profileCache = null;
    let profileDirty = false;
    let profilePersistPromise = null;
    let lastProfilePersistAt = 0;

    const hydrateProfileCache = async () => {
        if (profileCache && typeof profileCache === 'object') {
            return profileCache;
        }
        const existing = await getJSON(profileKey);
        profileCache = existing && typeof existing === 'object' ? { ...existing } : {};
        return profileCache;
    };

    const updateQuality = (frame) => {
        const latency = Number.isFinite(frame?.timestamp) ? Date.now() - frame.timestamp : null;
        if (Number.isFinite(latency) && latency >= 0 && latency < 10_000) {
            state.quality.latencies.push(latency);
            if (state.quality.latencies.length > qualityWindow) {
                state.quality.latencies.shift();
            }
        }
        state.quality.sampleCount += 1;
    };

    const buildQualityPayload = () => {
        const corrections = Math.max(1, state.quality.corrections);
        const cueCount = Math.max(1, state.quality.cues);
        return {
            sessionId: state.sessionId || 'none',
            p95CueLatencyMs: Math.round(p95(state.quality.latencies)),
            falseCorrectionRate: state.quality.falseCorrections / corrections,
            fallbackRate: state.quality.fallbackCount / cueCount,
            sampleCount: state.quality.sampleCount,
            at: Date.now(),
        };
    };

    const updateProfileCacheFromFeature = (feature) => {
        if (!profileCache || typeof profileCache !== 'object') {
            profileCache = {};
        }
        profileCache.lastSessionAt = Date.now();
        profileCache.lastPitchCents = Number.isFinite(feature?.cents) ? feature.cents : 0;
        profileCache.lastTempoBpm = Number.isFinite(feature?.tempoBpm) ? feature.tempoBpm : 0;
        profileCache.lastConfidence = Number.isFinite(feature?.confidence) ? feature.confidence : 0;
        profileCache.longTermPitchBiasCents = state.calibration.pitchBiasCents;
        profileCache.longTermRhythmBiasMs = state.calibration.rhythmBiasMs;
        profileCache.longTermSampleCount = state.calibration.samples;
        profileDirty = true;
    };

    const flushProfileCache = async ({ force = false } = {}) => {
        if (profilePersistPromise) {
            await profilePersistPromise;
        }
        if (!profileDirty) return;

        const now = Date.now();
        if (!force && lastProfilePersistAt > 0 && now - lastProfilePersistAt < profilePersistIntervalMs) {
            return;
        }

        const snapshot = { ...(profileCache && typeof profileCache === 'object' ? profileCache : {}) };
        profileDirty = false;
        profilePersistPromise = setJSON(profileKey, snapshot)
            .then(() => {
                lastProfilePersistAt = Date.now();
            })
            .catch(() => {
                profileDirty = true;
            })
            .finally(() => {
                profilePersistPromise = null;
            });

        await profilePersistPromise;
        if (force && profileDirty) {
            await flushProfileCache({ force: true });
        }
    };

    const hydrateCalibrationFromProfile = async () => {
        try {
            const profile = await hydrateProfileCache();
            if (!profile || typeof profile !== 'object') return;

            const savedPitchBias = Number.isFinite(profile.longTermPitchBiasCents)
                ? profile.longTermPitchBiasCents
                : 0;
            const savedRhythmBias = Number.isFinite(profile.longTermRhythmBiasMs)
                ? profile.longTermRhythmBiasMs
                : 0;
            const savedSamples = Number.isFinite(profile.longTermSampleCount)
                ? profile.longTermSampleCount
                : 0;

            // Slower long-term personalization seed, constrained by safety bounds.
            state.calibration.pitchBiasCents = clamp(savedPitchBias, -18, 18);
            state.calibration.rhythmBiasMs = clamp(savedRhythmBias, -120, 120);
            state.calibration.samples = Math.max(0, Math.round(savedSamples));
        } catch {
            // Keep default calibration on read failures.
        }
    };

    const updateSessionCalibration = (feature) => {
        if (!feature?.hasSignal) return;
        const confidence = Number.isFinite(feature.confidence) ? feature.confidence : 0;
        if (confidence < 0.6) return;

        // Fast in-session adaptation using clipped incremental averages.
        const pitchTarget = clamp(feature.cents, -30, 30);
        const rhythmTarget = clamp(feature.rhythmOffsetMs, -180, 180);

        const alphaFast = 0.14;
        state.calibration.pitchBiasCents = clamp(
            state.calibration.pitchBiasCents + (pitchTarget - state.calibration.pitchBiasCents) * alphaFast,
            -24,
            24,
        );
        state.calibration.rhythmBiasMs = clamp(
            state.calibration.rhythmBiasMs + (rhythmTarget - state.calibration.rhythmBiasMs) * alphaFast,
            -150,
            150,
        );
        state.calibration.samples += 1;
    };

    const resetQualityCounters = () => {
        state.quality.latencies = [];
        state.quality.sampleCount = 0;
        state.quality.cues = 0;
        state.quality.corrections = 0;
        state.quality.falseCorrections = 0;
        state.quality.fallbackCount = 0;
    };

    return {
        updateQuality,
        buildQualityPayload,
        updateProfileCacheFromFeature,
        flushProfileCache,
        hydrateCalibrationFromProfile,
        updateSessionCalibration,
        resetQualityCounters,
    };
};
