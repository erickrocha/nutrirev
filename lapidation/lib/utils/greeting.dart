import '../l10n/app_localizations.dart';

/// Returns a localized time-of-day greeting for the given 24h [hour].
String greetingForHour(int hour, AppLocalizations l10n) {
  if (hour >= 5 && hour < 12) return l10n.greetingMorning;
  if (hour >= 12 && hour < 18) return l10n.greetingAfternoon;
  return l10n.greetingEvening;
}
