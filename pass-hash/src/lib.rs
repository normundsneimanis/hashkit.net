mod md5_crypt;

mod detect;
mod encode;
mod options;
mod response;
mod salt;

use wasm_bindgen::prelude::*;

use options::EncodeOptions;
use response::json_err;

#[wasm_bindgen]
pub fn detect_algorithm(hash: &str) -> String {
    detect::detect(hash)
}

#[wasm_bindgen]
pub fn encode_password(algo: &str, password: &str, options_json: &str) -> String {
    if password.is_empty() {
        return json_err("password must not be empty");
    }
    let opts = match EncodeOptions::from_json(options_json) {
        Ok(o) => o,
        Err(e) => return json_err(e),
    };
    encode::encode(algo, password, &opts)
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn round_trip_argon2id() {
        let encoded = encode::encode("argon2id", "secret", &EncodeOptions::default());
        let parsed: serde_json::Value =
            serde_json::from_str(&encoded).expect("encode should return json");
        assert_eq!(parsed["ok"], true, "encode failed: {encoded}");
        let hash = parsed["hash"].as_str().expect("hash field");
        let detected = detect::detect(hash);
        assert!(detected.contains("argon2id"), "detected: {detected}");
    }
}
