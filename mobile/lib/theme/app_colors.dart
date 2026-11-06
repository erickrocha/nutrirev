import 'package:flutter/material.dart';

/// NutriRev Clinic Design System Color Palette (Design-nutrirev.md)
class AppColors {
  AppColors._();

  // Backgrounds
  static const Color primaryBg = Color(0xFFF7FAFF); // Branco azulado (fundo dominante)
  static const Color surface = Color(0xFFFFFFFF); // Branco para cards e campos
  static const Color surfaceAlt = Color(0xFFEDF3FC); // Azul sutil / fundo suave
  static const Color darkSection = Color(0xFF12467F); // Azul profundo (seção escura / destaque)

  // Typography
  static const Color textHeading = Color(0xFF0F2A47); // Azul quase preto para títulos
  static const Color textBody = Color(0xFF5A6B80); // Cinza azulado para corpo e secundário
  static const Color textLight = Color(0xFFFFFFFF); // Texto em fundo escuro

  // Accents & Borders
  static const Color accentPrimary = Color(0xFF1D6FD1); // Azul NutriRev (CTA, links, ícones de ação)
  static const Color accentHover = Color(0xFF155BAE); // Azul profundo hover
  static const Color accentSecondary = Color(0xFFFFC629); // Amarelo NutriRev (destaque/badge)
  static const Color accentSecondaryHover = Color(0xFFF2B300); // Amarelo hover
  static const Color borderOutline = Color(0xFFDCE6F2); // Borda suave azulada
  static const Color badgeBg = Color(0xFFEDF3FC); // Fundo de badge/superfície sutil
  static const Color badgeAccentBg = Color(0xFFFFF4D1); // Fundo de badge com destaque amarelo

  // Nutrition Macros
  static const Color macroProtein = Color(0xFF2563EB); // Azul
  static const Color macroCarbs = Color(0xFFB45309); // Âmbar / dourado
  static const Color macroFat = Color(0xFFB91C1C); // Vermelho suave

  // Status Colors
  static const Color success = Color(0xFF16A34A);
  static const Color successBg = Color(0xFFECFDF5);
  static const Color warning = Color(0xFFD97706);
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color error = Color(0xFFDC2626);
  static const Color errorBg = Color(0xFFFEF2F2);
}
