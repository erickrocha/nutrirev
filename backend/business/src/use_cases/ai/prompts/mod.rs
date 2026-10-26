use serde_json::Value;
use std::sync::LazyLock;

pub(crate) static VISION_PROMPTS: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("vision_prompts.json")).expect("vision_prompts.json must be valid JSON")
});
