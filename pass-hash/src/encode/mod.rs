#[cfg(feature = "argon2")]
pub mod argon2;
#[cfg(feature = "bcrypt")]
pub mod bcrypt;
#[cfg(feature = "django")]
pub mod django;
#[cfg(feature = "htpasswd")]
pub mod htpasswd;
#[cfg(feature = "pbkdf2")]
pub mod pbkdf2_phc;
#[cfg(feature = "scrypt")]
pub mod scrypt;
#[cfg(feature = "shadow")]
pub mod shadow;

use crate::options::EncodeOptions;
use crate::response::{json_err, json_ok};

pub fn encode(algo: &str, password: &str, opts: &EncodeOptions) -> String {
    match algo {
        #[cfg(feature = "argon2")]
        "argon2id" | "argon2i" | "argon2d" => {
            let variant = opts.variant.as_deref().unwrap_or(algo);
            match argon2::encode(password, variant, opts) {
                Ok(hash) => json_ok(&hash),
                Err(e) => json_err(e),
            }
        }
        #[cfg(feature = "bcrypt")]
        "bcrypt" => match bcrypt::encode(password, opts) {
            Ok(hash) => json_ok(&hash),
            Err(e) => json_err(e),
        },
        #[cfg(feature = "shadow")]
        "yescrypt" | "sha512crypt" | "sha256crypt" | "md5crypt" => {
            match shadow::encode(password, algo, opts) {
                Ok(hash) => json_ok(&hash),
                Err(e) => json_err(e),
            }
        }
        #[cfg(feature = "htpasswd")]
        "htpasswd_bcrypt" | "htpasswd_apr1" | "htpasswd_crypt" => {
            match htpasswd::encode(password, algo, opts) {
                Ok(line) => json_ok(&line),
                Err(e) => json_err(e),
            }
        }
        #[cfg(feature = "django")]
        "django_pbkdf2_sha256" | "django_pbkdf2_sha512" => {
            match django::encode(password, algo, opts) {
                Ok(hash) => json_ok(&hash),
                Err(e) => json_err(e),
            }
        }
        #[cfg(feature = "scrypt")]
        "scrypt" => match scrypt::encode(password, opts) {
            Ok(hash) => json_ok(&hash),
            Err(e) => json_err(e),
        },
        #[cfg(feature = "pbkdf2")]
        "pbkdf2_sha256_phc" | "pbkdf2_sha512_phc" => match pbkdf2_phc::encode(password, algo, opts)
        {
            Ok(hash) => json_ok(&hash),
            Err(e) => json_err(e),
        },
        _ => json_err(format!("unsupported algorithm: {algo}")),
    }
}
