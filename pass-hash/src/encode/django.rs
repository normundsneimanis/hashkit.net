use base64::{engine::general_purpose::STANDARD, Engine as _};
use hmac::Hmac;
use pbkdf2::pbkdf2;
use sha2::{Sha256, Sha512};

use crate::options::EncodeOptions;
use crate::salt::random_django_salt;

type HmacSha256 = Hmac<Sha256>;
type HmacSha512 = Hmac<Sha512>;

const DJANGO_SHA256_ITERS: u32 = 720_000;
const DJANGO_SHA512_ITERS: u32 = 720_000;

pub fn encode(password: &str, algo: &str, opts: &EncodeOptions) -> Result<String, String> {
    let salt = match &opts.salt {
        Some(s) => s.clone(),
        None => random_django_salt(12)?,
    };

    match algo {
        "django_pbkdf2_sha256" => {
            let iterations = opts.iterations.unwrap_or(DJANGO_SHA256_ITERS);
            let mut hash = [0u8; 32];
            pbkdf2::<HmacSha256>(password.as_bytes(), salt.as_bytes(), iterations, &mut hash)
                .map_err(|e| e.to_string())?;
            Ok(format!(
                "pbkdf2_sha256${iterations}${salt}${}",
                STANDARD.encode(hash)
            ))
        }
        "django_pbkdf2_sha512" => {
            let iterations = opts.iterations.unwrap_or(DJANGO_SHA512_ITERS);
            let mut hash = [0u8; 64];
            pbkdf2::<HmacSha512>(password.as_bytes(), salt.as_bytes(), iterations, &mut hash)
                .map_err(|e| e.to_string())?;
            Ok(format!(
                "pbkdf2_sha512${iterations}${salt}${}",
                STANDARD.encode(hash)
            ))
        }
        other => Err(format!("unknown django algorithm: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn django_pbkdf2_sha256_shape() {
        let hash = encode(
            "password",
            "django_pbkdf2_sha256",
            &EncodeOptions {
                salt: Some("abcdefghijkl".into()),
                iterations: Some(1000),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(hash.starts_with("pbkdf2_sha256$1000$abcdefghijkl$"));
    }
}
