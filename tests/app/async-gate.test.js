import { describe, expect, it } from 'vitest';

import { createAsyncGate } from '../../src/app/async-gate.js';

describe('async-gate', () => {
    it('marks only the latest token as active', () => {
        const gate = createAsyncGate();
        const first = gate.begin();
        const second = gate.begin();

        expect(gate.isActive(first)).toBe(false);
        expect(gate.isActive(second)).toBe(true);
    });

    it('starts with first token active', () => {
        const gate = createAsyncGate();
        const first = gate.begin();
        expect(first).toBe(1);
        expect(gate.isActive(first)).toBe(true);
    });
});
