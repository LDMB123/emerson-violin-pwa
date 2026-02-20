export const createMissionProgressContext = () => ({
    mission: null,
    unit: null,
    weakestSkill: 'pitch',
    completionDispatched: false,
    initGeneration: 0,
});

export const nextMissionProgressGeneration = (context) => {
    context.initGeneration += 1;
    return context.initGeneration;
};

export const isMissionProgressGenerationActive = (context, generation) => (
    generation === null || generation === context.initGeneration
);
