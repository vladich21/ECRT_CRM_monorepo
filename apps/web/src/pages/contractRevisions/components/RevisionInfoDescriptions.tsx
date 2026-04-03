import { Descriptions, Tag } from 'antd';

import { formatDate } from '../../../helpers/formatDate';
import { getNameById } from '../../../helpers/getNameById';
import type { ContractRevision } from '../../../types/contract';
import type { ReferenceData } from '../../../api/hooks/useReferences';
import styles from '../ContractRevisionDetailsPage.module.scss';

type Props = {
  revision: ContractRevision;
  referenceBooks: Partial<Pick<ReferenceData, 'contractCategories' | 'contractTypes' | 'partners' | 'contractStates'>>;
};

export function RevisionInfoDescriptions({ revision, referenceBooks }: Props) {
  return (
    <div className={styles.contentCard}>
      <Descriptions column={2} bordered size='small' className={styles.descriptionsBlock}>
        <Descriptions.Item label='Номер договора' span={1}>
          {revision.number || '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Шифр' span={1}>
          {revision.cipher || '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Название' span={2}>
          {revision.name || '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Описание' span={2}>
          {revision.description || <Tag color='gray'>Не указано</Tag>}
        </Descriptions.Item>

        <Descriptions.Item label='Категория'>
          {getNameById(revision.category_id, referenceBooks.contractCategories ?? [])}
        </Descriptions.Item>

        <Descriptions.Item label='Тип'>
          {getNameById(revision.contract_type_id, referenceBooks.contractTypes ?? [])}
        </Descriptions.Item>

        <Descriptions.Item label='Контрагент'>
          {getNameById(revision.partner_id, referenceBooks.partners ?? [])}
        </Descriptions.Item>

        <Descriptions.Item label='Состояние'>
          {getNameById(revision.state_id, referenceBooks.contractStates ?? [])}
        </Descriptions.Item>

        <Descriptions.Item label='Дата подписания'>
          {revision.date_signed ? formatDate(revision.date_signed) : '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Дата начала'>
          {revision.start_date ? formatDate(revision.start_date) : '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Дата окончания'>
          {revision.end_date ? formatDate(revision.end_date) : '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Сумма без НДС'>{revision.amount_excl_vat}</Descriptions.Item>

        <Descriptions.Item label='Ставка НДС'>
          {revision.vat_rate ? `${revision.vat_rate}%` : '-'}
        </Descriptions.Item>

        <Descriptions.Item label='Сумма НДС'>{revision.amount_vat}</Descriptions.Item>

        <Descriptions.Item label='Сумма с НДС'>{revision.amount_incl_vat}</Descriptions.Item>

        <Descriptions.Item label='Статус активности' span={2}>
          <Tag color={revision.is_active ? 'green' : 'red'}>
            {revision.is_active ? 'Активен' : 'Не активен'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}
