import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/customer_provider.dart';
import '../../views/daily/daily_tab_view.dart';
import '../../views/eat/eat_tab_view.dart';
import '../../views/home/home_tab_view.dart';
import '../../views/meal_plan/meal_plan_tab_view.dart';
import '../../views/settings/settings_tab_view.dart';
import 'app_bottom_nav_bar.dart';
import 'app_top_bar.dart';

/// Authenticated app shell: fixed top bar + fixed bottom nav + a
/// swipeable PageView body. A single [_currentIndex]/[_pageController]
/// pair is shared between tap (bottom bar) and swipe (PageView) so both
/// stay in sync.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _pageController = PageController();
  int _currentIndex = 0;

  static const _tabs = [
    HomeTabView(),
    MealPlanTabView(),
    DailyTabView(),
    EatTabView(),
    SettingsTabView(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<CustomerProvider>().loadMe(
        fallbackError: AppLocalizations.of(context).errorGenericProfile,
      );
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onTabTapped(int index) {
    setState(() => _currentIndex = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
    );
  }

  void _onPageChanged(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppTopBar(),
      body: PageView(
        controller: _pageController,
        onPageChanged: _onPageChanged,
        children: _tabs,
      ),
      bottomNavigationBar: AppBottomNavBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
      ),
    );
  }
}
