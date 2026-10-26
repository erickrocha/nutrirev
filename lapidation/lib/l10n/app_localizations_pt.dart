// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Lapidation';

  @override
  String get navHome => 'Início';

  @override
  String get navMealPlan => 'Cardápio';

  @override
  String get navDaily => 'Diário';

  @override
  String get navEat => 'Receitas';

  @override
  String get navSettings => 'Ajustes';

  @override
  String get mealPlanTitle => 'Cardápio';

  @override
  String get dailyTitle => 'Diário';

  @override
  String get eatTitle => 'Receitas';

  @override
  String get settingsTitle => 'Ajustes';

  @override
  String get defaultEmptyMessage => 'Nada por aqui ainda.';

  @override
  String get retryButton => 'Tentar novamente';

  @override
  String get homeMealPlanSectionTitle => 'Seu cardápio';

  @override
  String get mealPlanEmptyMessage => 'Nenhum cardápio atribuído ainda.';

  @override
  String get homeDailyMealsSectionTitle => 'Suas refeições do dia';

  @override
  String get dailyMealsEmptyMessage =>
      'Nenhuma categoria de refeição atribuída ainda.';

  @override
  String mealsPlannedCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count refeições planejadas',
      one: '$count refeição planejada',
    );
    return '$_temp0';
  }

  @override
  String get mealPlanDetailEmpty =>
      'Nenhuma refeição detalhada neste cardápio.';

  @override
  String get eatEmptyMessage => 'Nenhuma receita disponível ainda.';

  @override
  String minutesLabel(int minutes) {
    return '$minutes min';
  }

  @override
  String portionsLabel(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count porções',
      one: '$count porção',
    );
    return '$_temp0';
  }

  @override
  String get ingredientsTitle => 'Ingredientes';

  @override
  String get directionsTitle => 'Modo de preparo';

  @override
  String get logoutButton => 'Sair';

  @override
  String appFooter(String version) {
    return 'Lapidation · v$version';
  }

  @override
  String get loginValidationError => 'Por favor, informe seu e-mail e senha.';

  @override
  String get loginTagline => 'CLINIC & NUTRITION';

  @override
  String get loginAreaLabel => 'ÁREA DO PACIENTE';

  @override
  String get loginHeadline => 'Acesse seu plano nutricional';

  @override
  String get loginSubtext =>
      'Informe seu e-mail e senha para acessar o aplicativo.';

  @override
  String get emailLabel => 'E-mail de Acesso';

  @override
  String get emailHint => 'seu.email@exemplo.com';

  @override
  String get passwordLabel => 'Senha';

  @override
  String get loginSubmitButton => 'ENTRAR NO APLICATIVO';

  @override
  String get welcomeValidationEmpty =>
      'Por favor, informe e confirme sua nova senha.';

  @override
  String get welcomeValidationMismatch => 'As senhas informadas não coincidem.';

  @override
  String get welcomeValidationMinLength =>
      'A senha deve conter no mínimo 6 caracteres.';

  @override
  String get welcomeBadge => 'PRIMEIRO ACESSO';

  @override
  String welcomeGreeting(String name) {
    return 'Bem-vindo(a), $name!';
  }

  @override
  String get welcomeSubtext =>
      'Seu acesso ao aplicativo mobile foi ativado pela clínica. Para sua segurança, crie sua nova senha pessoal abaixo.';

  @override
  String get newPasswordLabel => 'Nova Senha Pessoal';

  @override
  String get newPasswordHint => 'Mínimo 6 caracteres';

  @override
  String get confirmPasswordLabel => 'Confirmar Nova Senha';

  @override
  String get confirmPasswordHint => 'Repita a senha informada';

  @override
  String get welcomeSubmitButton => 'SALVAR E CONTINUAR PARA O APP';

  @override
  String get greetingMorning => 'Bom dia';

  @override
  String get greetingAfternoon => 'Boa tarde';

  @override
  String get greetingEvening => 'Boa noite';

  @override
  String get errorGenericMealPlan => 'Não foi possível carregar o cardápio.';

  @override
  String get errorGenericDailyMeals =>
      'Não foi possível carregar suas refeições do dia.';

  @override
  String get errorGenericRecipes => 'Não foi possível carregar as receitas.';

  @override
  String get errorGenericProfile => 'Não foi possível carregar seu perfil.';

  @override
  String get errorGenericConnection =>
      'Não foi possível conectar. Verifique sua conexão e tente novamente.';

  @override
  String get errorGenericSavePassword =>
      'Não foi possível salvar sua nova senha. Tente novamente.';

  @override
  String get dailyCameraOption => 'Tirar foto com a Câmera';

  @override
  String get dailyGalleryOption => 'Escolher da Galeria';

  @override
  String get dailyAnalyzeButton => 'Analisar Foto da Refeição';

  @override
  String get dailyAnalyzeSubtext =>
      'Toque para tirar ou escolher uma foto do prato para análise nutricional por IA';

  @override
  String get dailyAnalyzingTitle => 'Analisando imagem da refeição...';

  @override
  String get dailyAnalysisResultsTitle => 'Análise Nutricional';

  @override
  String get dailyCaloriesLabel => 'Calorias';

  @override
  String get dailyProteinLabel => 'Proteínas';

  @override
  String get dailyCarbsLabel => 'Carboidratos';

  @override
  String get dailyFatLabel => 'Gorduras';

  @override
  String get dailyFoodItemsTitle => 'Alimentos Identificados';

  @override
  String get dailySelectImageTitle => 'Adicionar Foto da Refeição';

  @override
  String get dailyPickMealSlotPrompt => 'Qual refeição é essa?';

  @override
  String get dailySaveToLogButton => 'Salvar no diário';

  @override
  String get dailySavedToLog => 'Salvo no diário';

  @override
  String dailySavedToLogWithPoints(int points) {
    return 'Salvo · +$points pts';
  }

  @override
  String get errorGenericSaveMealLog =>
      'Não foi possível salvar esta refeição no seu diário. Tente novamente.';

  @override
  String get dailyLoggedMealsTitle => 'Refeições registradas neste dia';

  @override
  String get dailyNoLoggedMeals =>
      'Nenhuma refeição registrada neste dia ainda.';

  @override
  String get errorGenericMealLogs =>
      'Não foi possível carregar suas refeições registradas.';

  @override
  String get dailyModeAi => 'Foto com IA';

  @override
  String get dailyModeManual => 'Lançamento Manual';

  @override
  String get dailyManualSearchPlaceholder =>
      'Buscar ingredientes (ex: Frango, Arroz)...';

  @override
  String get dailyManualSearchHint =>
      'Busque pelo nome para definir quantidade e porção';

  @override
  String get dailyManualAddIngredient => 'Adicionar Ingrediente';

  @override
  String get dailyManualQuantity => 'Quantidade';

  @override
  String get dailyManualUnit => 'Unidade de Medida';

  @override
  String get dailyManualSelectedItems => 'Ingredientes Selecionados';

  @override
  String get dailyManualEmptyItems =>
      'Nenhum ingrediente adicionado. Busque e selecione itens acima para montar sua refeição.';

  @override
  String get dailyManualSubmit => 'Calcular e Salvar Refeição';

  @override
  String get dailyManualSubmitting => 'Calculando e Salvando...';

  @override
  String get dailyManualLiveNutrition => 'Macros Estimados';

  @override
  String get dailyManualQuickAdd => 'Adicionar à refeição';

  @override
  String dailyManualNoIngredientsFound(String query) {
    return 'Nenhum ingrediente encontrado para \"$query\"';
  }

  @override
  String get dailyManualSearching => 'Buscando ingredientes...';

  @override
  String get dailyManualPer100g => 'por 100g';

  @override
  String get dailyManualItemRemoved => 'Item removido';

  @override
  String get dailyManualSelectMealSlotFirst =>
      'Selecione uma categoria de refeição acima para continuar';

  @override
  String get dailyManualClearSearch => 'Limpar busca';

  @override
  String get dailyManualNutritionalSummary => 'Resumo Nutricional da Refeição';

  @override
  String get enumRoleSysAdmin => 'Administrador do Sistema';

  @override
  String get enumRoleTenantOwner => 'Administrador da Clínica';

  @override
  String get enumRoleTenantUser => 'Usuário da Clínica';

  @override
  String get enumRoleUser => 'Usuário';

  @override
  String get enumUnitGrams => 'G (Gramas)';

  @override
  String get enumUnitKg => 'Kg';

  @override
  String get enumUnitMl => 'Ml';

  @override
  String get enumUnitLiter => 'Litro';

  @override
  String get enumUnitUnits => 'Unidade';

  @override
  String get enumUnitCup => 'Xícara';

  @override
  String get enumUnitTableSpoon => 'Colher de sopa';

  @override
  String get enumUnitTeaSpoon => 'Colher de chá';

  @override
  String get enumUnitCoffeeSpoon => 'Colher de café';

  @override
  String get enumUnitDessertSpoon => 'Colher de sobremesa';

  @override
  String get enumUnitPinch => 'Pitada';

  @override
  String get enumUnitSlice => 'Fatia';

  @override
  String get enumUnitShell => 'Concha';

  @override
  String get enumUnitGlass => 'Copo';

  @override
  String get enumUnitLittleSquares => 'Quadradinhos';

  @override
  String get enumUnitScoop => 'Scoop';

  @override
  String get enumPeriodWeekly => 'Semanal';

  @override
  String get enumPeriodMonthly => 'Mensal';

  @override
  String get enumCategoryLoseWeight => 'Perder Peso';

  @override
  String get enumCategoryKeepFit => 'Manter a Forma';

  @override
  String get enumCategoryEarnWeight => 'Ganhar Peso';

  @override
  String get enumCategoryHypocaloric => 'Hipocalórico';

  @override
  String get enumCategoryHypertrophy => 'Hipertrofia';

  @override
  String get enumCategoryMaintenance => 'Manutenção';

  @override
  String get enumCategoryKetogenic => 'Cetogênica';

  @override
  String get enumCategoryLowCarb => 'Low Carb';

  @override
  String get enumStatusDraft => 'Rascunho';

  @override
  String get enumStatusFinished => 'Finalizado';

  @override
  String get enumMealTypeBreakfast => 'Café da manhã';

  @override
  String get enumMealTypeMorningSnack => 'Lanche da manhã';

  @override
  String get enumMealTypeLunch => 'Almoço';

  @override
  String get enumMealTypeSnack => 'Lanche';

  @override
  String get enumMealTypeDinner => 'Jantar';

  @override
  String get enumMealTypeSupper => 'Ceia';

  @override
  String get enumMealTypePreWorkout => 'Pré-treino';

  @override
  String get enumMealTypePostWorkout => 'Pós-treino';

  @override
  String get paymentsTitle => 'Pagamentos';

  @override
  String get paymentsSectionTitle => 'Seu plano';

  @override
  String get paymentsEmptyMessage => 'Nenhuma cobrança por aqui ainda.';

  @override
  String get paymentsNextDue => 'Próximo vencimento';

  @override
  String paymentsDueIn(num days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Vence em $days dias',
      one: 'Vence em $days dia',
      zero: 'Vence hoje',
    );
    return '$_temp0';
  }

  @override
  String paymentsOverdueBy(num days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Vencida há $days dias',
      one: 'Vencida há $days dia',
    );
    return '$_temp0';
  }

  @override
  String get paymentsPayButton => 'Pagar com cartão ou Pix';

  @override
  String get paymentsStatusOpen => 'Em aberto';

  @override
  String get paymentsStatusOverdue => 'Em atraso';

  @override
  String get paymentsStatusPaid => 'Paga';

  @override
  String get paymentsStatusCancelled => 'Cancelada';

  @override
  String get paymentsCardTitle => 'Dados do cartão';

  @override
  String get paymentsCardHolder => 'Nome impresso no cartão';

  @override
  String get paymentsCardNumber => 'Número do cartão';

  @override
  String get paymentsCardExpiry => 'Validade (MM/AAAA)';

  @override
  String get paymentsCardCvv => 'CVV';

  @override
  String get paymentsCardInvalid => 'Confira os dados do cartão.';

  @override
  String get paymentsConfirmButton => 'Confirmar pagamento';

  @override
  String get paymentsApproved => 'Pagamento aprovado.';

  @override
  String get paymentsDeclined =>
      'Pagamento não autorizado. Tente outro cartão.';

  @override
  String get paymentsUncertain =>
      'Não foi possível confirmar o pagamento. Aguarde alguns minutos e confira antes de tentar de novo.';

  @override
  String get paymentsBannerOverdue =>
      'Você tem uma cobrança em atraso. Regularize para manter o acesso.';

  @override
  String get paymentsBannerDueSoon => 'Sua próxima cobrança vence em breve.';

  @override
  String get errorGenericPayments =>
      'Não foi possível carregar suas cobranças.';

  @override
  String get paymentsMethodCard => 'Cartão';

  @override
  String get paymentsMethodPix => 'Pix';

  @override
  String get paymentsMethodTitle => 'Como você quer pagar?';

  @override
  String get paymentsPixGenerating => 'Gerando o código Pix...';

  @override
  String get paymentsPixInstructions =>
      'Abra o app do seu banco, escolha Pix e leia o QR Code — ou copie o código abaixo.';

  @override
  String get paymentsPixCopy => 'Copiar código';

  @override
  String get paymentsPixCopied => 'Código copiado';

  @override
  String get paymentsPixWaiting => 'Aguardando o pagamento';

  @override
  String get paymentsPixExpired => 'Este código expirou. Feche e gere um novo.';

  @override
  String get paymentsPixError =>
      'Não foi possível gerar o Pix. Tente novamente.';

  @override
  String get paymentsPixUseCode => 'Use o código copia e cola';

  @override
  String get paymentsRecurringLabel => 'Cobrar automaticamente todo ciclo';

  @override
  String get paymentsRecurringHint =>
      'Salvamos seu cartão com segurança no provedor e cobramos a cada vencimento. Você pode desativar quando quiser.';

  @override
  String get paymentsRecurringFailed =>
      'Pagamento aprovado, mas não foi possível ativar a cobrança automática.';

  @override
  String get paymentsTaxId => 'CPF ou CNPJ';

  @override
  String get paymentsTaxIdRequired =>
      'Precisamos do seu CPF para emitir a cobrança. Ele é solicitado uma única vez.';
}
