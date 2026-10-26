import 'package:flutter/material.dart';
import 'base64_or_network_image.dart';

/// Circular avatar showing the customer's photo when available; falls back
/// to a gender-based placeholder illustration otherwise.
///
/// Backend-confirmed gender values are "Feminino"/"Masculino"/"Outro"
/// (default "Feminino") — only an exact "Masculino" selects the male
/// asset, mirroring the web frontend's own default.
class UserAvatar extends StatelessWidget {
  final String? photoUrl;
  final String? photoBase64;
  final String? gender;
  final double radius;

  const UserAvatar({
    super.key,
    this.photoUrl,
    this.photoBase64,
    this.gender,
    this.radius = 20,
  });

  String get _fallbackAsset => gender == 'Masculino'
      ? 'assets/images/avatar_male.png'
      : 'assets/images/avatar_female.png';

  @override
  Widget build(BuildContext context) {
    final diameter = radius * 2;
    final source = photoBase64?.isNotEmpty == true ? photoBase64 : photoUrl;

    return ClipOval(
      child: SizedBox(
        width: diameter,
        height: diameter,
        child: AppImage(
          source: source,
          fallback: Image.asset(_fallbackAsset, fit: BoxFit.cover),
        ),
      ),
    );
  }
}
