import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initSync, SkillProfile } from '@core/wasm/panda_core.js';

test('panda-core wasm exposes apply_practice_event', () => {
    const wasmPath = resolve(process.cwd(), 'src/core/wasm/panda_core_bg.wasm');
    let bytes;
    try {
        bytes = readFileSync(wasmPath);
    } catch (error) {
        throw new Error('Missing panda-core WASM binary. Run `npm run wasm:prepare` before tests.');
    }

    initSync({ module: bytes });

    const profile = new SkillProfile();
    expect(typeof profile.apply_practice_event).toBe('function');

    const before = profile.overall();
    profile.apply_practice_event('rd-set-1', 5);
    const after = profile.overall();
    expect(after).toBeGreaterThanOrEqual(before);
});
