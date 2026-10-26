use std::env;
use std::sync::LazyLock;
use tokio::sync::Semaphore;

pub static AI_ANALYSIS_SEMAPHORE: LazyLock<Semaphore> = LazyLock::new(|| {
    let max_concurrent = env::var("AI_MAX_CONCURRENT_JOBS")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .filter(|n| *n > 0)
        .unwrap_or(5);
    Semaphore::new(max_concurrent)
});
