import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleEntityManagement } from '../../components/common/SimpleEntityManagement';
import { formulaService } from '../../services/api';
import { Calculator } from 'lucide-react';

export const FormulaManagement = () => {
  const { t } = useTranslation();
  return (
    <SimpleEntityManagement
      title={t('clinical.formula.title')}
      subtitle={t('clinical.formula.subtitle')}
      entityName={t('clinical.formula.entityName')}
      service={formulaService}
      icon={Calculator}
    />
  );
};
