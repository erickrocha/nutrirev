import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Lapidation Clinic Mobile App Theme (Design-lapidation.md)
class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.jostTextTheme();

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.primaryBg,
      colorScheme: const ColorScheme.light(
        primary: AppColors.accentPrimary,
        secondary: AppColors.darkSection,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: AppColors.textLight,
        onSecondary: AppColors.textLight,
        onSurface: AppColors.textHeading,
        onError: AppColors.textLight,
      ),

      // Typography Configuration
      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.jost(
          fontSize: 28,
          fontWeight: FontWeight.w400,
          color: AppColors.textHeading,
          letterSpacing: 1.5,
        ),
        titleLarge: GoogleFonts.jost(
          fontSize: 20,
          fontWeight: FontWeight.w500,
          color: AppColors.textHeading,
          letterSpacing: 0.5,
        ),
        titleMedium: GoogleFonts.jost(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.textHeading,
        ),
        bodyLarge: GoogleFonts.jost(
          fontSize: 15,
          fontWeight: FontWeight.w400,
          color: AppColors.textBody,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.jost(
          fontSize: 13,
          fontWeight: FontWeight.w400,
          color: AppColors.textBody,
        ),
        labelLarge: GoogleFonts.jost(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.textHeading,
          letterSpacing: 1.2,
        ),
      ),

      // App Bar Theme
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: AppColors.textHeading),
        titleTextStyle: GoogleFonts.jost(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.textHeading,
          letterSpacing: 1.2,
        ),
      ),

      // Primary Pill Button Theme (Design-lapidation.md: rounded pill, accent primary, text white)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentPrimary,
          foregroundColor: AppColors.textLight,
          elevation: 2,
          shadowColor: AppColors.accentPrimary.withValues(alpha: 0.3),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          textStyle: GoogleFonts.jost(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
      ),

      // Secondary Outline Button Theme (Design-lapidation.md: rounded pill, outline beige border)
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textHeading,
          side: const BorderSide(color: AppColors.borderOutline, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          textStyle: GoogleFonts.jost(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.8,
          ),
        ),
      ),

      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.borderOutline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.borderOutline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: AppColors.accentPrimary,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: GoogleFonts.jost(color: AppColors.textBody, fontSize: 14),
        hintStyle: GoogleFonts.jost(
          color: AppColors.textBody.withValues(alpha: 0.6),
          fontSize: 14,
        ),
      ),

      // Card Theme (Design-lapidation.md: off-white surface, rounded corners, subtle border)
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 1,
        shadowColor: AppColors.textHeading.withValues(alpha: 0.05),
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.borderOutline, width: 0.8),
        ),
      ),
    );
  }
}
