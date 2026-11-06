import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../models/payment_charge.dart';
import '../../providers/payment_provider.dart';
import '../../theme/app_colors.dart';

/// The patient's billing cycles, newest first, with a card form for whatever is
/// still owed.
class PaymentView extends StatefulWidget {
  const PaymentView({super.key});

  @override
  State<PaymentView> createState() => _PaymentViewState();
}

class _PaymentViewState extends State<PaymentView> {
  /// One idempotency key per charge, kept across retries on purpose.
  ///
  /// Deriving it from the clock on every tap (what this used to do) makes a retry
  /// after a lost response look like a fresh request: `prepare` misses on the new
  /// key, then hits the reservation the first call already made and refuses the
  /// charge -- permanently, because nothing ever releases that reservation. An
  /// entry is dropped only after a definitive decline, which is the one case where
  /// the customer really is asking for a new attempt.
  final Map<int, String> _idempotencyKeys = {};

  /// Collected at checkout when the patient has none stored, and kept for this
  /// session so a second payment does not ask again.
  String? _taxId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<PaymentProvider>().load(
        fallbackError: AppLocalizations.of(context).errorGenericPayments,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final payments = context.watch<PaymentProvider>();

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        title: Text(l10n.paymentsTitle),
      ),
      body: RefreshIndicator(
        onRefresh: () => payments.load(fallbackError: l10n.errorGenericPayments),
        child: _body(context, l10n, payments),
      ),
    );
  }

  Widget _body(
    BuildContext context,
    AppLocalizations l10n,
    PaymentProvider payments,
  ) {
    if (payments.loading && payments.charges.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (payments.error != null && payments.charges.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            payments.error!,
            style: const TextStyle(color: AppColors.error),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () =>
                payments.load(fallbackError: l10n.errorGenericPayments),
            child: Text(l10n.retryButton),
          ),
        ],
      );
    }
    if (payments.charges.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [Text(l10n.paymentsEmptyMessage)],
      );
    }

    final next = payments.nextUnpaid;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (next != null) _NextDueCard(charge: next, onPay: () => _pay(next)),
        const SizedBox(height: 24),
        Text(
          l10n.paymentsSectionTitle,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        ...payments.charges.map((charge) => _ChargeTile(charge: charge)),
      ],
    );
  }

  Future<void> _pay(PaymentCharge charge) async {
    final method = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surface,
      builder: (_) => const _MethodSheet(),
    );
    if (method == null || !mounted) return;
    if (method == 'pix') {
      await _payWithPix(charge);
      return;
    }
    await _payWithCard(charge);
  }

  Future<void> _payWithPix(PaymentCharge charge) async {
    final l10n = AppLocalizations.of(context);
    final provider = context.read<PaymentProvider>();
    var pix = await provider.createPix(
      chargeId: charge.id,
      idempotencyKey: _idempotencyKeyFor(charge.id),
      taxId: _taxId,
      fallbackError: l10n.paymentsPixError,
    );
    if (!mounted) return;

    // The document is optional at registration, so the first payment is where
    // it is asked for. Asked once, then remembered for this session.
    if (pix == null && provider.needsTaxId) {
      final entered = await _askTaxId();
      if (entered == null || !mounted) return;
      _taxId = entered;
      pix = await provider.createPix(
        chargeId: charge.id,
        idempotencyKey: _idempotencyKeyFor(charge.id),
        taxId: entered,
        fallbackError: l10n.paymentsPixError,
      );
      if (!mounted) return;
    }

    final issued = pix;
    if (issued == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? l10n.paymentsPixError)),
      );
      return;
    }

    final paid = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      backgroundColor: AppColors.surface,
      builder: (_) => _PixSheet(pix: issued),
    );
    if (!mounted) return;

    if (paid == true) {
      // Settled: the key must not be reused, and the list has to catch up.
      _idempotencyKeys.remove(charge.id);
      await provider.load(fallbackError: l10n.errorGenericPayments);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.paymentsApproved)));
    } else {
      // Abandoned. Releasing the attempt is what keeps this charge payable —
      // a live attempt reserves it against every method, not just Pix.
      await provider.releaseAttempt(issued.attemptId);
      _idempotencyKeys.remove(charge.id);
    }
  }

  Future<void> _payWithCard(PaymentCharge charge) async {
    final l10n = AppLocalizations.of(context);
    final card = await showModalBottomSheet<_CardInput>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (_) => _CardFormSheet(charge: charge),
    );
    if (card == null || !mounted) return;

    final result = await context.read<PaymentProvider>().pay(
      chargeId: charge.id,
      // One key per charge and card entry: reusing it on a retry is what keeps
      // a lost response from becoming a second charge.
      idempotencyKey: _idempotencyKeyFor(charge.id),
      cardholderName: card.holder,
      cardNumber: card.number,
      expirationMonth: card.month,
      expirationYear: card.year,
      securityCode: card.cvv,
    );
    if (!mounted) return;

    final subscriptionId = charge.paymentDateId;
    String message;
    if (result == null) {
      message = context.read<PaymentProvider>().error ?? l10n.paymentsDeclined;
    } else if (result.isApproved) {
      message = l10n.paymentsApproved;
      // Storing the card happens after the payment and never fails it: the
      // charge is settled either way, so only the recurrence is reported as
      // having gone wrong.
      if (card.recurring && subscriptionId != null) {
        final stored = await context.read<PaymentProvider>().enableRecurring(
          subscriptionId: subscriptionId,
          cardholderName: card.holder,
          cardNumber: card.number,
          expirationMonth: card.month,
          expirationYear: card.year,
          securityCode: card.cvv,
          taxId: _taxId,
        );
        if (!mounted) return;
        if (!stored) message = l10n.paymentsRecurringFailed;
      }
    } else if (result.isUncertain) {
      message = l10n.paymentsUncertain;
    } else {
      // Declined releases the reservation server-side, so a retry is a new
      // attempt and must not reuse the key.
      _idempotencyKeys.remove(charge.id);
      message = l10n.paymentsDeclined;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<String?> _askTaxId() async {
    final controller = TextEditingController();
    final l10n = AppLocalizations.of(context);
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.paymentsTaxId,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textHeading,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.paymentsTaxIdRequired,
              style: const TextStyle(fontSize: 13, color: AppColors.textBody),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(14),
              ],
              decoration: InputDecoration(labelText: l10n.paymentsTaxId),
            ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: () {
                final value = controller.text.trim();
                Navigator.of(sheetContext).pop(value.isEmpty ? null : value);
              },
              child: Text(l10n.paymentsConfirmButton),
            ),
          ],
        ),
      ),
    );
  }

  String _idempotencyKeyFor(int chargeId) {
    // 16-64 ASCII characters, letters, digits, '-' and '_' only.
    return _idempotencyKeys.putIfAbsent(
      chargeId,
      () => 'charge-$chargeId-${DateTime.now().microsecondsSinceEpoch}'
          .padRight(16, '0'),
    );
  }
}

String _formatAmount(int cents) =>
    'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}';

String _formatDate(String iso) {
  final parts = iso.split('-');
  return parts.length == 3 ? '${parts[2]}/${parts[1]}/${parts[0]}' : iso;
}

String _statusLabel(AppLocalizations l10n, String status) => switch (status) {
  'paid' => l10n.paymentsStatusPaid,
  'overdue' => l10n.paymentsStatusOverdue,
  'cancelled' => l10n.paymentsStatusCancelled,
  _ => l10n.paymentsStatusOpen,
};

Color _statusColor(String status) => switch (status) {
  'paid' => AppColors.success,
  'overdue' => AppColors.error,
  'cancelled' => AppColors.textBody,
  _ => AppColors.warning,
};

class _NextDueCard extends StatelessWidget {
  const _NextDueCard({required this.charge, required this.onPay});

  final PaymentCharge charge;
  final VoidCallback onPay;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final days = charge.daysUntilDue(DateTime.now());
    final paying = context.watch<PaymentProvider>().paying;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: charge.isOverdue ? AppColors.error : AppColors.borderOutline,
          width: charge.isOverdue ? 1.2 : 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.paymentsNextDue,
            style: const TextStyle(color: AppColors.textBody, fontSize: 13),
          ),
          const SizedBox(height: 6),
          Text(
            _formatAmount(charge.amountCents),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            days == null
                ? _formatDate(charge.dueDate)
                : days < 0
                ? l10n.paymentsOverdueBy(-days)
                : l10n.paymentsDueIn(days),
            style: TextStyle(
              color: charge.isOverdue ? AppColors.error : AppColors.textBody,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: paying ? null : onPay,
              icon: paying
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.credit_card, size: 18),
              label: Text(l10n.paymentsPayButton),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChargeTile extends StatelessWidget {
  const _ChargeTile({required this.charge});

  final PaymentCharge charge;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(Icons.receipt_long, color: _statusColor(charge.status)),
      title: Text(_formatAmount(charge.amountCents)),
      subtitle: Text(_formatDate(charge.dueDate)),
      trailing: Text(
        _statusLabel(l10n, charge.status),
        style: TextStyle(
          color: _statusColor(charge.status),
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
    );
  }
}

class _CardInput {
  const _CardInput({
    required this.holder,
    required this.number,
    required this.month,
    required this.year,
    required this.cvv,
    this.recurring = false,
  });

  final String holder;
  final String number;
  final int month;
  final int year;
  final String cvv;

  /// Whether the customer asked for this card to be kept and charged each cycle.
  final bool recurring;
}

/// Collects card data for a single submission. Nothing here is persisted or
/// logged; the fields live only as long as the sheet.
class _CardFormSheet extends StatefulWidget {
  const _CardFormSheet({required this.charge});

  final PaymentCharge charge;

  @override
  State<_CardFormSheet> createState() => _CardFormSheetState();
}

class _CardFormSheetState extends State<_CardFormSheet> {
  /// Only offered when the charge came from a subscription: an ad-hoc charge
  /// the clinic typed in has no cycle to make recurring.
  bool _recurring = false;

  final _holder = TextEditingController();
  final _number = TextEditingController();
  final _expiry = TextEditingController();
  final _cvv = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _holder.dispose();
    _number.dispose();
    _expiry.dispose();
    _cvv.dispose();
    super.dispose();
  }

  void _submit() {
    final l10n = AppLocalizations.of(context);
    final number = _number.text.replaceAll(RegExp(r'\s'), '');
    final expiry = _expiry.text.split('/');
    final month = expiry.isNotEmpty ? int.tryParse(expiry[0].trim()) : null;
    final year = expiry.length > 1 ? int.tryParse(expiry[1].trim()) : null;

    // A first pass here saves a round trip; the server validates again.
    if (_holder.text.trim().isEmpty ||
        number.length < 13 ||
        number.length > 19 ||
        month == null ||
        month < 1 ||
        month > 12 ||
        year == null ||
        year < 2020 ||
        year > 2099 ||
        _cvv.text.length < 3 ||
        _cvv.text.length > 4) {
      setState(() => _error = l10n.paymentsCardInvalid);
      return;
    }

    Navigator.of(context).pop(
      _CardInput(
        holder: _holder.text.trim(),
        number: number,
        month: month,
        year: year,
        cvv: _cvv.text,
        recurring: _recurring,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.paymentsCardTitle,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            _formatAmount(widget.charge.amountCents),
            style: const TextStyle(
              color: AppColors.textBody,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _holder,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(labelText: l10n.paymentsCardHolder),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _number,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(19),
            ],
            decoration: InputDecoration(labelText: l10n.paymentsCardNumber),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _expiry,
                  keyboardType: TextInputType.datetime,
                  decoration: InputDecoration(
                    labelText: l10n.paymentsCardExpiry,
                    hintText: '12/2030',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _cvv,
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                  decoration: InputDecoration(labelText: l10n.paymentsCardCvv),
                ),
              ),
            ],
          ),
          if (widget.charge.paymentDateId != null) ...[
            const SizedBox(height: 6),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              value: _recurring,
              onChanged: (value) => setState(() => _recurring = value),
              title: Text(
                l10n.paymentsRecurringLabel,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading,
                ),
              ),
              subtitle: Text(
                l10n.paymentsRecurringHint,
                style: const TextStyle(fontSize: 12, color: AppColors.textBody),
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
          ],
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _submit,
              child: Text(l10n.paymentsConfirmButton),
            ),
          ),
        ],
      ),
    );
  }
}

/// Card or Pix. A plain sheet rather than a tab bar: this is a one-off choice
/// made before anything is reserved, not a view the customer moves between.
class _MethodSheet extends StatelessWidget {
  const _MethodSheet();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.paymentsMethodTitle,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textHeading,
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop('pix'),
              icon: const Icon(Icons.qr_code_2),
              label: Text(l10n.paymentsMethodPix),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).pop('card'),
              icon: const Icon(Icons.credit_card),
              label: Text(l10n.paymentsMethodCard),
            ),
          ],
        ),
      ),
    );
  }
}

/// The Pix QR, with a poll running while it is on screen.
///
/// Pops `true` once the charge is settled and `false`/null if the customer
/// leaves — the caller uses that to decide whether to release the attempt.
class _PixSheet extends StatefulWidget {
  const _PixSheet({required this.pix});

  final PixCharge pix;

  @override
  State<_PixSheet> createState() => _PixSheetState();
}

class _PixSheetState extends State<_PixSheet> {
  static const _pollInterval = Duration(seconds: 4);

  Timer? _poll;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _poll = Timer.periodic(_pollInterval, (_) => _check());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _check() async {
    final state = await context.read<PaymentProvider>().pollAttempt(
      widget.pix.attemptId,
    );
    if (!mounted || state == null || !state.isSettled) return;
    _poll?.cancel();
    Navigator.of(context).pop(true);
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.pix.payload));
    if (!mounted) return;
    setState(() => _copied = true);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final image = widget.pix.encodedImage;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _formatAmount(widget.pix.amountCents),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: AppColors.textHeading,
              ),
            ),
            const SizedBox(height: 16),
            if (image != null && image.isNotEmpty)
              Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.borderOutline, width: 0.8),
                  ),
                  // The provider returns a rendered QR, which is why no QR
                  // package is needed on either client.
                  child: Image.memory(
                    base64Decode(image),
                    width: 208,
                    height: 208,
                    filterQuality: FilterQuality.none,
                    errorBuilder: (_, _, _) => Text(l10n.paymentsPixUseCode),
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              l10n.paymentsPixInstructions,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.textBody),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primaryBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderOutline, width: 0.8),
              ),
              child: Text(
                widget.pix.payload,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: AppColors.textHeading,
                ),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _copy,
              icon: Icon(_copied ? Icons.check : Icons.copy),
              label: Text(
                _copied ? l10n.paymentsPixCopied : l10n.paymentsPixCopy,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 10),
                Text(
                  l10n.paymentsPixWaiting,
                  style: const TextStyle(fontSize: 13, color: AppColors.textBody),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
