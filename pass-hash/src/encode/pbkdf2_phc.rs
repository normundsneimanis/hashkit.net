use pbkdf2::{Params, Pbkdf2};
use password_hash::{Ident, PasswordHasher, SaltString, rand_core::OsRng};

use crate::options::EncodeOptions;

pub fn encode(password: &str, algo: &str, opts: &EncodeOptions) -> Result<String, String> {
    let iterations = opts.iterations.unwrap_or(600_000);
    let salt = match &opts.salt {
        Some(s) => SaltString::from_b64(s).map_err(|e| e.to_string())?,
        None => SaltString::generate(&mut OsRng),
    };

    match algo {
        "pbkdf2_sha256_phc" => {
            let params = Params {
                rounds: iterations,
                output_length: 32,
            };
            Pbkdf2
                .hash_password_customized(
                    password.as_bytes(),
                    Some(Ident::new("pbkdf2-sha256").map_err(|e| e.to_string())?),
                    None,
                    params,
                    &salt,
                )
                .map(|h| h.to_string())
                .map_err(|e| e.to_string())
        }
        "pbkdf2_sha512_phc" => {
            let params = Params {
                rounds: iterations,
                output_length: 64,
            };
            Pbkdf2
                .hash_password_customized(
                    password.as_bytes(),
                    Some(Ident::new("pbkdf2-sha512").map_err(|e| e.to_string())?),
                    None,
                    params,
                    &salt,
                )
                .map(|h| h.to_string())
                .map_err(|e| e.to_string())
        }
        other => Err(format!("unknown pbkdf2 algorithm: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pbkdf2_sha256_phc_prefix() {
        let hash = encode(
            "password",
            "pbkdf2_sha256_phc",
            &EncodeOptions {
                iterations: Some(1000),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(hash.starts_with("$pbkdf2-sha256$"));
    }
}
