import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../models/eat.dart';
import '../../providers/eat_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/base64_or_network_image.dart';
import '../../widgets/common/loading_state.dart';
import 'eat_detail_view.dart';

class EatTabView extends StatefulWidget {
  const EatTabView({super.key});

  @override
  State<EatTabView> createState() => _EatTabViewState();
}

class _EatTabViewState extends State<EatTabView>
    with AutomaticKeepAliveClientMixin {
  final ScrollController _scrollController = ScrollController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final provider = context.read<EatProvider>();
      if (provider.recipes.isEmpty) {
        provider.load(
          fallbackError: AppLocalizations.of(context).errorGenericRecipes,
        );
      }
    });
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 250) {
      context.read<EatProvider>().loadMore(
        fallbackError: AppLocalizations.of(context).errorGenericRecipes,
      );
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final provider = context.watch<EatProvider>();

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(l10n.eatTitle),
      ),
      body: LoadingState(
        loading: provider.loading,
        error: provider.error,
        isEmpty: provider.recipes.isEmpty,
        emptyMessage: l10n.eatEmptyMessage,
        onRetry: () => context.read<EatProvider>().load(
          fallbackError: l10n.errorGenericRecipes,
        ),
        child: RefreshIndicator(
          color: AppColors.accentPrimary,
          onRefresh: () => context.read<EatProvider>().load(
            fallbackError: l10n.errorGenericRecipes,
          ),
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.78,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _EatCard(eat: provider.recipes[index]),
                    childCount: provider.recipes.length,
                  ),
                ),
              ),
              if (provider.loadingMore)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.accentPrimary,
                        strokeWidth: 2.5,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EatCard extends StatelessWidget {
  final Eat eat;

  const _EatCard({required this.eat});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => EatDetailView(eat: eat))),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.borderOutline, width: 0.8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(aspectRatio: 1.4, child: AppImage(source: eat.photo)),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          eat.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (eat.isHighlight)
                        const Icon(
                          Icons.star,
                          color: AppColors.accentPrimary,
                          size: 14,
                        ),
                    ],
                  ),
                  if (eat.time != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      AppLocalizations.of(context).minutesLabel(eat.time!),
                      style: const TextStyle(
                        color: AppColors.textBody,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
