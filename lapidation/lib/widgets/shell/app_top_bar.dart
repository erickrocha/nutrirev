import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';
import '../../theme/app_colors.dart';
import '../common/user_avatar.dart';

/// Fixed top bar: customer name on the left, avatar on the
/// right. Stays constant across all 5 bottom-nav tabs.
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  const AppTopBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(72);

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final customer = context.watch<CustomerProvider>();

    final displayName = customer.me?.name ?? auth.token?.name ?? '';

    return AppBar(
      backgroundColor: AppColors.primaryBg,
      elevation: 0,
      automaticallyImplyLeading: false,
      toolbarHeight: preferredSize.height,
      titleSpacing: 20,
      title: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          displayName,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 20),
          child: UserAvatar(
            photoUrl: customer.me?.photoUrl,
            gender: customer.me?.gender,
            radius: 20,
          ),
        ),
      ],
    );
  }
}
