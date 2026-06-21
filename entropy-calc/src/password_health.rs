use crate::Quality;
use crate::PasswordStrength;
use crate::zxcvbn_ffi;

const ZXCVBN_ESTIMATE_THRESHOLD: usize = 256;

pub fn quality_from_bits(bits: f64) -> Quality {
    if bits <= 0.0 {
        Quality::Bad
    } else if bits < 40.0 {
        Quality::Poor
    } else if bits < 75.0 {
        Quality::Weak
    } else if bits < 100.0 {
        Quality::Good
    } else {
        Quality::Excellent
    }
}

pub fn estimate_entropy(password: &str, user_dict: &[String]) -> f64 {
    let estimate_input: String = password.chars().take(ZXCVBN_ESTIMATE_THRESHOLD).collect();
    let mut entropy = zxcvbn_ffi::zxcvbn_match(&estimate_input, user_dict);

    if password.chars().count() > ZXCVBN_ESTIMATE_THRESHOLD {
        let average = entropy / ZXCVBN_ESTIMATE_THRESHOLD as f64;
        entropy += average * (password.chars().count() - ZXCVBN_ESTIMATE_THRESHOLD) as f64;
    }

    entropy
}

pub fn strength_from_password(password: &str, user_dict: &[String]) -> PasswordStrength {
    let entropy_bits = estimate_entropy(password, user_dict);

    PasswordStrength {
        entropy_bits,
        quality: quality_from_bits(entropy_bits),
        score: entropy_bits,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adding_digit_increases_entropy() {
        let base = estimate_entropy("zzzzzzzz", &[]);
        let with_digit = estimate_entropy("zzzzzzzz1", &[]);
        assert!(with_digit > base);
    }

    #[test]
    fn adding_punctuation_increases_entropy() {
        let base = estimate_entropy("zzzzzzzz", &[]);
        let with_comma = estimate_entropy("zzzzzzzz,", &[]);
        let with_space = estimate_entropy("zzzz zzzz", &[]);
        assert!(with_comma > base);
        assert!(with_space > base);
    }

    #[test]
    fn long_password_extrapolation() {
        let short = "a".repeat(256);
        let long = "a".repeat(300);
        let short_entropy = estimate_entropy(&short, &[]);
        let long_entropy = estimate_entropy(&long, &[]);
        assert!(long_entropy > short_entropy);
    }

    #[test]
    fn quality_thresholds() {
        assert_eq!(quality_from_bits(0.0), Quality::Bad);
        assert_eq!(quality_from_bits(39.9), Quality::Poor);
        assert_eq!(quality_from_bits(74.9), Quality::Weak);
        assert_eq!(quality_from_bits(99.9), Quality::Good);
        assert_eq!(quality_from_bits(100.0), Quality::Excellent);
    }
}
