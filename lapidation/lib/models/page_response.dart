/// Maps the backend's `PageJson<T>`.
///
/// IMPORTANT: unlike every other backend DTO, `PageJson<T>` itself has no
/// `#[serde(rename_all = "camelCase")]` — its own keys (`content`, `page`,
/// `size`, `total_elements`, `total_pages`) are snake_case, even though
/// each item inside `content` is still camelCase per its own type.
class PageResponse<T> {
  final List<T> content;
  final int page;
  final int size;
  final int totalElements;
  final int totalPages;

  const PageResponse({
    required this.content,
    required this.page,
    required this.size,
    required this.totalElements,
    required this.totalPages,
  });

  static PageResponse<T> fromJson<T>(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemParser,
  ) {
    return PageResponse<T>(
      content: (json['content'] as List<dynamic>? ?? [])
          .map((e) => itemParser(e as Map<String, dynamic>))
          .toList(),
      page: json['page'] as int? ?? 0,
      size: json['size'] as int? ?? 0,
      totalElements: json['total_elements'] as int? ?? 0,
      totalPages: json['total_pages'] as int? ?? 0,
    );
  }
}
