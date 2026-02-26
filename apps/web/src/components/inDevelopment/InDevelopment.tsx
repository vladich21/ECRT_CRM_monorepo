// components/DevelopmentBadge.tsx
import { useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

interface DevelopmentBadgeProps {
  message?: string;
  closable?: boolean;
}

export const DevelopmentBadge: React.FC<DevelopmentBadgeProps> = ({
  message = 'Функционал в разработке',
  closable = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!import.meta.env.DEV || !isVisible) {
    return null;
  }

  return (
    <div
      style={{
        padding: '4px 8px',
        backgroundColor: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: 4,
        fontSize: 12,
        color: '#d48806',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <span>🚧 {message}</span>
      {closable && (
        <Button
          type='text'
          size='small'
          icon={<CloseOutlined style={{ fontSize: 10 }} />}
          onClick={() => setIsVisible(false)}
          style={{
            minWidth: 'auto',
            width: 16,
            height: 16,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      )}
    </div>
  );
};
