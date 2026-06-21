mod alloc_shim;
mod password_health;
mod zxcvbn_ffi;

use std::cell::RefCell;
use std::collections::HashSet;

use wasm_bindgen::prelude::*;

thread_local! {
    static CUSTOM_WORDS: RefCell<Vec<String>> = RefCell::new(Vec::new());
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Quality {
    Bad = 0,
    Poor = 1,
    Weak = 2,
    Good = 3,
    Excellent = 4,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PasswordStrength {
    pub entropy_bits: f64,
    pub quality: Quality,
    pub score: f64,
}

fn normalize_words(words: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();

    for word in words {
        let trimmed = word.trim();
        if trimmed.is_empty() {
            continue;
        }
        let key = trimmed.to_ascii_lowercase();
        if seen.insert(key) {
            normalized.push(trimmed.to_string());
        }
    }

    normalized
}

fn with_custom_words<F, R>(f: F) -> R
where
    F: FnOnce(&[String]) -> R,
{
    CUSTOM_WORDS.with(|words| f(&words.borrow()))
}

fn merge_words(stored: &[String], extra: &[String]) -> Vec<String> {
    let mut merged = stored.to_vec();
    merged.extend(extra.iter().cloned());
    normalize_words(merged)
}

fn analyze_with_inputs(password: &str, user_inputs: &[String]) -> PasswordStrength {
    password_health::strength_from_password(password, user_inputs)
}

#[wasm_bindgen]
pub fn add_words(words: Vec<String>) {
    CUSTOM_WORDS.with(|custom| {
        let mut stored = custom.borrow_mut();
        stored.extend(words);
        *stored = normalize_words(std::mem::take(&mut *stored));
    });
}

#[wasm_bindgen]
pub fn set_words(words: Vec<String>) {
    CUSTOM_WORDS.with(|custom| {
        *custom.borrow_mut() = normalize_words(words);
    });
}

#[wasm_bindgen]
pub fn clear_words() {
    CUSTOM_WORDS.with(|custom| {
        custom.borrow_mut().clear();
    });
}

#[wasm_bindgen]
pub fn dictionary_words() -> Vec<String> {
    with_custom_words(|words| words.to_vec())
}

#[wasm_bindgen]
pub fn analyze_password(password: &str) -> PasswordStrength {
    with_custom_words(|words| analyze_with_inputs(password, words))
}

#[wasm_bindgen]
pub fn analyze_password_with(password: &str, extra_words: Vec<String>) -> PasswordStrength {
    with_custom_words(|words| {
        let merged = merge_words(words, &extra_words);
        analyze_with_inputs(password, &merged)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reset_words() {
        clear_words();
    }

    #[test]
    fn strong_password_beats_weak_password() {
        reset_words();
        let weak = analyze_password("password");
        let strong = analyze_password("correct horse battery staple");
        assert!(strong.entropy_bits > weak.entropy_bits);
    }

    #[test]
    fn custom_word_lowers_entropy() {
        reset_words();
        let baseline = analyze_password("hashkitsecret");
        add_words(vec!["hashkitsecret".to_string()]);
        let with_custom = analyze_password("hashkitsecret");
        assert!(with_custom.entropy_bits < baseline.entropy_bits);
    }

    #[test]
    fn add_words_deduplicates_and_skips_blanks() {
        reset_words();
        add_words(vec![
            "alpha".to_string(),
            "ALPHA".to_string(),
            " ".to_string(),
            "beta".to_string(),
        ]);
        assert_eq!(dictionary_words(), vec!["alpha", "beta"]);
    }

    #[test]
    fn score_matches_entropy_bits() {
        reset_words();
        let result = analyze_password("zzzzzzzz1");
        assert!((result.score - result.entropy_bits).abs() < f64::EPSILON);
    }
}
