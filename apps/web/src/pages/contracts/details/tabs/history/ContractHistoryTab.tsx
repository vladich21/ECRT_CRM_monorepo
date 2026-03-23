import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Alert, Card, Timeline, Typography } from 'antd';
import {
  EditOutlined,
  FileOutlined,
  UserSwitchOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { Contract } from '../../../../../types/contract';
import styles from '../additionalAgreements/ContractSupplementTabs.module.scss';
const { Text, Title } = Typography;
type OutletContext = {
  contract: Contract;
};
const DEMO_HISTORY_ITEMS: {
  key: string;
  color: 'green' | 'blue' | 'gray' | 'orange';
  icon: ReactNode;
  title: string;
  detail: string;
  at: string;
}[] = [
  {
    key: '1',
    color: 'green',
    icon: <CheckCircleOutlined />,
    title: 'Договор переведён в статус «Действует»',
    detail: 'Пользователь: Иванов П. С.',
    at: '12.03.2025 14:22',
  },
  {
    key: '2',
    color: 'blue',
    icon: <EditOutlined />,
    title: 'Изменены сроки действия',
    detail: 'Поле «Дата окончания»: 31.12.2024 → 30.06.2026. Пользователь: Сидорова А. К.',
    at: '05.02.2025 09:10',
  },
  {
    key: '3',
    color: 'blue',
    icon: <FileOutlined />,
    title: 'Загружен файл',
    detail: '«Договор_подписанный_скан.pdf» в раздел «Файлы». Пользователь: Иванов П. С.',
    at: '28.01.2025 16:45',
  },
  {
    key: '4',
    color: 'gray',
    icon: <UserSwitchOutlined />,
    title: 'Смена ответственного',
    detail: 'Ответственный за договор: Петров → Сидорова. Пользователь: Администратор',
    at: '10.01.2025 11:00',
  },
  {
    key: '5',
    color: 'orange',
    icon: <CalendarOutlined />,
    title: 'Создание карточки',
    detail: 'Договор заведён в системе из черновика.',
    at: '02.01.2025 08:30',
  },
];
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

        <Alert
          className={styles.alert}
          type='info'
          showIcon
          message='Демонстрационная лента'
          description='События приведены для примера интерфейса.'
        />

        <Timeline
          className={styles.timeline}
          items={DEMO_HISTORY_ITEMS.map(item => ({
            key: item.key,
            color: item.color,
            dot: item.icon,
            children: (
              <div className={styles.timelineItem}>
                <div className={styles.timelineTitleRow}>
                  <Text strong>{item.title}</Text>
                  <Text type='secondary' className={styles.timelineAt}>
                    {item.at}
                  </Text>
                </div>
                <Text type='secondary' className={styles.timelineDetail}>
                  {item.detail}
                </Text>
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
