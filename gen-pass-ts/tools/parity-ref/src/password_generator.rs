use bitflags::bitflags;

use crate::random;

bitflags! {
    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    pub struct CharClass: u32 {
        const LOWER_LETTERS = 1 << 0;
        const UPPER_LETTERS = 1 << 1;
        const NUMBERS = 1 << 2;
        const BRACES = 1 << 3;
        const PUNCTUATION = 1 << 4;
        const QUOTES = 1 << 5;
        const DASHES = 1 << 6;
        const MATH = 1 << 7;
        const LOGOGRAMS = 1 << 8;
        const SPECIAL_CHARACTERS = Self::BRACES.bits()
            | Self::PUNCTUATION.bits()
            | Self::QUOTES.bits()
            | Self::DASHES.bits()
            | Self::MATH.bits()
            | Self::LOGOGRAMS.bits();
        const EASCII = 1 << 9;
        const WHITESPACE = 1 << 10;
        const DEFAULT_CHARSET = Self::LOWER_LETTERS.bits()
            | Self::UPPER_LETTERS.bits()
            | Self::NUMBERS.bits();
    }
}

bitflags! {
    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    pub struct GeneratorFlag: u32 {
        const EXCLUDE_LOOK_ALIKE = 1 << 0;
        const CHAR_FROM_EVERY_GROUP = 1 << 1;
        const ADVANCED_MODE = 1 << 2;
        const DEFAULT_FLAGS = Self::EXCLUDE_LOOK_ALIKE.bits() | Self::CHAR_FROM_EVERY_GROUP.bits();
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PasswordGeneratorConfig {
    pub length: u32,
    pub classes: CharClass,
    pub flags: GeneratorFlag,
    pub custom_charset: String,
    pub excluded_charset: String,
}

impl Default for PasswordGeneratorConfig {
    fn default() -> Self {
        Self {
            length: 32,
            classes: CharClass::DEFAULT_CHARSET,
            flags: GeneratorFlag::DEFAULT_FLAGS,
            custom_charset: String::new(),
            excluded_charset: String::new(),
        }
    }
}

type PasswordGroup = Vec<char>;

pub fn password_groups(config: &PasswordGeneratorConfig) -> Vec<PasswordGroup> {
    let exclude = config.flags.contains(GeneratorFlag::EXCLUDE_LOOK_ALIKE);
    let mut groups = Vec::new();

    if config.classes.contains(CharClass::LOWER_LETTERS) {
        let mut group = Vec::new();
        for code in 97..=122 {
            if exclude && code == 108 {
                continue;
            }
            group.push(char::from_u32(code).unwrap());
        }
        groups.push(group);
    }

    if config.classes.contains(CharClass::UPPER_LETTERS) {
        let mut group = Vec::new();
        for code in 65..=90 {
            if exclude && matches!(code, 66 | 71 | 73 | 79) {
                continue;
            }
            group.push(char::from_u32(code).unwrap());
        }
        groups.push(group);
    }

    if config.classes.contains(CharClass::NUMBERS) {
        let mut group = Vec::new();
        for code in 48..=57 {
            if exclude && matches!(code, 48 | 49 | 54 | 56) {
                continue;
            }
            group.push(char::from_u32(code).unwrap());
        }
        groups.push(group);
    }

    if config.classes.contains(CharClass::BRACES) {
        groups.push(vec!['(', ')', '[', ']', '{', '}']);
    }

    if config.classes.contains(CharClass::PUNCTUATION) {
        groups.push(vec![',', '.', ':', ';']);
    }

    if config.classes.contains(CharClass::QUOTES) {
        groups.push(vec!['"', '\'']);
    }

    if config.classes.contains(CharClass::DASHES) {
        let mut group = vec!['-', '/', '\\', '_'];
        if !exclude {
            group.push('|');
        }
        groups.push(group);
    }

    if config.classes.contains(CharClass::MATH) {
        groups.push(vec!['!', '*', '+', '<', '=', '>', '?']);
    }

    if config.classes.contains(CharClass::LOGOGRAMS) {
        let mut group = Vec::new();
        for code in 35..=38 {
            group.push(char::from_u32(code).unwrap());
        }
        group.extend(['@', '^', '`', '~']);
        groups.push(group);
    }

    if config.classes.contains(CharClass::EASCII) {
        let mut group = Vec::new();
        for code in 161..=172 {
            group.push(char::from_u32(code).unwrap());
        }
        for code in 174..=255 {
            if exclude && code == 249 {
                continue;
            }
            group.push(char::from_u32(code).unwrap());
        }
        groups.push(group);
    }

    if config.classes.contains(CharClass::WHITESPACE) {
        groups.push(vec![' ']);
    }

    if !config.custom_charset.is_empty() {
        let mut group = Vec::new();
        for ch in config.custom_charset.chars() {
            if !group.contains(&ch) {
                group.push(ch);
            }
        }
        if !group.is_empty() {
            groups.push(group);
        }
    }

    let excluded: Vec<char> = config.excluded_charset.chars().collect();
    groups.retain_mut(|group| {
        group.retain(|ch| !excluded.contains(ch));
        !group.is_empty()
    });

    groups
}

pub fn min_length(config: &PasswordGeneratorConfig) -> u32 {
    if config.flags.contains(GeneratorFlag::CHAR_FROM_EVERY_GROUP) {
        password_groups(config).len() as u32
    } else {
        1
    }
}

pub fn is_valid(config: &PasswordGeneratorConfig) -> bool {
    if config.classes.is_empty() && config.custom_charset.is_empty() {
        return false;
    }
    if config.length == 0 {
        return false;
    }
    if config.flags.contains(GeneratorFlag::CHAR_FROM_EVERY_GROUP)
        && config.length < min_length(config)
    {
        return false;
    }
    !password_groups(config).is_empty()
}

pub fn generate_password(config: &PasswordGeneratorConfig) -> Result<String, &'static str> {
    generate_password_with(config, |limit| random::random_uint(limit))
}

pub fn generate_password_with(
    config: &PasswordGeneratorConfig,
    mut random_uint: impl FnMut(u32) -> u32,
) -> Result<String, &'static str> {
    if !is_valid(config) {
        return Err("invalid password generator configuration");
    }

    let groups = password_groups(config);
    let mut password_chars = Vec::new();
    for group in &groups {
        password_chars.extend(group.iter().copied());
    }

    let mut password = String::new();

    if config.flags.contains(GeneratorFlag::CHAR_FROM_EVERY_GROUP) {
        for group in &groups {
            let pos = random_uint(group.len() as u32) as usize;
            password.push(group[pos]);
        }

        for _ in groups.len() as u32..config.length {
            let pos = random_uint(password_chars.len() as u32) as usize;
            password.push(password_chars[pos]);
        }

        let mut chars: Vec<char> = password.chars().collect();
        for i in (1..chars.len()).rev() {
            let j = random_uint(i as u32 + 1) as usize;
            chars.swap(i, j);
        }
        password = chars.into_iter().collect();
    } else {
        for _ in 0..config.length {
            let pos = random_uint(password_chars.len() as u32) as usize;
            password.push(password_chars[pos]);
        }
    }

    Ok(password)
}

pub fn flatten_password_charset(config: &PasswordGeneratorConfig) -> String {
    let mut chars: Vec<char> = password_groups(config)
        .iter()
        .flat_map(|group| group.iter().copied())
        .collect();
    chars.sort_unstable();
    chars.dedup();
    chars.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_generates_length_32() {
        let password = generate_password(&PasswordGeneratorConfig::default()).unwrap();
        assert_eq!(password.chars().count(), 32);
    }

    #[test]
    fn char_from_every_group_includes_each_class() {
        let config = PasswordGeneratorConfig {
            length: 8,
            classes: CharClass::LOWER_LETTERS | CharClass::UPPER_LETTERS | CharClass::NUMBERS,
            flags: GeneratorFlag::CHAR_FROM_EVERY_GROUP | GeneratorFlag::EXCLUDE_LOOK_ALIKE,
            ..Default::default()
        };
        let password = generate_password(&config).unwrap();
        assert!(password.chars().any(|c| c.is_ascii_lowercase()));
        assert!(password.chars().any(|c| c.is_ascii_uppercase()));
        assert!(password.chars().any(|c| c.is_ascii_digit()));
    }

    #[test]
    fn exclude_look_alike_chars() {
        let config = PasswordGeneratorConfig {
            length: 64,
            classes: CharClass::LOWER_LETTERS
                | CharClass::UPPER_LETTERS
                | CharClass::NUMBERS
                | CharClass::DASHES,
            flags: GeneratorFlag::CHAR_FROM_EVERY_GROUP | GeneratorFlag::EXCLUDE_LOOK_ALIKE,
            ..Default::default()
        };
        let password = generate_password(&config).unwrap();
        assert!(!password.contains('l'));
        assert!(!password.contains('|'));
        assert!(!password.contains('0'));
    }

    #[test]
    fn excluded_charset_is_removed() {
        let config = PasswordGeneratorConfig {
            length: 16,
            classes: CharClass::LOWER_LETTERS,
            flags: GeneratorFlag::empty(),
            excluded_charset: "aeiou".into(),
            ..Default::default()
        };
        let password = generate_password(&config).unwrap();
        assert!(!password.chars().any(|c| "aeiou".contains(c)));
    }

    #[test]
    fn flatten_password_charset_dedupes_and_excludes() {
        let config = PasswordGeneratorConfig {
            classes: CharClass::LOWER_LETTERS | CharClass::NUMBERS,
            flags: GeneratorFlag::EXCLUDE_LOOK_ALIKE,
            excluded_charset: "0".into(),
            ..Default::default()
        };
        let charset = flatten_password_charset(&config);
        assert!(!charset.contains('0'));
        assert!(!charset.contains('l'));
        assert!(charset.contains('a'));
        assert!(charset.contains('2'));
        let unique: std::collections::HashSet<char> = charset.chars().collect();
        assert_eq!(unique.len(), charset.chars().count());
    }

    #[test]
    fn invalid_config_errors() {
        let config = PasswordGeneratorConfig {
            length: 1,
            classes: CharClass::LOWER_LETTERS | CharClass::UPPER_LETTERS,
            flags: GeneratorFlag::CHAR_FROM_EVERY_GROUP,
            ..Default::default()
        };
        assert!(generate_password(&config).is_err());
    }
}
