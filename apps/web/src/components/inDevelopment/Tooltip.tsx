import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export const InDevelopmentTooltip = () => (
  <Tooltip title='Функционал находится в разработке'>
    <InfoCircleOutlined style={{ marginLeft: 8, color: '#faad14' }} />
  </Tooltip>
);

export const TextWithDevTooltip = ({ text }: { text: string }) => (
  <span>
    {text}
    <Tooltip title='Функционал находится в разработке'>
      <InfoCircleOutlined style={{ marginLeft: 8, color: '#faad14' }} />
    </Tooltip>
  </span>
);
