#[cfg(feature = "argon2")]
use argon2::{
    Algorithm, Argon2, Params, Version,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};

use crate::options::EncodeOptions;

#[cfg(feature = "argon2")]
pub fn encode(password: &str, variant: &str, opts: &EncodeOptions) -> Result<String, String> {
    let algorithm = match variant {
        "argon2id" => Algorithm::Argon2id,
        "argon2i" => Algorithm::Argon2i,
        "argon2d" => Algorithm::Argon2d,
        other => return Err(format!("unknown argon2 variant: {other}")),
    };

    let m = opts.m_cost.unwrap_or(Params::DEFAULT_M_COST);
    let t = opts.t_cost.unwrap_or(Params::DEFAULT_T_COST);
    let p = opts.p_cost.unwrap_or(Params::DEFAULT_P_COST);
    let params = Params::new(m, t, p, None).map_err(|e| e.to_string())?;
    let argon2 = Argon2::new(algorithm, Version::V0x13, params);

    let salt = match &opts.salt {
        Some(s) => SaltString::from_b64(s).map_err(|e| e.to_string())?,
        None => SaltString::generate(&mut OsRng),
    };

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| e.to_string())
}

#[cfg(not(feature = "argon2"))]
pub fn encode(_password: &str, _variant: &str, _opts: &EncodeOptions) -> Result<String, String> {
    Err("argon2 feature disabled".into())
}

#[cfg(all(test, feature = "argon2"))]
mod tests {
    use super::*;
    use argon2::Params;

    #[test]
    fn argon2id_default_params_in_output() {
        let hash = encode("password", "argon2id", &EncodeOptions::default()).unwrap();
        assert!(hash.starts_with("$argon2id$v=19$"));
        assert!(hash.contains(&format!("m={}", Params::DEFAULT_M_COST)));
        assert!(hash.contains(&format!("t={}", Params::DEFAULT_T_COST)));
        assert!(hash.contains(&format!("p={}", Params::DEFAULT_P_COST)));
    }
}
