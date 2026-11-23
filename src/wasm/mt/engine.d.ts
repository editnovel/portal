/* tslint:disable */
/* eslint-disable */

export class SymSpell {
    free(): void;
    [Symbol.dispose](): void;
    load_bigram_dictionary(input: Uint8Array | number[], args: any): void;
    load_dictionary(input: Uint8Array | number[], args: any): void;
    lookup(input: string, verbosity: number, max_edit_distance: number): any[];
    lookup_compound(input: string, edit_distance: number): any[];
    constructor(parameters: any);
    word_segmentation(input: string, max_edit_distance: number): any;
}

export function apply_editorial_transforms_wasm(content: string, editorial_rules_json: string, regex_rules_json: string, glossary_json: string): string;

export function audit_dynamic_paragraphs_wasm(request_json: string): string;

export function audit_spelling_wasm(file_id: string, options_json: string): string;

export function build_epub_wasm(payload_json: string): Uint8Array;

export function clear_custom_cover_wasm(): void;

export function compress_brotli_wasm(bytes: Uint8Array | number[]): Uint8Array;

export function decompress_brotli_wasm(bytes: Uint8Array | number[]): Uint8Array;

export function engine_manifest_wasm(): string;

export function engine_version(): string;

export function get_image_bytes_wasm(file_id: string, image_name: string): Uint8Array | undefined;

export function initThreadPool(num_threads: number): Promise<any>;

export function init_dictionary_wasm(lang: string, bytes: Uint8Array | number[]): void;

export function init_engine(): void;

export function inject_ocr_pages_wasm(file_id: string, pages_json: string, options_json: string): string;

export function parse_book_file_wasm(bytes: Uint8Array | number[], filename: string): string;

export function parse_book_file_with_options_wasm(bytes: Uint8Array | number[], filename: string, options_json: string): string;

export function remove_book_file_wasm(file_id: string): void;

export function resolve_preset_id_wasm(raw: string): string | undefined;

export function set_custom_cover_wasm(filename: string, ext: string, data: Uint8Array | number[]): void;

export function transform_section_blocks_wasm(request_json: string): string;

export class wbg_rayon_PoolBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    build(): void;
    numThreads(): number;
    receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_symspell_free: (a: number, b: number) => void;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly apply_editorial_transforms_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly audit_dynamic_paragraphs_wasm: (a: number, b: number, c: number) => void;
    readonly audit_spelling_wasm: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly build_epub_wasm: (a: number, b: number, c: number) => void;
    readonly clear_custom_cover_wasm: () => void;
    readonly compress_brotli_wasm: (a: number, b: number, c: number) => void;
    readonly decompress_brotli_wasm: (a: number, b: number, c: number) => void;
    readonly engine_manifest_wasm: (a: number) => void;
    readonly engine_version: (a: number) => void;
    readonly get_image_bytes_wasm: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly initThreadPool: (a: number) => any;
    readonly init_dictionary_wasm: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly init_engine: () => void;
    readonly inject_ocr_pages_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly parse_book_file_wasm: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly parse_book_file_with_options_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly remove_book_file_wasm: (a: number, b: number) => void;
    readonly resolve_preset_id_wasm: (a: number, b: number, c: number) => void;
    readonly set_custom_cover_wasm: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly symspell_load_bigram_dictionary: (a: number, b: number, c: number, d: number, e: any) => void;
    readonly symspell_load_dictionary: (a: number, b: number, c: number, d: number, e: any) => void;
    readonly symspell_lookup: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly symspell_lookup_compound: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly symspell_new: (a: number, b: any) => void;
    readonly qcms_profile_precache_output_transform: (a: number) => void;
    readonly lut_inverse_interp16: (a: number, b: number, c: number) => number;
    readonly lut_interp_linear16: (a: number, b: number, c: number) => number;
    readonly qcms_enable_iccv4: () => void;
    readonly qcms_profile_is_bogus: (a: number) => number;
    readonly qcms_transform_data_bgra_out_lut: (a: number, b: number, c: number, d: number) => void;
    readonly qcms_transform_data_bgra_out_lut_precache: (a: number, b: number, c: number, d: number) => void;
    readonly qcms_transform_data_rgb_out_lut: (a: number, b: number, c: number, d: number) => void;
    readonly qcms_transform_data_rgb_out_lut_precache: (a: number, b: number, c: number, d: number) => void;
    readonly qcms_transform_data_rgba_out_lut: (a: number, b: number, c: number, d: number) => void;
    readonly qcms_transform_data_rgba_out_lut_precache: (a: number, b: number, c: number, d: number) => void;
    readonly qcms_transform_release: (a: number) => void;
    readonly qcms_white_point_sRGB: (a: number) => void;
    readonly symspell_word_segmentation: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly transform_section_blocks_wasm: (a: number, b: number, c: number) => void;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export4: (a: number) => void;
    readonly __wbindgen_export5: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export6: (a: number) => void;
    readonly __wbindgen_export7: (a: number, b: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
