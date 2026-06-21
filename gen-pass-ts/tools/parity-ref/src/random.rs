use getrandom::fill;

pub fn random_uint(limit: u32) -> u32 {
    if limit == 0 {
        return 0;
    }

    let ceil = u32::MAX - (u32::MAX % limit) - 1;
    loop {
        let mut bytes = [0u8; 4];
        fill(&mut bytes).expect("failed to read random bytes");
        let value = u32::from_le_bytes(bytes);
        if value <= ceil {
            return value % limit;
        }
    }
}

#[allow(dead_code)]
pub fn random_uint_range(min: u32, max: u32) -> u32 {
    min + random_uint(max - min)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_limit_returns_zero() {
        assert_eq!(random_uint(0), 0);
    }

    #[test]
    fn result_is_below_limit() {
        for _ in 0..256 {
            let value = random_uint(7);
            assert!(value < 7);
        }
    }
}
