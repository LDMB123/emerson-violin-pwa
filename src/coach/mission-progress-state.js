/** Creates the mutable context used by the mission-progress controller. */
export const createMissionProgressContext = () => ({
    mission: null,
    unit: null,
    weakestSkill: 'pitch',
    completionDispatched: false,
    initGeneration: 0,
});

/** Advances and returns the current mission-progress generation token. */
export const nextMissionProgressGeneration = (context) => {
    context.initGeneration += 1;
    return context.initGeneration;
};

/** Returns whether a stored generation token is still current. */
export const isMissionProgressGenerationActive = (context, generation) => (
    generation === null || generation === context.initGeneration
);
