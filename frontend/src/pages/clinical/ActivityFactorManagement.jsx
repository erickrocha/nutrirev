import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { activityFactorService } from '../../services/api';
import { Zap } from 'lucide-react';

export const ActivityFactorManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.activityFactor.title')}
      subtitle={t('clinical.activityFactor.subtitle')}
      entityName={t('clinical.activityFactor.entityName')}
      service={activityFactorService}
      icon={Zap}
    />
  );
};
