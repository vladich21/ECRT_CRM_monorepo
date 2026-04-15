import { Card, Empty, Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';

import type { Contract } from '@/types/contract';
import styles from '../additionalAgreements/ContractSupplementTabs.module.scss';

const { Text, Title } = Typography;

type OutletContext = {
  contract: Contract;
};

export function ContractHistoryTab() {
  const { contract } = useOutletContext<OutletContext>();

  return (
    <div className={styles.tabRoot}>
      <Card className={styles.card}>
        <Title level={4} className={styles.cardTitle}>
          История изменений
        </Title>
        <Text type='secondary' className={styles.intro}>
          Хронология действий по договору №{contract.number}
          {contract.cipher ? ` (${contract.cipher})` : ''}: правки полей, файлы, смена ответственных, смена статусов.
        </Text>

        <Empty className={styles.alert} description='Записей истории пока нет' />
      </Card>
    </div>
  );
}
