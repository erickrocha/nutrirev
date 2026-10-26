import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { physicalActivityLevelService } from '../../services/api';
import { Flame } from 'lucide-react';

export const PhysicalActivityLevelManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.physicalActivityLevel.title')}
      subtitle={t('clinical.physicalActivityLevel.subtitle')}
      entityName={t('clinical.physicalActivityLevel.entityName')}
      service={physicalActivityLevelService}
      icon={Flame}
    />
  );
};
