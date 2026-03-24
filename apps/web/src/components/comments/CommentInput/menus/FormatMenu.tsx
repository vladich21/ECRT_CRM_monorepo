import { OrderedListOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import styles from './FormatMenu.module.scss';

interface FormatMenuProps {
  disabled: boolean;
  position: { top?: number; left?: number; bott?: number };
  formatText: (command: 'bold' | 'italic' | 'underline' | 'insertOrderedList' | 'insertUnorderedList') => void;
}

const isActive = (command: string) => {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
};

export const FormatMenu: React.FC<FormatMenuProps> = ({ disabled, position, formatText }) => {
  return (
    <div
      className={styles.formatMenu}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
      }}
      onMouseDown={e => e.preventDefault()}
    >
      <Tooltip title='Жирный'>
        <Button
          type='text'
          className={`${styles.formatButton} ${isActive('bold') ? styles.active : ''}`}
          onClick={() => formatText('bold')}
          disabled={disabled}
        >
          <strong>B</strong>
        </Button>
      </Tooltip>
      <Tooltip title='Курсив'>
        <Button
          type='text'
          className={`${styles.formatButton} ${isActive('italic') ? styles.active : ''}`}
          onClick={() => formatText('italic')}
          disabled={disabled}
        >
          <em>I</em>
        </Button>
      </Tooltip>
      <Tooltip title='Подчеркнутый'>
        <Button
          type='text'
          className={`${styles.formatButton} ${isActive('underline') ? styles.active : ''}`}
          onClick={() => formatText('underline')}
          disabled={disabled}
        >
          <u>U</u>
        </Button>
      </Tooltip>
      <Tooltip title='Нумерованный список'>
        <Button
          type='text'
          className={`${styles.formatButton} ${isActive('insertOrderedList') ? styles.active : ''}`}
          onClick={() => formatText('insertOrderedList')}
          disabled={disabled}
          icon={<OrderedListOutlined />}
        />
      </Tooltip>
      <Tooltip title='Маркированный список'>
        <Button
          type='text'
          className={`${styles.formatButton} ${isActive('insertUnorderedList') ? styles.active : ''}`}
          onClick={() => formatText('insertUnorderedList')}
          disabled={disabled}
          icon={<UnorderedListOutlined />}
        />
      </Tooltip>
    </div>
  );
};
