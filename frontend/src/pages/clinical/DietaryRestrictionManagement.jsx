import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { dietaryRestrictionService } from '../../services/api';
import { AlertCircle } from 'lucide-react';

export const DietaryRestrictionManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.dietaryRestriction.title')}
      subtitle={t('clinical.dietaryRestriction.subtitle')}
      entityName={t('clinical.dietaryRestriction.entityName')}
      service={dietaryRestrictionService}
      icon={AlertCircle}
      importEnabled
    />
  );
};
