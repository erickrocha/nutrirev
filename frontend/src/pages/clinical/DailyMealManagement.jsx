import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { dailyMealService } from '../../services/api';
import { CalendarDays } from 'lucide-react';

export const DailyMealManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.dailyMeal.title')}
      subtitle={t('clinical.dailyMeal.subtitle')}
      entityName={t('clinical.dailyMeal.entityName')}
      service={dailyMealService}
      icon={CalendarDays}
      formPresentation="page"
    />
  );
};
