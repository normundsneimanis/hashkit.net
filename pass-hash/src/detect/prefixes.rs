use crate::response::DetectResult;

pub fn detect_django(hash: &str) -> Option<DetectResult> {
    if let Some(rest) = hash.strip_prefix("pbkdf2_sha256$") {
        return Some(parse_django("django_pbkdf2_sha256", rest));
    }
    if let Some(rest) = hash.strip_prefix("pbkdf2_sha512$") {
        return Some(parse_django("django_pbkdf2_sha512", rest));
    }
    None
}

fn parse_django(algo: &str, rest: &str) -> DetectResult {
    let mut parts = rest.splitn(3, '$');
    let iterations = parts.next().unwrap_or("");
    let salt = parts.next().unwrap_or("");
    let hash_part = parts.next().unwrap_or("");

    let params = serde_json::json!({
        "iterations": iterations,
        "salt": salt,
        "hash": hash_part,
    });

    DetectResult {
        algorithm: algo.into(),
        variant: None,
        params: Some(params),
        confidence: if hash_part.is_empty() {
            "likely".into()
        } else {
            "certain".into()
        },
        notes: None,
        htpasswd_user: None,
    }
}

pub fn detect_crypt(hash: &str) -> Option<DetectResult> {
    if hash.starts_with("$argon2") {
        return None;
    }
    if hash.starts_with("$y$") {
        return Some(crypt_result("yescrypt", None, "certain"));
    }
    if hash.starts_with("$6$") {
        let rounds = extract_rounds(hash);
        return Some(crypt_result(
            "sha512crypt",
            rounds.map(|r| serde_json::json!({ "rounds": r })),
            "certain",
        ));
    }
    if hash.starts_with("$5$") {
        let rounds = extract_rounds(hash);
        return Some(crypt_result(
            "sha256crypt",
            rounds.map(|r| serde_json::json!({ "rounds": r })),
            "certain",
        ));
    }
    if hash.starts_with("$1$") {
        return Some(crypt_result("md5crypt", None, "certain"));
    }
    if hash.starts_with("$apr1$") {
        return Some(crypt_result("htpasswd_apr1", None, "certain"));
    }
    if hash.starts_with("$2a$") || hash.starts_with("$2b$") || hash.starts_with("$2y$") {
        let prefix = &hash[..4];
        let cost = hash.get(4..6).and_then(|c| c.parse::<u32>().ok());
        return Some(DetectResult {
            algorithm: "bcrypt".into(),
            variant: Some(prefix.to_string()),
            params: cost.map(|c| serde_json::json!({ "cost": c })),
            confidence: "certain".into(),
            notes: None,
            htpasswd_user: None,
        });
    }
    None
}

fn crypt_result(algo: &str, params: Option<serde_json::Value>, confidence: &str) -> DetectResult {
    DetectResult {
        algorithm: algo.into(),
        variant: None,
        params,
        confidence: confidence.into(),
        notes: None,
        htpasswd_user: None,
    }
}

fn extract_rounds(hash: &str) -> Option<u32> {
    hash.strip_prefix("$6$")
        .or_else(|| hash.strip_prefix("$5$"))
        .and_then(|rest| rest.strip_prefix("rounds="))
        .and_then(|rest| rest.split('$').next())
        .and_then(|r| r.parse().ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha512_rounds() {
        let r = detect_crypt("$6$rounds=10000$salt$hash").unwrap();
        assert_eq!(r.algorithm, "sha512crypt");
        assert_eq!(r.params.as_ref().unwrap()["rounds"], 10000);
    }
}
