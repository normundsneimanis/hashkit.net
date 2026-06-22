use password_hash::PasswordHash;

use crate::response::DetectResult;

pub fn detect_phc(hash: &str) -> Option<DetectResult> {
    if !hash.starts_with('$') {
        return None;
    }

    let parsed = PasswordHash::new(hash).ok()?;
    let algorithm = parsed.algorithm.as_str();

    let (algo, variant) = match algorithm {
        "argon2id" => ("argon2id", None),
        "argon2i" => ("argon2i", None),
        "argon2d" => ("argon2d", None),
        "scrypt" => ("scrypt", None),
        "pbkdf2-sha256" => ("pbkdf2_sha256_phc", None),
        "pbkdf2-sha512" => ("pbkdf2_sha512_phc", None),
        "2a" | "2b" | "2y" => ("bcrypt", Some(format!("${algorithm}$"))),
        _ => return None,
    };

    let mut params = serde_json::Map::new();
    for (key, value) in parsed.params.iter() {
        params.insert(
            key.to_string(),
            serde_json::Value::String(value.to_string()),
        );
    }

    Some(DetectResult {
        algorithm: algo.into(),
        variant,
        params: Some(serde_json::Value::Object(params)),
        confidence: "certain".into(),
        notes: None,
        htpasswd_user: None,
    })
}
