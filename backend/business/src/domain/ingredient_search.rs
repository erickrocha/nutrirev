//! Termos e padrões da busca de ingredientes.
//!
//! Acento e caixa não importam: a coluna usa collation `ai_ci`, então "acai" casa com "Açaí".
//! Cada palavra digitada precisa aparecer no nome em português **ou** no nome em inglês,
//! assim "frango cozido" e "chicken cooked" funcionam sem o usuário escolher o idioma.

const MAX_TERMS: usize = 6;
pub const DEFAULT_LIMIT: u64 = 20;
pub const MAX_LIMIT: u64 = 100;

/// Idioma da interface; define em qual nome a busca ordena primeiro.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchLanguage {
    Portuguese,
    English,
}

impl SearchLanguage {
    pub fn parse(value: Option<&str>) -> Self {
        match value.map(|v| v.trim().to_ascii_lowercase()) {
            Some(v) if v.starts_with("en") => Self::English,
            _ => Self::Portuguese,
        }
    }
}

#[derive(Debug, Clone)]
pub struct IngredientSearch {
    pub terms: Vec<String>,
    pub language: SearchLanguage,
    pub limit: u64,
    pub offset: u64,
}

impl IngredientSearch {
    pub fn new(query: Option<&str>, language: Option<&str>, limit: Option<u64>, offset: Option<u64>) -> Self {
        Self {
            terms: search_terms(query.unwrap_or_default()),
            language: SearchLanguage::parse(language),
            limit: limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT),
            offset: offset.unwrap_or(0),
        }
    }
}

/// Palavras da busca (até `MAX_TERMS`), sem espaços extras.
pub fn search_terms(query: &str) -> Vec<String> {
    query.split_whitespace().take(MAX_TERMS).map(str::to_string).collect()
}

/// Escapa `%`, `_` e `\` para uso literal em LIKE.
pub fn escape_like(term: &str) -> String {
    let mut escaped = String::with_capacity(term.len());
    for c in term.chars() {
        if matches!(c, '%' | '_' | '\\') {
            escaped.push('\\');
        }
        escaped.push(c);
    }
    escaped
}

/// `%termo%`: contém.
pub fn contains_pattern(term: &str) -> String {
    format!("%{}%", escape_like(term))
}

/// `termo%`: começa com.
pub fn prefix_pattern(term: &str) -> String {
    format!("{}%", escape_like(term))
}
