//! Leitor mínimo de CSV para os arquivos de dados das migrações (sem nova dependência).

/// Divide uma linha respeitando aspas e `""` como aspas literais.
fn split_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' if quoted && chars.peek() == Some(&'"') => {
                current.push('"');
                chars.next();
            }
            '"' => quoted = !quoted,
            ',' if !quoted => fields.push(std::mem::take(&mut current)),
            _ => current.push(c),
        }
    }
    fields.push(current);
    fields
}

/// Cabeçalho e linhas de dados (uma linha do arquivo por registro, sem quebras dentro de campos).
pub fn parse(data: &str) -> (Vec<String>, Vec<Vec<String>>) {
    let mut lines = data.lines().filter(|line| !line.trim().is_empty());
    let header = lines.next().map(split_line).unwrap_or_default();
    (header, lines.map(split_line).collect())
}
