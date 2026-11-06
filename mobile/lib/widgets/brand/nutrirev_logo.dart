import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';

/// Painter for the NutriRev circular brand mark:
/// A vibrant blue primary ring with an energetic yellow accent arc.
class NutriRevLogoPainter extends CustomPainter {
  final Color primaryColor;
  final Color secondaryColor;
  final double strokeWidthRatio;

  const NutriRevLogoPainter({
    this.primaryColor = AppColors.accentPrimary,
    this.secondaryColor = AppColors.accentSecondary,
    this.strokeWidthRatio = 0.13,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (math.min(size.width, size.height) / 2) * (1 - strokeWidthRatio);
    final strokeWidth = size.width * strokeWidthRatio;

    final primaryPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final secondaryPaint = Paint()
      ..color = secondaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Start angle: -90 degrees (top)
    const startAngle = -math.pi / 2;

    // Primary arc (~240 degrees)
    const primarySweep = (240 / 360) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      primarySweep,
      false,
      primaryPaint,
    );

    // Accent arc (~60 degrees, offset)
    const secondaryStart = startAngle + primarySweep + (25 / 360) * 2 * math.pi;
    const secondarySweep = (65 / 360) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      secondaryStart,
      secondarySweep,
      false,
      secondaryPaint,
    );
  }

  @override
  bool shouldRepaint(covariant NutriRevLogoPainter oldDelegate) {
    return oldDelegate.primaryColor != primaryColor ||
        oldDelegate.secondaryColor != secondaryColor ||
        oldDelegate.strokeWidthRatio != strokeWidthRatio;
  }
}

/// Standalone NutriRev Logo Mark (Ring icon)
class NutriRevLogoMark extends StatelessWidget {
  final double size;
  final Color? primaryColor;
  final Color? secondaryColor;

  const NutriRevLogoMark({
    super.key,
    this.size = 48,
    this.primaryColor,
    this.secondaryColor,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: NutriRevLogoPainter(
          primaryColor: primaryColor ?? AppColors.accentPrimary,
          secondaryColor: secondaryColor ?? AppColors.accentSecondary,
        ),
      ),
    );
  }
}

/// Full NutriRev Brand Logo (Mark + Typography Lockup)
class NutriRevLogo extends StatelessWidget {
  final double markSize;
  final double fontSize;
  final Color? textColor;

  const NutriRevLogo({
    super.key,
    this.markSize = 40,
    this.fontSize = 24,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = textColor ?? AppColors.textHeading;

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        NutriRevLogoMark(size: markSize),
        const SizedBox(width: 12),
        RichText(
          text: TextSpan(
            style: GoogleFonts.jost(
              fontSize: fontSize,
              color: color,
              letterSpacing: 0.5,
            ),
            children: const [
              TextSpan(
                text: 'Nutri',
                style: TextStyle(fontWeight: FontWeight.w400),
              ),
              TextSpan(
                text: 'rev',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

