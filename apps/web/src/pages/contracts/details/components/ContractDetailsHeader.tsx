import { Button } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ContractState } from '../../../../types/contract';
import { getContractStateTagClass } from '../../utils/contractStateUtils';
import detailsStyles from '../ContractDetails.module.scss';
import headerStyles from '../../../../components/pageLayout/PageHeader.module.scss';
import tagStyles from '../../list/ContractsListPage.module.scss';

type ContractDetailsHeaderProps = {
  contractNumber: string;
  contractName: string;
  contractCipher: string;
  isContractActive: boolean;
  contractState: ContractState | undefined;
  contractCategoryName: string;
  partnerName: string;
  daysUntilEnd: number | null;
  formattedEndDate: string;
  shouldShowDeadlineBanner: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ContractDetailsHeader({
  contractNumber,
  contractName,
  contractCipher,
  isContractActive,
  contractState,
  contractCategoryName,
  partnerName,
  daysUntilEnd,
  formattedEndDate,
  shouldShowDeadlineBanner,
  onEdit,
  onDelete,
}: ContractDetailsHeaderProps) {
  return (
    <>
      <header className={headerStyles.pageHeader}>
        <div className={headerStyles.pageHeaderContainer}>
          <div className={headerStyles.pageHeaderLeft}>
            <div>
              <h1 className={headerStyles.pageTitle}>
                Договор №{contractNumber}
                {contractCipher && (
                  <span className={detailsStyles.phTitleCipher}> ({contractCipher})</span>
                )}
                {contractName && (
                  <span className={detailsStyles.phTitleName}>{contractName}</span>
                )}
              </h1>

              <div className={detailsStyles.phSub}>
                <span
                  className={
                    isContractActive ? tagStyles.tagStatusActive : tagStyles.tagStatusInactive
                  }
                >
                  {isContractActive ? 'Действует' : 'Не действует'}
                </span>

                <span className={detailsStyles.phSubSeparator}>·</span>

                {contractState ? (
                  <span
                    className={
                      tagStyles[
                        getContractStateTagClass(contractState.code) as keyof typeof tagStyles
                      ]
                    }
                  >
                    {contractState.name}
                  </span>
                ) : (
                  <span>—</span>
                )}

                <span className={detailsStyles.phSubSeparator}>·</span>

                {contractCategoryName ? (
                  <span className={tagStyles.cardCategory}>{contractCategoryName}</span>
                ) : (
                  <span>—</span>
                )}

                <span className={detailsStyles.phSubSeparator}>·</span>
                <span>{partnerName || '—'}</span>
              </div>
            </div>
          </div>

          <div className={headerStyles.pageHeaderRight}>
            <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
              Редактировать
            </Button>
            <Button type="primary" danger icon={<DeleteOutlined />} onClick={onDelete}>
              Удалить
            </Button>
          </div>
        </div>
      </header>

      {shouldShowDeadlineBanner && (
        <div className={detailsStyles.deadlineBanner}>
          Срок действия договора истекает через{' '}
          <strong>{daysUntilEnd} дн.</strong>{' '}
          — до <strong>{formattedEndDate}</strong>
        </div>
      )}
    </>
  );
}
