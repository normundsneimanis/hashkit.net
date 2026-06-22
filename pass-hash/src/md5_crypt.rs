use md5::Context;

/// MD5 crypt ($1$) compatible with Linux shadow / libc crypt.
pub fn md5_crypt(password: &str, salt: &str) -> String {
    let mut ctx = Context::new();
    ctx.consume(password.as_bytes());
    ctx.consume(b"$1$");
    ctx.consume(salt.as_bytes());
    let mut final_hash = ctx.compute().0;

    let mut ctx = Context::new();
    ctx.consume(password.as_bytes());
    ctx.consume(b"$1$");
    ctx.consume(salt.as_bytes());
    let mut tmp = Context::new();
    tmp.consume(password.as_bytes());
    let tmp_digest = tmp.compute().0;
    for i in 0..password.len() {
        if i % 2 == 0 {
            ctx.consume(&[tmp_digest[i / 2]]);
        } else {
            ctx.consume(&[0]);
        }
    }
    final_hash = ctx.compute().0;

    for i in 0..1000 {
        let mut ctx = Context::new();
        if i & 1 != 0 {
            ctx.consume(password.as_bytes());
        } else {
            ctx.consume(&final_hash);
        }
        if i % 3 != 0 {
            ctx.consume(salt.as_bytes());
        }
        if i % 7 != 0 {
            ctx.consume(password.as_bytes());
        }
        if i & 1 != 0 {
            ctx.consume(&final_hash);
        } else {
            ctx.consume(password.as_bytes());
        }
        final_hash = ctx.compute().0;
    }

    let mut result = format!("$1${salt}$");
    result.push_str(&to_crypt64(&final_hash[0..4]));
    result.push_str(&to_crypt64(&final_hash[4..8]));
    result.push_str(&to_crypt64(&final_hash[8..12]));
    result.push_str(&to_crypt64(&final_hash[12..16]));
    result
}

fn to_crypt64(bytes: &[u8]) -> String {
    const TAB: &[u8] = b"./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let mut v = u32::from_be_bytes([0, bytes[0], bytes[1], bytes[2]]);
    let mut out = String::new();
    for _ in 0..4 {
        out.push(TAB[(v & 0x3f) as usize] as char);
        v >>= 6;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn md5crypt_prefix() {
        let hash = md5_crypt("password", "testsalt");
        assert!(hash.starts_with("$1$testsalt$"));
    }
}
