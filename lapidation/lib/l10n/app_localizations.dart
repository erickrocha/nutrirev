import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_pt.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('pt'),
  ];

  /// Application title
  ///
  /// In en, this message translates to:
  /// **'Lapidation'**
  String get appTitle;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navMealPlan.
  ///
  /// In en, this message translates to:
  /// **'Meal Plan'**
  String get navMealPlan;

  /// No description provided for @navDaily.
  ///
  /// In en, this message translates to:
  /// **'Daily'**
  String get navDaily;

  /// No description provided for @navEat.
  ///
  /// In en, this message translates to:
  /// **'Eat'**
  String get navEat;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @mealPlanTitle.
  ///
  /// In en, this message translates to:
  /// **'Meal Plan'**
  String get mealPlanTitle;

  /// No description provided for @dailyTitle.
  ///
  /// In en, this message translates to:
  /// **'Daily'**
  String get dailyTitle;

  /// No description provided for @eatTitle.
  ///
  /// In en, this message translates to:
  /// **'Eat'**
  String get eatTitle;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @defaultEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet.'**
  String get defaultEmptyMessage;

  /// No description provided for @retryButton.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retryButton;

  /// No description provided for @homeMealPlanSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Your meal plan'**
  String get homeMealPlanSectionTitle;

  /// No description provided for @mealPlanEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No meal plan assigned yet.'**
  String get mealPlanEmptyMessage;

  /// No description provided for @homeDailyMealsSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Your meals for the day'**
  String get homeDailyMealsSectionTitle;

  /// No description provided for @dailyMealsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No meal categories assigned yet.'**
  String get dailyMealsEmptyMessage;

  /// No description provided for @mealsPlannedCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} meal planned} other{{count} meals planned}}'**
  String mealsPlannedCount(int count);

  /// No description provided for @mealPlanDetailEmpty.
  ///
  /// In en, this message translates to:
  /// **'No meals detailed in this plan.'**
  String get mealPlanDetailEmpty;

  /// No description provided for @eatEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No recipes available yet.'**
  String get eatEmptyMessage;

  /// No description provided for @minutesLabel.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String minutesLabel(int minutes);

  /// No description provided for @portionsLabel.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} serving} other{{count} servings}}'**
  String portionsLabel(int count);

  /// No description provided for @ingredientsTitle.
  ///
  /// In en, this message translates to:
  /// **'Ingredients'**
  String get ingredientsTitle;

  /// No description provided for @directionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Directions'**
  String get directionsTitle;

  /// No description provided for @logoutButton.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logoutButton;

  /// No description provided for @appFooter.
  ///
  /// In en, this message translates to:
  /// **'Lapidation · v{version}'**
  String appFooter(String version);

  /// No description provided for @loginValidationError.
  ///
  /// In en, this message translates to:
  /// **'Please enter your email and password.'**
  String get loginValidationError;

  /// No description provided for @loginTagline.
  ///
  /// In en, this message translates to:
  /// **'CLINIC & NUTRITION'**
  String get loginTagline;

  /// No description provided for @loginAreaLabel.
  ///
  /// In en, this message translates to:
  /// **'PATIENT AREA'**
  String get loginAreaLabel;

  /// No description provided for @loginHeadline.
  ///
  /// In en, this message translates to:
  /// **'Access your meal plan'**
  String get loginHeadline;

  /// No description provided for @loginSubtext.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and password to access the app.'**
  String get loginSubtext;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Access Email'**
  String get emailLabel;

  /// No description provided for @emailHint.
  ///
  /// In en, this message translates to:
  /// **'your.email@example.com'**
  String get emailHint;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @loginSubmitButton.
  ///
  /// In en, this message translates to:
  /// **'LOG IN TO THE APP'**
  String get loginSubmitButton;

  /// No description provided for @welcomeValidationEmpty.
  ///
  /// In en, this message translates to:
  /// **'Please enter and confirm your new password.'**
  String get welcomeValidationEmpty;

  /// No description provided for @welcomeValidationMismatch.
  ///
  /// In en, this message translates to:
  /// **'The passwords entered do not match.'**
  String get welcomeValidationMismatch;

  /// No description provided for @welcomeValidationMinLength.
  ///
  /// In en, this message translates to:
  /// **'The password must be at least 6 characters long.'**
  String get welcomeValidationMinLength;

  /// No description provided for @welcomeBadge.
  ///
  /// In en, this message translates to:
  /// **'FIRST ACCESS'**
  String get welcomeBadge;

  /// No description provided for @welcomeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Welcome, {name}!'**
  String welcomeGreeting(String name);

  /// No description provided for @welcomeSubtext.
  ///
  /// In en, this message translates to:
  /// **'Your access to the mobile app has been activated by the clinic. For your security, create your new personal password below.'**
  String get welcomeSubtext;

  /// No description provided for @newPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'New Personal Password'**
  String get newPasswordLabel;

  /// No description provided for @newPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'At least 6 characters'**
  String get newPasswordHint;

  /// No description provided for @confirmPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm New Password'**
  String get confirmPasswordLabel;

  /// No description provided for @confirmPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Repeat the password entered'**
  String get confirmPasswordHint;

  /// No description provided for @welcomeSubmitButton.
  ///
  /// In en, this message translates to:
  /// **'SAVE AND CONTINUE TO THE APP'**
  String get welcomeSubmitButton;

  /// No description provided for @greetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get greetingMorning;

  /// No description provided for @greetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get greetingAfternoon;

  /// No description provided for @greetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get greetingEvening;

  /// No description provided for @errorGenericMealPlan.
  ///
  /// In en, this message translates to:
  /// **'Could not load the meal plan.'**
  String get errorGenericMealPlan;

  /// No description provided for @errorGenericDailyMeals.
  ///
  /// In en, this message translates to:
  /// **'Could not load your meals for the day.'**
  String get errorGenericDailyMeals;

  /// No description provided for @errorGenericRecipes.
  ///
  /// In en, this message translates to:
  /// **'Could not load the recipes.'**
  String get errorGenericRecipes;

  /// No description provided for @errorGenericProfile.
  ///
  /// In en, this message translates to:
  /// **'Could not load your profile.'**
  String get errorGenericProfile;

  /// No description provided for @errorGenericConnection.
  ///
  /// In en, this message translates to:
  /// **'Could not connect. Check your connection and try again.'**
  String get errorGenericConnection;

  /// No description provided for @errorGenericSavePassword.
  ///
  /// In en, this message translates to:
  /// **'Could not save your new password. Please try again.'**
  String get errorGenericSavePassword;

  /// No description provided for @dailyCameraOption.
  ///
  /// In en, this message translates to:
  /// **'Take photo with Camera'**
  String get dailyCameraOption;

  /// No description provided for @dailyGalleryOption.
  ///
  /// In en, this message translates to:
  /// **'Choose from Gallery'**
  String get dailyGalleryOption;

  /// No description provided for @dailyAnalyzeButton.
  ///
  /// In en, this message translates to:
  /// **'Analyze Meal Photo'**
  String get dailyAnalyzeButton;

  /// No description provided for @dailyAnalyzeSubtext.
  ///
  /// In en, this message translates to:
  /// **'Tap to take or choose a photo of your plate for instant AI nutrition analysis'**
  String get dailyAnalyzeSubtext;

  /// No description provided for @dailyAnalyzingTitle.
  ///
  /// In en, this message translates to:
  /// **'Analyzing meal image...'**
  String get dailyAnalyzingTitle;

  /// No description provided for @dailyAnalysisResultsTitle.
  ///
  /// In en, this message translates to:
  /// **'Nutritional Analysis'**
  String get dailyAnalysisResultsTitle;

  /// No description provided for @dailyCaloriesLabel.
  ///
  /// In en, this message translates to:
  /// **'Calories'**
  String get dailyCaloriesLabel;

  /// No description provided for @dailyProteinLabel.
  ///
  /// In en, this message translates to:
  /// **'Protein'**
  String get dailyProteinLabel;

  /// No description provided for @dailyCarbsLabel.
  ///
  /// In en, this message translates to:
  /// **'Carbs'**
  String get dailyCarbsLabel;

  /// No description provided for @dailyFatLabel.
  ///
  /// In en, this message translates to:
  /// **'Fat'**
  String get dailyFatLabel;

  /// No description provided for @dailyFoodItemsTitle.
  ///
  /// In en, this message translates to:
  /// **'Identified Food Items'**
  String get dailyFoodItemsTitle;

  /// No description provided for @dailySelectImageTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Meal Photo'**
  String get dailySelectImageTitle;

  /// No description provided for @dailyPickMealSlotPrompt.
  ///
  /// In en, this message translates to:
  /// **'Which meal is this?'**
  String get dailyPickMealSlotPrompt;

  /// No description provided for @dailySaveToLogButton.
  ///
  /// In en, this message translates to:
  /// **'Save to log'**
  String get dailySaveToLogButton;

  /// No description provided for @dailySavedToLog.
  ///
  /// In en, this message translates to:
  /// **'Saved to log'**
  String get dailySavedToLog;

  /// No description provided for @dailySavedToLogWithPoints.
  ///
  /// In en, this message translates to:
  /// **'Saved · +{points} pts'**
  String dailySavedToLogWithPoints(int points);

  /// No description provided for @errorGenericSaveMealLog.
  ///
  /// In en, this message translates to:
  /// **'Could not save this meal to your log. Please try again.'**
  String get errorGenericSaveMealLog;

  /// No description provided for @dailyLoggedMealsTitle.
  ///
  /// In en, this message translates to:
  /// **'Logged meals for this day'**
  String get dailyLoggedMealsTitle;

  /// No description provided for @dailyNoLoggedMeals.
  ///
  /// In en, this message translates to:
  /// **'No meals logged for this day yet.'**
  String get dailyNoLoggedMeals;

  /// No description provided for @errorGenericMealLogs.
  ///
  /// In en, this message translates to:
  /// **'Could not load your logged meals.'**
  String get errorGenericMealLogs;

  /// No description provided for @dailyModeAi.
  ///
  /// In en, this message translates to:
  /// **'AI Photo Scan'**
  String get dailyModeAi;

  /// No description provided for @dailyModeManual.
  ///
  /// In en, this message translates to:
  /// **'Manual Entry'**
  String get dailyModeManual;

  /// No description provided for @dailyManualSearchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Search ingredients (e.g. Chicken, Rice)...'**
  String get dailyManualSearchPlaceholder;

  /// No description provided for @dailyManualSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search by name to configure quantity & portion'**
  String get dailyManualSearchHint;

  /// No description provided for @dailyManualAddIngredient.
  ///
  /// In en, this message translates to:
  /// **'Add Ingredient'**
  String get dailyManualAddIngredient;

  /// No description provided for @dailyManualQuantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get dailyManualQuantity;

  /// No description provided for @dailyManualUnit.
  ///
  /// In en, this message translates to:
  /// **'Measurement Unit'**
  String get dailyManualUnit;

  /// No description provided for @dailyManualSelectedItems.
  ///
  /// In en, this message translates to:
  /// **'Selected Ingredients'**
  String get dailyManualSelectedItems;

  /// No description provided for @dailyManualEmptyItems.
  ///
  /// In en, this message translates to:
  /// **'No ingredients added yet. Search and select items above to build your meal.'**
  String get dailyManualEmptyItems;

  /// No description provided for @dailyManualSubmit.
  ///
  /// In en, this message translates to:
  /// **'Calculate & Save Meal'**
  String get dailyManualSubmit;

  /// No description provided for @dailyManualSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Calculating & Saving...'**
  String get dailyManualSubmitting;

  /// No description provided for @dailyManualLiveNutrition.
  ///
  /// In en, this message translates to:
  /// **'Estimated Macros'**
  String get dailyManualLiveNutrition;

  /// No description provided for @dailyManualQuickAdd.
  ///
  /// In en, this message translates to:
  /// **'Add to meal'**
  String get dailyManualQuickAdd;

  /// No description provided for @dailyManualNoIngredientsFound.
  ///
  /// In en, this message translates to:
  /// **'No ingredients found matching \"{query}\"'**
  String dailyManualNoIngredientsFound(String query);

  /// No description provided for @dailyManualSearching.
  ///
  /// In en, this message translates to:
  /// **'Searching ingredients...'**
  String get dailyManualSearching;

  /// No description provided for @dailyManualPer100g.
  ///
  /// In en, this message translates to:
  /// **'per 100g'**
  String get dailyManualPer100g;

  /// No description provided for @dailyManualItemRemoved.
  ///
  /// In en, this message translates to:
  /// **'Item removed'**
  String get dailyManualItemRemoved;

  /// No description provided for @dailyManualSelectMealSlotFirst.
  ///
  /// In en, this message translates to:
  /// **'Select a meal category above to continue'**
  String get dailyManualSelectMealSlotFirst;

  /// No description provided for @dailyManualClearSearch.
  ///
  /// In en, this message translates to:
  /// **'Clear search'**
  String get dailyManualClearSearch;

  /// No description provided for @dailyManualNutritionalSummary.
  ///
  /// In en, this message translates to:
  /// **'Meal Nutritional Summary'**
  String get dailyManualNutritionalSummary;

  /// No description provided for @enumRoleSysAdmin.
  ///
  /// In en, this message translates to:
  /// **'System Admin'**
  String get enumRoleSysAdmin;

  /// No description provided for @enumRoleTenantOwner.
  ///
  /// In en, this message translates to:
  /// **'Tenant Owner'**
  String get enumRoleTenantOwner;

  /// No description provided for @enumRoleTenantUser.
  ///
  /// In en, this message translates to:
  /// **'Tenant User'**
  String get enumRoleTenantUser;

  /// No description provided for @enumRoleUser.
  ///
  /// In en, this message translates to:
  /// **'User'**
  String get enumRoleUser;

  /// No description provided for @enumUnitGrams.
  ///
  /// In en, this message translates to:
  /// **'g'**
  String get enumUnitGrams;

  /// No description provided for @enumUnitKg.
  ///
  /// In en, this message translates to:
  /// **'kg'**
  String get enumUnitKg;

  /// No description provided for @enumUnitMl.
  ///
  /// In en, this message translates to:
  /// **'ml'**
  String get enumUnitMl;

  /// No description provided for @enumUnitLiter.
  ///
  /// In en, this message translates to:
  /// **'liter'**
  String get enumUnitLiter;

  /// No description provided for @enumUnitUnits.
  ///
  /// In en, this message translates to:
  /// **'unit'**
  String get enumUnitUnits;

  /// No description provided for @enumUnitCup.
  ///
  /// In en, this message translates to:
  /// **'cup'**
  String get enumUnitCup;

  /// No description provided for @enumUnitTableSpoon.
  ///
  /// In en, this message translates to:
  /// **'tablespoon'**
  String get enumUnitTableSpoon;

  /// No description provided for @enumUnitTeaSpoon.
  ///
  /// In en, this message translates to:
  /// **'teaspoon'**
  String get enumUnitTeaSpoon;

  /// No description provided for @enumUnitCoffeeSpoon.
  ///
  /// In en, this message translates to:
  /// **'coffee spoon'**
  String get enumUnitCoffeeSpoon;

  /// No description provided for @enumUnitDessertSpoon.
  ///
  /// In en, this message translates to:
  /// **'dessert spoon'**
  String get enumUnitDessertSpoon;

  /// No description provided for @enumUnitPinch.
  ///
  /// In en, this message translates to:
  /// **'pinch'**
  String get enumUnitPinch;

  /// No description provided for @enumUnitSlice.
  ///
  /// In en, this message translates to:
  /// **'slice'**
  String get enumUnitSlice;

  /// No description provided for @enumUnitShell.
  ///
  /// In en, this message translates to:
  /// **'ladle'**
  String get enumUnitShell;

  /// No description provided for @enumUnitGlass.
  ///
  /// In en, this message translates to:
  /// **'glass'**
  String get enumUnitGlass;

  /// No description provided for @enumUnitLittleSquares.
  ///
  /// In en, this message translates to:
  /// **'small squares'**
  String get enumUnitLittleSquares;

  /// No description provided for @enumUnitScoop.
  ///
  /// In en, this message translates to:
  /// **'scoop'**
  String get enumUnitScoop;

  /// No description provided for @enumPeriodWeekly.
  ///
  /// In en, this message translates to:
  /// **'Weekly'**
  String get enumPeriodWeekly;

  /// No description provided for @enumPeriodMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get enumPeriodMonthly;

  /// No description provided for @enumCategoryLoseWeight.
  ///
  /// In en, this message translates to:
  /// **'Lose Weight'**
  String get enumCategoryLoseWeight;

  /// No description provided for @enumCategoryKeepFit.
  ///
  /// In en, this message translates to:
  /// **'Keep Fit'**
  String get enumCategoryKeepFit;

  /// No description provided for @enumCategoryEarnWeight.
  ///
  /// In en, this message translates to:
  /// **'Gain Weight'**
  String get enumCategoryEarnWeight;

  /// No description provided for @enumCategoryHypocaloric.
  ///
  /// In en, this message translates to:
  /// **'Hypocaloric'**
  String get enumCategoryHypocaloric;

  /// No description provided for @enumCategoryHypertrophy.
  ///
  /// In en, this message translates to:
  /// **'Hypertrophy'**
  String get enumCategoryHypertrophy;

  /// No description provided for @enumCategoryMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get enumCategoryMaintenance;

  /// No description provided for @enumCategoryKetogenic.
  ///
  /// In en, this message translates to:
  /// **'Ketogenic'**
  String get enumCategoryKetogenic;

  /// No description provided for @enumCategoryLowCarb.
  ///
  /// In en, this message translates to:
  /// **'Low Carb'**
  String get enumCategoryLowCarb;

  /// No description provided for @enumStatusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get enumStatusDraft;

  /// No description provided for @enumStatusFinished.
  ///
  /// In en, this message translates to:
  /// **'Finished'**
  String get enumStatusFinished;

  /// No description provided for @enumMealTypeBreakfast.
  ///
  /// In en, this message translates to:
  /// **'Breakfast'**
  String get enumMealTypeBreakfast;

  /// No description provided for @enumMealTypeMorningSnack.
  ///
  /// In en, this message translates to:
  /// **'Morning Snack'**
  String get enumMealTypeMorningSnack;

  /// No description provided for @enumMealTypeLunch.
  ///
  /// In en, this message translates to:
  /// **'Lunch'**
  String get enumMealTypeLunch;

  /// No description provided for @enumMealTypeSnack.
  ///
  /// In en, this message translates to:
  /// **'Snack'**
  String get enumMealTypeSnack;

  /// No description provided for @enumMealTypeDinner.
  ///
  /// In en, this message translates to:
  /// **'Dinner'**
  String get enumMealTypeDinner;

  /// No description provided for @enumMealTypeSupper.
  ///
  /// In en, this message translates to:
  /// **'Supper'**
  String get enumMealTypeSupper;

  /// No description provided for @enumMealTypePreWorkout.
  ///
  /// In en, this message translates to:
  /// **'Pre-workout'**
  String get enumMealTypePreWorkout;

  /// No description provided for @enumMealTypePostWorkout.
  ///
  /// In en, this message translates to:
  /// **'Post-workout'**
  String get enumMealTypePostWorkout;

  /// No description provided for @paymentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get paymentsTitle;

  /// No description provided for @paymentsSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Your plan'**
  String get paymentsSectionTitle;

  /// No description provided for @paymentsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No charges here yet.'**
  String get paymentsEmptyMessage;

  /// No description provided for @paymentsNextDue.
  ///
  /// In en, this message translates to:
  /// **'Next due'**
  String get paymentsNextDue;

  /// No description provided for @paymentsDueIn.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =0{Due today} one{Due in {days} day} other{Due in {days} days}}'**
  String paymentsDueIn(num days);

  /// No description provided for @paymentsOverdueBy.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, one{{days} day overdue} other{{days} days overdue}}'**
  String paymentsOverdueBy(num days);

  /// No description provided for @paymentsPayButton.
  ///
  /// In en, this message translates to:
  /// **'Pay by card or Pix'**
  String get paymentsPayButton;

  /// No description provided for @paymentsStatusOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get paymentsStatusOpen;

  /// No description provided for @paymentsStatusOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get paymentsStatusOverdue;

  /// No description provided for @paymentsStatusPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get paymentsStatusPaid;

  /// No description provided for @paymentsStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get paymentsStatusCancelled;

  /// No description provided for @paymentsCardTitle.
  ///
  /// In en, this message translates to:
  /// **'Card details'**
  String get paymentsCardTitle;

  /// No description provided for @paymentsCardHolder.
  ///
  /// In en, this message translates to:
  /// **'Name on card'**
  String get paymentsCardHolder;

  /// No description provided for @paymentsCardNumber.
  ///
  /// In en, this message translates to:
  /// **'Card number'**
  String get paymentsCardNumber;

  /// No description provided for @paymentsCardExpiry.
  ///
  /// In en, this message translates to:
  /// **'Expiry (MM/YYYY)'**
  String get paymentsCardExpiry;

  /// No description provided for @paymentsCardCvv.
  ///
  /// In en, this message translates to:
  /// **'CVV'**
  String get paymentsCardCvv;

  /// No description provided for @paymentsCardInvalid.
  ///
  /// In en, this message translates to:
  /// **'Check the card details.'**
  String get paymentsCardInvalid;

  /// No description provided for @paymentsConfirmButton.
  ///
  /// In en, this message translates to:
  /// **'Confirm payment'**
  String get paymentsConfirmButton;

  /// No description provided for @paymentsApproved.
  ///
  /// In en, this message translates to:
  /// **'Payment approved.'**
  String get paymentsApproved;

  /// No description provided for @paymentsDeclined.
  ///
  /// In en, this message translates to:
  /// **'Payment was not authorized. Try another card.'**
  String get paymentsDeclined;

  /// No description provided for @paymentsUncertain.
  ///
  /// In en, this message translates to:
  /// **'We could not confirm this payment. Wait a few minutes and check before trying again.'**
  String get paymentsUncertain;

  /// No description provided for @paymentsBannerOverdue.
  ///
  /// In en, this message translates to:
  /// **'You have an overdue charge. Settle it to keep your access.'**
  String get paymentsBannerOverdue;

  /// No description provided for @paymentsBannerDueSoon.
  ///
  /// In en, this message translates to:
  /// **'Your next charge is due soon.'**
  String get paymentsBannerDueSoon;

  /// No description provided for @errorGenericPayments.
  ///
  /// In en, this message translates to:
  /// **'Could not load your charges.'**
  String get errorGenericPayments;

  /// No description provided for @paymentsMethodCard.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get paymentsMethodCard;

  /// No description provided for @paymentsMethodPix.
  ///
  /// In en, this message translates to:
  /// **'Pix'**
  String get paymentsMethodPix;

  /// No description provided for @paymentsMethodTitle.
  ///
  /// In en, this message translates to:
  /// **'How would you like to pay?'**
  String get paymentsMethodTitle;

  /// No description provided for @paymentsPixGenerating.
  ///
  /// In en, this message translates to:
  /// **'Generating your Pix code...'**
  String get paymentsPixGenerating;

  /// No description provided for @paymentsPixInstructions.
  ///
  /// In en, this message translates to:
  /// **'Open your banking app, choose Pix and scan the QR code — or copy the code below.'**
  String get paymentsPixInstructions;

  /// No description provided for @paymentsPixCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy code'**
  String get paymentsPixCopy;

  /// No description provided for @paymentsPixCopied.
  ///
  /// In en, this message translates to:
  /// **'Code copied'**
  String get paymentsPixCopied;

  /// No description provided for @paymentsPixWaiting.
  ///
  /// In en, this message translates to:
  /// **'Waiting for payment'**
  String get paymentsPixWaiting;

  /// No description provided for @paymentsPixExpired.
  ///
  /// In en, this message translates to:
  /// **'This code has expired. Close and generate a new one.'**
  String get paymentsPixExpired;

  /// No description provided for @paymentsPixError.
  ///
  /// In en, this message translates to:
  /// **'Could not generate the Pix charge. Please try again.'**
  String get paymentsPixError;

  /// No description provided for @paymentsPixUseCode.
  ///
  /// In en, this message translates to:
  /// **'Use the copy-and-paste code'**
  String get paymentsPixUseCode;

  /// No description provided for @paymentsRecurringLabel.
  ///
  /// In en, this message translates to:
  /// **'Charge automatically every cycle'**
  String get paymentsRecurringLabel;

  /// No description provided for @paymentsRecurringHint.
  ///
  /// In en, this message translates to:
  /// **'We store your card securely with the provider and charge it on each due date. You can turn this off at any time.'**
  String get paymentsRecurringHint;

  /// No description provided for @paymentsRecurringFailed.
  ///
  /// In en, this message translates to:
  /// **'Payment approved, but automatic billing could not be enabled.'**
  String get paymentsRecurringFailed;

  /// No description provided for @paymentsTaxId.
  ///
  /// In en, this message translates to:
  /// **'CPF or CNPJ'**
  String get paymentsTaxId;

  /// No description provided for @paymentsTaxIdRequired.
  ///
  /// In en, this message translates to:
  /// **'We need your taxpayer document to issue this charge. It is asked only once.'**
  String get paymentsTaxIdRequired;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'pt'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'pt':
      return AppLocalizationsPt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
