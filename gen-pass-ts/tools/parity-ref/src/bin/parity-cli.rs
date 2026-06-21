use parity_ref::test_rng::SequentialRng;
use parity_ref::{
    flatten_password_charset, generate_password_with, is_valid, min_length, password_groups,
    CharClass, GeneratorFlag, PasswordGeneratorConfig,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct ParityRequest {
    action: String,
    config: ParityConfig,
    #[serde(default)]
    random_u32: Vec<u32>,
}

#[derive(Debug, Deserialize)]
struct ParityConfig {
    length: u32,
    classes: u32,
    flags: u32,
    #[serde(default)]
    custom_charset: String,
    #[serde(default)]
    excluded_charset: String,
}

#[derive(Debug, Serialize)]
struct ParityResponse {
    valid: bool,
    min_length: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    groups: Option<Vec<Vec<String>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    charset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn to_config(config: &ParityConfig) -> PasswordGeneratorConfig {
    PasswordGeneratorConfig {
        length: config.length,
        classes: CharClass::from_bits_truncate(config.classes),
        flags: GeneratorFlag::from_bits_truncate(config.flags),
        custom_charset: config.custom_charset.clone(),
        excluded_charset: config.excluded_charset.clone(),
    }
}

fn groups_to_json(groups: &[Vec<char>]) -> Vec<Vec<String>> {
    groups
        .iter()
        .map(|group| group.iter().map(|ch| ch.to_string()).collect())
        .collect()
}

fn main() {
    let input = std::io::read_to_string(std::io::stdin()).expect("failed to read stdin");
    let request: ParityRequest = serde_json::from_str(&input).expect("invalid json input");
    let config = to_config(&request.config);
    let valid = is_valid(&config);
    let min_len = min_length(&config);

    let mut response = ParityResponse {
        valid,
        min_length: min_len,
        groups: None,
        charset: None,
        password: None,
        error: None,
    };

    match request.action.as_str() {
        "groups" => {
            response.groups = Some(groups_to_json(&password_groups(&config)));
        }
        "charset" => {
            response.charset = Some(flatten_password_charset(&config));
        }
        "valid" => {}
        "generate" => {
            if !valid {
                response.error = Some("invalid password generator configuration".into());
            } else {
                let mut rng = SequentialRng::new(request.random_u32);
                match generate_password_with(&config, |limit| rng.random_uint(limit)) {
                    Ok(password) => response.password = Some(password),
                    Err(err) => response.error = Some(err.into()),
                }
            }
        }
        other => {
            response.error = Some(format!("unknown action: {other}"));
        }
    }

    println!("{}", serde_json::to_string(&response).expect("serialize response"));
}
