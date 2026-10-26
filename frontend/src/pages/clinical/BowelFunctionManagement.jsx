import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { bowelFunctionService } from '../../services/api';
import { Activity } from 'lucide-react';

export const BowelFunctionManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.bowelFunction.title')}
      subtitle={t('clinical.bowelFunction.subtitle')}
      entityName={t('clinical.bowelFunction.entityName')}
      service={bowelFunctionService}
      icon={Activity}
    />
  );
};
