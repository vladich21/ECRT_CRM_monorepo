import { LinkOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { Link } from 'react-router-dom';

import { partnerFilesSectionUrl } from '../partnerFileSections';
import styles from './EvaluationLowScoreFilesHint.module.scss';

type Props = {
  partnerId: string;
  className?: string;
};

export function EvaluationLowScoreFilesHint({ partnerId, className }: Props) {
  return (
    <Alert
      type='warning'
      showIcon
      className={className}
      message='Рекомендуется приложить документы'
      description={
        <div className={styles.body}>
          <p className={styles.lead}>
            Итоговый балл ниже 2. Дальше по процессу:
          </p>
          <ol className={styles.steps}>
            <li>Загрузите замечания и план корректирующих действий (можно передать контрагенту).</li>
            <li>После устранения - документы в разделе «Результат корректирующих действий».</li>
            <li>Проведите переоценку.</li>
          </ol>
          <p className={styles.lead}>Файлы на вкладке «Файлы» контрагента:</p>
          <ul className={styles.links}>
            <li>
              <Link to={partnerFilesSectionUrl(partnerId, 'evaluation_corrective_actions')}>
                <LinkOutlined /> Корректирующие действия
              </Link>
            </li>
            <li>
              <Link to={partnerFilesSectionUrl(partnerId, 'evaluation_corrective_result')}>
                <LinkOutlined /> Результат корректирующих действий
              </Link>
            </li>
          </ul>
        </div>
      }
    />
  );
}
