/* @ts-self-types="./engine.d.ts" */
import { startWorkers } from "./snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js";

export class SymSpell {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    SymSpellFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_symspell_free(ptr, 0);
  }
  /**
   * @param {Uint8Array | number[]} input
   * @param {any} args
   */
  load_bigram_dictionary(input, args) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
      const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_export);
      const len0 = WASM_VECTOR_LEN;
      wasm.symspell_load_bigram_dictionary(retptr, this.__wbg_ptr, ptr0, len0, args);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      if (r1) {
        throw takeFromExternrefTable0(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * @param {Uint8Array | number[]} input
   * @param {any} args
   */
  load_dictionary(input, args) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
      const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_export);
      const len0 = WASM_VECTOR_LEN;
      wasm.symspell_load_dictionary(retptr, this.__wbg_ptr, ptr0, len0, args);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      if (r1) {
        throw takeFromExternrefTable0(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * @param {string} input
   * @param {number} verbosity
   * @param {number} max_edit_distance
   * @returns {any[]}
   */
  lookup(input, verbosity, max_edit_distance) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
      const val2 = +verbosity;
      const val3 = +max_edit_distance;
      const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len0 = WASM_VECTOR_LEN;
      wasm.symspell_lookup(retptr, this.__wbg_ptr, ptr0, len0, val2, val3);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeFromExternrefTable0(r2);
      }
      var v4 = getArrayJsValueFromWasm0(r0, r1);
      wasm.__wbindgen_export3(r0, r1 * 4, 4);
      return v4;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * @param {string} input
   * @param {number} edit_distance
   * @returns {any[]}
   */
  lookup_compound(input, edit_distance) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
      const val2 = +edit_distance;
      const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len0 = WASM_VECTOR_LEN;
      wasm.symspell_lookup_compound(retptr, this.__wbg_ptr, ptr0, len0, val2);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
      if (r3) {
        throw takeFromExternrefTable0(r2);
      }
      var v3 = getArrayJsValueFromWasm0(r0, r1);
      wasm.__wbindgen_export3(r0, r1 * 4, 4);
      return v3;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * @param {any} parameters
   */
  constructor(parameters) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
      wasm.symspell_new(retptr, parameters);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeFromExternrefTable0(r1);
      }
      this.__wbg_ptr = r0;
      SymSpellFinalization.register(this, this.__wbg_ptr, this);
      return this;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * @param {string} input
   * @param {number} max_edit_distance
   * @returns {any}
   */
  word_segmentation(input, max_edit_distance) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
      const val2 = +max_edit_distance;
      const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len0 = WASM_VECTOR_LEN;
      wasm.symspell_word_segmentation(retptr, this.__wbg_ptr, ptr0, len0, val2);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeFromExternrefTable0(r1);
      }
      return takeFromExternrefTable0(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
if (Symbol.dispose) SymSpell.prototype[Symbol.dispose] = SymSpell.prototype.free;

/**
 * @param {string} content
 * @param {string} editorial_rules_json
 * @param {string} regex_rules_json
 * @param {string} glossary_json
 * @returns {string}
 */
export function apply_editorial_transforms_wasm(
  content,
  editorial_rules_json,
  regex_rules_json,
  glossary_json
) {
  let deferred5_0;
  let deferred5_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3;
    try {
      ptr0 = passStringToWasm0(content, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passStringToWasm0(
        editorial_rules_json,
        wasm.__wbindgen_export,
        wasm.__wbindgen_export2
      );
      len1 = WASM_VECTOR_LEN;
      ptr2 = passStringToWasm0(regex_rules_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len2 = WASM_VECTOR_LEN;
      ptr3 = passStringToWasm0(glossary_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len3 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr3) {
        wasm.__wbindgen_export3(ptr3, len3 * 1, 1);
      }
      if (ptr2) {
        wasm.__wbindgen_export3(ptr2, len2 * 1, 1);
      }
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.apply_editorial_transforms_wasm(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred5_0 = r0;
    deferred5_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred5_0, deferred5_1, 1);
  }
}

/**
 * @param {string} request_json
 * @returns {string}
 */
export function audit_dynamic_paragraphs_wasm(request_json) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.audit_dynamic_paragraphs_wasm(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr2 = r0;
    var len2 = r1;
    if (r3) {
      ptr2 = 0;
      len2 = 0;
      throw takeFromExternrefTable0(r2);
    }
    deferred3_0 = ptr2;
    deferred3_1 = len2;
    return getStringFromWasm0(ptr2, len2);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred3_0, deferred3_1, 1);
  }
}

/**
 * @param {string} file_id
 * @param {string} options_json
 * @returns {string}
 */
export function audit_spelling_wasm(file_id, options_json) {
  let deferred4_0;
  let deferred4_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1;
    try {
      ptr0 = passStringToWasm0(file_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passStringToWasm0(options_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len1 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.audit_spelling_wasm(retptr, ptr0, len0, ptr1, len1);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr3 = r0;
    var len3 = r1;
    if (r3) {
      ptr3 = 0;
      len3 = 0;
      throw takeFromExternrefTable0(r2);
    }
    deferred4_0 = ptr3;
    deferred4_1 = len3;
    return getStringFromWasm0(ptr3, len3);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred4_0, deferred4_1, 1);
  }
}

/**
 * @param {string} payload_json
 * @returns {Uint8Array}
 */
export function build_epub_wasm(payload_json) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    const ptr0 = passStringToWasm0(payload_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.build_epub_wasm(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeFromExternrefTable0(r2);
    }
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export3(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

export function clear_custom_cover_wasm() {
  wasm.clear_custom_cover_wasm();
}

/**
 * @param {Uint8Array | number[]} bytes
 * @returns {Uint8Array}
 */
export function compress_brotli_wasm(bytes) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.compress_brotli_wasm(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeFromExternrefTable0(r2);
    }
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export3(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @param {Uint8Array | number[]} bytes
 * @returns {Uint8Array}
 */
export function decompress_brotli_wasm(bytes) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.decompress_brotli_wasm(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeFromExternrefTable0(r2);
    }
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export3(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @returns {string}
 */
export function engine_version() {
  let deferred1_0;
  let deferred1_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    wasm.engine_version(retptr);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred1_0 = r0;
    deferred1_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
  }
}

/**
 * @param {string} file_id
 * @param {string} image_name
 * @returns {Uint8Array | undefined}
 */
export function get_image_bytes_wasm(file_id, image_name) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1;
    try {
      ptr0 = passStringToWasm0(file_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passStringToWasm0(image_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len1 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.get_image_bytes_wasm(retptr, ptr0, len0, ptr1, len1);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    let v3;
    if (r0 !== 0) {
      v3 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export3(r0, r1 * 1, 1);
    }
    return v3;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @param {number} num_threads
 * @returns {Promise<any>}
 */
export function initThreadPool(num_threads) {
  const ret = wasm.initThreadPool(num_threads);
  return ret;
}

/**
 * @param {string} lang
 * @param {Uint8Array | number[]} bytes
 */
export function init_dictionary_wasm(lang, bytes) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1;
    try {
      ptr0 = passStringToWasm0(lang, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
      len1 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.init_dictionary_wasm(retptr, ptr0, len0, ptr1, len1);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    if (r1) {
      throw takeFromExternrefTable0(r0);
    }
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

export function init_engine() {
  wasm.init_engine();
}

/**
 * @param {string} file_id
 * @param {string} pages_json
 * @param {string} options_json
 * @returns {string}
 */
export function inject_ocr_pages_wasm(file_id, pages_json, options_json) {
  let deferred5_0;
  let deferred5_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1, ptr2, len2;
    try {
      ptr0 = passStringToWasm0(file_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passStringToWasm0(pages_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len1 = WASM_VECTOR_LEN;
      ptr2 = passStringToWasm0(options_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len2 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr2) {
        wasm.__wbindgen_export3(ptr2, len2 * 1, 1);
      }
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.inject_ocr_pages_wasm(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr4 = r0;
    var len4 = r1;
    if (r3) {
      ptr4 = 0;
      len4 = 0;
      throw takeFromExternrefTable0(r2);
    }
    deferred5_0 = ptr4;
    deferred5_1 = len4;
    return getStringFromWasm0(ptr4, len4);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred5_0, deferred5_1, 1);
  }
}

/**
 * @param {Uint8Array | number[]} bytes
 * @param {string} filename
 * @returns {string}
 */
export function parse_book_file_wasm(bytes, filename) {
  let deferred4_0;
  let deferred4_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1;
    try {
      ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passStringToWasm0(filename, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len1 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.parse_book_file_wasm(retptr, ptr0, len0, ptr1, len1);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr3 = r0;
    var len3 = r1;
    if (r3) {
      ptr3 = 0;
      len3 = 0;
      throw takeFromExternrefTable0(r2);
    }
    deferred4_0 = ptr3;
    deferred4_1 = len3;
    return getStringFromWasm0(ptr3, len3);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred4_0, deferred4_1, 1);
  }
}

/**
 * @param {Uint8Array | number[]} bytes
 * @param {string} filename
 * @param {string} options_json
 * @returns {string}
 */
export function parse_book_file_with_options_wasm(bytes, filename, options_json) {
  let deferred5_0;
  let deferred5_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    let ptr0, len0, ptr1, len1, ptr2, len2;
    try {
      ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
      len0 = WASM_VECTOR_LEN;
      ptr1 = passStringToWasm0(filename, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len1 = WASM_VECTOR_LEN;
      ptr2 = passStringToWasm0(options_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      len2 = WASM_VECTOR_LEN;
    } catch (e) {
      if (ptr2) {
        wasm.__wbindgen_export3(ptr2, len2 * 1, 1);
      }
      if (ptr1) {
        wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
      }
      if (ptr0) {
        wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
      }
      throw e;
    }
    wasm.parse_book_file_with_options_wasm(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr4 = r0;
    var len4 = r1;
    if (r3) {
      ptr4 = 0;
      len4 = 0;
      throw takeFromExternrefTable0(r2);
    }
    deferred5_0 = ptr4;
    deferred5_1 = len4;
    return getStringFromWasm0(ptr4, len4);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred5_0, deferred5_1, 1);
  }
}

/**
 * @param {string} file_id
 */
export function remove_book_file_wasm(file_id) {
  const ptr0 = passStringToWasm0(file_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  wasm.remove_book_file_wasm(ptr0, len0);
}

/**
 * @param {string} filename
 * @param {string} ext
 * @param {Uint8Array | number[]} data
 */
export function set_custom_cover_wasm(filename, ext, data) {
  let ptr0, len0, ptr1, len1, ptr2, len2;
  try {
    ptr0 = passStringToWasm0(filename, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    len0 = WASM_VECTOR_LEN;
    ptr1 = passStringToWasm0(ext, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    len1 = WASM_VECTOR_LEN;
    ptr2 = passArray8ToWasm0(data, wasm.__wbindgen_export);
    len2 = WASM_VECTOR_LEN;
  } catch (e) {
    if (ptr2) {
      wasm.__wbindgen_export3(ptr2, len2 * 1, 1);
    }
    if (ptr1) {
      wasm.__wbindgen_export3(ptr1, len1 * 1, 1);
    }
    if (ptr0) {
      wasm.__wbindgen_export3(ptr0, len0 * 1, 1);
    }
    throw e;
  }
  wasm.set_custom_cover_wasm(ptr0, len0, ptr1, len1, ptr2, len2);
}

/**
 * @param {string} request_json
 * @returns {string}
 */
export function transform_section_blocks_wasm(request_json) {
  let deferred3_0;
  let deferred3_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16) >>> 0;
    const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.transform_section_blocks_wasm(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    var ptr2 = r0;
    var len2 = r1;
    if (r3) {
      ptr2 = 0;
      len2 = 0;
      throw takeFromExternrefTable0(r2);
    }
    deferred3_0 = ptr2;
    deferred3_1 = len2;
    return getStringFromWasm0(ptr2, len2);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export3(deferred3_0, deferred3_1, 1);
  }
}

export class wbg_rayon_PoolBuilder {
  static __wrap(ptr) {
    const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
    obj.__wbg_ptr = ptr;
    wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    wbg_rayon_PoolBuilderFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
  }
  build() {
    wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
  }
  /**
   * @returns {number}
   */
  numThreads() {
    const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  receiver() {
    const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
    return ret >>> 0;
  }
}
if (Symbol.dispose)
  wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;

/**
 * @param {number} receiver
 */
export function wbg_rayon_start_worker(receiver) {
  wasm.wbg_rayon_start_worker(receiver);
}
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg_Error_208446807d0d1e30: (arg0, arg1) => {
      const ret = Error(getStringFromWasm0(arg0, arg1));
      return ret;
    },
    __wbg_Number_ff192a72a0dcdf6d: (arg0) => {
      const ret = Number(arg0);
      return ret;
    },
    __wbg___wbindgen_boolean_get_4f1baf9a00be3c74: (arg0) => {
      const v = arg0;
      const ret = typeof v === "boolean" ? v : undefined;
      return isLikeNone(ret) ? 0xffffff : ret ? 1 : 0;
    },
    __wbg___wbindgen_debug_string_f249a2a76caa9a55: (arg0, arg1) => {
      const ret = debugString(arg1);
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_in_3f58a9d3b3a7eed2: (arg0, arg1) => {
      const ret = arg0 in arg1;
      return ret;
    },
    __wbg___wbindgen_is_object_8b968c3ab8e96595: (arg0) => {
      const val = arg0;
      const ret = typeof val === "object" && val !== null;
      return ret;
    },
    __wbg___wbindgen_is_undefined_be5b34249ff1fc15: (arg0) => {
      const ret = arg0 === undefined;
      return ret;
    },
    __wbg___wbindgen_jsval_loose_eq_b2f214e2e4b30e36: (arg0, arg1) => {
      const ret = arg0 == arg1;
      return ret;
    },
    __wbg___wbindgen_memory_17a1178bc3328ea3: () => {
      const ret = wasm.memory;
      return ret;
    },
    __wbg___wbindgen_module_2e98e71e8e96b4ac: () => {
      const ret = wasmModule;
      return ret;
    },
    __wbg___wbindgen_number_get_934b640d0889af78: (arg0, arg1) => {
      const obj = arg1;
      const ret = typeof obj === "number" ? obj : undefined;
      getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
    },
    __wbg___wbindgen_string_get_7ce8eee7fd327545: (arg0, arg1) => {
      const obj = arg1;
      const ret = typeof obj === "string" ? obj : undefined;
      var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_throw_4c88d8bf264fd984: (arg0, arg1) => {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_error_757e9472f8410341: (arg0, arg1) => {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_export3(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_getRandomValues_db3aaeb8394c1d98: function () {
      return handleError((arg0) => {
        globalThis.crypto.getRandomValues(arg0);
      }, arguments);
    },
    __wbg_get_with_ref_key_fc601247060b7204: (arg0, arg1) => {
      const ret = arg0[arg1];
      return ret;
    },
    __wbg_instanceof_ArrayBuffer_12cdaa4161423e6b: (arg0) => {
      let result;
      try {
        result = arg0 instanceof ArrayBuffer;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_instanceof_Uint8Array_d7aeb0dcb3108fea: (arg0) => {
      let result;
      try {
        result = arg0 instanceof Uint8Array;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_instanceof_Window_5cf453f5639aa1a2: (arg0) => {
      let result;
      try {
        result = arg0 instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_isSafeInteger_1a35ba4d31e71d38: (arg0) => {
      const ret = Number.isSafeInteger(arg0);
      return ret;
    },
    __wbg_length_186163212ffe79c3: (arg0) => {
      const ret = arg0.length;
      return ret;
    },
    __wbg_new_13de428334042d26: (arg0) => {
      const ret = new Uint8Array(arg0);
      return ret;
    },
    __wbg_new_bb74001155cb8ca8: () => {
      const ret = new Error();
      return ret;
    },
    __wbg_new_cd4348290afae586: () => {
      const ret = new Object();
      return ret;
    },
    __wbg_new_with_length_01b143a7e5dd5a3e: (arg0) => {
      const ret = new Uint8Array(arg0 >>> 0);
      return ret;
    },
    __wbg_prototypesetcall_13162965d1fe7aa3: (arg0, arg1, arg2) => {
      Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    },
    __wbg_set_e4b9a833d288759a: (arg0, arg1, arg2) => {
      arg0[arg1] = arg2;
    },
    __wbg_stack_575c4e0918581b9c: (arg0, arg1) => {
      const ret = arg1.stack;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
      getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
    },
    __wbg_startWorkers_8b582d57e92bd2d4: (arg0, arg1, arg2) => {
      const ret = startWorkers(arg0, arg1, wbg_rayon_PoolBuilder.__wrap(arg2));
      return ret;
    },
    __wbg_static_accessor_GLOBAL_THIS_003ee833af9699fc: () => {
      const ret = typeof globalThis === "undefined" ? undefined : globalThis;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_GLOBAL_e4293fb22cbe77da: () => {
      const ret = typeof global === "undefined" ? undefined : global;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_SELF_53bb20457401453d: () => {
      const ret = typeof self === "undefined" ? undefined : self;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_static_accessor_WINDOW_b5e0810bfecb7feb: () => {
      const ret = typeof window === "undefined" ? undefined : window;
      return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    },
    __wbg_subarray_58f388a9247ac0bb: (arg0, arg1, arg2) => {
      const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
      return ret;
    },
    __wbindgen_generic_0000000000000001: (arg0) => {
      // Cast intrinsic for `F64 -> Externref`.
      const ret = arg0;
      return ret;
    },
    __wbindgen_generic_0000000000000002: (arg0, arg1) => {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return ret;
    },
    __wbindgen_init_externref_table: () => {
      const table = wasm.__wbindgen_externrefs;
      table.set(0, undefined);
      table.set(1024, undefined);
      table.set(1025, null);
      table.set(1026, true);
      table.set(1027, false);
    },
  };
  return {
    __proto__: null,
    "./engine_bg.js": import0,
  };
}

const SymSpellFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_symspell_free(ptr, 1));
const wbg_rayon_PoolBuilderFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 1));

function addToExternrefTable0(obj) {
  const idx = wasm.__wbindgen_export5();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

function debugString(val) {
  switch (typeof val) {
    // primitive types
    case "number":
    case "boolean":
    case "undefined":
      return `${val}`;
    case "string":
      return JSON.stringify(val);
    case "bigint":
      return `${val}n`;
    case "symbol":
      return val.description !== undefined ? `Symbol(${val.description})` : "Symbol";
    case "function":
      return typeof val.name === "string" && val.name !== "" ? `Function(${val.name})` : "Function";
    case "object": {
      if (val === null) {
        return "null";
      }
      // objects
      if (Array.isArray(val)) {
        return "[" + Array.from(val, debugString).join(", ") + "]";
      }
      // errors
      if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
      }

      const toStringOutput = toString.call(val);
      // Test for built-in
      const className = /\[object ([^\]]+)\]/.exec(toStringOutput)?.[1];

      // Failed to match the standard '[object ClassName]'
      if (className === undefined) {
        return toStringOutput;
      }
      if (className === "Object") {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
          return "Object(" + JSON.stringify(val) + ")";
        } catch (_) {
          return "Object";
        }
      }
      // TODO we could test for more things here, like `Set`s and `Map`s.
      return className;
    }
    // Per MDN: 'This list of values is exhaustive.'
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
  }
}

function getArrayJsValueFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  const mem = getDataViewMemory0();
  const result = [];
  for (let i = ptr; i < ptr + 4 * len; i += 4) {
    result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
  }
  wasm.__wbindgen_export7(ptr, len);
  return result;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
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
    wasm.__wbindgen_export4(idx);
  }
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__wbindgen_export6(idx);
  return value;
}

let cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
  numBytesDecoded += bytes.length;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true });
    cachedTextDecoder.decode();
    numBytesDecoded = bytes.length;
  }
  return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!("encodeInto" in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = (arg, view) => {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length,
    };
  };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}

async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (!module.ok) {
      throw new Error(
        `failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`
      );
    }

    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = expectedResponseType(module.type);

        if (validResponse && module.headers.get("Content-Type") !== "application/wasm") {
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            e
          );
        } else {
          throw e;
        }
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
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}

function initSync(module) {
  if (wasm !== undefined) return wasm;

  if (module !== undefined) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
    }
  }

  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;
  if (__wbg_init_promise === undefined) {
    __wbg_init_promise = __wbg_init_once(module_or_path);
    __wbg_init_promise.catch(() => {
      __wbg_init_promise = undefined;
    });
  }
  return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {
  if (module_or_path !== undefined) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        "using deprecated parameters for the initialization function; pass a single object instead"
      );
    }
  }

  if (module_or_path === undefined) {
    module_or_path = new URL("engine_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();

  if (
    typeof module_or_path === "string" ||
    (typeof Request === "function" && module_or_path instanceof Request) ||
    (typeof URL === "function" && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

export { __wbg_init as default, initSync };
