import 'package:flutter/material.dart';

/// Lapidation Clinic Design System Color Palette (Design-lapidation.md)
class AppColors {
  AppColors._();

  // Backgrounds
  static const Color primaryBg = Color(
    0xFFF7F1E8,
  ); // Creme/marfim (fundo dominante)
  static const Color surface = Color(0xFFFFFFFF); // Branco para cards e campos
  static const Color surfaceAlt = Color(0xFFFDFBF7); // Off-white sutil
  static const Color darkSection = Color(
    0xFF8B7D6A,
  ); // Taupe/marrom acinzentado

  // Typography
  static const Color textHeading = Color(0xFF2B2723); // Quase preto quente
  static const Color textBody = Color(0xFF8C8378); // Cinza-marrom médio
  static const Color textLight = Color(0xFFFFFFFF); // Texto em fundo escuro

  // Accents & Borders
  static const Color accentPrimary = Color(
    0xFF8B7355,
  ); // Marrom dourado/taupe (Acento primário)
  static const Color accentHover = Color(0xFF6E5A42); // Dourado taupe profundo
  static const Color borderOutline = Color(
    0xFFD8CFC0,
  ); // Bege claro (borda/outline)
  static const Color badgeBg = Color(
    0xFFEFE8DC,
  ); // Bege suave (fundo de tags/pills)

  // Status Colors
  static const Color success = Color(0xFF059669);
  static const Color successBg = Color(0xFFECFDF5);
  static const Color warning = Color(0xFFB45309);
  static const Color warningBg = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFB91C1C);
  static const Color errorBg = Color(0xFFFEF2F2);
}
