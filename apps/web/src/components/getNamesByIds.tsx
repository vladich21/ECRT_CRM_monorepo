import { Space, Typography } from 'antd';

import { getNameById } from '../helpers/getNameById';
import { Reference } from '../types/referenceTypes';

const { Text } = Typography;

export const getNamesByIds = (authorIds: string[], referenceBooks?: Reference[]) => {
  if (!authorIds || authorIds.length === 0) return <Text type='secondary'>Не указаны</Text>;

  return (
    <Space direction='vertical' size='small'>
      {authorIds.map(authorId => (
        <Text key={authorId}>{getNameById(authorId, referenceBooks)}</Text>
      ))}
    </Space>
  );
};
