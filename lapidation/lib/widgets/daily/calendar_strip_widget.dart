import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../theme/app_colors.dart';

class CalendarStripWidget extends StatelessWidget {
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  const CalendarStripWidget({
    super.key,
    required this.selectedDate,
    required this.onDateSelected,
  });

  List<DateTime> _getDaysOfWeek() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    // Always show a fixed 7-day window, today centered (-3 to +3 days).
    return List.generate(7, (i) => today.add(Duration(days: i - 3)));
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  @override
  Widget build(BuildContext context) {
    final days = _getDaysOfWeek();
    final today = DateTime.now();
    final locale = Localizations.localeOf(context).toString();

    return Container(
      height: 85,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderOutline, width: 0.8),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        itemCount: days.length,
        itemBuilder: (context, index) {
          final day = days[index];
          final isSelected = _isSameDay(day, selectedDate);
          final isToday = _isSameDay(day, today);
          final dayName = DateFormat('EEE', locale).format(day).toUpperCase();
          final dayNum = DateFormat('d', locale).format(day);

          return GestureDetector(
            onTap: () => onDateSelected(day),
            child: Container(
              width: 52,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.accentPrimary
                    : isToday
                    ? AppColors.badgeBg
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                border: isToday && !isSelected
                    ? Border.all(
                        color: AppColors.accentPrimary.withValues(alpha: 0.5),
                      )
                    : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    dayName,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : AppColors.textBody,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    dayNum,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? Colors.white
                          : isToday
                          ? AppColors.accentPrimary
                          : AppColors.textHeading,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
