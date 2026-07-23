import type { FormInstance } from 'antd/es/form';

import {
  PartnerFormClassificationFields,
  PartnerFormContactFields,
  PartnerFormExtraFields,
  PartnerFormFlagsFields,
  PartnerFormRequisitesFields,
  type PartnerBlockUiMode,
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
  blockUiMode?: PartnerBlockUiMode;
  projectBlocksCount?: number;
  unblockLockedByLowScore?: boolean;
}

export function PartnerFormFields({
  referenceBooks,
  disabled,
  getFieldStatus = () => undefined,
  onUploadByInn,
  isLoadingInn,
  formMode = 'create',
  blockUiMode = 'none',
  projectBlocksCount = 0,
  unblockLockedByLowScore = false,
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
        <PartnerFormFlagsFields
          formMode={formMode}
          refs={refs}
          blockUiMode={blockUiMode}
          projectBlocksCount={projectBlocksCount}
          unblockLockedByLowScore={unblockLockedByLowScore}
        />
        <PartnerFormContactFields />
        <PartnerFormExtraFields refs={refs} />
      </div>
    </>
  );
}
