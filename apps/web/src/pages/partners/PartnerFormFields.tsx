import type { FormInstance } from 'antd/es/form';

import {
  PartnerFormClassificationFields,
  PartnerFormContactFields,
  PartnerFormExtraFields,
  PartnerFormFlagsFields,
  PartnerFormRequisitesFields,
  type PartnerFormRefs,
} from './components/form';
import styles from './PartnerFormPage.module.scss';

export interface PartnerFormFieldsProps {
  form: FormInstance;
  referenceBooks: PartnerFormRefs;
  disabled?: boolean;
  getFieldStatus?: (fieldName: string) => 'error' | undefined;
  onUploadByInn?: () => void;
  isLoadingInn?: boolean;
  formMode?: 'create' | 'edit';
  statusDisplayName?: string;
}

export function PartnerFormFields({
  referenceBooks,
  disabled,
  getFieldStatus = () => undefined,
  onUploadByInn,
  isLoadingInn,
  formMode = 'create',
}: PartnerFormFieldsProps) {
  const refs = referenceBooks;

  return (
    <>
      <PartnerFormRequisitesFields
        getFieldStatus={getFieldStatus}
        onUploadByInn={onUploadByInn}
        isLoadingInn={isLoadingInn}
      />

      <div className={styles.threeColSections}>
        <PartnerFormClassificationFields refs={refs} />
        <PartnerFormFlagsFields formMode={formMode} refs={refs} />
        <PartnerFormContactFields />
        <PartnerFormExtraFields refs={refs} />
      </div>
    </>
  );
}
