import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/customer_provider.dart';
import '../../providers/payment_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/user_avatar.dart';
import 'payment_view.dart';

class SettingsTabView extends StatelessWidget {
  const SettingsTabView({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final customer = context.watch<CustomerProvider>().me;
    final uploadingPhoto = context.watch<CustomerProvider>().uploadingPhoto;

    Future<void> selectProfilePhoto() async {
      final file = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (file == null || !context.mounted) return;
      final extension = file.name.split('.').last;
      final success = await context.read<CustomerProvider>().uploadPhoto(
        await file.readAsBytes(),
        extension: extension,
      );
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? (Localizations.localeOf(context).languageCode == 'pt'
                      ? 'Foto do perfil atualizada.'
                      : 'Profile photo updated.')
                : (context.read<CustomerProvider>().error ??
                      l10n.errorGenericProfile),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(l10n.settingsTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.borderOutline, width: 0.8),
            ),
            child: Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    UserAvatar(
                      photoUrl: customer?.photoUrl,
                      photoBase64: customer?.photoBase64,
                      gender: customer?.gender,
                      radius: 32,
                    ),
                    Positioned(
                      right: -6,
                      bottom: -6,
                      child: Material(
                        color: AppColors.accentPrimary,
                        shape: const CircleBorder(),
                        child: IconButton(
                          tooltip: 'Alterar foto',
                          constraints: const BoxConstraints.tightFor(
                            width: 32,
                            height: 32,
                          ),
                          padding: EdgeInsets.zero,
                          onPressed: customer == null || uploadingPhoto
                              ? null
                              : selectProfilePhoto,
                          icon: uploadingPhoto
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(
                                  Icons.camera_alt,
                                  size: 16,
                                  color: Colors.white,
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customer?.name ?? '',
                        style: Theme.of(
                          context,
                        ).textTheme.titleLarge?.copyWith(fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        customer?.email ?? '',
                        style: const TextStyle(
                          color: AppColors.textBody,
                          fontSize: 13,
                        ),
                      ),
                      if (customer != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          '${customer.phone} · ${customer.city}',
                          style: const TextStyle(
                            color: AppColors.textBody,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.credit_card,
              color: context.watch<PaymentProvider>().hasOverdue
                  ? AppColors.error
                  : AppColors.accentPrimary,
            ),
            title: Text(l10n.paymentsTitle),
            trailing: const Icon(Icons.chevron_right, size: 20),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const PaymentView()),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.read<AuthProvider>().logout(),
            icon: const Icon(Icons.logout, size: 18),
            label: Text(l10n.logoutButton),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              l10n.appFooter('1.0.0'),
              style: const TextStyle(color: AppColors.textBody, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
