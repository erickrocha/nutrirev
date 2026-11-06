import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// Renders images from network URLs or Base64 data URIs/raw strings.
class AppImage extends StatelessWidget {
  final String? source;
  final BoxFit fit;
  final Widget? fallback;

  const AppImage({
    super.key,
    required this.source,
    this.fit = BoxFit.cover,
    this.fallback,
  });

  Widget _defaultFallback() {
    return fallback ??
        const ColoredBox(
          color: AppColors.badgeBg,
          child: Center(
            child: Icon(Icons.restaurant_menu, color: AppColors.accentPrimary),
          ),
        );
  }

  Uint8List? _tryDecodeBase64(String src) {
    try {
      String clean = src.trim();
      if (clean.contains(';base64,')) {
        clean = clean.split(';base64,').last;
      }
      clean = clean.replaceAll(RegExp(r'\s+'), '');
      return base64Decode(clean);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final src = source?.trim();
    if (src == null || src.isEmpty) {
      return _defaultFallback();
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      return Image.network(
        src,
        fit: fit,
        errorBuilder: (_, _, _) => _defaultFallback(),
      );
    }

    final bytes = _tryDecodeBase64(src);
    if (bytes != null && bytes.isNotEmpty) {
      return Image.memory(
        bytes,
        fit: fit,
        errorBuilder: (_, _, _) => _defaultFallback(),
      );
    }

    return _defaultFallback();
  }
}
