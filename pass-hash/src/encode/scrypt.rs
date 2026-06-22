use scrypt::{
    Params, Scrypt,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};

use crate::options::EncodeOptions;

pub fn encode(password: &str, opts: &EncodeOptions) -> Result<String, String> {
    let log_n = opts.scrypt_n.unwrap_or(15).min(255) as u8;
    let r = opts.scrypt_r.unwrap_or(8);
    let p = opts.scrypt_p.unwrap_or(1);
    let params = Params::new(log_n, r, p, 32).map_err(|e| e.to_string())?;

    let salt = match &opts.salt {
        Some(s) => SaltString::from_b64(s).map_err(|e| e.to_string())?,
        None => SaltString::generate(&mut OsRng),
    };

    Scrypt
        .hash_password_customized(password.as_bytes(), None, None, params, &salt)
        .map(|h| h.to_string())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrypt_phc_prefix() {
        let hash = encode("password", &EncodeOptions::default()).unwrap();
        assert!(hash.starts_with("$scrypt$"));
    }
}
