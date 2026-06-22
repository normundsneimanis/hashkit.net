use serde::Serialize;

#[derive(Serialize)]
pub struct EncodeSuccess<'a> {
    pub ok: bool,
    pub hash: &'a str,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub ok: bool,
    pub error: String,
}

impl ErrorResponse {
    pub fn new(error: impl Into<String>) -> Self {
        Self {
            ok: false,
            error: error.into(),
        }
    }
}

pub fn json_ok(hash: &str) -> String {
    serde_json::to_string(&EncodeSuccess { ok: true, hash }).unwrap_or_else(|_| {
        serde_json::to_string(&ErrorResponse::new("json encode failed")).unwrap()
    })
}

pub fn json_err(error: impl Into<String>) -> String {
    serde_json::to_string(&ErrorResponse::new(error)).unwrap_or_else(|_| {
        "{\"ok\":false,\"error\":\"json encode failed\"}".to_string()
    })
}

#[derive(Serialize)]
pub struct DetectResult {
    pub algorithm: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
    pub confidence: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub htpasswd_user: Option<String>,
}

impl DetectResult {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| json_err("detect json failed"))
    }
}

pub fn detect_unknown() -> String {
    DetectResult {
        algorithm: "unknown".into(),
        variant: None,
        params: None,
        confidence: "unknown".into(),
        notes: Some("No recognized hash format".into()),
        htpasswd_user: None,
    }
    .to_json()
}
