use wasm_bindgen::prelude::*;

#[cfg(feature = "parallel")]
pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen]
pub fn init_engine() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn engine_version() -> String {
    editnovel_engine::engine_version().to_string()
}

#[wasm_bindgen]
pub fn parse_book_file_wasm(bytes: &[u8], filename: &str) -> Result<String, JsValue> {
    editnovel_engine::parse_book_file_json(bytes, filename).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn audit_spelling_wasm(file_id: &str, options_json: &str) -> Result<String, JsValue> {
    editnovel_engine::audit_spelling_json(file_id, options_json).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn audit_dynamic_paragraphs_wasm(request_json: &str) -> Result<String, JsValue> {
    editnovel_engine::audit_dynamic_paragraphs_json(request_json).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn set_custom_cover_wasm(filename: &str, ext: &str, data: &[u8]) {
    editnovel_engine::set_custom_cover(filename, ext, data);
}

#[wasm_bindgen]
pub fn clear_custom_cover_wasm() {
    editnovel_engine::clear_custom_cover();
}

#[wasm_bindgen]
pub fn get_image_bytes_wasm(file_id: &str, image_name: &str) -> Option<Vec<u8>> {
    editnovel_engine::get_image_bytes(file_id, image_name)
}

#[wasm_bindgen]
pub fn remove_book_file_wasm(file_id: &str) {
    editnovel_engine::remove_book_file(file_id);
}

#[wasm_bindgen]
pub fn apply_editorial_transforms_wasm(
    content: &str,
    editorial_rules_json: &str,
    regex_rules_json: &str,
    glossary_json: &str,
) -> String {
    editnovel_engine::apply_editorial_transforms_json(
        content,
        editorial_rules_json,
        regex_rules_json,
        glossary_json,
    )
}

#[wasm_bindgen]
pub fn build_epub_wasm(payload_json: &str) -> Result<Vec<u8>, JsValue> {
    editnovel_engine::build_epub_from_json(payload_json).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn parse_book_file_with_options_wasm(
    bytes: &[u8],
    filename: &str,
    options_json: &str,
) -> Result<String, JsValue> {
    editnovel_engine::parse_book_file_with_options_json(bytes, filename, options_json)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn init_dictionary_wasm(lang: &str, bytes: &[u8]) -> Result<(), JsValue> {
    editnovel_engine::init_dictionary(lang, bytes).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn transform_section_blocks_wasm(request_json: &str) -> Result<String, JsValue> {
    editnovel_engine::transform_section_blocks_json(request_json)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn inject_ocr_pages_wasm(
    file_id: &str,
    pages_json: &str,
    options_json: &str,
) -> Result<String, JsValue> {
    editnovel_engine::inject_ocr_pages_json(file_id, pages_json, options_json)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn compress_brotli_wasm(bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    editnovel_engine::compress_brotli(bytes).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn decompress_brotli_wasm(bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    editnovel_engine::decompress_brotli(bytes).map_err(|e| JsValue::from_str(&e))
}
