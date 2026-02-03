import { createBudgetMonitor } from '@core/audio/audio-budget.js';

describe('createBudgetMonitor', () => {
    it('tracks breaches and trips after threshold', () => {
        const monitor = createBudgetMonitor({ ratio: 1, maxBreaches: 2 });
        const over = { processMs: 120, bufferSize: 100, sampleRate: 1000 };

        const first = monitor.update(over);
        expect(first.overBudget).toBe(true);
        expect(first.tripped).toBe(false);

        const second = monitor.update(over);
        expect(second.overBudget).toBe(true);
        expect(second.tripped).toBe(true);
    });

    it('decays breaches when under budget', () => {
        const monitor = createBudgetMonitor({ ratio: 1, maxBreaches: 3 });
        const over = { processMs: 120, bufferSize: 100, sampleRate: 1000 };
        const under = { processMs: 40, bufferSize: 100, sampleRate: 1000 };

        monitor.update(over);
        const recovered = monitor.update(under);

        expect(recovered.breaches).toBe(0);
        expect(recovered.overBudget).toBe(false);
    });

    it('ignores invalid samples', () => {
        const monitor = createBudgetMonitor({ ratio: 1, maxBreaches: 1 });
        const state = monitor.update({ processMs: NaN });
        expect(state.breaches).toBe(0);
        expect(state.tripped).toBe(false);
    });
});
