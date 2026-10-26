import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { objectiveService } from '../../services/api';
import { Compass } from 'lucide-react';

export const ObjectiveManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.objective.title')}
      subtitle={t('clinical.objective.subtitle')}
      entityName={t('clinical.objective.entityName')}
      service={objectiveService}
      icon={Compass}
    />
  );
};
