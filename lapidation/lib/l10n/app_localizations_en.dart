// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Lapidation';

  @override
  String get navHome => 'Home';

  @override
  String get navMealPlan => 'Meal Plan';

  @override
  String get navDaily => 'Daily';

  @override
  String get navEat => 'Eat';

  @override
  String get navSettings => 'Settings';

  @override
  String get mealPlanTitle => 'Meal Plan';

  @override
  String get dailyTitle => 'Daily';

  @override
  String get eatTitle => 'Eat';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get defaultEmptyMessage => 'Nothing here yet.';

  @override
  String get retryButton => 'Try again';

  @override
  String get homeMealPlanSectionTitle => 'Your meal plan';

  @override
  String get mealPlanEmptyMessage => 'No meal plan assigned yet.';

  @override
  String get homeDailyMealsSectionTitle => 'Your meals for the day';

  @override
  String get dailyMealsEmptyMessage => 'No meal categories assigned yet.';

  @override
  String mealsPlannedCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count meals planned',
      one: '$count meal planned',
    );
    return '$_temp0';
  }

  @override
  String get mealPlanDetailEmpty => 'No meals detailed in this plan.';

  @override
  String get eatEmptyMessage => 'No recipes available yet.';

  @override
  String minutesLabel(int minutes) {
    return '$minutes min';
  }

  @override
  String portionsLabel(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count servings',
      one: '$count serving',
    );
    return '$_temp0';
  }

  @override
  String get ingredientsTitle => 'Ingredients';

  @override
  String get directionsTitle => 'Directions';

  @override
  String get logoutButton => 'Log out';

  @override
  String appFooter(String version) {
    return 'Lapidation · v$version';
  }

  @override
  String get loginValidationError => 'Please enter your email and password.';

  @override
  String get loginTagline => 'CLINIC & NUTRITION';

  @override
  String get loginAreaLabel => 'PATIENT AREA';

  @override
  String get loginHeadline => 'Access your meal plan';

  @override
  String get loginSubtext => 'Enter your email and password to access the app.';

  @override
  String get emailLabel => 'Access Email';

  @override
  String get emailHint => 'your.email@example.com';

  @override
  String get passwordLabel => 'Password';

  @override
  String get loginSubmitButton => 'LOG IN TO THE APP';

  @override
  String get welcomeValidationEmpty =>
      'Please enter and confirm your new password.';

  @override
  String get welcomeValidationMismatch => 'The passwords entered do not match.';

  @override
  String get welcomeValidationMinLength =>
      'The password must be at least 6 characters long.';

  @override
  String get welcomeBadge => 'FIRST ACCESS';

  @override
  String welcomeGreeting(String name) {
    return 'Welcome, $name!';
  }

  @override
  String get welcomeSubtext =>
      'Your access to the mobile app has been activated by the clinic. For your security, create your new personal password below.';

  @override
  String get newPasswordLabel => 'New Personal Password';

  @override
  String get newPasswordHint => 'At least 6 characters';

  @override
  String get confirmPasswordLabel => 'Confirm New Password';

  @override
  String get confirmPasswordHint => 'Repeat the password entered';

  @override
  String get welcomeSubmitButton => 'SAVE AND CONTINUE TO THE APP';

  @override
  String get greetingMorning => 'Good morning';

  @override
  String get greetingAfternoon => 'Good afternoon';

  @override
  String get greetingEvening => 'Good evening';

  @override
  String get errorGenericMealPlan => 'Could not load the meal plan.';

  @override
  String get errorGenericDailyMeals => 'Could not load your meals for the day.';

  @override
  String get errorGenericRecipes => 'Could not load the recipes.';

  @override
  String get errorGenericProfile => 'Could not load your profile.';

  @override
  String get errorGenericConnection =>
      'Could not connect. Check your connection and try again.';

  @override
  String get errorGenericSavePassword =>
      'Could not save your new password. Please try again.';

  @override
  String get dailyCameraOption => 'Take photo with Camera';

  @override
  String get dailyGalleryOption => 'Choose from Gallery';

  @override
  String get dailyAnalyzeButton => 'Analyze Meal Photo';

  @override
  String get dailyAnalyzeSubtext =>
      'Tap to take or choose a photo of your plate for instant AI nutrition analysis';

  @override
  String get dailyAnalyzingTitle => 'Analyzing meal image...';

  @override
  String get dailyAnalysisResultsTitle => 'Nutritional Analysis';

  @override
  String get dailyCaloriesLabel => 'Calories';

  @override
  String get dailyProteinLabel => 'Protein';

  @override
  String get dailyCarbsLabel => 'Carbs';

  @override
  String get dailyFatLabel => 'Fat';

  @override
  String get dailyFoodItemsTitle => 'Identified Food Items';

  @override
  String get dailySelectImageTitle => 'Add Meal Photo';

  @override
  String get dailyPickMealSlotPrompt => 'Which meal is this?';

  @override
  String get dailySaveToLogButton => 'Save to log';

  @override
  String get dailySavedToLog => 'Saved to log';

  @override
  String dailySavedToLogWithPoints(int points) {
    return 'Saved · +$points pts';
  }

  @override
  String get errorGenericSaveMealLog =>
      'Could not save this meal to your log. Please try again.';

  @override
  String get dailyLoggedMealsTitle => 'Logged meals for this day';

  @override
  String get dailyNoLoggedMeals => 'No meals logged for this day yet.';

  @override
  String get errorGenericMealLogs => 'Could not load your logged meals.';

  @override
  String get dailyModeAi => 'AI Photo Scan';

  @override
  String get dailyModeManual => 'Manual Entry';

  @override
  String get dailyManualSearchPlaceholder =>
      'Search ingredients (e.g. Chicken, Rice)...';

  @override
  String get dailyManualSearchHint =>
      'Search by name to configure quantity & portion';

  @override
  String get dailyManualAddIngredient => 'Add Ingredient';

  @override
  String get dailyManualQuantity => 'Quantity';

  @override
  String get dailyManualUnit => 'Measurement Unit';

  @override
  String get dailyManualSelectedItems => 'Selected Ingredients';

  @override
  String get dailyManualEmptyItems =>
      'No ingredients added yet. Search and select items above to build your meal.';

  @override
  String get dailyManualSubmit => 'Calculate & Save Meal';

  @override
  String get dailyManualSubmitting => 'Calculating & Saving...';

  @override
  String get dailyManualLiveNutrition => 'Estimated Macros';

  @override
  String get dailyManualQuickAdd => 'Add to meal';

  @override
  String dailyManualNoIngredientsFound(String query) {
    return 'No ingredients found matching \"$query\"';
  }

  @override
  String get dailyManualSearching => 'Searching ingredients...';

  @override
  String get dailyManualPer100g => 'per 100g';

  @override
  String get dailyManualItemRemoved => 'Item removed';

  @override
  String get dailyManualSelectMealSlotFirst =>
      'Select a meal category above to continue';

  @override
  String get dailyManualClearSearch => 'Clear search';

  @override
  String get dailyManualNutritionalSummary => 'Meal Nutritional Summary';

  @override
  String get enumRoleSysAdmin => 'System Admin';

  @override
  String get enumRoleTenantOwner => 'Tenant Owner';

  @override
  String get enumRoleTenantUser => 'Tenant User';

  @override
  String get enumRoleUser => 'User';

  @override
  String get enumUnitGrams => 'g';

  @override
  String get enumUnitKg => 'kg';

  @override
  String get enumUnitMl => 'ml';

  @override
  String get enumUnitLiter => 'liter';

  @override
  String get enumUnitUnits => 'unit';

  @override
  String get enumUnitCup => 'cup';

  @override
  String get enumUnitTableSpoon => 'tablespoon';

  @override
  String get enumUnitTeaSpoon => 'teaspoon';

  @override
  String get enumUnitCoffeeSpoon => 'coffee spoon';

  @override
  String get enumUnitDessertSpoon => 'dessert spoon';

  @override
  String get enumUnitPinch => 'pinch';

  @override
  String get enumUnitSlice => 'slice';

  @override
  String get enumUnitShell => 'ladle';

  @override
  String get enumUnitGlass => 'glass';

  @override
  String get enumUnitLittleSquares => 'small squares';

  @override
  String get enumUnitScoop => 'scoop';

  @override
  String get enumPeriodWeekly => 'Weekly';

  @override
  String get enumPeriodMonthly => 'Monthly';

  @override
  String get enumCategoryLoseWeight => 'Lose Weight';

  @override
  String get enumCategoryKeepFit => 'Keep Fit';

  @override
  String get enumCategoryEarnWeight => 'Gain Weight';

  @override
  String get enumCategoryHypocaloric => 'Hypocaloric';

  @override
  String get enumCategoryHypertrophy => 'Hypertrophy';

  @override
  String get enumCategoryMaintenance => 'Maintenance';

  @override
  String get enumCategoryKetogenic => 'Ketogenic';

  @override
  String get enumCategoryLowCarb => 'Low Carb';

  @override
  String get enumStatusDraft => 'Draft';

  @override
  String get enumStatusFinished => 'Finished';

  @override
  String get enumMealTypeBreakfast => 'Breakfast';

  @override
  String get enumMealTypeMorningSnack => 'Morning Snack';

  @override
  String get enumMealTypeLunch => 'Lunch';

  @override
  String get enumMealTypeSnack => 'Snack';

  @override
  String get enumMealTypeDinner => 'Dinner';

  @override
  String get enumMealTypeSupper => 'Supper';

  @override
  String get enumMealTypePreWorkout => 'Pre-workout';

  @override
  String get enumMealTypePostWorkout => 'Post-workout';

  @override
  String get paymentsTitle => 'Payments';

  @override
  String get paymentsSectionTitle => 'Your plan';

  @override
  String get paymentsEmptyMessage => 'No charges here yet.';

  @override
  String get paymentsNextDue => 'Next due';

  @override
  String paymentsDueIn(num days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Due in $days days',
      one: 'Due in $days day',
      zero: 'Due today',
    );
    return '$_temp0';
  }

  @override
  String paymentsOverdueBy(num days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days overdue',
      one: '$days day overdue',
    );
    return '$_temp0';
  }

  @override
  String get paymentsPayButton => 'Pay by card or Pix';

  @override
  String get paymentsStatusOpen => 'Open';

  @override
  String get paymentsStatusOverdue => 'Overdue';

  @override
  String get paymentsStatusPaid => 'Paid';

  @override
  String get paymentsStatusCancelled => 'Cancelled';

  @override
  String get paymentsCardTitle => 'Card details';

  @override
  String get paymentsCardHolder => 'Name on card';

  @override
  String get paymentsCardNumber => 'Card number';

  @override
  String get paymentsCardExpiry => 'Expiry (MM/YYYY)';

  @override
  String get paymentsCardCvv => 'CVV';

  @override
  String get paymentsCardInvalid => 'Check the card details.';

  @override
  String get paymentsConfirmButton => 'Confirm payment';

  @override
  String get paymentsApproved => 'Payment approved.';

  @override
  String get paymentsDeclined =>
      'Payment was not authorized. Try another card.';

  @override
  String get paymentsUncertain =>
      'We could not confirm this payment. Wait a few minutes and check before trying again.';

  @override
  String get paymentsBannerOverdue =>
      'You have an overdue charge. Settle it to keep your access.';

  @override
  String get paymentsBannerDueSoon => 'Your next charge is due soon.';

  @override
  String get errorGenericPayments => 'Could not load your charges.';

  @override
  String get paymentsMethodCard => 'Card';

  @override
  String get paymentsMethodPix => 'Pix';

  @override
  String get paymentsMethodTitle => 'How would you like to pay?';

  @override
  String get paymentsPixGenerating => 'Generating your Pix code...';

  @override
  String get paymentsPixInstructions =>
      'Open your banking app, choose Pix and scan the QR code — or copy the code below.';

  @override
  String get paymentsPixCopy => 'Copy code';

  @override
  String get paymentsPixCopied => 'Code copied';

  @override
  String get paymentsPixWaiting => 'Waiting for payment';

  @override
  String get paymentsPixExpired =>
      'This code has expired. Close and generate a new one.';

  @override
  String get paymentsPixError =>
      'Could not generate the Pix charge. Please try again.';

  @override
  String get paymentsPixUseCode => 'Use the copy-and-paste code';

  @override
  String get paymentsRecurringLabel => 'Charge automatically every cycle';

  @override
  String get paymentsRecurringHint =>
      'We store your card securely with the provider and charge it on each due date. You can turn this off at any time.';

  @override
  String get paymentsRecurringFailed =>
      'Payment approved, but automatic billing could not be enabled.';

  @override
  String get paymentsTaxId => 'CPF or CNPJ';

  @override
  String get paymentsTaxIdRequired =>
      'We need your taxpayer document to issue this charge. It is asked only once.';
}
