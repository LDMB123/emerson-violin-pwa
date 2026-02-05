export function start() {
    wasm.start();
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_8c4e43fe74559d73: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_Number_04624de7d0e8332d: function(arg0) {
            const ret = Number(arg0);
            return ret;
        },
        __wbg___wbindgen_bigint_get_as_i64_8fcf4ce7f1ca72a2: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_bbbb1c18aa2f5e25: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_0bc8482c6e3508ae: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_47fa6863be6f2f25: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_bigint_31b12575b56f32fc: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_0095a73b8b156f76: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_ac34f5003991759a: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_cd444516edc5b180: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_9e4d92534c42d778: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_11888390b0186270: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_9dd77d8cd6671811: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_8ff4255516ccad3e: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_72fb696202c56729: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_d9b87ff7982e3b21: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_addEventListener_3acb0aad4483804c: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.addEventListener(getStringFromWasm0(arg1, arg2), arg3);
        }, arguments); },
        __wbg_add_5be83378df680c25: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.add(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_appendChild_dea38765a26d346d: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.appendChild(arg1);
            return ret;
        }, arguments); },
        __wbg_apply_ada2ee1a60ac7b3c: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.apply(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_arc_60bf829e1bd2add5: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.arc(arg1, arg2, arg3, arg4, arg5);
        }, arguments); },
        __wbg_arrayBuffer_05ce1af23e9064e8: function(arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        },
        __wbg_arrayBuffer_bb54076166006c39: function() { return handleError(function (arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        }, arguments); },
        __wbg_beginPath_9873f939d695759c: function(arg0) {
            arg0.beginPath();
        },
        __wbg_buffer_26d0910f3a5bc899: function(arg0) {
            const ret = arg0.buffer;
            return ret;
        },
        __wbg_call_389efe28435a9388: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_4708e0c13bdc8e95: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_call_812d25f1510c13c8: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.call(arg1, arg2, arg3);
            return ret;
        }, arguments); },
        __wbg_cancelAnimationFrame_cd35895d78cf4510: function() { return handleError(function (arg0, arg1) {
            arg0.cancelAnimationFrame(arg1);
        }, arguments); },
        __wbg_checked_04db83ac6810bc82: function(arg0) {
            const ret = arg0.checked;
            return ret;
        },
        __wbg_classList_1a87c34c6d81421e: function(arg0) {
            const ret = arg0.classList;
            return ret;
        },
        __wbg_clearInterval_c75df0651e74fbb8: function(arg0, arg1) {
            arg0.clearInterval(arg1);
        },
        __wbg_clearRect_1eed255045515c55: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.clearRect(arg1, arg2, arg3, arg4);
        },
        __wbg_clearTimeout_df03cf00269bc442: function(arg0, arg1) {
            arg0.clearTimeout(arg1);
        },
        __wbg_clear_159551fa0f231a1d: function() { return handleError(function (arg0) {
            const ret = arg0.clear();
            return ret;
        }, arguments); },
        __wbg_click_0e9c20848b655ed3: function(arg0) {
            arg0.click();
        },
        __wbg_clientX_a3c5f4ff30e91264: function(arg0) {
            const ret = arg0.clientX;
            return ret;
        },
        __wbg_clientY_e28509acb9b4a42a: function(arg0) {
            const ret = arg0.clientY;
            return ret;
        },
        __wbg_clipboard_98c5a32249fa8416: function(arg0) {
            const ret = arg0.clipboard;
            return ret;
        },
        __wbg_clone_d1ce11fac28c9ba2: function(arg0) {
            const ret = arg0.clone();
            return ret;
        },
        __wbg_close_987a203f749ce4ab: function() { return handleError(function (arg0) {
            const ret = arg0.close();
            return ret;
        }, arguments); },
        __wbg_close_dd86348a5d182c17: function(arg0) {
            arg0.close();
        },
        __wbg_closest_11206fe6e0fb4e4e: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.closest(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_colno_0fb6d80d2fbe874f: function(arg0) {
            const ret = arg0.colno;
            return ret;
        },
        __wbg_confirm_0951f3942a645061: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.confirm(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_connect_aba749effbe588ea: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.connect(arg1);
            return ret;
        }, arguments); },
        __wbg_construct_86626e847de3b629: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.construct(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_contains_bde74fed714d6521: function(arg0, arg1, arg2) {
            const ret = arg0.contains(getStringFromWasm0(arg1, arg2));
            return ret;
        },
        __wbg_context_ad68a13452d07225: function(arg0) {
            const ret = arg0.context;
            return ret;
        },
        __wbg_continue_209e676996911d82: function() { return handleError(function (arg0) {
            arg0.continue();
        }, arguments); },
        __wbg_count_396412b088981cb4: function() { return handleError(function (arg0) {
            const ret = arg0.count();
            return ret;
        }, arguments); },
        __wbg_createAnalyser_354026bfa1c95ad7: function() { return handleError(function (arg0) {
            const ret = arg0.createAnalyser();
            return ret;
        }, arguments); },
        __wbg_createElement_49f60fdcaae809c8: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.createElement(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_createGain_26f8f6d082c608c7: function() { return handleError(function (arg0) {
            const ret = arg0.createGain();
            return ret;
        }, arguments); },
        __wbg_createMediaStreamSource_738a729c18da3524: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.createMediaStreamSource(arg1);
            return ret;
        }, arguments); },
        __wbg_createObjectStore_f75f59d55a549868: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.createObjectStore(getStringFromWasm0(arg1, arg2), arg3);
            return ret;
        }, arguments); },
        __wbg_createObjectURL_918185db6a10a0c8: function() { return handleError(function (arg0, arg1) {
            const ret = URL.createObjectURL(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_createOscillator_a54380cbece8f580: function() { return handleError(function (arg0) {
            const ret = arg0.createOscillator();
            return ret;
        }, arguments); },
        __wbg_createTask_deeb88a68fc97c9d: function() { return handleError(function (arg0, arg1) {
            const ret = console.createTask(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_crypto_e4b88bdecc3312df: function() { return handleError(function (arg0) {
            const ret = arg0.crypto;
            return ret;
        }, arguments); },
        __wbg_currentTime_6c7288048dba47fa: function(arg0) {
            const ret = arg0.currentTime;
            return ret;
        },
        __wbg_data_4e5f67c46a91cac5: function(arg0) {
            const ret = arg0.data;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_data_5330da50312d0bc1: function(arg0) {
            const ret = arg0.data;
            return ret;
        },
        __wbg_dataset_20cb5c72458ae3fc: function(arg0) {
            const ret = arg0.dataset;
            return ret;
        },
        __wbg_decodeURIComponent_c0a12f850c93e3c4: function() { return handleError(function (arg0, arg1) {
            const ret = decodeURIComponent(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_delete_d6d7f750bd9ed2cd: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.delete(arg1);
            return ret;
        }, arguments); },
        __wbg_destination_a97dbc327ce97191: function(arg0) {
            const ret = arg0.destination;
            return ret;
        },
        __wbg_dispatchEvent_dc8dcc7ddca11378: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.dispatchEvent(arg1);
            return ret;
        }, arguments); },
        __wbg_documentElement_723733f86794182a: function(arg0) {
            const ret = arg0.documentElement;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_document_ee35a3d3ae34ef6c: function(arg0) {
            const ret = arg0.document;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_done_57b39ecd9addfe81: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_entries_58c7934c745daac7: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_error_45c0f859deca018a: function(arg0) {
            const ret = arg0.error;
            return ret;
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
        __wbg_estimate_66e4c58896309567: function() { return handleError(function (arg0) {
            const ret = arg0.estimate();
            return ret;
        }, arguments); },
        __wbg_exponentialRampToValueAtTime_ceb11d1a27e80afe: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.exponentialRampToValueAtTime(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_fetch_4f06ca81d87798ba: function(arg0, arg1, arg2) {
            const ret = arg0.fetch(getStringFromWasm0(arg1, arg2));
            return ret;
        },
        __wbg_fetch_e6e8e0a221783759: function(arg0, arg1) {
            const ret = arg0.fetch(arg1);
            return ret;
        },
        __wbg_fftSize_c7830d0cc7b24df6: function(arg0) {
            const ret = arg0.fftSize;
            return ret;
        },
        __wbg_filename_24a2159491bcf8ff: function(arg0, arg1) {
            const ret = arg1.filename;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_files_f9461f097760ef70: function(arg0) {
            const ret = arg0.files;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_fillRect_d44afec47e3a3fab: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.fillRect(arg1, arg2, arg3, arg4);
        },
        __wbg_fillText_4a931850b976cc62: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
        }, arguments); },
        __wbg_fill_1eb35c386c8676aa: function(arg0) {
            arg0.fill();
        },
        __wbg_frequency_39fb5db6d5ee85ba: function(arg0) {
            const ret = arg0.frequency;
            return ret;
        },
        __wbg_from_bddd64e7d5ff6941: function(arg0) {
            const ret = Array.from(arg0);
            return ret;
        },
        __wbg_gain_9c9a2e054010f159: function(arg0) {
            const ret = arg0.gain;
            return ret;
        },
        __wbg_getAll_33c9f4f22da09509: function() { return handleError(function (arg0) {
            const ret = arg0.getAll();
            return ret;
        }, arguments); },
        __wbg_getAttribute_b9f6fc4b689c71b0: function(arg0, arg1, arg2, arg3) {
            const ret = arg1.getAttribute(getStringFromWasm0(arg2, arg3));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_getBoundingClientRect_b5c8c34d07878818: function(arg0) {
            const ret = arg0.getBoundingClientRect();
            return ret;
        },
        __wbg_getContext_2a5764d48600bc43: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_getDate_db46eca87d2b4907: function(arg0) {
            const ret = arg0.getDate();
            return ret;
        },
        __wbg_getElementsByTagName_20b929a7b6e4d14c: function(arg0, arg1, arg2) {
            const ret = arg0.getElementsByTagName(getStringFromWasm0(arg1, arg2));
            return ret;
        },
        __wbg_getEntries_3e70dc3dc5d22858: function(arg0) {
            const ret = arg0.getEntries();
            return ret;
        },
        __wbg_getFloatTimeDomainData_9232d2d08f8164b0: function(arg0, arg1, arg2) {
            arg0.getFloatTimeDomainData(getArrayF32FromWasm0(arg1, arg2));
        },
        __wbg_getItem_0c792d344808dcf5: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg1.getItem(getStringFromWasm0(arg2, arg3));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_getRandomValues_c7e747eb57f43f2c: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.getRandomValues(getArrayU8FromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_getTime_1e3cd1391c5c3995: function(arg0) {
            const ret = arg0.getTime();
            return ret;
        },
        __wbg_getTimezoneOffset_81776d10a4ec18a8: function(arg0) {
            const ret = arg0.getTimezoneOffset();
            return ret;
        },
        __wbg_getTracks_0ebc2ccfec066781: function(arg0) {
            const ret = arg0.getTracks();
            return ret;
        },
        __wbg_getUserMedia_e0ae761c45b48754: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.getUserMedia(arg1);
            return ret;
        }, arguments); },
        __wbg_get_5e856edb32ac1289: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.get(arg1);
            return ret;
        }, arguments); },
        __wbg_get_9a1f194723936140: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_get_9b94d73e6221f75c: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_b3ed3ad4be2bc8ac: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_d8db2ad31d529ff8: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_get_index_253dd2a9e007656d: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_index_80a69050a46aaf91: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_index_9a5bfdd2ca49c65f: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_with_index_d26da38d2c038e1a: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_get_with_ref_key_1dc361bd10053bfe: function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        },
        __wbg_has_d4e53238966c12b6: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_height_38750dc6de41ee75: function(arg0) {
            const ret = arg0.height;
            return ret;
        },
        __wbg_height_45209601b4c4ede6: function(arg0) {
            const ret = arg0.height;
            return ret;
        },
        __wbg_href_67854c3dd511f6f3: function() { return handleError(function (arg0, arg1) {
            const ret = arg1.href;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_indexedDB_782f0610ea9fb144: function() { return handleError(function (arg0) {
            const ret = arg0.indexedDB;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_installing_860506570e3bb33d: function(arg0) {
            const ret = arg0.installing;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_instanceof_ArrayBuffer_c367199e2fa2aa04: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Blob_ce92a9ddd729a84a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Blob;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_CanvasRenderingContext2d_4bb052fd1c3d134d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof CanvasRenderingContext2D;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Element_9e662f49ab6c6beb: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Element;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_ErrorEvent_cd1bf636fceb3180: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ErrorEvent;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_File_21240124aa87092d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof File;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlCanvasElement_3f2f6e1edb1c9792: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLCanvasElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlDialogElement_1f8a486805a54010: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLDialogElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlElement_5abfac207260fd6f: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlInputElement_c10b7260b4e0710a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLInputElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlSelectElement_a1820832b22b0d1e: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLSelectElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_HtmlTextAreaElement_d17ace23f20e2338: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLTextAreaElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbCursorWithValue_44f92eb9c04854e3: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBCursorWithValue;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbDatabase_8d723b3ff4761c2d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBDatabase;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbOpenDbRequest_e476921a744b955b: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBOpenDBRequest;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbRequest_6388508cc77f8da0: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBRequest;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_53af74335dec57f4: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_MediaStreamTrack_de218ec16db5b948: function(arg0) {
            let result;
            try {
                result = arg0 instanceof MediaStreamTrack;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_MediaStream_87a4b350cfc3064a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof MediaStream;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_PromiseRejectionEvent_3da81d3ab45c671d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof PromiseRejectionEvent;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Promise_0094681e3519d6ec: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Promise;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_ee1d54d79ae41977: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_ServiceWorkerRegistration_8e649dbc7bef531c: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ServiceWorkerRegistration;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_ServiceWorker_c36ebcde79957570: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ServiceWorker;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_9b9075935c74707c: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_ed49b2db8df90359: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_d314bb98fcf08331: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_isSafeInteger_bfbc7332a9768d2a: function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        },
        __wbg_isTypeSupported_604fcd5e023f1c81: function(arg0, arg1) {
            const ret = MediaRecorder.isTypeSupported(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_item_5c82f52b014b3056: function(arg0, arg1) {
            const ret = arg0.item(arg1 >>> 0);
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_iterator_6ff6560ca1568e55: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_json_d214c3d336140979: function() { return handleError(function (arg0) {
            const ret = arg0.json();
            return ret;
        }, arguments); },
        __wbg_key_c27cb3b734638d81: function() { return handleError(function (arg0) {
            const ret = arg0.key;
            return ret;
        }, arguments); },
        __wbg_left_3b7c3c1030d5ca7a: function(arg0) {
            const ret = arg0.left;
            return ret;
        },
        __wbg_length_32ed9a279acd054c: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_35a7bace40f36eac: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_3f12bc1cab862cc3: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_9a7876c9728a0979: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_e455564ce5cbf46e: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_lineTo_c584cff6c760c4a5: function(arg0, arg1, arg2) {
            arg0.lineTo(arg1, arg2);
        },
        __wbg_lineno_07f44f045a7cec70: function(arg0) {
            const ret = arg0.lineno;
            return ret;
        },
        __wbg_localStorage_a22d31b9eacc4594: function() { return handleError(function (arg0) {
            const ret = arg0.localStorage;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_location_df7ca06c93e51763: function(arg0) {
            const ret = arg0.location;
            return ret;
        },
        __wbg_lowerBound_f442e9d74f886fb5: function() { return handleError(function (arg0, arg1) {
            const ret = IDBKeyRange.lowerBound(arg0, arg1 !== 0);
            return ret;
        }, arguments); },
        __wbg_matchMedia_91d4fc9729dc3c84: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.matchMedia(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_matches_4b5c22bd830f7bb3: function(arg0) {
            const ret = arg0.matches;
            return ret;
        },
        __wbg_maxTouchPoints_b2fe253f521aeb99: function(arg0) {
            const ret = arg0.maxTouchPoints;
            return ret;
        },
        __wbg_mediaDevices_1a8b20bf414820e2: function() { return handleError(function (arg0) {
            const ret = arg0.mediaDevices;
            return ret;
        }, arguments); },
        __wbg_message_6de0e1db93388eee: function(arg0, arg1) {
            const ret = arg1.message;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_moveTo_e9190fc700d55b40: function(arg0, arg1, arg2) {
            arg0.moveTo(arg1, arg2);
        },
        __wbg_name_171cddfde96a29c8: function(arg0, arg1) {
            const ret = arg1.name;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_navigator_43be698ba96fc088: function(arg0) {
            const ret = arg0.navigator;
            return ret;
        },
        __wbg_new_0_73afc35eb544e539: function() {
            const ret = new Date();
            return ret;
        },
        __wbg_new_245cd5c49157e602: function(arg0) {
            const ret = new Date(arg0);
            return ret;
        },
        __wbg_new_361308b2356cecd0: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_3eb36ae241fe6f44: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_4f8f3c123e474358: function() { return handleError(function (arg0, arg1) {
            const ret = new Worker(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_64284bd487f9d239: function() { return handleError(function () {
            const ret = new Headers();
            return ret;
        }, arguments); },
        __wbg_new_744a224bd92cc682: function() { return handleError(function (arg0) {
            const ret = new PerformanceObserver(arg0);
            return ret;
        }, arguments); },
        __wbg_new_79e6044f512b1551: function() { return handleError(function () {
            const ret = new DOMParser();
            return ret;
        }, arguments); },
        __wbg_new_848d3caa9d043d05: function() { return handleError(function () {
            const ret = new lAudioContext();
            return ret;
        }, arguments); },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_9ccae8c3d6099588: function(arg0) {
            const ret = new Float32Array(arg0);
            return ret;
        },
        __wbg_new_c1eaab32d813ec69: function() { return handleError(function () {
            const ret = new FileReader();
            return ret;
        }, arguments); },
        __wbg_new_dca287b076112a51: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_dd2b680c8bf6ae29: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_from_slice_a3d2629dc1826784: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_no_args_1c7c842f08d00ebb: function(arg0, arg1) {
            const ret = new Function(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_with_blob_sequence_cbcfaaa04b66d433: function() { return handleError(function (arg0) {
            const ret = new Blob(arg0);
            return ret;
        }, arguments); },
        __wbg_new_with_byte_offset_and_length_bc2e7b72cc96d1c1: function(arg0, arg1, arg2) {
            const ret = new Int32Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_new_with_byte_offset_and_length_d8c7d0b5bb54f65e: function(arg0, arg1, arg2) {
            const ret = new Float32Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_new_with_event_init_dict_48877e7ca125f3c1: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new CustomEvent(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_new_with_length_a2c39cbe88fd8ff1: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_new_with_media_stream_7ff4a33055d28c5e: function() { return handleError(function (arg0) {
            const ret = new MediaRecorder(arg0);
            return ret;
        }, arguments); },
        __wbg_new_with_media_stream_and_media_recorder_options_58d06cefd0ce235a: function() { return handleError(function (arg0, arg1) {
            const ret = new MediaRecorder(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_new_with_options_145afba922ad3703: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Worker(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_new_with_str_and_init_a61cbc6bdef21614: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_new_with_str_sequence_and_options_9b8b0bee99ec6b0f: function() { return handleError(function (arg0, arg1) {
            const ret = new Blob(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_new_with_u8_array_sequence_and_options_cc0f8f2c1ef62e68: function() { return handleError(function (arg0, arg1) {
            const ret = new Blob(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_next_3482f54c49e8af19: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_next_418f80d8f5303233: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_now_a3af9a2f4bbaa4d1: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_now_ebffdf7e580f210d: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_objectStoreNames_d2c5d2377420ad78: function(arg0) {
            const ret = arg0.objectStoreNames;
            return ret;
        },
        __wbg_objectStore_d56e603390dcc165: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.objectStore(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_of_ddc0942b0dce16a1: function(arg0, arg1, arg2) {
            const ret = Array.of(arg0, arg1, arg2);
            return ret;
        },
        __wbg_of_f915f7cd925b21a5: function(arg0) {
            const ret = Array.of(arg0);
            return ret;
        },
        __wbg_ok_87f537440a0acf85: function(arg0) {
            const ret = arg0.ok;
            return ret;
        },
        __wbg_onLine_a52496f5c9a569ec: function(arg0) {
            const ret = arg0.onLine;
            return ret;
        },
        __wbg_openCursor_0b21622d2de8f313: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.openCursor(arg1);
            return ret;
        }, arguments); },
        __wbg_openCursor_2df325852ae85998: function() { return handleError(function (arg0) {
            const ret = arg0.openCursor();
            return ret;
        }, arguments); },
        __wbg_open_82db86fd5b087109: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.open(getStringFromWasm0(arg1, arg2), arg3 >>> 0);
            return ret;
        }, arguments); },
        __wbg_parseFromString_06bbea4ddcf49d6f: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.parseFromString(getStringFromWasm0(arg1, arg2), __wbindgen_enum_SupportedType[arg3]);
            return ret;
        }, arguments); },
        __wbg_parse_4abc6ab7df803525: function(arg0, arg1) {
            const ret = Date.parse(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_parse_708461a1feddfb38: function() { return handleError(function (arg0, arg1) {
            const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_pathname_b2267fae358b49a7: function() { return handleError(function (arg0, arg1) {
            const ret = arg1.pathname;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_performance_06f12ba62483475d: function(arg0) {
            const ret = arg0.performance;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_persist_6c519dbe611fdbd5: function() { return handleError(function (arg0) {
            const ret = arg0.persist();
            return ret;
        }, arguments); },
        __wbg_persisted_ef68508ee9d49458: function() { return handleError(function (arg0) {
            const ret = arg0.persisted();
            return ret;
        }, arguments); },
        __wbg_platform_4d516d3a4d56e7b6: function() { return handleError(function (arg0, arg1) {
            const ret = arg1.platform;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_postMessage_771ef3293a28bbac: function() { return handleError(function (arg0, arg1) {
            arg0.postMessage(arg1);
        }, arguments); },
        __wbg_postMessage_c4e7d6aaa1797a16: function() { return handleError(function (arg0, arg1) {
            arg0.postMessage(arg1);
        }, arguments); },
        __wbg_preventDefault_cdcfcd7e301b9702: function(arg0) {
            arg0.preventDefault();
        },
        __wbg_prompt_aef409ac41a011d0: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            const ret = arg1.prompt(getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg4, arg5));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_prompt_e920785904433941: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg1.prompt(getStringFromWasm0(arg2, arg3));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_push_8ffdcb2063340ba5: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_put_c2ea76677a9d9bac: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.put(arg1);
            return ret;
        }, arguments); },
        __wbg_querySelectorAll_1283aae52043a951: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.querySelectorAll(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_querySelector_c3b0df2d58eec220: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.querySelector(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_queueMicrotask_0aa0a927f78f5d98: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_5bb536982f78a56f: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_randomUUID_c252761901cb3037: function(arg0, arg1) {
            const ret = arg1.randomUUID();
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_random_912284dbf636f269: function() {
            const ret = Math.random();
            return ret;
        },
        __wbg_readAsText_6be5d99a0de05eea: function() { return handleError(function (arg0, arg1) {
            arg0.readAsText(arg1);
        }, arguments); },
        __wbg_readyState_cf11f0728fc7b46c: function(arg0, arg1) {
            const ret = arg1.readyState;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_reason_2034bc1ebad63adf: function(arg0) {
            const ret = arg0.reason;
            return ret;
        },
        __wbg_register_a23c042703515915: function(arg0, arg1, arg2) {
            const ret = arg0.register(getStringFromWasm0(arg1, arg2));
            return ret;
        },
        __wbg_reload_c8ca3f3b07f9e534: function() { return handleError(function (arg0) {
            arg0.reload();
        }, arguments); },
        __wbg_removeAttribute_87259aab06d9f286: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.removeAttribute(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_removeEventListener_e63328781a5b9af9: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.removeEventListener(getStringFromWasm0(arg1, arg2), arg3);
        }, arguments); },
        __wbg_removeItem_f6369b1a6fa39850: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.removeItem(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_remove_f9451697e0bc6ca0: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.remove(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_requestAnimationFrame_43682f8e1c5e5348: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.requestAnimationFrame(arg1);
            return ret;
        }, arguments); },
        __wbg_resolve_002c4b7d9d8f6b64: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_result_233b2d68aae87a05: function() { return handleError(function (arg0) {
            const ret = arg0.result;
            return ret;
        }, arguments); },
        __wbg_result_a9f41cf43ff6e60f: function() { return handleError(function (arg0) {
            const ret = arg0.result;
            return ret;
        }, arguments); },
        __wbg_resume_7995ba29b6bb4edb: function() { return handleError(function (arg0) {
            const ret = arg0.resume();
            return ret;
        }, arguments); },
        __wbg_revokeObjectURL_ba5712ef5af8bc9a: function() { return handleError(function (arg0, arg1) {
            URL.revokeObjectURL(getStringFromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_run_bcde7ea43ea6ed7c: function(arg0, arg1, arg2) {
            try {
                var state0 = {a: arg1, b: arg2};
                var cb0 = () => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen__convert__closures_____invoke__hac75eeeb50bbb621(a, state0.b, );
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = arg0.run(cb0);
                return ret;
            } finally {
                state0.a = state0.b = 0;
            }
        },
        __wbg_sampleRate_112321b6e2e1b66c: function(arg0) {
            const ret = arg0.sampleRate;
            return ret;
        },
        __wbg_sampleRate_8142bbf3840b654b: function(arg0) {
            const ret = arg0.sampleRate;
            return ret;
        },
        __wbg_search_1b385e665c888780: function() { return handleError(function (arg0, arg1) {
            const ret = arg1.search;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_selectedOptions_3df80ab28194091d: function(arg0) {
            const ret = arg0.selectedOptions;
            return ret;
        },
        __wbg_serviceWorker_7632c51ed73e8f80: function(arg0) {
            const ret = arg0.serviceWorker;
            return ret;
        },
        __wbg_setAttribute_cc8e4c8a2a008508: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.setAttribute(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_setDate_6d7cf6c9745a80d7: function(arg0, arg1) {
            const ret = arg0.setDate(arg1 >>> 0);
            return ret;
        },
        __wbg_setInterval_612728cce80dfecf: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setInterval(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_setItem_cf340bb2edbd3089: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_setProperty_cbb25c4e74285b39: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_setTimeout_eff32631ea138533: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_setValueAtTime_6f820595a4900b36: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setValueAtTime(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_1eb0999cf5d27fc8: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_3f1d0b984ed272ed: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_6cb8631f80447a67: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_audio_947c46bfb2542b56: function(arg0, arg1) {
            arg0.audio = arg1;
        },
        __wbg_set_body_9a7e00afe3cfe244: function(arg0, arg1) {
            arg0.body = arg1;
        },
        __wbg_set_checked_4b2468680005fbf7: function(arg0, arg1) {
            arg0.checked = arg1 !== 0;
        },
        __wbg_set_className_c1d9e7362164af61: function(arg0, arg1, arg2) {
            arg0.className = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_db769d02949a271d: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_set_detail_fa3b358526be3a85: function(arg0, arg1) {
            arg0.detail = arg1;
        },
        __wbg_set_disabled_2c6ed6464228ed53: function(arg0, arg1) {
            arg0.disabled = arg1 !== 0;
        },
        __wbg_set_f43e577aea94465b: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_fb27b296001e2de9: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0[getStringFromWasm0(arg1, arg2)] = getStringFromWasm0(arg3, arg4);
        }, arguments); },
        __wbg_set_fftSize_19777f0c257f9061: function(arg0, arg1) {
            arg0.fftSize = arg1 >>> 0;
        },
        __wbg_set_fillStyle_783d3f7489475421: function(arg0, arg1, arg2) {
            arg0.fillStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_font_575685c8f7e56957: function(arg0, arg1, arg2) {
            arg0.font = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_hash_d79656da462e2166: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.hash = getStringFromWasm0(arg1, arg2);
        }, arguments); },
        __wbg_set_headers_cfc5f4b2c1f20549: function(arg0, arg1) {
            arg0.headers = arg1;
        },
        __wbg_set_innerHTML_edd39677e3460291: function(arg0, arg1, arg2) {
            arg0.innerHTML = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_key_path_d4c32b4460a1f7d7: function(arg0, arg1) {
            arg0.keyPath = arg1;
        },
        __wbg_set_lineWidth_89fa506592f5b994: function(arg0, arg1) {
            arg0.lineWidth = arg1;
        },
        __wbg_set_method_c3e20375f5ae7fac: function(arg0, arg1, arg2) {
            arg0.method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mime_type_474ca5ef943763bb: function(arg0, arg1, arg2) {
            arg0.mimeType = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_name_49b9ecba7f58f2e5: function(arg0, arg1, arg2) {
            arg0.name = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_ondataavailable_69d78d920567d505: function(arg0, arg1) {
            arg0.ondataavailable = arg1;
        },
        __wbg_set_onerror_73f3137061c9c32e: function(arg0, arg1) {
            arg0.onerror = arg1;
        },
        __wbg_set_onerror_dc0e606b09e1792f: function(arg0, arg1) {
            arg0.onerror = arg1;
        },
        __wbg_set_onload_0ae5444d94882a19: function(arg0, arg1) {
            arg0.onload = arg1;
        },
        __wbg_set_onmessage_6ed41050e4a5cee2: function(arg0, arg1) {
            arg0.onmessage = arg1;
        },
        __wbg_set_onstop_9fe4338950b8fe2b: function(arg0, arg1) {
            arg0.onstop = arg1;
        },
        __wbg_set_onsuccess_0edec1acb4124784: function(arg0, arg1) {
            arg0.onsuccess = arg1;
        },
        __wbg_set_onupgradeneeded_c887b74722b6ce77: function(arg0, arg1) {
            arg0.onupgradeneeded = arg1;
        },
        __wbg_set_strokeStyle_087121ed5350b038: function(arg0, arg1, arg2) {
            arg0.strokeStyle = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_textContent_3e87dba095d9cdbc: function(arg0, arg1, arg2) {
            arg0.textContent = arg1 === 0 ? undefined : getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_type_148de20768639245: function(arg0, arg1, arg2) {
            arg0.type = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_type_e127f26b78d78bfc: function(arg0, arg1) {
            arg0.type = __wbindgen_enum_WorkerType[arg1];
        },
        __wbg_set_value_62a965e38b22b38c: function(arg0, arg1, arg2) {
            arg0.value = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_value_c3556fce049236f0: function(arg0, arg1, arg2) {
            arg0.value = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_value_c51b9eb4cf70aa54: function(arg0, arg1) {
            arg0.value = arg1;
        },
        __wbg_set_value_ddc3bd01a8467bf1: function(arg0, arg1, arg2) {
            arg0.value = getStringFromWasm0(arg1, arg2);
        },
        __wbg_showModal_a79853fc18492f9c: function() { return handleError(function (arg0) {
            arg0.showModal();
        }, arguments); },
        __wbg_size_e05d31cc6049815f: function(arg0) {
            const ret = arg0.size;
            return ret;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_start_192b59777b3abb50: function() { return handleError(function (arg0) {
            arg0.start();
        }, arguments); },
        __wbg_start_3ba619a7b9b12b20: function() { return handleError(function (arg0) {
            arg0.start();
        }, arguments); },
        __wbg_static_accessor_GLOBAL_12837167ad935116: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_a621d3dfbb60d0ce: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_f8727f0cf888e0bd: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_stop_9a199eb3bfa3e7f0: function() { return handleError(function (arg0, arg1) {
            arg0.stop(arg1);
        }, arguments); },
        __wbg_stop_b1b3a19a0af2f9b5: function() { return handleError(function (arg0) {
            arg0.stop();
        }, arguments); },
        __wbg_stop_b859162f9cf5e2ae: function(arg0) {
            arg0.stop();
        },
        __wbg_storage_6ef5028f2a840762: function(arg0) {
            const ret = arg0.storage;
            return ret;
        },
        __wbg_stringify_8d1cc6ff383e8bae: function() { return handleError(function (arg0) {
            const ret = JSON.stringify(arg0);
            return ret;
        }, arguments); },
        __wbg_strokeRect_4da24de25ed7fbaf: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.strokeRect(arg1, arg2, arg3, arg4);
        },
        __wbg_stroke_240ea7f2407d73c0: function(arg0) {
            arg0.stroke();
        },
        __wbg_style_0b7c9bd318f8b807: function(arg0) {
            const ret = arg0.style;
            return ret;
        },
        __wbg_subtle_9d4bb4e872f71546: function(arg0) {
            const ret = arg0.subtle;
            return ret;
        },
        __wbg_target_521be630ab05b11e: function(arg0) {
            const ret = arg0.target;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_terminate_3f4012a42e9b98c4: function(arg0) {
            arg0.terminate();
        },
        __wbg_textContent_fc823fb432e90037: function(arg0, arg1) {
            const ret = arg1.textContent;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_text_083b8727c990c8c0: function() { return handleError(function (arg0) {
            const ret = arg0.text();
            return ret;
        }, arguments); },
        __wbg_then_0d9fe2c7b1857d32: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_b9e7b3b5f1a9e1b5: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_toISOString_c04e0b8b70650552: function(arg0) {
            const ret = arg0.toISOString();
            return ret;
        },
        __wbg_toLocaleString_8956748b26cc4d3b: function(arg0, arg1, arg2, arg3) {
            const ret = arg0.toLocaleString(getStringFromWasm0(arg1, arg2), arg3);
            return ret;
        },
        __wbg_toString_c1449224e1205fc7: function(arg0) {
            const ret = arg0.toString();
            return ret;
        },
        __wbg_top_3d27ff6f468cf3fc: function(arg0) {
            const ret = arg0.top;
            return ret;
        },
        __wbg_transaction_55ceb96f4b852417: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.transaction(getStringFromWasm0(arg1, arg2), __wbindgen_enum_IdbTransactionMode[arg3]);
            return ret;
        }, arguments); },
        __wbg_type_e8c7fade6d73451b: function(arg0, arg1) {
            const ret = arg1.type;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_update_6c2d8c6ecfd90513: function() { return handleError(function (arg0) {
            const ret = arg0.update();
            return ret;
        }, arguments); },
        __wbg_userAgent_34463fd660ba4a2a: function() { return handleError(function (arg0, arg1) {
            const ret = arg1.userAgent;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_valueAsNumber_5292e7ed56db5658: function(arg0) {
            const ret = arg0.valueAsNumber;
            return ret;
        },
        __wbg_value_0546255b415e96c1: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_value_15684899da869c95: function(arg0, arg1) {
            const ret = arg1.value;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_30a10f975c5e9af8: function() { return handleError(function (arg0) {
            const ret = arg0.value;
            return ret;
        }, arguments); },
        __wbg_value_d402dce7dcb16251: function(arg0, arg1) {
            const ret = arg1.value;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_e506a07878790ca0: function(arg0, arg1) {
            const ret = arg1.value;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_waiting_6c1a093c2fa2102b: function(arg0) {
            const ret = arg0.waiting;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_width_5f66bde2e810fbde: function(arg0) {
            const ret = arg0.width;
            return ret;
        },
        __wbg_width_ae46cb8e98ee102f: function(arg0) {
            const ret = arg0.width;
            return ret;
        },
        __wbg_writeText_be1c3b83a3e46230: function(arg0, arg1, arg2) {
            const ret = arg0.writeText(getStringFromWasm0(arg1, arg2));
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 1144, function: Function { arguments: [Externref], shim_idx: 1145, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h86ad753c4ae151d5, wasm_bindgen__convert__closures_____invoke__h33ba8de8f177db59);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 639, function: Function { arguments: [NamedExternref("BlobEvent")], shim_idx: 635, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__hf4579d55ede6847e, wasm_bindgen__convert__closures_____invoke__hce11954e24ce2448);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 640, function: Function { arguments: [NamedExternref("PointerEvent")], shim_idx: 633, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h9d4ad55505357fe8, wasm_bindgen__convert__closures_____invoke__h4622c50a61eabd69);
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 641, function: Function { arguments: [NamedExternref("PerformanceObserverEntryList"), NamedExternref("PerformanceObserver")], shim_idx: 636, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h452c266f802cb4f5, wasm_bindgen__convert__closures_____invoke__h12a194ce68c428a6);
            return ret;
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 642, function: Function { arguments: [], shim_idx: 630, ret: Externref, inner_ret: Some(Externref) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__hb95e08a643036f9a, wasm_bindgen__convert__closures_____invoke__h32b79470e53b8d4e);
            return ret;
        },
        __wbindgen_cast_0000000000000006: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 643, function: Function { arguments: [], shim_idx: 631, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h84b36706a26c5887, wasm_bindgen__convert__closures_____invoke__hfb941345f736d586);
            return ret;
        },
        __wbindgen_cast_0000000000000007: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 644, function: Function { arguments: [NamedExternref("Event")], shim_idx: 634, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h2643c1cd0277ce71, wasm_bindgen__convert__closures_____invoke__hf0c956a8c7b53566);
            return ret;
        },
        __wbindgen_cast_0000000000000008: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { dtor_idx: 645, function: Function { arguments: [NamedExternref("MessageEvent")], shim_idx: 632, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h223c44906b04d201, wasm_bindgen__convert__closures_____invoke__h334464bdcdbaf403);
            return ret;
        },
        __wbindgen_cast_0000000000000009: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_000000000000000a: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_000000000000000b: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_000000000000000c: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
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
        "./emerson-violin-pwa_bg.js": import0,
    };
}

const lAudioContext = (typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : undefined));
function wasm_bindgen__convert__closures_____invoke__hfb941345f736d586(arg0, arg1) {
    wasm.wasm_bindgen__convert__closures_____invoke__hfb941345f736d586(arg0, arg1);
}

function wasm_bindgen__convert__closures_____invoke__h32b79470e53b8d4e(arg0, arg1) {
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h32b79470e53b8d4e(arg0, arg1);
    return ret;
}

function wasm_bindgen__convert__closures_____invoke__hac75eeeb50bbb621(arg0, arg1) {
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__hac75eeeb50bbb621(arg0, arg1);
    return ret !== 0;
}

function wasm_bindgen__convert__closures_____invoke__h33ba8de8f177db59(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h33ba8de8f177db59(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__hce11954e24ce2448(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__hce11954e24ce2448(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h4622c50a61eabd69(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h4622c50a61eabd69(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__hf0c956a8c7b53566(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__hf0c956a8c7b53566(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h334464bdcdbaf403(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h334464bdcdbaf403(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h12a194ce68c428a6(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures_____invoke__h12a194ce68c428a6(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_IdbTransactionMode = ["readonly", "readwrite", "versionchange", "readwriteflush", "cleanup"];


const __wbindgen_enum_SupportedType = ["text/html", "text/xml", "application/xml", "application/xhtml+xml", "image/svg+xml"];


const __wbindgen_enum_WorkerType = ["classic", "module"];

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
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

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
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
        module_or_path = new URL('emerson-violin-pwa_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
