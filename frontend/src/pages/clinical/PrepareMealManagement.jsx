import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { prepareMealService } from '../../services/api';
import { Utensils } from 'lucide-react';

export const PrepareMealManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.prepareMeal.title')}
      subtitle={t('clinical.prepareMeal.subtitle')}
      entityName={t('clinical.prepareMeal.entityName')}
      service={prepareMealService}
      icon={Utensils}
      formPresentation="page"
    />
  );
};
