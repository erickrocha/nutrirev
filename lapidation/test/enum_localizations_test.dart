import 'package:flutter_test/flutter_test.dart';
import 'package:lapidation/l10n/app_localizations_en.dart';
import 'package:lapidation/l10n/app_localizations_pt.dart';
import 'package:lapidation/l10n/enum_localizations.dart';

void main() {
  final en = AppLocalizationsEn();
  final pt = AppLocalizationsPt();

  test('translates canonical enum values in English and Portuguese', () {
    expect(enumLabel(en, BusinessEnumGroup.role, 'SysAdmin'), 'System Admin');
    expect(
      enumLabel(pt, BusinessEnumGroup.role, 'SysAdmin'),
      'Administrador do Sistema',
    );
    expect(
      enumLabel(en, BusinessEnumGroup.measurementUnit, 'LittleSquares'),
      'small squares',
    );
    expect(
      enumLabel(pt, BusinessEnumGroup.measurementUnit, 'LittleSquares'),
      'Quadradinhos',
    );
    expect(
      enumLabel(en, BusinessEnumGroup.recommendedPeriod, 'Weekly'),
      'Weekly',
    );
    expect(
      enumLabel(pt, BusinessEnumGroup.mealPlanCategory, 'KeepFit'),
      'Manter a Forma',
    );
    expect(
      enumLabel(en, BusinessEnumGroup.mealPlanGenerationStatus, 'Finished'),
      'Finished',
    );
    expect(enumLabel(pt, BusinessEnumGroup.mealType, 'Supper'), 'Ceia');
  });

  test('keeps unknown enum values visible', () {
    expect(
      enumLabel(en, BusinessEnumGroup.mealType, 'FutureMeal'),
      'FutureMeal',
    );
  });
}
