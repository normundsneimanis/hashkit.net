use md5::Context;

use crate::encode;
use crate::options::EncodeOptions;
use crate::salt::random_shadow_salt;

pub fn encode(password: &str, algo: &str, opts: &EncodeOptions) -> Result<String, String> {
    let username = opts
        .username
        .as_deref()
        .filter(|u| !u.is_empty())
        .ok_or("htpasswd requires username")?;

    let inner = match algo {
        "htpasswd_bcrypt" => {
            let mut bcrypt_opts = opts.clone();
            bcrypt_opts.bcrypt_prefix = Some("2y".into());
            encode::bcrypt::encode(password, &bcrypt_opts)?
        }
        "htpasswd_apr1" => apr1(password, opts)?,
        "htpasswd_crypt" => {
            let shadow_algo = opts.variant.as_deref().unwrap_or("sha512crypt");
            encode::shadow::encode(password, shadow_algo, opts)?
        }
        other => return Err(format!("unknown htpasswd algorithm: {other}")),
    };

    Ok(format!("{username}:{inner}"))
}

fn apr1(password: &str, opts: &EncodeOptions) -> Result<String, String> {
    let salt = match &opts.salt {
        Some(s) => s.clone(),
        None => random_shadow_salt(8)?,
    };
    Ok(apr1_md5_crypt(password, &salt))
}

/// Apache MD5 ($apr1$) — compatible with `htpasswd -m`.
fn apr1_md5_crypt(password: &str, salt: &str) -> String {
    let mut ctx = Context::new();
    ctx.consume(password.as_bytes());
    ctx.consume(b"$apr1$");
    ctx.consume(salt.as_bytes());
    let mut final_hash = ctx.compute().0;

    let mut ctx = Context::new();
    ctx.consume(password.as_bytes());
    ctx.consume(b"$apr1$");
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

    let mut result = format!("$apr1${salt}$");
    result.push_str(&to_apr64(&final_hash[0..4]));
    result.push_str(&to_apr64(&final_hash[4..8]));
    result.push_str(&to_apr64(&final_hash[8..12]));
    result.push_str(&to_apr64(&final_hash[12..16]));
    result
}

fn to_apr64(bytes: &[u8]) -> String {
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
    fn htpasswd_bcrypt_line() {
        let line = encode(
            "password",
            "htpasswd_bcrypt",
            &EncodeOptions {
                username: Some("user".into()),
                cost: Some(4),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(line.starts_with("user:$2y$"));
    }

    #[test]
    fn apr1_prefix() {
        let hash = apr1_md5_crypt("password", "testsalt");
        assert!(hash.starts_with("$apr1$testsalt$"));
    }
}
