import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { clinicalConditionsService } from '../../services/api';
import { Stethoscope } from 'lucide-react';

export const ClinicalConditionsManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.clinicalCondition.title')}
      subtitle={t('clinical.clinicalCondition.subtitle')}
      entityName={t('clinical.clinicalCondition.entityName')}
      service={clinicalConditionsService}
      icon={Stethoscope}
      importEnabled
    />
  );
};
