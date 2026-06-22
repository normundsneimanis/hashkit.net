use sha_crypt::{
    sha256_crypt_b64, sha512_crypt_b64, CryptError, Sha256Params, Sha512Params, ROUNDS_DEFAULT,
};

use crate::md5_crypt;
use crate::options::EncodeOptions;
use crate::salt::random_shadow_salt;

#[cfg(feature = "shadow")]
pub fn encode(password: &str, algo: &str, opts: &EncodeOptions) -> Result<String, String> {
    let salt = match &opts.salt {
        Some(s) => s.clone(),
        None => random_shadow_salt(16)?,
    };

    match algo {
        "sha512crypt" => sha512_format(password, &salt, opts),
        "sha256crypt" => sha256_format(password, &salt, opts),
        "md5crypt" => Ok(md5_crypt::md5_crypt(password, &salt)),
        "yescrypt" => encode_yescrypt(password, &salt),
        other => Err(format!("unknown shadow algorithm: {other}")),
    }
}

#[cfg(feature = "shadow")]
fn sha512_format(password: &str, salt: &str, opts: &EncodeOptions) -> Result<String, String> {
    let rounds = opts.rounds.unwrap_or(ROUNDS_DEFAULT as u32) as usize;
    let params = Sha512Params::new(rounds).map_err(crypt_err)?;
    let hash = sha512_crypt_b64(password.as_bytes(), salt.as_bytes(), &params).map_err(crypt_err)?;
    let mut result = String::from("$6$");
    if rounds != ROUNDS_DEFAULT {
        result.push_str(&format!("rounds={rounds}$"));
    }
    result.push_str(salt);
    result.push('$');
    result.push_str(&hash);
    Ok(result)
}

#[cfg(feature = "shadow")]
fn sha256_format(password: &str, salt: &str, opts: &EncodeOptions) -> Result<String, String> {
    let rounds = opts.rounds.unwrap_or(ROUNDS_DEFAULT as u32) as usize;
    let params = Sha256Params::new(rounds).map_err(crypt_err)?;
    let hash = sha256_crypt_b64(password.as_bytes(), salt.as_bytes(), &params).map_err(crypt_err)?;
    let mut result = String::from("$5$");
    if rounds != ROUNDS_DEFAULT {
        result.push_str(&format!("rounds={rounds}$"));
    }
    result.push_str(salt);
    result.push('$');
    result.push_str(&hash);
    Ok(result)
}

#[cfg(feature = "shadow")]
fn encode_yescrypt(password: &str, salt: &str) -> Result<String, String> {
    use yescrypt::{CustomizedPasswordHasher, Params, Yescrypt};

    let yescrypt = Yescrypt::default();
    yescrypt
        .hash_password_customized(
            password.as_bytes(),
            salt.as_bytes(),
            None,
            None,
            Params::default(),
        )
        .map(|h| h.to_string())
        .map_err(|e| format!("{e:?}"))
}

#[cfg(not(feature = "shadow"))]
pub fn encode(_password: &str, _algo: &str, _opts: &EncodeOptions) -> Result<String, String> {
    Err("shadow feature disabled".into())
}

fn crypt_err(err: CryptError) -> String {
    format!("{err:?}")
}

#[cfg(all(test, feature = "shadow"))]
mod tests {
    use super::*;

    #[test]
    fn sha512crypt_prefix() {
        let hash = encode(
            "password",
            "sha512crypt",
            &EncodeOptions {
                salt: Some("testsalt".into()),
                rounds: Some(5000),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(hash.starts_with("$6$testsalt$"));
    }
}
