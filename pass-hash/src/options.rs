use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Default)]
pub struct EncodeOptions {
    /// Salt string (algorithm-specific encoding). Auto-generated if omitted.
    pub salt: Option<String>,
    /// Argon2 memory cost in KiB.
    pub m_cost: Option<u32>,
    /// Argon2 time cost.
    pub t_cost: Option<u32>,
    /// Argon2 parallelism.
    pub p_cost: Option<u32>,
    /// bcrypt cost factor.
    pub cost: Option<u32>,
    /// sha512/sha256 crypt rounds.
    pub rounds: Option<u32>,
    /// PBKDF2 / Django iterations.
    pub iterations: Option<u32>,
    /// htpasswd username.
    pub username: Option<String>,
    /// bcrypt prefix: "2a", "2b", or "2y".
    pub bcrypt_prefix: Option<String>,
    /// Argon2 variant override: argon2id, argon2i, argon2d.
    pub variant: Option<String>,
    /// scrypt log2(N)
    pub scrypt_n: Option<u32>,
    /// scrypt r
    pub scrypt_r: Option<u32>,
    /// scrypt p
    pub scrypt_p: Option<u32>,
}

impl EncodeOptions {
    pub fn from_json(json: &str) -> Result<Self, String> {
        if json.trim().is_empty() {
            return Ok(Self::default());
        }
        serde_json::from_str(json).map_err(|e| e.to_string())
    }
}
