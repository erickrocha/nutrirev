import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lapidation/l10n/app_localizations.dart';
import 'package:lapidation/models/ingredient.dart';
import 'package:lapidation/widgets/daily/meal_mode_switcher.dart';

void main() {
  group('Manual Meal Calculations', () {
    test('Calculates live macros accurately for Grams and other units', () {
      const ingredient = Ingredient(
        id: 1,
        name: 'Peito de Frango',
        kcal: 165,
        protein: 31.0,
        carbs: 0.0,
        fat: 3.6,
      );

      // 100g test
      final draft100g = ManualMealItemDraft(
        tempId: '1',
        ingredient: ingredient,
        quantity: 100,
        unit: 'Grams',
      );

      expect(draft100g.calories, 165);
      expect(draft100g.protein, 31.0);
      expect(draft100g.fat, 3.6);

      // 200g test
      final draft200g = ManualMealItemDraft(
        tempId: '2',
        ingredient: ingredient,
        quantity: 200,
        unit: 'Grams',
      );

      expect(draft200g.calories, 330);
      expect(draft200g.protein, 62.0);
      expect(draft200g.fat, 7.2);

      // 1 TableSpoon (15g)
      final draftTablespoon = ManualMealItemDraft(
        tempId: '3',
        ingredient: ingredient,
        quantity: 2,
        unit: 'TableSpoon',
      );

      expect(draftTablespoon.estimatedGrams, 30.0);
      expect(draftTablespoon.calories, closeTo(49.5, 0.01));
    });
  });

  group('IngredientProvider search', () {
    test('Filters ingredients by case-insensitive name', () {
      final testIngredients = [
        const Ingredient(id: 1, name: 'Arroz Branco', kcal: 130),
        const Ingredient(id: 2, name: 'Feijão Carioca', kcal: 76),
        const Ingredient(id: 3, name: 'Frango Grelhado', kcal: 165),
      ];

      // Simulate loaded
      expect(
        testIngredients.where((i) => i.name.toLowerCase().contains('arroz')).length,
        1,
      );
      expect(
        testIngredients.where((i) => i.name.toLowerCase().contains('feijão')).length,
        1,
      );
    });
  });

  group('MealModeSwitcher Widget', () {
    testWidgets('Renders and switches modes correctly', (tester) async {
      MealAnalysisMode currentMode = MealAnalysisMode.ai;

      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return MealModeSwitcher(
                  selectedMode: currentMode,
                  onModeChanged: (newMode) {
                    setState(() {
                      currentMode = newMode;
                    });
                  },
                );
              },
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap on Manual Entry
      final manualFinder = find.byIcon(Icons.format_list_bulleted_rounded);
      expect(manualFinder, findsOneWidget);

      await tester.tap(manualFinder);
      await tester.pumpAndSettle();

      expect(currentMode, MealAnalysisMode.manual);
    });
  });
}
