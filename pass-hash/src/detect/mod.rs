mod phc;
mod prefixes;

use crate::response::detect_unknown;

pub fn detect(hash: &str) -> String {
    let trimmed = hash.trim();
    if trimmed.is_empty() {
        return detect_unknown();
    }

    if let Some((user, inner)) = split_htpasswd(trimmed) {
        let inner_json = detect_inner(inner);
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&inner_json) {
            if let Some(obj) = value.as_object() {
                let mut map = obj.clone();
                map.insert(
                    "htpasswd_user".into(),
                    serde_json::Value::String(user.to_string()),
                );
                if let Some(notes) = map.get_mut("notes") {
                    *notes = serde_json::Value::String(
                        "htpasswd line; inner hash detected".into(),
                    );
                } else {
                    map.insert(
                        "notes".into(),
                        serde_json::Value::String(
                            "htpasswd line; inner hash detected".into(),
                        ),
                    );
                }
                return serde_json::to_string(&map).unwrap_or(inner_json);
            }
        }
        return inner_json;
    }

    detect_inner(trimmed)
}

fn detect_inner(hash: &str) -> String {
    if let Some(result) = phc::detect_phc(hash) {
        return result.to_json();
    }
    if let Some(result) = prefixes::detect_django(hash) {
        return result.to_json();
    }
    if let Some(result) = prefixes::detect_crypt(hash) {
        return result.to_json();
    }
    detect_unknown()
}

fn split_htpasswd(line: &str) -> Option<(&str, &str)> {
    let (user, hash) = line.split_once(':')?;
    if hash.starts_with('$') || hash.starts_with("pbkdf2_") {
        Some((user, hash))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_argon2id_prefix() {
        let encoded = crate::encode::encode("argon2id", "secret", &crate::options::EncodeOptions::default());
        let parsed: serde_json::Value = serde_json::from_str(&encoded).unwrap();
        let hash = parsed["hash"].as_str().unwrap();
        let json = detect(hash);
        assert!(json.contains("\"algorithm\":\"argon2id\""), "detected: {json}");
    }

    #[test]
    fn detects_django() {
        let json = detect("pbkdf2_sha256$720000$salt$abc=");
        assert!(json.contains("\"algorithm\":\"django_pbkdf2_sha256\""));
    }

    #[test]
    fn detects_htpasswd_wrapper() {
        let json = detect("admin:$6$rounds=5000$salt$hash");
        assert!(json.contains("\"htpasswd_user\":\"admin\""));
    }
}
