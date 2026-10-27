use business::domain::ingredient_search::{
    contains_pattern, escape_like, prefix_pattern, search_terms, IngredientSearch, SearchLanguage, DEFAULT_LIMIT, MAX_LIMIT,
};

#[test]
fn terms_are_split_on_whitespace_and_capped() {
    assert_eq!(search_terms("  frango   cozido "), vec!["frango", "cozido"]);
    assert!(search_terms("   ").is_empty());
    assert_eq!(search_terms("a b c d e f g h").len(), 6);
}

#[test]
fn like_wildcards_are_escaped() {
    assert_eq!(escape_like("50%_off\\"), "50\\%\\_off\\\\");
    assert_eq!(contains_pattern("açaí"), "%açaí%");
    assert_eq!(prefix_pattern("a_b"), "a\\_b%");
}

#[test]
fn language_defaults_to_portuguese() {
    assert_eq!(SearchLanguage::parse(None), SearchLanguage::Portuguese);
    assert_eq!(SearchLanguage::parse(Some("pt-BR")), SearchLanguage::Portuguese);
    assert_eq!(SearchLanguage::parse(Some("EN-us")), SearchLanguage::English);
}

#[test]
fn paging_is_clamped() {
    assert_eq!(IngredientSearch::new(None, None, None, None).limit, DEFAULT_LIMIT);
    assert_eq!(IngredientSearch::new(None, None, Some(0), None).limit, 1);
    assert_eq!(IngredientSearch::new(None, None, Some(5000), None).limit, MAX_LIMIT);
}
