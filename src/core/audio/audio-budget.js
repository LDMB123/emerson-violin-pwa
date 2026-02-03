export const createBudgetMonitor = ({ ratio = 0.9, maxBreaches = 6 } = {}) => {
    let breaches = 0;
    const update = ({ processMs, bufferSize, sampleRate } = {}) => {
        if (!Number.isFinite(processMs) || !Number.isFinite(bufferSize) || !Number.isFinite(sampleRate)) {
            return {
                breaches,
                budgetMs: null,
                overBudget: false,
                tripped: breaches >= maxBreaches,
            };
        }
        const budgetMs = (bufferSize / sampleRate) * 1000 * ratio;
        const overBudget = processMs > budgetMs;
        if (overBudget) {
            breaches += 1;
        } else {
            breaches = Math.max(0, breaches - 1);
        }
        return {
            breaches,
            budgetMs,
            overBudget,
            tripped: breaches >= maxBreaches,
        };
    };

    const reset = () => {
        breaches = 0;
    };

    const getBreaches = () => breaches;

    return {
        update,
        reset,
        getBreaches,
    };
};
