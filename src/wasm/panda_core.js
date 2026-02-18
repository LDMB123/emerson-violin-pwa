/* @ts-self-types="./panda_core.d.ts" */

/**
 * Achievement definition
 */
export class Achievement {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AchievementFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_achievement_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get description() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.achievement_description(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get icon() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.achievement_icon(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.achievement_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.achievement_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get unlocked() {
        const ret = wasm.achievement_unlocked(this.__wbg_ptr);
        return ret !== 0;
    }
}
if (Symbol.dispose) Achievement.prototype[Symbol.dispose] = Achievement.prototype.free;

/**
 * Achievement tracker
 */
export class AchievementTracker {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AchievementTrackerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_achievementtracker_free(ptr, 0);
    }
    /**
     * Check progress-based achievements
     * @param {PlayerProgress} progress
     * @param {bigint} timestamp
     * @returns {string[]}
     */
    check_progress(progress, timestamp) {
        _assertClass(progress, PlayerProgress);
        const ret = wasm.achievementtracker_check_progress(this.__wbg_ptr, progress.__wbg_ptr, timestamp);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Check if a specific achievement is unlocked
     * @param {string} id
     * @returns {boolean}
     */
    is_unlocked(id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.achievementtracker_is_unlocked(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    constructor() {
        const ret = wasm.achievementtracker_new();
        this.__wbg_ptr = ret >>> 0;
        AchievementTrackerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get total achievements count
     * @returns {number}
     */
    total_count() {
        const ret = wasm.achievementtracker_total_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Check and unlock achievement by ID
     * @param {string} id
     * @param {bigint} timestamp
     * @returns {boolean}
     */
    unlock(id, timestamp) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.achievementtracker_unlock(this.__wbg_ptr, ptr0, len0, timestamp);
        return ret !== 0;
    }
    /**
     * Get count of unlocked achievements
     * @returns {number}
     */
    unlocked_count() {
        const ret = wasm.achievementtracker_unlocked_count(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) AchievementTracker.prototype[Symbol.dispose] = AchievementTracker.prototype.free;

/**
 * Player progress state
 */
export class PlayerProgress {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PlayerProgressFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_playerprogress_free(ptr, 0);
    }
    /**
     * Add XP and check for level up
     * @param {number} amount
     * @returns {boolean}
     */
    add_xp(amount) {
        const ret = wasm.playerprogress_add_xp(this.__wbg_ptr, amount);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get games_played() {
        const ret = wasm.playerprogress_games_played(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get level() {
        const ret = wasm.playerprogress_level(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get progress percentage to next level (0-100)
     * @returns {number}
     */
    level_progress() {
        const ret = wasm.playerprogress_level_progress(this.__wbg_ptr);
        return ret;
    }
    /**
     * Log game score
     * @param {string} game_id
     * @param {number} score
     * @returns {number}
     */
    log_game_score(game_id, score) {
        const ptr0 = passStringToWasm0(game_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.playerprogress_log_game_score(this.__wbg_ptr, ptr0, len0, score);
        return ret >>> 0;
    }
    /**
     * Log practice time and award XP
     * @param {number} minutes
     * @param {number} streak_days
     * @returns {number}
     */
    log_practice(minutes, streak_days) {
        const ret = wasm.playerprogress_log_practice(this.__wbg_ptr, minutes, streak_days);
        return ret >>> 0;
    }
    /**
     * Log song completion
     * @param {number} accuracy
     * @returns {number}
     */
    log_song_complete(accuracy) {
        const ret = wasm.playerprogress_log_song_complete(this.__wbg_ptr, accuracy);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.playerprogress_new();
        this.__wbg_ptr = ret >>> 0;
        PlayerProgressFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get songs_completed() {
        const ret = wasm.playerprogress_songs_completed(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get streak() {
        const ret = wasm.playerprogress_streak(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get total_minutes() {
        const ret = wasm.playerprogress_total_minutes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get xp() {
        const ret = wasm.playerprogress_xp(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get XP needed for next level
     * @returns {number}
     */
    xp_to_next_level() {
        const ret = wasm.playerprogress_xp_to_next_level(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) PlayerProgress.prototype[Symbol.dispose] = PlayerProgress.prototype.free;

/**
 * Skill categories for violin playing
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const SkillCategory = Object.freeze({
    Pitch: 0, "0": "Pitch",
    Rhythm: 1, "1": "Rhythm",
    BowControl: 2, "2": "BowControl",
    Posture: 3, "3": "Posture",
    Reading: 4, "4": "Reading",
});

/**
 * Skill profile with ratings per category
 */
export class SkillProfile {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SkillProfileFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_skillprofile_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get bow_control() {
        const ret = wasm.skillprofile_bow_control(this.__wbg_ptr);
        return ret;
    }
    constructor() {
        const ret = wasm.skillprofile_new();
        this.__wbg_ptr = ret >>> 0;
        SkillProfileFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get overall skill level (average)
     * @returns {number}
     */
    overall() {
        const ret = wasm.skillprofile_overall(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get pitch() {
        const ret = wasm.skillprofile_pitch(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get posture() {
        const ret = wasm.skillprofile_posture(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get reading() {
        const ret = wasm.skillprofile_reading(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get rhythm() {
        const ret = wasm.skillprofile_rhythm(this.__wbg_ptr);
        return ret;
    }
    /**
     * Update bow control skill
     * @param {number} score
     */
    update_bow_control(score) {
        wasm.skillprofile_update_bow_control(this.__wbg_ptr, score);
    }
    /**
     * Update pitch skill
     * @param {number} score
     */
    update_pitch(score) {
        wasm.skillprofile_update_pitch(this.__wbg_ptr, score);
    }
    /**
     * Update posture skill
     * @param {number} score
     */
    update_posture(score) {
        wasm.skillprofile_update_posture(this.__wbg_ptr, score);
    }
    /**
     * Update reading skill
     * @param {number} score
     */
    update_reading(score) {
        wasm.skillprofile_update_reading(this.__wbg_ptr, score);
    }
    /**
     * Update rhythm skill
     * @param {number} score
     */
    update_rhythm(score) {
        wasm.skillprofile_update_rhythm(this.__wbg_ptr, score);
    }
    /**
     * Update a skill score with exponential moving average
     * @param {SkillCategory} category
     * @param {number} score
     */
    update_skill(category, score) {
        wasm.skillprofile_update_skill(this.__wbg_ptr, category, score);
    }
    /**
     * Get the weakest skill category for focus
     * @returns {string}
     */
    weakest_skill() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.skillprofile_weakest_skill(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) SkillProfile.prototype[Symbol.dispose] = SkillProfile.prototype.free;

/**
 * Calculate streak from practice dates
 * @param {Uint32Array} practice_dates
 * @returns {number}
 */
export function calculate_streak(practice_dates) {
    const ptr0 = passArray32ToWasm0(practice_dates, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_streak(ptr0, len0);
    return ret >>> 0;
}

export function init() {
    wasm.init();
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./panda_core_bg.js": import0,
    };
}

const AchievementFinalization = new FinalizationRegistry(ptr => wasm.__wbg_achievement_free(ptr >>> 0, 1));
const AchievementTrackerFinalization = new FinalizationRegistry(ptr => wasm.__wbg_achievementtracker_free(ptr >>> 0, 1));
const PlayerProgressFinalization = new FinalizationRegistry(ptr => wasm.__wbg_playerprogress_free(ptr >>> 0, 1));
const SkillProfileFinalization = new FinalizationRegistry(ptr => wasm.__wbg_skillprofile_free(ptr >>> 0, 1));

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
function decodeText(ptr, len) {
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('panda_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
