use crate::options::EncodeOptions;

#[cfg(feature = "bcrypt")]
pub fn encode(password: &str, opts: &EncodeOptions) -> Result<String, String> {
    let cost = opts.cost.unwrap_or(12) as u32;
    if !(4..=31).contains(&cost) {
        return Err("bcrypt cost must be 4..=31".into());
    }

    let mut hash = bcrypt::hash(password, cost).map_err(|e| e.to_string())?;
    if let Some(prefix) = &opts.bcrypt_prefix {
        let target = match prefix.as_str() {
            "2a" => "$2a$",
            "2b" => "$2b$",
            "2y" => "$2y$",
            other => return Err(format!("bcrypt_prefix must be 2a, 2b, or 2y; got {other}")),
        };
        if hash.starts_with("$2b$") {
            hash = format!("{target}{}", &hash[4..]);
        }
    }
    Ok(hash)
}

#[cfg(not(feature = "bcrypt"))]
pub fn encode(_password: &str, _opts: &EncodeOptions) -> Result<String, String> {
    Err("bcrypt feature disabled".into())
}

#[cfg(all(test, feature = "bcrypt"))]
mod tests {
    use super::*;

    #[test]
    fn bcrypt_fixed_salt_shape() {
        let hash = encode(
            "password",
            &EncodeOptions {
                cost: Some(4),
                bcrypt_prefix: Some("2y".into()),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(hash.starts_with("$2y$04$"));
    }
}
