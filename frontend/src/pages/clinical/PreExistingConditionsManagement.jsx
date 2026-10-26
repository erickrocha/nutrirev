import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { preExistingConditionsService } from '../../services/api';
import { Heart } from 'lucide-react';

export const PreExistingConditionsManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.preExistingCondition.title')}
      subtitle={t('clinical.preExistingCondition.subtitle')}
      entityName={t('clinical.preExistingCondition.entityName')}
      service={preExistingConditionsService}
      icon={Heart}
      importEnabled
    />
  );
};
