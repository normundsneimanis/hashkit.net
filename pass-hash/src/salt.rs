const SHADOW_CHARS: &[u8] = b"./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DJANGO_CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

pub fn random_bytes(len: usize) -> Result<Vec<u8>, String> {
    let mut buf = vec![0u8; len];
    getrandom::getrandom(&mut buf).map_err(|e| e.to_string())?;
    Ok(buf)
}

pub fn random_shadow_salt(len: usize) -> Result<String, String> {
    let bytes = random_bytes(len)?;
    Ok(bytes
        .iter()
        .map(|b| SHADOW_CHARS[(*b as usize) % SHADOW_CHARS.len()] as char)
        .collect())
}

pub fn random_django_salt(len: usize) -> Result<String, String> {
    let bytes = random_bytes(len)?;
    Ok(bytes
        .iter()
        .map(|b| DJANGO_CHARS[(*b as usize) % DJANGO_CHARS.len()] as char)
        .collect())
}

pub fn random_b64_salt(len: usize) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
    Ok(STANDARD_NO_PAD.encode(random_bytes(len)?))
}
